import { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AnnotationCanvas } from './AnnotationCanvas'
import { supabase } from '@/lib/supabase/client'

interface ImageAnnotationDialogProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  filePath: string
  onSaveComplete?: (newUrl: string) => void
}

export function ImageAnnotationDialog({
  isOpen,
  onClose,
  imageUrl,
  filePath,
  onSaveComplete,
}: ImageAnnotationDialogProps) {
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = useCallback(async (dataUrl: string) => {
    setIsSaving(true)
    
    try {
      // Convert data URL to blob
      const response = await fetch(dataUrl)
      const blob = await response.blob()
      const file = new File([blob], 'annotated.png', { type: 'image/png' })

      // Upload to Supabase Storage (replace original)
      const { error: uploadError } = await supabase.storage
        .from('order-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true, // Replace existing file
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw new Error('Failed to upload annotated image')
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('order-photos')
        .getPublicUrl(filePath)

      onSaveComplete?.(publicUrl)
      onClose()
    } catch (error) {
      console.error('Error saving annotation:', error)
      alert('Klaida išsaugant anotaciją. Bandykite dar kartą.')
    } finally {
      setIsSaving(false)
    }
  }, [filePath, onClose, onSaveComplete])

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Anotuoti nuotrauką</DialogTitle>
        </DialogHeader>
        <AnnotationCanvas
          imageUrl={imageUrl}
          onSave={handleSave}
          onCancel={onClose}
          isLoading={isSaving}
        />
      </DialogContent>
    </Dialog>
  )
}
