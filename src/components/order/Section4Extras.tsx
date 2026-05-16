import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, ShoppingBag, Crown, Ribbon, Sparkles, ImageIcon } from 'lucide-react'
import { useCatalogue } from '@/hooks/useCatalogue'
import type { Database } from '@/lib/supabase/types'

type Product = Database['public']['Tables']['products']['Row']
type ExtrasType = 'bags' | 'veils' | 'belts' | 'headbands' | 'tiaras' | 'cuffs_gloves'

interface ExtraItem {
  id: string
  description: string
  price: number
  productId?: string
  imageUrl?: string
}

interface Section4ExtrasProps {
  onAddToOrder: (item: ExtraItem) => void
}

interface ExtrasCategory {
  type: ExtrasType
  title: string
  icon: React.ReactNode
  color: string
}

const categories: ExtrasCategory[] = [
  {
    type: 'bags',
    title: 'Bags',
    icon: <ShoppingBag className="w-8 h-8" />,
    color: 'bg-rose-100 text-rose-600 hover:bg-rose-200',
  },
  {
    type: 'veils',
    title: 'Veils',
    icon: <Crown className="w-8 h-8" />,
    color: 'bg-gold-100 text-gold-600 hover:bg-gold-200',
  },
  {
    type: 'belts',
    title: 'Belts',
    icon: <Ribbon className="w-8 h-8" />,
    color: 'bg-rose-100 text-rose-600 hover:bg-rose-200',
  },
  {
    type: 'headbands',
    title: 'Headbands',
    icon: <Sparkles className="w-8 h-8" />,
    color: 'bg-gold-100 text-gold-600 hover:bg-gold-200',
  },
  {
    type: 'tiaras',
    title: 'Tiaras',
    icon: <Crown className="w-8 h-8" />,
    color: 'bg-rose-100 text-rose-600 hover:bg-rose-200',
  },
  {
    type: 'cuffs_gloves',
    title: 'Cuffs/Gloves',
    icon: <Sparkles className="w-8 h-8" />,
    color: 'bg-gold-100 text-gold-600 hover:bg-gold-200',
  },
]

export function Section4Extras({ onAddToOrder }: Section4ExtrasProps) {
  const [selectedCategory, setSelectedCategory] = useState<ExtrasType | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const {
    data: extrasProducts = [],
    isLoading,
    isError,
  } = useCatalogue({
    catalogue: 'extras',
  })

  const handleCategoryClick = (type: ExtrasType) => {
    setSelectedCategory(type)
    setIsDialogOpen(true)
  }

  const handleAddExtra = (product: Product) => {
    onAddToOrder({
      id: crypto.randomUUID(),
      description: product.name,
      price: product.price,
      productId: product.id,
      imageUrl: product.image_url || undefined,
    })
    setIsDialogOpen(false)
  }

  const selectedCategoryData = categories.find(c => c.type === selectedCategory)
  const products = selectedCategory
    ? extrasProducts.filter(product => product.extras_type === selectedCategory)
    : []

  const getCategoryCount = (type: ExtrasType) =>
    extrasProducts.filter(product => product.extras_type === type).length

  return (
    <div className="space-y-4">
      {/* 3x2 Grid */}
      <div className="grid grid-cols-3 gap-4">
        {categories.map((category) => (
          <Card
            key={category.type}
            className={`cursor-pointer transition-all ${category.color} border-0`}
            onClick={() => handleCategoryClick(category.type)}
          >
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
              <div className="mb-3">{category.icon}</div>
              <h3 className="font-semibold text-lg">{category.title}</h3>
              <p className="text-xs mt-1 opacity-75">
                {isLoading ? 'Loading...' : `${getCategoryCount(category.type)} prekės`}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Product Selection Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedCategoryData?.icon}
              {selectedCategoryData?.title}
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">
              Loading products...
            </p>
          ) : isError ? (
            <p className="text-center text-rose-600 py-8">
              Could not load extras from catalogue
            </p>
          ) : products.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No products in this category
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 mt-4">
              {products.map((product) => (
                <Card
                  key={product.id}
                  className="cursor-pointer hover:border-rose-400 transition-colors"
                >
                  <CardContent className="p-4">
                    {/* Product Image */}
                    <div className="aspect-square bg-gray-100 rounded-md mb-3 flex items-center justify-center">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-md"
                        />
                      ) : (
                        <ImageIcon className="w-10 h-10 text-gray-400" />
                      )}
                    </div>

                    {/* Product Info */}
                    <h4 className="font-medium text-sm mb-1">{product.name}</h4>
                    <p className="text-rose-600 font-semibold text-lg">
                      €{product.price.toFixed(2)}
                    </p>

                    {/* Add Button */}
                    <Button
                      className="w-full mt-3"
                      size="sm"
                      onClick={() => handleAddExtra(product)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
