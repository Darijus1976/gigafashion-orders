import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ShoppingBag, PenTool, Plus, ImageIcon, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type Product = Database['public']['Tables']['products']['Row']
type Occasion = Database['public']['Tables']['orders']['Row']['occasion']

type DressSelectionMode = 'catalogue' | 'custom'

interface DressSelectionItem {
  id: string
  type: 'catalogue' | 'custom'
  description: string
  price: number
  productId?: string
  imageUrl?: string
  imageUrls?: string[]
}

interface OrderItem {
  id: string
  type: 'dress' | 'alteration' | 'extra' | 'fitting' | 'custom'
  description: string
  price: number
  productId?: string
  imageUrl?: string
  deleted?: boolean
  deletedAt?: string
  deletedBy?: string
}

interface Section2DressSelectProps {
  occasion?: Occasion
  onAddToOrder: (item: DressSelectionItem) => void
  orderItems?: OrderItem[]
  onRemoveItem?: (id: string) => void
}

const occasionLabels: Record<Occasion, string> = {
  christening: 'Krikstynos',
  communion: 'Komunija',
  confirmation: 'Sutvirtinimas',
  debs: 'Debs',
  wedding: 'Vestuves',
  wedding_alteration: 'Vestuviu taisymas',
  other: 'Kita',
}

