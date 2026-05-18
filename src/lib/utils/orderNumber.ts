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

/**
 * Get the next order number from database
 * Queries the highest sequence number for current year and increments by 1
 */
export async function getNextOrderNumber(): Promise<string> {
  const response = await fetch('/api/get-next-order-number')
  const responseText = await response.text()
  const result = responseText ? JSON.parse(responseText) : {}

  if (!response.ok) {
    throw new Error(result.details || result.error || 'Failed to generate order number')
  }

  return result.orderNumber
}

/**
 * Validate order number format
 */
export function isValidOrderNumber(orderNumber: string): boolean {
  return /^GF-\d{4}-\d{4}$/.test(orderNumber)
}
