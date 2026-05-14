import { describe, it, expect, vi } from 'vitest'
import {
  generateOrderNumber,
  parseOrderNumber,
  getNextOrderNumber,
  isValidOrderNumber,
} from './orderNumber'
import { supabase } from '@/lib/supabase/client'

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        ilike: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(),
          })),
        })),
      })),
    })),
  },
}))

describe('orderNumber', () => {
  describe('generateOrderNumber', () => {
    it('should generate order number with correct format', () => {
      const result = generateOrderNumber(2025, 1)
      expect(result).toBe('GF-2025-0001')
    })

    it('should pad sequence to 4 digits', () => {
      expect(generateOrderNumber(2025, 1)).toBe('GF-2025-0001')
      expect(generateOrderNumber(2025, 42)).toBe('GF-2025-0042')
      expect(generateOrderNumber(2025, 999)).toBe('GF-2025-0999')
      expect(generateOrderNumber(2025, 9999)).toBe('GF-2025-9999')
    })
  })

  describe('parseOrderNumber', () => {
    it('should parse valid order number', () => {
      const result = parseOrderNumber('GF-2025-0047')
      expect(result).toEqual({ year: 2025, sequence: 47 })
    })

    it('should return null for invalid format', () => {
      expect(parseOrderNumber('invalid')).toBeNull()
      expect(parseOrderNumber('GF-2025')).toBeNull()
      expect(parseOrderNumber('GF-2025-')).toBeNull()
      expect(parseOrderNumber('2025-0001')).toBeNull()
    })
  })

  describe('isValidOrderNumber', () => {
    it('should validate correct format', () => {
      expect(isValidOrderNumber('GF-2025-0001')).toBe(true)
      expect(isValidOrderNumber('GF-2025-9999')).toBe(true)
      expect(isValidOrderNumber('GF-1999-0001')).toBe(true)
    })

    it('should reject invalid format', () => {
      expect(isValidOrderNumber('invalid')).toBe(false)
      expect(isValidOrderNumber('GF-2025')).toBe(false)
      expect(isValidOrderNumber('gf-2025-0001')).toBe(false)
      expect(isValidOrderNumber('GF-2025-001')).toBe(false)
    })
  })

  describe('getNextOrderNumber', () => {
    it('should return first order number of year when no orders exist', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          ilike: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          })),
        })),
      }))
      
      supabase.from = mockFrom
      
      const result = await getNextOrderNumber()
      const currentYear = new Date().getFullYear()
      expect(result).toBe(`GF-${currentYear}-0001`)
    })

    it('should increment sequence from last order', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          ilike: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({
                data: [{ order_number: 'GF-2025-0047' }],
                error: null,
              }),
            })),
          })),
        })),
      }))
      
      supabase.from = mockFrom
      
      const result = await getNextOrderNumber()
      expect(result).toBe('GF-2025-0048')
    })
  })
})
