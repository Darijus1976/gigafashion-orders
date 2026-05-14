import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCatalogue, useProduct, usePrefetchCatalogue } from './useCatalogue'
import { supabase } from '@/lib/supabase/client'

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            single: vi.fn(),
          })),
          contains: vi.fn(() => ({
            order: vi.fn(() => ({
              single: vi.fn(),
            })),
          })),
        })),
        order: vi.fn(() => ({
          single: vi.fn(),
        })),
        single: vi.fn(),
      })),
    })),
  },
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useCatalogue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch products by catalogue type', async () => {
    const mockProducts = [
      { id: '1', name: 'Wedding Dress 1', catalogue: 'wedding', price: 250 },
      { id: '2', name: 'Wedding Dress 2', catalogue: 'wedding', price: 300 },
    ]

    const mockSelect = vi.fn().mockResolvedValue({
      data: mockProducts,
      error: null,
    })

    supabase.from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            single: mockSelect,
          })),
        })),
        order: vi.fn(() => ({
          single: mockSelect,
        })),
        single: mockSelect,
      })),
    }))

    const { result } = renderHook(() => useCatalogue({ catalogue: 'wedding' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    
    expect(result.current.data).toEqual(mockProducts)
  })

  it('should handle errors', async () => {
    const mockSelect = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    })

    supabase.from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            single: mockSelect,
          })),
        })),
        order: vi.fn(() => ({
          single: mockSelect,
        })),
        single: mockSelect,
      })),
    }))

    const { result } = renderHook(() => useCatalogue({ catalogue: 'wedding' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useProduct', () => {
  it('should fetch single product', async () => {
    const mockProduct = { id: '1', name: 'Test Dress', catalogue: 'wedding', price: 250 }

    const mockSingle = vi.fn().mockResolvedValue({
      data: mockProduct,
      error: null,
    })

    supabase.from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockSingle,
        })),
      })),
    }))

    const { result } = renderHook(() => useProduct('1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    
    expect(result.current.data).toEqual(mockProduct)
  })
})

describe('usePrefetchCatalogue', () => {
  it('should provide prefetch function', () => {
    const { result } = renderHook(() => usePrefetchCatalogue(), {
      wrapper: createWrapper(),
    })

    expect(result.current.prefetchCatalogue).toBeDefined()
    expect(result.current.invalidateCatalogue).toBeDefined()
  })
})