export function Section2DressSelect({ occasion, onAddToOrder, orderItems = [], onRemoveItem }: Section2DressSelectProps) {
  const [selectedMode, setSelectedMode] = useState<DressSelectionMode | null>(null)
  const [customDescription, setCustomDescription] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [customImageFiles, setCustomImageFiles] = useState<File[]>([])
  const [customImagePreviews, setCustomImagePreviews] = useState<string[]>([])

  const dressItems = orderItems.filter(item => item.type === 'dress' || item.type === 'custom')

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoadingProducts(true)
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .neq('catalogue', 'extras')
          .order('display_order', { ascending: true })
          .order('name', { ascending: true })

        if (error) throw error
        setProducts(data || [])
      } catch (error) {
        console.error('Error loading products:', error)
        setProducts([])
      } finally {
        setIsLoadingProducts(false)
      }
    }

    loadProducts()
  }, [])

  const filteredProducts = occasion
    ? products.filter(p => {
        if (p.catalogue === occasion) return true
        if (p.occasion_tags?.includes(occasion)) return true
        if (occasion === 'wedding_alteration' && p.catalogue === 'wedding') return true
        return false
      })
    : products

  const handleCatalogueSelect = (product: Product) => {
    setSelectedProduct(product)
  }

  const handleAddCatalogueDress = () => {
    if (selectedProduct) {
      onAddToOrder({
        id: crypto.randomUUID(),
        type: 'catalogue',
        description: selectedProduct.name,
        price: selectedProduct.price,
        productId: selectedProduct.id,
        imageUrl: selectedProduct.image_url || undefined,
      })
      setSelectedProduct(null)
    }
  }

  const handleAddCustomDress = () => {
    const price = parseFloat(customPrice)
    if (customDescription.trim() && !isNaN(price)) {
      const item: DressSelectionItem = {
        id: crypto.randomUUID(),
        type: 'custom',
        description: customDescription,
        price: price,
        imageUrls: customImagePreviews.length > 0 ? customImagePreviews : undefined,
      }
      onAddToOrder(item)
      setCustomDescription('')
      setCustomPrice('')
      setCustomImageFiles([])
      setCustomImagePreviews([])
    }
  }

  const addImages = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return
      setCustomImageFiles(prev => [...prev, file])
      const reader = new FileReader()
      reader.onloadend = () => {
        setCustomImagePreviews(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (idx: number) => {
    setCustomImageFiles(prev => prev.filter((_, i) => i !== idx))
    setCustomImagePreviews(prev => prev.filter((_, i) => i !== idx))
  }

  const hasSelectedMode = selectedMode !== null

  return (
    <div className="space-y-4">
      {dressItems.length > 0 && (
        <div className="space-y-2">
          <Label>Pridetos sukneles:</Label>
          <div className="space-y-2">
            {dressItems.map((item) => (
              <div key={item.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-3">
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.description} className="w-full max-h-96 object-contain rounded-lg bg-white" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{item.description}</p>
                    <p className="text-sm text-rose-600">€{item.price.toFixed(2)}</p>
                  </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { if (onRemoveItem) onRemoveItem(item.id)}}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasSelectedMode && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="cursor-pointer hover:border-rose-400 transition-colors" onClick={() => setSelectedMode('catalogue')}>
            <CardHeader className="text-center">
              <ShoppingBag className="w-12 h-12 mx-auto text-rose-600 mb-2" />
              <CardTitle className="text-lg">Our Catalogue Dress</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                Select from existing dresses in catalogue
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-gold-400 transition-colors" onClick={() => setSelectedMode('custom')}>
            <CardHeader className="text-center">
              <PenTool className="w-12 h-12 mx-auto text-gold-500 mb-2" />
              <CardTitle className="text-lg">Custom Dress</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                Create custom order
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {hasSelectedMode && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedMode(null)
            setSelectedProduct(null)
            setCustomDescription('')
            setCustomPrice('')
            setCustomImageFiles([])
            setCustomImagePreviews([])
          }}
        >
          ← Change selection
        </Button>
      )}

      {selectedMode === 'catalogue' && (
        <div className="space-y-4">
          <h3 className="font-medium">
            {occasion ? `${occasionLabels[occasion]} katalogas` : 'Visi katalogai'}
          </h3>
          
          {isLoadingProducts ? (
            <p className="text-muted-foreground">Kraunamos sukneles...</p>
          ) : filteredProducts.length === 0 ? (
            <p className="text-muted-foreground">Šioje kategorijoje nėra sukneliu</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filteredProducts.map((product) => (
                <Card 
                  key={product.id}
                  className={`cursor-pointer transition-all ${selectedProduct?.id === product.id ? 'border-rose-600 ring-2 ring-rose-200' : 'hover:border-rose-300'}`}
                  onClick={() => handleCatalogueSelect(product)}
                >
                  <CardContent className="p-4">
                    <div className="aspect-square bg-gray-100 rounded-md mb-3 flex items-center justify-center">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover rounded-md" />
                      ) : (
                        <ImageIcon className="w-12 h-12 text-gray-400" />
                      )}
                    </div>
                    <h4 className="font-medium text-sm">{product.name}</h4>
                    <p className="text-rose-600 font-semibold">€{product.price.toFixed(2)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {selectedProduct && (
            <Button 
              className="w-full"
              onClick={handleAddCatalogueDress}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add to order: {selectedProduct.name} (€{selectedProduct.price.toFixed(2)})
            </Button>
          )}
        </div>
      )}

      {selectedMode === 'custom' && (
        <div className="space-y-4">
          <h3 className="font-medium">Custom Dress</h3>
          
          <div className="space-y-2">
            <Label htmlFor="customDescription">
              Description <span className="text-rose-600">*</span>
            </Label>
            <Textarea
              id="customDescription"
              placeholder="Describe the desired dress..."
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customPrice">
              Price (€) <span className="text-rose-600">*</span>
            </Label>
            <Input
              id="customPrice"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Referencines nuotraukos</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              {customImagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {customImagePreviews.map((preview, idx) => (
                    <div key={idx} className="relative">
                      <img src={preview} alt={`Preview ${idx + 1}`} className="w-full aspect-square object-cover rounded-lg" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-1 right-1 bg-white/80 hover:bg-white"
                        onClick={() => removeImage(idx)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <label className="cursor-pointer block text-center">
                <ImageIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-muted-foreground mb-2">Click to upload images</p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => addImages(e.target.files)}
                />
              </label>
            </div>
          </div>

          <Button 
            className="w-full"
            onClick={handleAddCustomDress}
            disabled={!customDescription.trim() || !customPrice}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add custom dress to order
          </Button>
        </div>
      )}
    </div>
  )
}
