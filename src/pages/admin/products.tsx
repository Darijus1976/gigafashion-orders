import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { ProductForm } from '@/components/admin/ProductForm'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ImageIcon, Plus, Pencil, Trash2 } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

type Product = Database['public']['Tables']['products']['Row']

export default function AdminProductsPage() {
  const [searchParams] = useSearchParams()
  const catalogueFilter = searchParams.get('catalogue')
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
      const productData = {
        name: formData.name,
        price: formData.price,
        catalogue: formData.catalogue,
        extras_type: formData.extras_type,
        image_url: formData.imageUrl ?? editingProduct?.image_url ?? null,
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
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id)
      
      if (error) throw error
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

  useEffect(() => {
    fetchProducts()
  }, [catalogueFilter])

  const openProduct = (product: Product) => {
    setEditingProduct(product)
    setIsFormOpen(true)
  }

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
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
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
                      Type: {product.extras_type}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
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
