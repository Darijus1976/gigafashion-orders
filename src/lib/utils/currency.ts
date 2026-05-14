/**
 * Format amount as Euro currency string
 * e.g., 240.00 → "€240.00"
 */
export function formatEuro(amount: number): string {
  return `€${amount.toFixed(2)}`
}

/**
 * Parse Euro string to number
 * e.g., "€240.00" → 240.00
 */
export function parseEuro(euroString: string): number {
  const cleaned = euroString.replace('€', '').replace(',', '.').trim()
  return parseFloat(cleaned) || 0
}
