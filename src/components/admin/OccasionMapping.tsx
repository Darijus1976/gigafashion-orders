import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, Save, X, Tag } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { Database } from '@/lib/supabase/types'

type Product = Database['public']['Tables']['products']['Row']

interface OccasionMappingProps {
  products: Product[]
  onSave: (productId: string, occasions: string[]) => Promise<void>
  isLoading?: boolean
}

const ALL_OCCASIONS = [
  { value: 'wedding', label: 'Vestuvės', color: 'bg-pink-100 text-pink-700' },
  { value: 'debs', label: 'Šimtadienis', color: 'bg-purple-100 text-purple-700' },
  { value: 'christening', label: 'Krikštynos', color: 'bg-blue-100 text-blue-700' },
  { value: 'communion', label: 'Komunija', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'confirmation', label: 'Sutvirtinimas', color: 'bg-green-100 text-green-700' },
  { value: 'formal', label: 'Formalios', color: 'bg-gray-100 text-gray-700' },
  { value: 'party', label: 'Vakarėlis', color: 'bg-orange-100 text-orange-700' },
] as const

export function OccasionMapping({
  products,
  onSave,
  isLoading = false,
}: OccasionMappingProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // Filter products by search
  const filteredProducts = products.filter((product) => {
    if (!searchQuery) return true
    return (
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.catalogue.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  const handleSelectProduct = useCallback((product: Product) => {
    setSelectedProduct(product)
    setSelectedOccasions(product.occasion_tags || [])
  }, [])

  const toggleOccasion = useCallback((occasion: string) => {
    setSelectedOccasions((prev) =>
      prev.includes(occasion)
        ? prev.filter((o) => o !== occasion)
        : [...prev, occasion]
    )
  }, [])

  const handleSave = useCallback(async () => {
    if (!selectedProduct) return

    setSaving(true)
    try {
      await onSave(selectedProduct.id, selectedOccasions)
      // Update the local product state
      selectedProduct.occasion_tags = selectedOccasions
    } finally {
      setSaving(false)
    }
  }, [selectedProduct, selectedOccasions, onSave])

  const clearSelection = useCallback(() => {
    setSelectedProduct(null)
    setSelectedOccasions([])
  }, [])

  const selectAll = useCallback(() => {
    setSelectedOccasions(ALL_OCCASIONS.map((o) => o.value))
  }, [])

  const clearAll = useCallback(() => {
    setSelectedOccasions([])
  }, [])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Product List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Produkto pasirinkimas
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Ieškoti produktų..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Produktų nerasta
              </p>
            ) : (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleSelectProduct(product)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedProduct?.id === product.id
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded-md"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center">
                        <Tag className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.catalogue} • €{product.price.toFixed(2)}
                      </p>
                      {product.occasion_tags && product.occasion_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {product.occasion_tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs capitalize">
                              {tag}
                            </Badge>
                          ))}
                          {product.occasion_tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{product.occasion_tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Occasion Selection */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedProduct ? (
              <span>Progos: {selectedProduct.name}</span>
            ) : (
              'Pasirinkite produktą'
            )}
          </CardTitle>
          {selectedProduct && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectAll}
              >
                Pažymėti visas
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearAll}
              >
                Nuimti visas
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {selectedProduct ? (
            <div className="space-y-6">
              {/* Occasion Checkboxes */}
              <div className="grid grid-cols-1 gap-3">
                {ALL_OCCASIONS.map((occasion) => (
                  <label
                    key={occasion.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedOccasions.includes(occasion.value)
                        ? 'border-rose-500 bg-rose-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Checkbox
                      checked={selectedOccasions.includes(occasion.value)}
                      onCheckedChange={() => toggleOccasion(occasion.value)}
                    />
                    <Badge className={`${occasion.color} border-0`}>
                      {occasion.label}
                    </Badge>
                  </label>
                ))}
              </div>

              {/* Summary */}
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">
                  Pasirinktos progos ({selectedOccasions.length} iš {ALL_OCCASIONS.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedOccasions.length === 0 ? (
                    <span className="text-sm text-gray-400">Nepasirinkta jokių progų</span>
                  ) : (
                    selectedOccasions.map((occasionValue) => {
                      const occasion = ALL_OCCASIONS.find((o) => o.value === occasionValue)
                      return occasion ? (
                        <Badge
                          key={occasion.value}
                          className={`${occasion.color} border-0`}
                        >
                          {occasion.label}
                          <button
                            onClick={() => toggleOccasion(occasion.value)}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ) : null
                    })
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearSelection}
                  className="flex-1"
                >
                  Atšaukti
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || isLoading}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saugoma...' : 'Išsaugoti'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Pasirinkite produktą iš sąrašo kairėje</p>
              <p className="text-sm mt-2">
                Tada galėsite priskirti progas
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
