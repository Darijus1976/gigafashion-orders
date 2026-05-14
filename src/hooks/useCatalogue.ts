import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Database } from '@/lib/supabase/types'

type Product = Database['public']['Tables']['products']['Row']
type Catalogue = Product['catalogue']
type Occasion = Database['public']['Tables']['orders']['Row']['occasion']

interface UseCatalogueOptions {
  catalogue?: Catalogue
  occasion?: Occasion | null
  extrasType?: 'bags' | 'veils' | 'belts' | 'headbands'
  enabled?: boolean
}

const STORAGE_KEY = 'giga_fashion_products'
const STALE_TIME = 5 * 60 * 1000 // 5 minutes
const CACHE_TIME = 10 * 60 * 1000 // 10 minutes

export function useCatalogue(options: UseCatalogueOptions = {}) {
  const { catalogue, occasion, extrasType, enabled = true } = options
  
  const queryKey = ['catalogue', { catalogue, occasion, extrasType }]
  
  return useQuery({
    queryKey,
    queryFn: async (): Promise<Product[]> => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (!stored) return []
        
        const products: Product[] = JSON.parse(stored)
        
        // Filter by catalogue type
        let filtered = products
        if (catalogue) {
          filtered = filtered.filter(p => p.catalogue === catalogue)
        }
        
        // Filter by extras type
        if (extrasType) {
          filtered = filtered.filter(p => p.extras_type === extrasType)
        }
        
        // Filter by occasion
        if (occasion) {
          filtered = filtered.filter(p => 
            p.occasion_tags?.includes(occasion)
          )
        }
        
        // Filter only active products
        filtered = filtered.filter(p => p.is_active)
        
        return filtered
      } catch (error) {
        console.error('Error fetching catalogue from localStorage:', error)
        return []
      }
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled,
  })
}

export function useProduct(productId: string) {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: async (): Promise<Product | null> => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (!stored) return null
        
        const products: Product[] = JSON.parse(stored)
        return products.find(p => p.id === productId) || null
      } catch (error) {
        console.error('Error fetching product from localStorage:', error)
        return null
      }
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
        queryFn: async (): Promise<Product[]> => {
          try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (!stored) return []
            
            const products: Product[] = JSON.parse(stored)
            
            let filtered = products
            if (catalogue) {
              filtered = filtered.filter(p => p.catalogue === catalogue)
            }
            
            if (extrasType) {
              filtered = filtered.filter(p => p.extras_type === extrasType)
            }
            
            if (occasion) {
              filtered = filtered.filter(p => 
                p.occasion_tags?.includes(occasion)
              )
            }
            
            filtered = filtered.filter(p => p.is_active)
            
            return filtered
          } catch (error) {
            console.error('Error prefetching catalogue from localStorage:', error)
            return []
          }
        },
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
