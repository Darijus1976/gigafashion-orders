import { format, parseISO } from 'date-fns'
import { lt } from 'date-fns/locale'

/**
 * Format date for display
 * e.g., "2025-04-15" → "2025 m. balandžio 15 d."
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'yyyy m. MMMM d d.', { locale: lt })
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'yyyy m. MMMM d d., HH:mm', { locale: lt })
}

/**
 * Format date for input fields (yyyy-MM-dd)
 */
export function formatDateInput(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'yyyy-MM-dd')
}

/**
 * Format time for input fields (HH:mm)
 */
export function formatTimeInput(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'HH:mm')
}

/**
 * Get today's date as string
 */
export function getToday(): string {
  return format(new Date(), 'yyyy-MM-dd')
}
