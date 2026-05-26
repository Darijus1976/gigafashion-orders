import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function generateOrderNumber(year: number, sequence: number): string {
  return `GF-${year}-${sequence.toString().padStart(4, '0')}`;
}

function parseOrderNumber(orderNumber: string): { year: number; sequence: number } | null {
  const match = orderNumber.match(/^GF-(\d{4})-(\d{4})$/);
  if (!match) return null;

  return {
    year: parseInt(match[1], 10),
    sequence: parseInt(match[2], 10),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({
        error: 'Missing Supabase environment variables',
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey);
    const orderData = req.body;
    let orderNumberToSave = orderData.orderNumber;

    if (!orderData.orderId && !orderData.isExistingOrder) {
      const currentYear = new Date().getFullYear();
      const { data: latestOrders, error: latestOrderError } = await supabase
        .from('orders')
        .select('order_number')
        .ilike('order_number', `GF-${currentYear}-%`)
        .order('order_number', { ascending: false })
        .limit(1);

      if (latestOrderError) {
        return res.status(500).json({
          error: 'Failed to validate order number',
          details: latestOrderError.message,
        });
      }

      const latestParsed = latestOrders?.[0]?.order_number
        ? parseOrderNumber(latestOrders[0].order_number)
        : null;
      const requestedParsed = parseOrderNumber(orderNumberToSave);
      const latestSequence = latestParsed?.year === currentYear ? latestParsed.sequence : 0;
      const requestedSequence = requestedParsed?.year === currentYear ? requestedParsed.sequence : 0;

      orderNumberToSave = generateOrderNumber(
        currentYear,
        Math.max(latestSequence + 1, requestedSequence || 1)
      );
    }

    const orderPayload = {
        order_number: orderNumberToSave,
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
      };

    const orderQuery = orderData.orderId
      ? supabase
        .from('orders')
        .update(orderPayload)
        .eq('id', orderData.orderId)
      : orderData.isExistingOrder
        ? supabase
          .from('orders')
          .update(orderPayload)
          .eq('order_number', orderData.orderNumber)
        : supabase
          .from('orders')
          .insert(orderPayload);

    const { data: order, error: orderError } = await orderQuery
      .select()
      .single();

    if (orderError) {
      console.error('Error saving order:', orderError);
      return res.status(500).json({
        error: 'Failed to save order',
        details: orderError.message,
      });
    }

    const { error: deleteItemsError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', order.id);

    if (deleteItemsError) {
      console.error('Error replacing order items:', deleteItemsError);
      return res.status(500).json({
        error: 'Failed to replace order items',
        details: deleteItemsError.message,
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
        image_url: item.imageUrl || null,
        sort_order: index,
        deleted: item.deleted || false,
        deleted_at: item.deletedAt || null,
        deleted_by: item.deletedBy || null,
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

    const { error: deletePaymentsError } = await supabase
      .from('payments')
      .delete()
      .eq('order_id', order.id);

    if (deletePaymentsError) {
      console.error('Error replacing payments:', deletePaymentsError);
      return res.status(500).json({
        error: 'Failed to replace payments',
        details: deletePaymentsError.message,
      });
    }

    // Insert payments
    if (orderData.payments && orderData.payments.length > 0) {
      const paymentsToInsert = orderData.payments.map((payment: any) => ({
        order_id: order.id,
        amount: payment.amount,
        method: payment.method,
        payment_date: payment.paymentDate || new Date().toISOString().split('T')[0],
        notes: payment.notes || null,
        accepted_by: payment.acceptedBy || null,
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

      const { error: deleteFittingError } = await supabase
        .from('fitting_sessions')
        .delete()
        .eq('order_id', order.id);

      if (deleteFittingError) {
        console.error('Error replacing fitting sessions:', deleteFittingError);
        return res.status(500).json({
          error: 'Failed to replace fitting sessions',
          details: deleteFittingError.message,
        });
      }

      if (fittingRows.length > 0) {
        const { error: fittingError } = await supabase
          .from('fitting_sessions')
          .insert(fittingRows);

        if (fittingError) {
          console.error('Error saving fitting sessions:', fittingError);
          return res.status(500).json({
            error: 'Failed to save fitting sessions',
            details: fittingError.message,
          });
        }
      }
    }

    // PDF generation is triggered asynchronously by the frontend
    // via POST /api/generate-pdf with { orderId } after this response.

    return res.status(200).json({
      success: true,
      orderNumber: orderNumberToSave,
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
