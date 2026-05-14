import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ProductCard } from './ProductCard'
import { useCatalogue } from '@/hooks/useCatalogue'
import { Search, Loader2, Grid3X3, List } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

type Product = Database['public']['Tables']['products']['Row']
type Catalogue = Product['catalogue']
type Occasion = Database['public']['Tables']['orders']['Row']['occasion']

interface CatalogueGridProps {
  catalogue?: Catalogue
  occasion?: Occasion | null
  extrasType?: 'bags' | 'veils' | 'belts' | 'headbands'
  onAddToOrder?: (product: Product) => void
  showSearch?: boolean
  showViewToggle?: boolean
  columns?: 2 | 3 | 4
  isCompact?: boolean
}

const ITEMS_PER_PAGE = 12

export function CatalogueGrid({
  catalogue,
  occasion,
  extrasType,
  onAddToOrder,
  showSearch = true,
  showViewToggle = false,
  columns = 3,
  isCompact = false,
}: CatalogueGridProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const { data: products, isLoading, isError, error } = useCatalogue({
    catalogue,
    occasion,
    extrasType,
  })

  // Filter products by search query
  const filteredProducts = products?.filter((product) => {
    if (!searchQuery) return true
    return product.name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  // Pagination
  const totalPages = filteredProducts 
    ? Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) 
    : 0
  
  const paginatedProducts = filteredProducts?.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Grid columns class
  const gridColsClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }[columns]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
        <span className="ml-2 text-muted-foreground">Kraunama...</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-rose-600">Klaida kraunant produktus</p>
        <p className="text-sm text-muted-foreground mt-1">
          {error instanceof Error ? error.message : 'Nežinoma klaida'}
        </p>
      </div>
    )
  }

  if (!products || products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Šioje kategorijoje nėra prekių</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and controls */}
      {(showSearch || showViewToggle) && (
        <div className="flex items-center gap-2">
          {showSearch && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Ieškoti produktų..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1) // Reset to first page on search
                }}
                className="pl-9"
              />
            </div>
          )}
          
          {showViewToggle && (
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-none rounded-l-md"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-none rounded-r-md"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Results count */}
      {searchQuery && (
        <p className="text-sm text-muted-foreground">
          Rasta {filteredProducts?.length} prekių
        </p>
      )}

      {/* Product grid */}
      <div className={`grid ${gridColsClass} gap-4`}>
        {paginatedProducts?.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToOrder={onAddToOrder}
            isCompact={isCompact}
          />
        ))}
      </div>

      {/* Empty search results */}
      {filteredProducts?.length === 0 && searchQuery && (
        <p className="text-center text-muted-foreground py-8">
          Pagal paiešką "{searchQuery}" nieko nerasta
        </p>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            ←
          </Button>
          
          <span className="text-sm">
            Puslapis {currentPage} iš {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            →
          </Button>
        </div>
      )}
    </div>
  )
}
