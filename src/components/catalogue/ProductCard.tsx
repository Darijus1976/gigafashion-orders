import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, ImageIcon } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

type Product = Database['public']['Tables']['products']['Row']

interface ProductCardProps {
  product: Product
  onAddToOrder?: (product: Product) => void
  isCompact?: boolean
}

export function ProductCard({ product, onAddToOrder, isCompact = false }: ProductCardProps) {
  const handleAdd = () => {
    if (onAddToOrder) {
      onAddToOrder(product)
    }
  }

  return (
    <Card className="overflow-hidden group hover:border-rose-400 transition-colors">
      <CardContent className="p-0">
        {/* Product Image */}
        <div 
          className={`relative bg-gray-100 flex items-center justify-center ${
            isCompact ? 'aspect-square' : 'aspect-[4/3]'
          }`}
        >
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center text-gray-400">
              <ImageIcon className="w-8 h-8 mb-2" />
              <span className="text-xs">Nuotrauka</span>
            </div>
          )}
          
          {/* Hover overlay with add button */}
          {onAddToOrder && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                onClick={handleAdd}
                size="sm"
                className="bg-white text-rose-600 hover:bg-rose-50"
              >
                <Plus className="w-4 h-4 mr-1" />
                Pridėti
              </Button>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-3">
          <h4 className="font-medium text-sm truncate" title={product.name}>
            {product.name}
          </h4>
          <p className="text-rose-600 font-semibold mt-1">
            €{product.price.toFixed(2)}
          </p>
          
          {/* Occasion tags (if any) */}
          {product.occasion_tags && product.occasion_tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {product.occasion_tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded-full text-gray-600"
                >
                  {tag}
                </span>
              ))}
              {product.occasion_tags.length > 2 && (
                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded-full text-gray-600">
                  +{product.occasion_tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
