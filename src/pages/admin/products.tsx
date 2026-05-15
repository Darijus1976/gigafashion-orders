import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { ProductForm } from '@/components/admin/ProductForm'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ChevronLeft, Folder, ImageIcon, Plus, Pencil, Trash2 } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

type Product = Database['public']['Tables']['products']['Row']
const PRODUCT_IMAGES_BUCKET = 'product-images'

function getStoragePathFromPublicUrl(url: string | null) {
  if (!url) return null

  const marker = `/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`
  const markerIndex = url.indexOf(marker)

  if (markerIndex === -1) return null

  return decodeURIComponent(url.slice(markerIndex + marker.length))
}

export default function AdminProductsPage() {
  const [searchParams] = useSearchParams()
  const catalogueFilter = searchParams.get('catalogue')
  const extrasTypeFilter = searchParams.get('extrasType')
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const fetchProducts = async () => {
    try {
      setIsLoading(true)
      let query = supabase
        .from('products')
        .select('*')
        .order('display_order', { ascending: true })

      if (catalogueFilter) {
        query = query.eq('catalogue', catalogueFilter)
      }

      const { data, error } = await query

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (formData: any) => {
    try {
      let imageUrl = editingProduct?.image_url ?? null

      if (formData.clearImage) {
        imageUrl = null
      }

      if (formData.imageFile) {
        const extension = formData.imageFile.name.split('.').pop()?.toLowerCase() || 'jpg'
        const safeName = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        const filePath = `${formData.catalogue}/${Date.now()}-${safeName || 'product'}.${extension}`

        const { error: uploadError } = await supabase.storage
          .from(PRODUCT_IMAGES_BUCKET)
          .upload(filePath, formData.imageFile, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) throw uploadError

        const { data } = supabase.storage
          .from(PRODUCT_IMAGES_BUCKET)
          .getPublicUrl(filePath)

        imageUrl = data.publicUrl
      }

      const productData = {
        name: formData.name,
        price: formData.price,
        description: formData.description || null,
        catalogue: formData.catalogue,
        extras_type: formData.extras_type,
        image_url: imageUrl,
        is_active: formData.is_active,
        display_order: formData.display_order,
        occasion_tags: formData.occasion_tags || [],
      }

      if (editingProduct) {
        const { error } = await (supabase as any)
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id)
        
        if (error) throw error
      } else {
        const { error } = await (supabase as any)
          .from('products')
          .insert(productData)
        
        if (error) throw error
      }

      if ((formData.clearImage || formData.imageFile) && editingProduct?.image_url) {
        const oldPath = getStoragePathFromPublicUrl(editingProduct.image_url)

        if (oldPath) {
          await supabase.storage
            .from(PRODUCT_IMAGES_BUCKET)
            .remove([oldPath])
        }
      }

      setIsFormOpen(false)
      setEditingProduct(null)
      fetchProducts()
    } catch (error) {
      console.error('Error saving product:', error)
      const message = error instanceof Error ? error.message : JSON.stringify(error)
      alert(`Error saving product: ${message}`)
    }
  }

  const handleDelete = async (product: Product) => {
    if (!confirm(`Delete "${product.name}"?`)) return

    try {
      const imagePath = getStoragePathFromPublicUrl(product.image_url)

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id)
      
      if (error) throw error

      if (imagePath) {
        await supabase.storage
          .from(PRODUCT_IMAGES_BUCKET)
          .remove([imagePath])
      }

      fetchProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Error deleting product')
    }
  }

  const catalogueLabels: Record<string, string> = {
    wedding: 'Wedding',
    debs: 'Debs',
    christening: 'Christening',
    communion: 'Communion',
    confirmation: 'Confirmation',
    extras: 'Extras',
  }

  const extrasTypeLabels: Record<string, string> = {
    bags: 'Bags',
    veils: 'Veils',
    belts: 'Belts',
    headbands: 'Headbands',
    tiaras: 'Tiaras',
    cuffs_gloves: 'Cuffs/Gloves',
    uncategorized: 'Uncategorized',
  }

  const extrasTypeOrder = ['bags', 'veils', 'belts', 'headbands', 'tiaras', 'cuffs_gloves', 'uncategorized']

  const extrasGroups = products.reduce((acc, product) => {
    const type = product.extras_type || 'uncategorized'
    if (!acc[type]) acc[type] = []
    acc[type].push(product)
    return acc
  }, {} as Record<string, Product[]>)

  useEffect(() => {
    fetchProducts()
  }, [catalogueFilter])

  const openProduct = (product: Product) => {
    setEditingProduct(product)
    setIsFormOpen(true)
  }

  const selectedExtrasProducts = extrasTypeFilter
    ? extrasGroups[extrasTypeFilter] || []
    : []

  const renderProductCard = (product: Product) => (
    <Card
      key={product.id}
      className="overflow-hidden cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => openProduct(product)}
    >
      <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageIcon className="h-12 w-12 text-gray-400" />
        )}
      </div>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{product.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {catalogueLabels[product.catalogue] || product.catalogue}
            </p>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(event) => {
                event.stopPropagation()
                openProduct(product)
              }}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(event) => {
                event.stopPropagation()
                handleDelete(product)
              }}
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-rose-600">
          €{product.price.toFixed(2)}
        </p>
        {product.extras_type && (
          <p className="text-sm text-muted-foreground mt-1">
            Type: {extrasTypeLabels[product.extras_type] || product.extras_type}
          </p>
        )}
      </CardContent>
    </Card>
  )

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            {catalogueFilter ? `${catalogueLabels[catalogueFilter] || catalogueFilter} Products` : 'Products'}
          </h1>
          <Button
            onClick={() => {
              setEditingProduct(null)
              setIsFormOpen(true)
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-200 border-t-rose-600" />
          </div>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No products yet. Add your first product!</p>
            </CardContent>
          </Card>
        ) : catalogueFilter === 'extras' ? (
          extrasTypeFilter ? (
            <div className="space-y-6">
              <Button
                variant="outline"
                onClick={() => {
                  window.history.pushState(null, '', '/admin/products?catalogue=extras')
                  window.dispatchEvent(new PopStateEvent('popstate'))
                }}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Extras folders
              </Button>

              <div className="flex items-center justify-between border-b border-rose-200 pb-2">
                <h2 className="text-xl font-bold text-rose-700">
                  {extrasTypeLabels[extrasTypeFilter] || extrasTypeFilter}
                </h2>
                <span className="text-sm text-muted-foreground">
                  {selectedExtrasProducts.length} products
                </span>
              </div>

              {selectedExtrasProducts.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No products in this extras folder yet.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {selectedExtrasProducts.map(renderProductCard)}
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {extrasTypeOrder.map((type) => {
                const count = extrasGroups[type]?.length || 0

                return (
                  <Card
                    key={type}
                    className="cursor-pointer transition-shadow hover:shadow-md"
                    onClick={() => {
                      window.history.pushState(null, '', `/admin/products?catalogue=extras&extrasType=${type}`)
                      window.dispatchEvent(new PopStateEvent('popstate'))
                    }}
                  >
                    <CardContent className="flex items-center gap-4 p-6">
                      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
                        <Folder className="h-8 w-8" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold">
                          {extrasTypeLabels[type] || type}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {count} products
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products.map(renderProductCard)}
          </div>
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edit Product' : 'Add Product'}
            </DialogTitle>
          </DialogHeader>
          <ProductForm
            product={editingProduct}
            initialCatalogue={catalogueFilter as Product['catalogue'] | null}
            onSave={handleSave}
            onCancel={() => setIsFormOpen(false)}
            onDelete={editingProduct ? () => handleDelete(editingProduct) : undefined}
          />
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
