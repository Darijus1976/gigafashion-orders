import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Pencil, Trash2, X, Upload, ImageIcon } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

type Product = Database['public']['Tables']['products']['Row']

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    catalogue: 'wedding',
    extras_type: '',
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setIsLoading(false)
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Products</h1>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>

        {showForm && (
          <Card className="mb-6 border-rose-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Add New Product</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Pearl Wedding Dress"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price (€) *</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Catalogue *</Label>
                  <select 
                    className="w-full border rounded-md p-2"
                    value={formData.catalogue}
                    onChange={(e) => setFormData({...formData, catalogue: e.target.value})}
                  >
                    <option value="wedding">Wedding</option>
                    <option value="debs">Debs</option>
                    <option value="christening">Christening</option>
                    <option value="communion">Communion</option>
                    <option value="confirmation">Confirmation</option>
                    <option value="extras">Extras</option>
                  </select>
                </div>
                {formData.catalogue === 'extras' && (
                  <div className="space-y-2">
                    <Label>Extras Type</Label>
                    <select 
                      className="w-full border rounded-md p-2"
                      value={formData.extras_type}
                      onChange={(e) => setFormData({...formData, extras_type: e.target.value})}
                    >
                      <option value="">Select type</option>
                      <option value="bags">Bags</option>
                      <option value="veils">Veils</option>
                      <option value="belts">Belts</option>
                      <option value="headbands">Headbands</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Product Image</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {imagePreview ? (
                    <div className="space-y-2">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="max-h-40 mx-auto rounded-lg"
                      />
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setImageFile(null)
                          setImagePreview(null)
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
                            setImageFile(file)
                            const reader = new FileReader()
                            reader.onloadend = () => {
                              setImagePreview(reader.result as string)
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
                onClick={async () => {
                  try {
                    const { error } = await (supabase as any).from('products').insert({
                      name: formData.name,
                      price: parseFloat(formData.price),
                      catalogue: formData.catalogue,
                      extras_type: formData.extras_type || null,
                      image_url: null, // Temporarily disabled
                      is_active: true,
                      display_order: 0,
                    })
                    if (error) throw error
                    setShowForm(false)
                    setFormData({ name: '', price: '', catalogue: 'wedding', extras_type: '' })
                    setImageFile(null)
                    setImagePreview(null)
                    fetchProducts()
                  } catch (err) {
                    console.error(err)
                    alert(`Error: ${JSON.stringify(err)}`)
                  }
                }}
                disabled={!formData.name || !formData.price}
              >
                <Upload className="w-4 h-4 mr-2" />
                Save Product
              </Button>
            </CardContent>
          </Card>
        )}

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
              <Card key={product.id}>
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
                        onClick={() => alert('Edit coming soon!')}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(product)}
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
    </AdminLayout>
  )
}
