import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Camera, ImageIcon, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useRef } from 'react'

export interface ChangesExtrasRow {
  id: string
  description: string
  price: string
  isConfirmed: boolean
  imageUrls?: string[]
}

interface ChangeExtraItem {
  id: string
  description: string
  price: number
}

interface Section3ChangesExtrasProps {
  onAddToOrder: (item: ChangeExtraItem & { imageUrls?: string[] }) => void
  onRemoveFromOrder: (id: string) => void
  rows: ChangesExtrasRow[]
  setRows: React.Dispatch<React.SetStateAction<ChangesExtrasRow[]>>
}

export const MIN_CHANGES_EXTRAS_ROWS = 5
export const MAX_CHANGES_EXTRAS_ROWS = 10

export function Section3ChangesExtras({ onAddToOrder, onRemoveFromOrder, rows, setRows }: Section3ChangesExtrasProps) {
  const canAddMore = rows.length < MAX_CHANGES_EXTRAS_ROWS
  const canRemove = rows.length > MIN_CHANGES_EXTRAS_ROWS
  const fileInputRefs = useRef<Record<string, { gallery: HTMLInputElement | null; camera: HTMLInputElement | null }>>({})

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

  const uploadImage = async (rowId: string, file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) return null
    try {
      const compressed = await compressImage(file)
      const filePath = 'change-extra/' + rowId + '/' + Date.now() + '.webp'
      const { error: uploadError } = await supabase.storage
        .from('order-photos')
        .upload(filePath, compressed, { cacheControl: '3600', upsert: false })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('order-photos').getPublicUrl(filePath)
      return data.publicUrl
    } catch (e) {
      console.error('Upload error:', e)
      return null
    }
  }

  const addImages = async (rowId: string, files: FileList | null) => {
    if (!files) return
    const uploadedUrls: string[] = []
    for (const file of Array.from(files)) {
      const url = await uploadImage(rowId, file)
      if (url) uploadedUrls.push(url)
    }
    if (uploadedUrls.length === 0) return
    setRows(prev =>
      prev.map(row =>
        row.id === rowId
          ? { ...row, imageUrls: [...(row.imageUrls || []), ...uploadedUrls], isConfirmed: false }
          : row
      )
    )
    const row = rows.find(r => r.id === rowId)
    if (row && row.description.trim()) {
      onRemoveFromOrder(rowId)
      onAddToOrder({
        id: rowId,
        description: row.description,
        price: parseFloat(row.price) || 0,
        imageUrls: [...(row.imageUrls || []), ...uploadedUrls],
      })
      setRows(prev => prev.map(r => r.id === rowId ? { ...r, isConfirmed: true } : r))
    }
  }

  const removeImage = (rowId: string, url: string) => {
    setRows(prev =>
      prev.map(row =>
        row.id === rowId
          ? { ...row, imageUrls: (row.imageUrls || []).filter(u => u !== url), isConfirmed: false }
          : row
      )
    )
    const row = rows.find(r => r.id === rowId)
    if (row && row.description.trim()) {
      onRemoveFromOrder(rowId)
      const remainingUrls = (row.imageUrls || []).filter(u => u !== url)
      onAddToOrder({
        id: rowId,
        description: row.description,
        price: parseFloat(row.price) || 0,
        imageUrls: remainingUrls.length > 0 ? remainingUrls : undefined,
      })
      setRows(prev => prev.map(r => r.id === rowId ? { ...r, isConfirmed: true } : r))
    }
  }

  const updateRow = (id: string, field: keyof Omit<ChangesExtrasRow, 'imageUrls'>, value: string) => {
    setRows(prev =>
      prev.map(row =>
        row.id === id ? { ...row, [field]: value, isConfirmed: false } : row
      )
    )
    onRemoveFromOrder(id)
  }

  const confirmRow = (id: string) => {
    const row = rows.find(r => r.id === id)
    if (row && row.description.trim()) {
      const price = parseFloat(row.price) || 0
      onRemoveFromOrder(row.id)
      onAddToOrder({
        id: row.id,
        description: row.description,
        price: price,
        imageUrls: row.imageUrls,
      })
      setRows(prev =>
        prev.map(r => (r.id === id ? { ...r, isConfirmed: true } : r))
      )
    }
  }

  const addRow = () => {
    if (canAddMore) {
      setRows(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          description: '',
          price: '',
          isConfirmed: false,
          imageUrls: [],
        },
      ])
    }
  }

  const removeRow = (id: string) => {
    onRemoveFromOrder(id)
    if (canRemove) {
      setRows(prev => prev.filter(row => row.id !== id))
    } else {
      setRows(prev =>
        prev.map(row =>
          row.id === id
            ? { ...row, description: '', price: '', isConfirmed: false, imageUrls: [] }
            : row
        )
      )
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      confirmRow(id)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className="grid grid-cols-12 gap-2 items-start p-3 rounded-lg border border-gray-200"
          >
            {/* Row Number */}
            <div className="col-span-1 flex items-center justify-center">
              <span className="text-base font-semibold text-muted-foreground">
                {index + 1}
              </span>
            </div>

            {/* Description Input */}
            <div className="col-span-6 space-y-1">
              {index === 0 && (
                <Label htmlFor={`desc-${row.id}`} className="text-sm font-semibold">
                  Changes/Extras description
                </Label>
              )}
              <Input
                id={`desc-${row.id}`}
                placeholder="e.g. Longer sleeves, additional embroidered strip..."
                value={row.description}
                onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                onBlur={() => confirmRow(row.id)}
                onKeyDown={(e) => handleKeyDown(e, row.id)}
              />
            </div>

            {/* Price Input */}
            <div className="col-span-3 space-y-1">
              {index === 0 && (
                <Label htmlFor={`price-${row.id}`} className="text-sm font-semibold">
                  Price (€)
                </Label>
              )}
              <Input
                id={`price-${row.id}`}
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={row.price}
                onChange={(e) => updateRow(row.id, 'price', e.target.value)}
                onBlur={() => confirmRow(row.id)}
                onKeyDown={(e) => handleKeyDown(e, row.id)}
              />
            </div>

            {/* Actions */}
            <div className="col-span-2 flex items-center justify-end gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRefs.current[row.id]?.gallery?.click()}
                title="Add from gallery"
              >
                <ImageIcon className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRefs.current[row.id]?.camera?.click()}
                title="Take photo"
              >
                <Camera className="w-4 h-4" />
              </Button>
              {(canRemove || row.description || row.price || row.isConfirmed || (row.imageUrls && row.imageUrls.length > 0)) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRow(row.id)}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-100"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <input
                ref={(el) => { fileInputRefs.current[row.id] = { ...(fileInputRefs.current[row.id] || {}), gallery: el } as { gallery: HTMLInputElement | null; camera: HTMLInputElement | null } }}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => { addImages(row.id, e.target.files); e.target.value = '' }}
              />
              <input
                ref={(el) => { fileInputRefs.current[row.id] = { ...(fileInputRefs.current[row.id] || {}), camera: el } as { gallery: HTMLInputElement | null; camera: HTMLInputElement | null } }}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => { addImages(row.id, e.target.files); e.target.value = '' }}
              />
            </div>

            {/* Photos preview */}
            {row.imageUrls && row.imageUrls.length > 0 && (
              <div className="col-span-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {row.imageUrls.map((url) => (
                    <div key={url} className="relative">
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt={row.description} className="w-full max-h-[500px] object-contain rounded-lg border bg-white" />
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-1 right-1 bg-white/80 hover:bg-white"
                        onClick={() => removeImage(row.id, url)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Row Button */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={addRow}
          disabled={!canAddMore}
          className="w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add row
          {rows.length >= MAX_CHANGES_EXTRAS_ROWS && (
            <span className="ml-2 text-sm text-muted-foreground">(max {MAX_CHANGES_EXTRAS_ROWS})</span>
          )}
        </Button>

        <p className="text-base text-muted-foreground">
          Rows: {rows.length}
        </p>
      </div>

      {/* Instructions */}
      <p className="text-sm text-muted-foreground">
        * Change/Extra is added automatically when you finish typing
      </p>
    </div>
  )
}
