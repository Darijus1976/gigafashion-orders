import { useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, ShoppingBag, Crown, Ribbon, Sparkles, ImageIcon, X, Camera, PenTool } from 'lucide-react'
import { useCatalogue } from '@/hooks/useCatalogue'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type Product = Database['public']['Tables']['products']['Row']
type AccessoryType = 'bags' | 'veils' | 'belts' | 'headbands' | 'tiaras' | 'cuffs_gloves' | 'custom'

interface AccessoryItem {
  id: string
  description: string
  price: number
  productId?: string
  imageUrl?: string
  imageUrls?: string[]
}

const parseImageUrls = (imageUrl?: string): string[] => {
  if (!imageUrl) return []
  if (imageUrl.startsWith('[')) {
    try { return JSON.parse(imageUrl) } catch { return [imageUrl] }
  }
  return [imageUrl]
}

interface OrderItem {
  id: string
  type: 'dress' | 'change_extra' | 'accessory' | 'fitting' | 'custom'
  description: string
  price: number
  productId?: string
  imageUrl?: string
  deleted?: boolean
}

interface Section4AccessoriesProps {
  onAddToOrder: (item: AccessoryItem) => void
  orderItems?: OrderItem[]
  onRemoveItem?: (id: string) => void
}

interface AccessoryCategory {
  type: AccessoryType
  title: string
  icon: React.ReactNode
  color: string
}

const categories: AccessoryCategory[] = [
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
  {
    type: 'custom',
    title: 'Custom',
    icon: <PenTool className="w-8 h-8" />,
    color: 'bg-slate-100 text-slate-600 hover:bg-slate-200',
  },
]

