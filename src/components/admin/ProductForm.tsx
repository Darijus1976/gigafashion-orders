import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ImageIcon, X, Upload, Eye, Save, Trash2 } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

type Product = Database['public']['Tables']['products']['Row']
type Catalogue = Product['catalogue']

const CATALOGUES: { value: Catalogue; label: string }[] = [
  { value: 'wedding', label: 'Vestuvių suknelės' },
  { value: 'debs', label: 'Šimtadienių suknelės' },
  { value: 'christening', label: 'Krikštynų suknelės' },
  { value: 'communion', label: 'Komunijos suknelės' },
  { value: 'confirmation', label: 'Sutvirtinimo suknelės' },
  { value: 'extras', label: 'Priedai' },
]

const EXTRAS_TYPES = [
  { value: 'bags', label: 'Krepšiai' },
  { value: 'veils', label: 'Vėlės' },
  { value: 'belts', label: 'Diržai' },
  { value: 'headbands', label: 'Galvos juostos' },
  { value: 'tiaras', label: 'Tiara' },
  { value: 'cuffs_gloves', label: 'Cuffs/Gloves' },
]

const OCCASIONS = [
  'wedding',
  'debs',
  'christening',
  'communion',
  'confirmation',
  'formal',
  'party',
] as const

const productSchema = z.object({
  name: z.string().min(1, 'Pavadinimas privalomas'),
  price: z.number().min(0, 'Kaina negali būti neigiama'),
  description: z.string().optional(),
  catalogue: z.enum(['wedding', 'debs', 'christening', 'communion', 'confirmation', 'extras']),
  extras_type: z.enum(['bags', 'veils', 'belts', 'headbands', 'tiaras', 'cuffs_gloves']).nullable().optional(),
  occasion_tags: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
  display_order: z.number().default(0),
})

type ProductFormData = z.infer<typeof productSchema>

interface ProductFormProps {
  product?: Product | null
  onSave: (data: ProductFormData & { imageFile?: File }) => void
  onDelete?: () => void
  onCancel: () => void
  isLoading?: boolean
}

export function ProductForm({
  product,
  onSave,
  onDelete,
  onCancel,
  isLoading = false,
}: ProductFormProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(product?.image_url || null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || '',
      price: product?.price || 0,
      description: product?.description || '',
      catalogue: product?.catalogue || 'wedding',
      extras_type: product?.extras_type || null,
      occasion_tags: product?.occasion_tags || [],
      is_active: product?.is_active ?? true,
      display_order: product?.display_order || 0,
    },
  })

  const selectedCatalogue = watch('catalogue')
  const occasionTags = watch('occasion_tags')
  const isExtras = selectedCatalogue === 'extras'

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const clearImage = useCallback(() => {
    setImageFile(null)
    setImagePreview(null)
  }, [])

  const toggleOccasion = useCallback((occasion: string) => {
    const current = occasionTags || []
    if (current.includes(occasion)) {
      setValue('occasion_tags', current.filter((o) => o !== occasion))
    } else {
      setValue('occasion_tags', [...current, occasion])
    }
  }, [occasionTags, setValue])

  const onSubmit = useCallback((data: ProductFormData) => {
    onSave({
      ...data,
      imageFile: imageFile || undefined,
    })
  }, [imageFile, onSave])

  const formValues = watch()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{product ? 'Redaguoti produktą' : 'Naujas produktas'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Nuotrauka</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-h-48 mx-auto rounded-md"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={clearImage}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <div className="flex flex-col items-center text-muted-foreground">
                      <ImageIcon className="w-12 h-12 mb-2" />
                      <span className="text-sm">Paspauskite arba tempkite nuotrauką čia</span>
                      <span className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP (max 5MB)</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Pavadinimas *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Produkto pavadinimas"
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* Price */}
            <div className="space-y-2">
              <Label htmlFor="price">Kaina (€) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                {...register('price', { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.price && (
                <p className="text-sm text-red-500">{errors.price.message}</p>
              )}
            </div>

            {/* Catalogue */}
            <div className="space-y-2">
              <Label htmlFor="catalogue">Katalogas *</Label>
              <select
                id="catalogue"
                {...register('catalogue')}
                className="w-full border rounded-md px-3 py-2"
              >
                {CATALOGUES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Extras Type (only for extras catalogue) */}
            {isExtras && (
              <div className="space-y-2">
                <Label htmlFor="extras_type">Priedo tipas</Label>
                <select
                  id="extras_type"
                  {...register('extras_type')}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="">Pasirinkite tipą</option>
                  {EXTRAS_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Occasion Tags */}
            <div className="space-y-2">
              <Label>Pritaikymo progos</Label>
              <div className="flex flex-wrap gap-2">
                {OCCASIONS.map((occasion) => (
                  <Badge
                    key={occasion}
                    variant={occasionTags?.includes(occasion) ? 'default' : 'outline'}
                    className="cursor-pointer capitalize"
                    onClick={() => toggleOccasion(occasion)}
                  >
                    {occasion}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Aprašymas</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Produkto aprašymas..."
                rows={3}
              />
            </div>

            {/* Display Order */}
            <div className="space-y-2">
              <Label htmlFor="display_order">Rodymo eilės numeris</Label>
              <Input
                id="display_order"
                type="number"
                {...register('display_order', { valueAsNumber: true })}
              />
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-2">
              <Switch id="is_active" {...register('is_active')} />
              <Label htmlFor="is_active">Aktyvus</Label>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="w-4 h-4 mr-2" />
                {showPreview ? 'Slėpti peržiūrą' : 'Peržiūra'}
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                {isLoading ? 'Saugoma...' : product ? 'Išsaugoti' : 'Sukurti'}
              </Button>
              {product && onDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={onDelete}
                  disabled={isLoading}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={onCancel}>
                Atšaukti
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Live Preview */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Peržiūra</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt={formValues.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-12 h-12 text-gray-400" />
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg">{formValues.name || 'Produkto pavadinimas'}</h3>
                <p className="text-rose-600 font-bold text-xl mt-1">
                  €{formValues.price?.toFixed(2) || '0.00'}
                </p>
                {formValues.description && (
                  <p className="text-sm text-gray-600 mt-2">{formValues.description}</p>
                )}
                {formValues.occasion_tags && formValues.occasion_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {formValues.occasion_tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="capitalize">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-4">
                  <Badge variant={formValues.is_active ? 'default' : 'secondary'}>
                    {formValues.is_active ? 'Aktyvus' : 'Neaktyvus'}
                  </Badge>
                  <Badge variant="outline">
                    {CATALOGUES.find((c) => c.value === formValues.catalogue)?.label}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
