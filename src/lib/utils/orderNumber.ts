/**
 * Generate unique order number
 * Format: GF-YYYY-NNNN
 * e.g., GF-2025-0047
 */
export function generateOrderNumber(year: number, sequence: number): string {
  const paddedSequence = sequence.toString().padStart(4, '0')
  return `GF-${year}-${paddedSequence}`
}

/**
 * Parse order number to extract year and sequence
 */
export function parseOrderNumber(orderNumber: string): { year: number; sequence: number } | null {
  const match = orderNumber.match(/^GF-(\d{4})-(\d{4})$/)
  if (!match) return null
  
  return {
    year: parseInt(match[1], 10),
    sequence: parseInt(match[2], 10),
  }
}

import { supabase } from '@/lib/supabase/client'

/**
 * Get the next order number from database
 * Queries the highest sequence number for current year and increments by 1
 */
export async function getNextOrderNumber(): Promise<string> {
  const currentYear = new Date().getFullYear()
  
  // Query the highest order_number for current year
  const { data, error } = await supabase
    .from('orders')
    .select('order_number')
    .ilike('order_number', `GF-${currentYear}-%`)
    .order('order_number', { ascending: false })
    .limit(1)
  
  if (error) {
    console.error('Error fetching order number:', error)
    throw new Error('Failed to generate order number')
  }
  
  let nextSequence = 1
  
  if (data && data.length > 0) {
    const parsed = parseOrderNumber(data[0].order_number)
    if (parsed && parsed.year === currentYear) {
      nextSequence = parsed.sequence + 1
    }
  }
  
  return generateOrderNumber(currentYear, nextSequence)
}

/**
 * Validate order number format
 */
export function isValidOrderNumber(orderNumber: string): boolean {
  return /^GF-\d{4}-\d{4}$/.test(orderNumber)
}