export function Section4Accessories({ onAddToOrder, orderItems = [], onRemoveItem }: Section4AccessoriesProps) {
  const accessoryItems = orderItems.filter(item => item.type === 'accessory' && !item.deleted)
  const [selectedCategory, setSelectedCategory] = useState<AccessoryType | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [customDescription, setCustomDescription] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [customImagePreviews, setCustomImagePreviews] = useState<string[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const customGalleryInputRef = useRef<HTMLInputElement>(null)
  const customCameraInputRef = useRef<HTMLInputElement>(null)
  const {
    data: accessoryProducts = [],
    isLoading,
    isError,
  } = useCatalogue({
    catalogue: 'accessories',
  })

  const handleCategoryClick = (type: AccessoryType) => {
    setSelectedCategory(type)
    setIsDialogOpen(true)
  }

  const handleAddAccessory = (product: Product) => {
    onAddToOrder({
      id: crypto.randomUUID(),
      description: product.name,
      price: product.price,
      productId: product.id,
      imageUrl: product.image_url || undefined,
    })
    setIsDialogOpen(false)
  }

  const resetCustomForm = () => {
    setCustomDescription('')
    setCustomPrice('')
    setCustomImagePreviews([])
  }

  const handleAddCustomAccessory = () => {
    const price = parseFloat(customPrice)
    if (!customDescription.trim() || isNaN(price)) return
    onAddToOrder({
      id: crypto.randomUUID(),
      description: customDescription.trim(),
      price,
      imageUrls: customImagePreviews.length > 0 ? customImagePreviews : undefined,
    })
    resetCustomForm()
    setIsDialogOpen(false)
  }

  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('No canvas context')); return }
        let { width, height } = img
        const maxDim = 1920
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = (height / width) * maxDim; width = maxDim }
          else { width = (width / height) * maxDim; height = maxDim }
        }
        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(blob => {
          if (blob) resolve(new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' }))
          else reject(new Error('Compression failed'))
        }, 'image/webp', 0.8)
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  const addCustomImages = async (files: FileList | null) => {
    if (!files) return
    setUploadingImages(true)
    const tempId = crypto.randomUUID()
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      try {
        const compressed = await compressImage(file)
        const filePath = 'custom-accessory/' + tempId + '/' + Date.now() + '.webp'
        const { error: uploadError } = await supabase.storage
          .from('order-photos')
          .upload(filePath, compressed, { cacheControl: '3600', upsert: false })
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('order-photos').getPublicUrl(filePath)
        setCustomImagePreviews(prev => [...prev, data.publicUrl])
      } catch (e) {
        console.error('Upload error:', e)
      }
    }
    setUploadingImages(false)
  }

  const removeCustomImage = (idx: number) => {
    setCustomImagePreviews(prev => prev.filter((_, i) => i !== idx))
  }

  const selectedCategoryData = categories.find(c => c.type === selectedCategory)
  const products = selectedCategory
    ? accessoryProducts.filter(product => product.accessory_type === selectedCategory)
    : []

  const getCategoryCount = (type: AccessoryType) =>
    accessoryProducts.filter(product => product.accessory_type === type).length

  return (
    <div className="space-y-4">
      {accessoryItems.length > 0 && (
        <div className="space-y-2">
          <Label>Added accessories:</Label>
          <div className="space-y-2">
            {accessoryItems.map((item) => {
              const imageUrls = parseImageUrls(item.imageUrl)
              return (
                <div key={item.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-3">
                      {imageUrls.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {imageUrls.map((url, idx) => (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                              <img src={url} alt={item.description} className="w-full max-h-[500px] object-contain rounded-lg border bg-white" />
                            </a>
                          ))}
                        </div>
                      )}
                      <div>
                        <p className="text-base font-semibold">{item.description}</p>
                        <p className="text-base text-rose-600 font-semibold">€{item.price.toFixed(2)}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { if (onRemoveItem) onRemoveItem(item.id) }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Category Grid */}
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
              <p className="text-sm mt-1 opacity-75">
                {category.type === 'custom'
                  ? 'Add non-catalogue item'
                  : isLoading ? 'Loading...' : `${getCategoryCount(category.type)} products`}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Product / Custom Selection Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) resetCustomForm()
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedCategoryData?.icon}
              {selectedCategoryData?.title}
            </DialogTitle>
          </DialogHeader>

          {selectedCategory === 'custom' ? (
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="customAccessoryDescription" className="text-base font-semibold">
                  Item name <span className="text-rose-600">*</span>
                </Label>
                <Textarea
                  id="customAccessoryDescription"
                  placeholder="Describe the item..."
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customAccessoryPrice" className="text-base font-semibold">
                  Price (€) <span className="text-rose-600">*</span>
                </Label>
                <Input
                  id="customAccessoryPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">Photos</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  {customImagePreviews.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {customImagePreviews.map((preview, idx) => (
                        <div key={idx} className="relative">
                          <a href={preview} target="_blank" rel="noopener noreferrer">
                            <img src={preview} alt={`Preview ${idx + 1}`} className="w-full max-h-[500px] object-contain rounded-lg border bg-white" />
                          </a>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-1 right-1 bg-white/80 hover:bg-white"
                            onClick={() => removeCustomImage(idx)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingImages}
                      onClick={() => customGalleryInputRef.current?.click()}
                    >
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Gallery
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingImages}
                      onClick={() => customCameraInputRef.current?.click()}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Camera
                    </Button>
                  </div>
                  <p className="text-sm text-center text-muted-foreground mt-2">
                    {uploadingImages ? 'Uploading...' : 'Choose from gallery or take a photo'}
                  </p>
                  <input
                    ref={customGalleryInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => { addCustomImages(e.target.files); e.target.value = '' }}
                  />
                  <input
                    ref={customCameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => { addCustomImages(e.target.files); e.target.value = '' }}
                  />
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleAddCustomAccessory}
                disabled={!customDescription.trim() || !customPrice.trim() || isNaN(parseFloat(customPrice)) || uploadingImages}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add to order
              </Button>
            </div>
          ) : isLoading ? (
            <p className="text-center text-muted-foreground py-8">
              Loading products...
            </p>
          ) : isError ? (
            <p className="text-center text-rose-600 py-8">
              Could not load accessories from catalogue
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
                    <h4 className="font-semibold text-base mb-1">{product.name}</h4>
                    <p className="text-rose-600 font-semibold text-lg">
                      €{product.price.toFixed(2)}
                    </p>

                    {/* Add Button */}
                    <Button
                      className="w-full mt-3"
                      size="sm"
                      onClick={() => handleAddAccessory(product)}
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
