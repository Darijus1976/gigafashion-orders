import { useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Camera, ImageIcon, Upload, X, Loader2, CheckCircle2, AlertCircle, Pencil } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { ImageAnnotationDialog } from './ImageAnnotationDialog'

interface UploadFile {
  id: string
  file: File
  preview: string
  status: 'pending' | 'compressing' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  uploadedUrl?: string
}

interface ImageUploaderProps {
  orderId: string
  onUploadComplete?: (urls: string[]) => void
  maxFiles?: number
  maxSizeMB?: number
  section?: 'custom_dress' | 'fitting'
}

export function ImageUploader({
  orderId,
  onUploadComplete,
  maxFiles = 10,
  maxSizeMB = 10,
  section = 'fitting',
}: ImageUploaderProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  
  // Annotation dialog state
  const [annotationFile, setAnnotationFile] = useState<UploadFile | null>(null)
  const [isAnnotationOpen, setIsAnnotationOpen] = useState(false)

  const maxSizeBytes = maxSizeMB * 1024 * 1024

  // Compress image to WebP
  const compressImage = useCallback(async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }

        // Calculate dimensions (max 1920px on longest side)
        let { width, height } = img
        const maxDimension = 1920
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension
            width = maxDimension
          } else {
            width = (width / height) * maxDimension
            height = maxDimension
          }
        }

        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], `${file.name.split('.')[0]}.webp`, {
                type: 'image/webp',
              })
              resolve(compressedFile)
            } else {
              reject(new Error('Compression failed'))
            }
          },
          'image/webp',
          0.8 // Quality 80%
        )
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }, [])

  // Upload to Supabase Storage
  const uploadToSupabase = useCallback(async (file: File, fileId: string): Promise<string> => {
    const filePath = `${orderId}/${fileId}-${Date.now()}.webp`
    
    const { error: uploadError } = await supabase.storage
      .from('order-photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      throw new Error(uploadError.message)
    }

    const { data } = supabase.storage.from('order-photos').getPublicUrl(filePath)
    return data.publicUrl
  }, [orderId])

  // Process and upload files
  const processFiles = useCallback(async (newFiles: FileList | null) => {
    if (!newFiles) return

    const imageFiles = Array.from(newFiles).filter((file) => {
      if (!file.type.startsWith('image/')) {
        return false
      }
      if (file.size > maxSizeBytes) {
        alert(`Failas "${file.name}" per didelis (max ${maxSizeMB}MB)`)
        return false
      }
      return true
    })

    if (files.length + imageFiles.length > maxFiles) {
      alert(`Max ${maxFiles} nuotraukų vienu metu`)
      return
    }

    // Create upload file objects
    const uploadFiles: UploadFile[] = imageFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
      progress: 0,
    }))

    setFiles((prev) => [...prev, ...uploadFiles])
    setIsProcessing(true)

    const uploadedUrls: string[] = []

    // Process each file
    for (const uploadFile of uploadFiles) {
      try {
        // Update status to compressing
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: 'compressing' } : f
          )
        )

        // Compress image
        const compressedFile = await compressImage(uploadFile.file)

        // Update status to uploading
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 50 } : f
          )
        )

        // Upload to Supabase
        const url = await uploadToSupabase(compressedFile, uploadFile.id)
        uploadedUrls.push(url)

        // Update status to success
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: 'success', progress: 100, uploadedUrl: url }
              : f
          )
        )

        // Save to order_photos table
        const { error: dbError } = await supabase.from('order_photos').insert({
          order_id: orderId,
          section: section,
          storage_path: url,
          is_annotated: false,
        } as never)

        if (dbError) {
          console.warn('Photo metadata save failed:', dbError)
        }
      } catch (error) {
        console.error('Upload error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Įkėlimo klaida'
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: 'error', error: errorMessage }
              : f
          )
        )
      }
    }

    setIsProcessing(false)

    if (uploadedUrls.length > 0 && onUploadComplete) {
      onUploadComplete(uploadedUrls)
    }
  }, [files.length, maxFiles, maxSizeBytes, maxSizeMB, compressImage, uploadToSupabase, orderId, onUploadComplete])

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    processFiles(e.dataTransfer.files)
  }, [processFiles])

  // Remove file from list
  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id)
      if (file) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter((f) => f.id !== id)
    })
  }, [])

  // Clear all files
  const clearAll = useCallback(() => {
    files.forEach((f) => URL.revokeObjectURL(f.preview))
    setFiles([])
  }, [files])

  // Open annotation dialog
  const handleAnnotate = useCallback((file: UploadFile) => {
    if (file.uploadedUrl) {
      setAnnotationFile(file)
      setIsAnnotationOpen(true)
    }
  }, [])

  // Handle annotation save
  const handleAnnotationSave = useCallback((newUrl: string) => {
    if (annotationFile) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === annotationFile.id
            ? { ...f, uploadedUrl: newUrl, preview: newUrl }
            : f
        )
      )
      // Update order_photos table to mark as annotated
      supabase
        .from('order_photos')
        .update({ is_annotated: true, storage_path: newUrl } as never)
        .eq('order_id', orderId)
        .eq('storage_path', annotationFile.uploadedUrl)
        .then(({ error }) => {
          if (error) console.warn('Failed to update annotation status:', error)
        })
    }
    setAnnotationFile(null)
    setIsAnnotationOpen(false)
  }, [annotationFile, orderId])

  // Get file path for annotation dialog
  const getAnnotationFilePath = useCallback(() => {
    if (!annotationFile?.uploadedUrl) return ''
    const match = annotationFile.uploadedUrl.match(/\/order-photos\/(.+)$/)
    return match ? match[1] : ''
  }, [annotationFile])

  const pendingCount = files.filter((f) => f.status === 'pending').length
  const uploadingCount = files.filter((f) => f.status === 'uploading' || f.status === 'compressing').length
  const successCount = files.filter((f) => f.status === 'success').length
  const errorCount = files.filter((f) => f.status === 'error').length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Nuotraukų įkėlimas
          </span>
          {files.length > 0 && (
            <Badge variant="secondary">
              {files.length} / {maxFiles}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Methods */}
        {files.length === 0 ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-rose-500 bg-rose-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="flex flex-col items-center text-muted-foreground">
              <ImageIcon className="w-12 h-12 mb-4" />
              <p className="text-lg font-medium mb-2">
                Tempkite nuotraukas čia
              </p>
              <p className="text-sm mb-4">arba</p>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Gallerija
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Kamera
                </Button>
              </div>
              
              <p className="text-xs text-gray-400 mt-4">
                WebP, JPG, PNG (max {maxSizeMB}MB, max {maxFiles} nuotraukų)
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Status Bar */}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {pendingCount > 0 && (
                <Badge variant="outline" className="gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {pendingCount} laukia
                </Badge>
              )}
              {uploadingCount > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {uploadingCount} apdorojama
                </Badge>
              )}
              {successCount > 0 && (
                <Badge variant="default" className="gap-1 bg-green-600">
                  <CheckCircle2 className="w-3 h-3" />
                  {successCount} įkelta
                </Badge>
              )}
              {errorCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errorCount} klaida
                </Badge>
              )}
            </div>

            {/* Image Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-80 overflow-y-auto p-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className={`relative border rounded-lg overflow-hidden ${
                    file.status === 'success'
                      ? 'border-green-500'
                      : file.status === 'error'
                      ? 'border-red-500'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="aspect-square">
                    <img
                      src={file.preview}
                      alt="Upload preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Status Overlay */}
                  {(file.status === 'compressing' || file.status === 'uploading') && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center p-4">
                      <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
                      <p className="text-white text-xs">
                        {file.status === 'compressing' ? 'Kompresuojama...' : 'Įkeliama...'}
                      </p>
                      <Progress value={file.progress} className="w-full h-2 mt-2" />
                    </div>
                  )}
                  
                  {file.status === 'success' && (
                    <>
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 className="w-6 h-6 text-green-600 bg-white rounded-full" />
                      </div>
                      {/* Annotate Button - S-Pen support */}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="absolute bottom-2 left-2 right-2 bg-white/90 hover:bg-white shadow-sm"
                        onClick={() => handleAnnotate(file)}
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        Piešti
                      </Button>
                    </>
                  )}
                  
                  {file.status === 'error' && (
                    <div className="absolute inset-0 bg-red-500/20 flex flex-col items-center justify-center p-2 text-center">
                      <AlertCircle className="w-8 h-8 text-red-600" />
                      {file.error && (
                        <span className="mt-1 rounded bg-white/90 px-1 text-[10px] text-red-700">
                          {file.error}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Remove Button */}
                  {file.status !== 'uploading' && file.status !== 'compressing' && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 left-2 opacity-0 hover:opacity-100 transition-opacity"
                      onClick={() => removeFile(file.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              
              {/* Add More Button */}
              <label className="cursor-pointer">
                <div className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-gray-400 hover:bg-gray-50 transition-colors">
                  <Upload className="w-8 h-8 mb-2" />
                  <span className="text-xs">Pridėti</span>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => processFiles(e.target.files)}
                />
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={clearAll}
                disabled={isProcessing}
              >
                Išvalyti
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing || files.length >= maxFiles}
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Gallerija
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={isProcessing || files.length >= maxFiles}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Kamera
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Hidden Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => processFiles(e.target.files)}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => processFiles(e.target.files)}
        />

        {/* S-Pen Annotation Dialog */}
        <ImageAnnotationDialog
          isOpen={isAnnotationOpen}
          onClose={() => {
            setIsAnnotationOpen(false)
            setAnnotationFile(null)
          }}
          imageUrl={annotationFile?.uploadedUrl || ''}
          filePath={getAnnotationFilePath()}
          onSaveComplete={handleAnnotationSave}
        />
      </CardContent>
    </Card>
  )
}
