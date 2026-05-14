import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Pencil, Trash2, X, Upload, ImageIcon } from 'lucide-react'

interface Product {
  id: string
  name: string
  price: number
  catalogue: string
  extras_type: string | null
  image_url: string | null
  is_active: boolean
  display_order: number
}

const STORAGE_KEY = 'giga_fashion_products'

export default function AdminProductsPage() {
  const [searchParams] = useSearchParams()
  const catalogueFilter = searchParams.get('catalogue')
  
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    catalogue: catalogueFilter || 'wedding',
    extras_type: '',
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  // Filter products by catalogue
  const filteredProducts = catalogueFilter
    ? products.filter(p => p.catalogue === catalogueFilter)
    : products

  // Group extras products by subcategory
  const extrasGroups = catalogueFilter === 'extras'
    ? filteredProducts.reduce((acc, product) => {
        const type = product.extras_type || 'uncategorized'
        if (!acc[type]) acc[type] = []
        acc[type].push(product)
        return acc
      }, {} as Record<string, Product[]>)
    : null

  const fetchProducts = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const parsed = stored ? JSON.parse(stored) : []
      setProducts(parsed)
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = (id: string) => {
    if (!confirm('Delete this product?')) return
    const updated = products.filter(p => p.id !== id)
    setProducts(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const handleSave = () => {
    if (!formData.name || !formData.price) return

    const newProduct: Product = {
      id: Date.now().toString(),
      name: formData.name,
      price: parseFloat(formData.price),
      catalogue: formData.catalogue,
      extras_type: formData.extras_type || null,
      image_url: imagePreview || null,
      is_active: true,
      display_order: 0,
    }

    const updated = [...products, newProduct]
    setProducts(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    
    setShowForm(false)
    setFormData({ name: '', price: '', catalogue: 'wedding', extras_type: '' })
    setImageFile(null)
    setImagePreview(null)
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
                      <option value="tiaras">Tiaras</option>
                      <option value="cuffs_gloves">Cuffs/Gloves</option>
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
                onClick={handleSave}
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
        ) : filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No products yet. Add your first product!</p>
            </CardContent>
          </Card>
        ) : catalogueFilter === 'extras' && extrasGroups ? (
          <div className="space-y-8">
            {Object.entries(extrasGroups).map(([type, products]) => (
              <div key={type} className="space-y-4">
                <h2 className="text-xl font-bold text-rose-600 border-b border-rose-200 pb-2">
                  {extrasTypeLabels[type] || type}
                </h2>
                {products.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No products in this category</p>
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(product.id)}
                            >
                              <Trash2 className="w-4 h-4 text-rose-600" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {product.image_url && (
                            <img 
                              src={product.image_url} 
                              alt={product.name}
                              className="w-full aspect-[3/4] object-cover rounded-lg mb-2"
                            />
                          )}
                          <p className="text-2xl font-bold text-rose-600">
                            €{product.price.toFixed(2)}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <Card key={product.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {catalogueLabels[product.catalogue] || product.catalogue}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(product.id)}
                    >
                      <Trash2 className="w-4 h-4 text-rose-600" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {product.image_url && (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-full aspect-[3/4] object-cover rounded-lg mb-2"
                    />
                  )}
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
