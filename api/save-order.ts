import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const orderData = req.body;

    // Step 1: Supabase Save
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderData.orderNumber,
        client_name: orderData.clientName,
        phone: orderData.phone,
        visit_date: orderData.visitDate,
        occasion: orderData.occasion,
        occasion_custom: orderData.occasionCustom || null,
        event_date: orderData.eventDate || null,
        dress_type: orderData.dressType,
        staff_member: orderData.staffMember,
        total_amount: orderData.totalAmount || 0,
        total_paid: orderData.totalPaid || 0,
        notes: orderData.notes || null,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return res.status(500).json({
        error: 'Failed to create order',
        details: orderError.message,
      });
    }

    // Insert order items
    if (orderData.items && orderData.items.length > 0) {
      const itemsToInsert = orderData.items.map((item: any, index: number) => ({
        order_id: order.id,
        item_type: item.type,
        description: item.description,
        price: item.price || 0,
        product_id: item.productId || null,
        sort_order: index,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Error creating order items:', itemsError);
        return res.status(500).json({
          error: 'Failed to create order items',
          details: itemsError.message,
        });
      }
    }

    // Insert payments
    if (orderData.payments && orderData.payments.length > 0) {
      const paymentsToInsert = orderData.payments.map((payment: any) => ({
        order_id: order.id,
        amount: payment.amount,
        method: payment.method,
        payment_date: payment.paymentDate || new Date().toISOString().split('T')[0],
        notes: payment.notes || null,
      }));

      const { error: paymentsError } = await supabase
        .from('payments')
        .insert(paymentsToInsert);

      if (paymentsError) {
        console.error('Error creating payments:', paymentsError);
        return res.status(500).json({
          error: 'Failed to create payments',
          details: paymentsError.message,
        });
      }
    }

    if (Array.isArray(orderData.fittingSessions)) {
      const fittingRows = orderData.fittingSessions.map((session: any, index: number) => ({
        order_id: order.id,
        session_key: session.id,
        fitting_date: session.date || new Date().toISOString().split('T')[0],
        notes: Array.isArray(session.notes) ? session.notes : [],
        photo_urls: Array.isArray(session.photoUrls) ? session.photoUrls : [],
        sort_order: index,
      }));

      if (fittingRows.length > 0) {
        const { error: fittingError } = await supabase
          .from('fitting_sessions')
          .upsert(fittingRows, {
            onConflict: 'order_id,session_key',
          });

        if (fittingError) {
          console.error('Error saving fitting sessions:', fittingError);
          return res.status(500).json({
            error: 'Failed to save fitting sessions',
            details: fittingError.message,
          });
        }
      }
    }

    // TODO: Implement remaining steps:
    // 2. PDF Generation — Full (Staff)
    // 3. Google Drive — Staff PDF
    // 4. PDF Generation — Client
    // 5. Google Drive — Client PDF
    // 6. Google Sheets Update

    return res.status(200).json({
      success: true,
      orderNumber: orderData.orderNumber,
      orderId: order.id,
      message: 'Order saved successfully to Supabase',
    });
  } catch (error) {
    console.error('Error saving order:', error);
    return res.status(500).json({
      error: 'Failed to save order',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
