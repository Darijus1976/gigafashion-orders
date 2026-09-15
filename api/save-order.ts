import type { VercelRequest, VercelResponse } from '@vercel/node';
import { waitUntil } from '@vercel/functions';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

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
    let orderData = req.body;

    if (Buffer.isBuffer(orderData)) {
      orderData = JSON.parse(orderData.toString('utf8'));
    } else if (typeof orderData === 'string') {
      orderData = JSON.parse(orderData);
    }

    if (!orderData || typeof orderData !== 'object') {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    console.log('save-order body keys:', Object.keys(orderData));

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
      const requestedParsed = orderNumberToSave ? parseOrderNumber(orderNumberToSave) : null;
      const latestSequence = latestParsed?.year === currentYear ? latestParsed.sequence : 0;
      const requestedSequence = requestedParsed?.year === currentYear ? requestedParsed.sequence : 0;

      orderNumberToSave = generateOrderNumber(
        currentYear,
        Math.max(latestSequence + 1, requestedSequence || 1)
      );
    }

    const orderPayload: any = {
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
        internal_notes: orderData.internalNotes || null,
        internal_photo_urls: Array.isArray(orderData.internalPhotoUrls) ? orderData.internalPhotoUrls : [],
      };

    if (orderData.dressColour) {
      orderPayload.dress_colour = orderData.dressColour;
      orderPayload.dress_colour_other = orderData.dressColour === 'other' && orderData.dressColourOther
        ? orderData.dressColourOther
        : null;
    }

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

    // Insert new order items first, then delete the old ones.
    // This prevents data loss if the insert fails.
    if (Array.isArray(orderData.items)) {
      if (orderData.items.length > 0) {
        const { data: existingItemIds, error: fetchItemIdsError } = await supabase
          .from('order_items')
          .select('id')
          .eq('order_id', order.id);

        if (fetchItemIdsError) {
          console.error('Error fetching existing item ids:', fetchItemIdsError);
          return res.status(500).json({
            error: 'Failed to fetch existing order items',
            details: fetchItemIdsError.message,
          });
        }

        const oldItemIds = (existingItemIds || []).map((row: any) => row.id);

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

        if (oldItemIds.length > 0) {
          const { error: deleteOldItemsError } = await supabase
            .from('order_items')
            .delete()
            .in('id', oldItemIds);

          if (deleteOldItemsError) {
            console.error('Error deleting old order items:', deleteOldItemsError);
            return res.status(500).json({
              error: 'Failed to clean up old order items',
              details: deleteOldItemsError.message,
            });
          }
        }
      } else {
        const { error: deleteAllItemsError } = await supabase
          .from('order_items')
          .delete()
          .eq('order_id', order.id);

        if (deleteAllItemsError) {
          console.error('Error deleting order items:', deleteAllItemsError);
          return res.status(500).json({
            error: 'Failed to delete order items',
            details: deleteAllItemsError.message,
          });
        }
      }
    }

    // Insert new payments first, then delete the old ones.
    if (Array.isArray(orderData.payments)) {
      if (orderData.payments.length > 0) {
        const { data: existingPaymentIds, error: fetchPaymentIdsError } = await supabase
          .from('payments')
          .select('id')
          .eq('order_id', order.id);

        if (fetchPaymentIdsError) {
          console.error('Error fetching existing payment ids:', fetchPaymentIdsError);
          return res.status(500).json({
            error: 'Failed to fetch existing payments',
            details: fetchPaymentIdsError.message,
          });
        }

        const oldPaymentIds = (existingPaymentIds || []).map((row: any) => row.id);

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

        if (oldPaymentIds.length > 0) {
          const { error: deleteOldPaymentsError } = await supabase
            .from('payments')
            .delete()
            .in('id', oldPaymentIds);

          if (deleteOldPaymentsError) {
            console.error('Error deleting old payments:', deleteOldPaymentsError);
            return res.status(500).json({
              error: 'Failed to clean up old payments',
              details: deleteOldPaymentsError.message,
            });
          }
        }
      } else {
        const { error: deleteAllPaymentsError } = await supabase
          .from('payments')
          .delete()
          .eq('order_id', order.id);

        if (deleteAllPaymentsError) {
          console.error('Error deleting payments:', deleteAllPaymentsError);
          return res.status(500).json({
            error: 'Failed to delete payments',
            details: deleteAllPaymentsError.message,
          });
        }
      }
    }

    // Insert new fitting sessions first, then delete the old ones.
    if (Array.isArray(orderData.fittingSessions)) {
      if (orderData.fittingSessions.length > 0) {
        const { data: existingSessionKeys, error: fetchSessionKeysError } = await supabase
          .from('fitting_sessions')
          .select('session_key')
          .eq('order_id', order.id);

        if (fetchSessionKeysError) {
          console.error('Error fetching existing session keys:', fetchSessionKeysError);
          return res.status(500).json({
            error: 'Failed to fetch existing fitting sessions',
            details: fetchSessionKeysError.message,
          });
        }

        const oldSessionKeys = (existingSessionKeys || []).map((row: any) => row.session_key);

        const fittingRows = orderData.fittingSessions.map((session: any, index: number) => ({
          order_id: order.id,
          session_key: randomUUID(),
          fitting_date: session.date || new Date().toISOString().split('T')[0],
          notes: Array.isArray(session.notes) ? session.notes : [],
          photo_urls: Array.isArray(session.photoUrls) ? session.photoUrls : [],
          sort_order: index,
        }));

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

        if (oldSessionKeys.length > 0) {
          const { error: deleteOldFittingError } = await supabase
            .from('fitting_sessions')
            .delete()
            .in('session_key', oldSessionKeys);

          if (deleteOldFittingError) {
            console.error('Error deleting old fitting sessions:', deleteOldFittingError);
            return res.status(500).json({
              error: 'Failed to clean up old fitting sessions',
              details: deleteOldFittingError.message,
            });
          }
        }
      } else {
        const { error: deleteAllFittingError } = await supabase
          .from('fitting_sessions')
          .delete()
          .eq('order_id', order.id);

        if (deleteAllFittingError) {
          console.error('Error deleting fitting sessions:', deleteAllFittingError);
          return res.status(500).json({
            error: 'Failed to delete fitting sessions',
            details: deleteAllFittingError.message,
          });
        }
      }
    }

    // Trigger PDF generation server-side so it no longer depends on the
    // client browser staying alive. waitUntil keeps this function alive
    // long enough for the request to be dispatched; generate-pdf then
    // runs to completion in its own invocation.
    const pdfMode = typeof orderData.pdfMode === 'string' ? orderData.pdfMode : 'full';
    const skipPdf = orderData.skipPdf === true || orderData.skipPdf === 'true';
    const host = req.headers.host;

    if (host && !skipPdf) {
      const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
      const pdfUrl = `${protocol}://${host}/api/generate-pdf?mode=${encodeURIComponent(pdfMode)}`;
      waitUntil(
        fetch(pdfUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id }),
        })
          .then(async (r) => {
            const text = await r.text();
            console.log(`generate-pdf trigger: status=${r.status} body=${text.slice(0, 500)}`);
          })
          .catch((err) => {
            console.error('generate-pdf trigger failed:', err);
          })
      );
    }

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
