import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function generateOrderNumber(year: number, sequence: number): string {
  const paddedSequence = sequence.toString().padStart(4, '0');
  return `GF-${year}-${paddedSequence}`;
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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Missing Supabase environment variables' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey);
  const currentYear = new Date().getFullYear();

  const { data, error } = await supabase
    .from('orders')
    .select('order_number')
    .ilike('order_number', `GF-${currentYear}-%`)
    .order('order_number', { ascending: false })
    .limit(1);

  if (error) {
    return res.status(500).json({
      error: 'Failed to generate order number',
      details: error.message,
    });
  }

  let nextSequence = 1;

  if (data && data.length > 0) {
    const parsed = parseOrderNumber(data[0].order_number);
    if (parsed && parsed.year === currentYear) {
      nextSequence = parsed.sequence + 1;
    }
  }

  return res.status(200).json({ orderNumber: generateOrderNumber(currentYear, nextSequence) });
}
