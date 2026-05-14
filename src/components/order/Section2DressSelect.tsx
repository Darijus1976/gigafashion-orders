import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ShoppingBag, PenTool, Plus, ImageIcon, X } from 'lucide-react'
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

const STORAGE_KEY = 'giga_fashion_products'

const occasionLabels: Record<Occasion, string> = {
  christening: 'Krikštynos',
  communion: 'Komunija',
  confirmation: 'Sutvirtinimas',
  debs: 'Debs',
  wedding: 'Vestuvės',
  wedding_alteration: 'Vestuvių taisymas',
  other: 'Kita',
}

export function Section2DressSelect({ occasion, onAddToOrder, orderItems = [], onRemoveItem }: Section2DressSelectProps) {
  const [selectedMode, setSelectedMode] = useState<DressSelectionMode | null>(null)
  const [customDescription, setCustomDescription] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [customImageFile, setCustomImageFile] = useState<File | null>(null)
  const [customImagePreview, setCustomImagePreview] = useState<string | null>(null)

  // Filter dress items from orderItems (both catalogue and custom)
  const dressItems = orderItems.filter(item => item.type === 'dress' || item.type === 'custom')

  // Load products from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: Product[] = JSON.parse(stored)
        setProducts(parsed)
      }
    } catch (error) {
      console.error('Error loading products from localStorage:', error)
    }
  }, [])

  // Filter products by occasion
  const filteredProducts = occasion
    ? products.filter(p => {
        // Direct catalogue match
        if (p.catalogue === occasion) return true
        // Occasion tags match
        if (p.occasion_tags?.includes(occasion)) return true
        // Special case: wedding_alteration should show wedding products
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
        imageUrl: customImagePreview || undefined,
      }
      onAddToOrder(item)
      setCustomDescription('')
      setCustomPrice('')
      setCustomImageFile(null)
      setCustomImagePreview(null)
    }
  }

  const hasSelectedMode = selectedMode !== null

  return (
    <div className="space-y-4">
      {/* Added dresses list - always visible */}
      {dressItems.length > 0 && (
        <div className="space-y-2">
          <Label>Pridėtos suknelės:</Label>
          <div className="space-y-2">
            {dressItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  {item.imageUrl && (
                    <img 
                      src={item.imageUrl} 
                      alt={item.description}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div>
                    <p className="text-sm font-medium">{item.description}</p>
                    <p className="text-sm text-rose-600">€{item.price.toFixed(2)}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (onRemoveItem) {
                      onRemoveItem(item.id)
                    }
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mode Selection Cards */}
      {!hasSelectedMode && (
        <div className="grid grid-cols-2 gap-4">
          <Card 
            className="cursor-pointer hover:border-rose-400 transition-colors"
            onClick={() => setSelectedMode('catalogue')}
          >
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

          <Card 
            className="cursor-pointer hover:border-gold-400 transition-colors"
            onClick={() => setSelectedMode('custom')}
          >
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

      {/* Change Mode Button */}
      {hasSelectedMode && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedMode(null)
            setSelectedProduct(null)
            setCustomDescription('')
            setCustomPrice('')
          }}
        >
          ← Keisti pasirinkimą
        </Button>
      )}

      {/* Mode A: Catalogue Selection */}
      {selectedMode === 'catalogue' && (
        <div className="space-y-4">
          <h3 className="font-medium">
            {occasion ? `${occasionLabels[occasion]} katalogas` : 'Visi katalogai'}
          </h3>
          
          {filteredProducts.length === 0 ? (
            <p className="text-muted-foreground">Šioje kategorijoje nėra suknelių</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filteredProducts.map((product) => (
                <Card 
                  key={product.id}
                  className={`cursor-pointer transition-all ${
                    selectedProduct?.id === product.id 
                      ? 'border-rose-600 ring-2 ring-rose-200' 
                      : 'hover:border-rose-300'
                  }`}
                  onClick={() => handleCatalogueSelect(product)}
                >
                  <CardContent className="p-4">
                    <div className="aspect-square bg-gray-100 rounded-md mb-3 flex items-center justify-center">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-full h-full object-cover rounded-md"
                        />
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

      {/* Mode B: Custom Dress */}
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

          {/* Image upload */}
          <div className="space-y-2">
            <Label>Referencinės nuotraukos</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              {customImagePreview ? (
                <div className="space-y-2">
                  <img 
                    src={customImagePreview} 
                    alt="Preview" 
                    className="max-h-40 mx-auto rounded-lg"
                  />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setCustomImageFile(null)
                      setCustomImagePreview(null)
                    }}
                  >
                    <X className="w-4 h-4 mr-1" /> Remove
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <ImageIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">Click to upload image</p>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setCustomImageFile(file)
                        const reader = new FileReader()
                        reader.onloadend = () => {
                          setCustomImagePreview(reader.result as string)
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                  />
                </label>
              )}
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
