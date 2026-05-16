import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type Product = Database['public']['Tables']['products']['Row']
type Catalogue = Product['catalogue']
type Occasion = Database['public']['Tables']['orders']['Row']['occasion']

interface UseCatalogueOptions {
  catalogue?: Catalogue
  occasion?: Occasion | null
  extrasType?: 'bags' | 'veils' | 'belts' | 'headbands' | 'tiaras' | 'cuffs_gloves'
  enabled?: boolean
}

const STALE_TIME = 5 * 60 * 1000 // 5 minutes
const CACHE_TIME = 10 * 60 * 1000 // 10 minutes

async function fetchProducts(options: UseCatalogueOptions = {}): Promise<Product[]> {
  const { catalogue, occasion, extrasType } = options

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error

  let filtered: Product[] = (data || []) as Product[]

  if (catalogue) {
    filtered = filtered.filter(p => p.catalogue === catalogue)
  }

  if (extrasType) {
    filtered = filtered.filter(p => p.extras_type === extrasType)
  }

  if (occasion) {
    filtered = filtered.filter(p => {
      if (p.catalogue === occasion) return true
      if (p.occasion_tags?.includes(occasion)) return true
      if (occasion === 'wedding_alteration' && p.catalogue === 'wedding') return true
      return false
    })
  }

  return filtered
}

export function useCatalogue(options: UseCatalogueOptions = {}) {
  const { catalogue, occasion, extrasType, enabled = true } = options
  
  const queryKey = ['catalogue', { catalogue, occasion, extrasType }]
  
  return useQuery({
    queryKey,
    queryFn: () => fetchProducts(options),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled,
  })
}

export function useProduct(productId: string) {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: async (): Promise<Product | null> => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()

      if (error) throw error
      return data as Product
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled: !!productId,
  })
}

// Hook for prefetching catalogue data
export function usePrefetchCatalogue() {
  const queryClient = useQueryClient()
  
  return {
    prefetchCatalogue: (options: UseCatalogueOptions) => {
      const { catalogue, occasion, extrasType } = options
      const queryKey = ['catalogue', { catalogue, occasion, extrasType }]
      
      return queryClient.prefetchQuery({
        queryKey,
        queryFn: () => fetchProducts(options),
        staleTime: STALE_TIME,
      })
    },
    
    invalidateCatalogue: (options?: UseCatalogueOptions) => {
      if (options) {
        const { catalogue, occasion, extrasType } = options
        queryClient.invalidateQueries({
          queryKey: ['catalogue', { catalogue, occasion, extrasType }],
        })
      } else {
        queryClient.invalidateQueries({ queryKey: ['catalogue'] })
      }
    },
  }
}
