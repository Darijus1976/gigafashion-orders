import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const orderNumber = typeof req.query.orderNumber === 'string' ? req.query.orderNumber : '';

    if (!orderNumber) {
      return res.status(400).json({ error: 'Missing orderNumber' });
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber)
      .single();

    if (orderError || !order) {
      return res.status(404).json({
        error: 'Order not found',
        details: orderError?.message,
      });
    }

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id)
      .order('sort_order', { ascending: true });

    if (itemsError) {
      return res.status(500).json({
        error: 'Failed to load order items',
        details: itemsError.message,
      });
    }

    const { data: fittingRows, error: fittingError } = await supabase
      .from('fitting_sessions')
      .select('*')
      .eq('order_id', order.id)
      .order('sort_order', { ascending: true });

    if (fittingError) {
      return res.status(500).json({
        error: 'Failed to load fitting sessions',
        details: fittingError.message,
      });
    }

    const fittingSessions = (fittingRows || []).map((session: any, index: number) => ({
      id: session.session_key,
      date: session.fitting_date,
      notes: Array.isArray(session.notes) ? session.notes : [],
      photoUrls: Array.isArray(session.photo_urls) ? session.photo_urls : [],
      isActive: index === 0,
    }));

    return res.status(200).json({
      order,
      items: items || [],
      fittingSessions,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to load order',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
