import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Camera, ImageIcon, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useRef } from 'react'

interface Section31NotesProps {
  orderNumber: string
  notes: string
  setNotes: (notes: string) => void
  photoUrls: string[]
  setPhotoUrls: (urls: string[]) => void
}

export function Section31Notes({ orderNumber, notes, setNotes, photoUrls, setPhotoUrls }: Section31NotesProps) {
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

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

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) return null
    try {
      const compressed = await compressImage(file)
      const prefix = orderNumber ? `internal-notes/${orderNumber}` : `internal-notes/draft-${Date.now()}`
      const filePath = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`
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

  const addImages = async (files: FileList | null) => {
    if (!files) return
    const uploadedUrls: string[] = []
    for (const file of Array.from(files)) {
      const url = await uploadImage(file)
      if (url) uploadedUrls.push(url)
    }
    if (uploadedUrls.length > 0) {
      setPhotoUrls([...photoUrls, ...uploadedUrls])
    }
  }

  const removeImage = (url: string) => {
    setPhotoUrls(photoUrls.filter(u => u !== url))
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="internal-notes" className="text-base font-semibold">
          Internal notes
        </Label>
        <Textarea
          id="internal-notes"
          placeholder="Write notes for us here..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          className="resize-y"
        />
        <p className="text-sm text-muted-foreground">
          These notes and photos will not appear on the client copy.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-base font-semibold">Photos</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => galleryInputRef.current?.click()}
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            Gallery
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="w-4 h-4 mr-2" />
            Camera
          </Button>
        </div>

        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => { addImages(e.target.files); e.target.value = '' }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => { addImages(e.target.files); e.target.value = '' }}
        />
      </div>

      {photoUrls.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {photoUrls.map((url) => (
            <div key={url} className="relative">
              <a href={url} target="_blank" rel="noopener noreferrer">
                <img
                  src={url}
                  alt="Internal note"
                  className="w-full max-h-[500px] object-contain rounded-lg border bg-white"
                />
              </a>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute top-1 right-1 bg-white/80 hover:bg-white"
                onClick={() => removeImage(url)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
