import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return res.status(500).json({ error: 'Missing Supabase environment variables' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const orderId = typeof req.query.orderId === 'string' ? req.query.orderId : '';

    if (!orderId) {
      return res.status(400).json({ error: 'Missing orderId' });
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found', details: orderError?.message });
    }

    const { data: photos, error: photosError } = await supabase
      .from('order_photos')
      .select('storage_path')
      .eq('order_id', orderId);

    if (photosError) {
      console.error('Error fetching photos:', photosError);
    }

    if (photos && photos.length > 0) {
      const storagePaths: string[] = [];
      for (const photo of photos) {
        const url = photo.storage_path;
        if (!url) continue;
        const match = url.match(/\/order-photos\/(.+)$/);
        if (match) {
          storagePaths.push(match[1]);
        }
      }

      if (storagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('order-photos')
          .remove(storagePaths);

        if (storageError) {
          console.error('Error deleting photos from storage:', storageError);
        }
      }
    }

    const tables = ['order_items', 'payments', 'fitting_sessions', 'order_photos'] as const;
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('order_id', orderId);

      if (error) {
        console.error(`Error deleting from ${table}:`, error);
        return res.status(500).json({
          error: `Failed to delete related records from ${table}`,
          details: error.message,
        });
      }
    }

    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (deleteError) {
      return res.status(500).json({
        error: 'Failed to delete order',
        details: deleteError.message,
      });
    }

    return res.status(200).json({
      success: true,
      orderNumber: order.order_number,
      message: `Order ${order.order_number} permanently deleted`,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to delete order',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
