import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Upload, X, ImageIcon, FileImage, AlertCircle, CheckCircle2 } from 'lucide-react'

interface ImageDraft {
  id: string
  file: File
  preview: string
  name: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
}

interface BulkUploadProps {
  onProcess: (drafts: ImageDraft[]) => Promise<void>
  maxFiles?: number
  maxSizeMB?: number
}

export function BulkUpload({
  onProcess,
  maxFiles = 50,
  maxSizeMB = 10,
}: BulkUploadProps) {
  const [drafts, setDrafts] = useState<ImageDraft[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const maxSizeBytes = maxSizeMB * 1024 * 1024

  const createDraft = useCallback((file: File): ImageDraft => {
    const preview = URL.createObjectURL(file)
    // Generate name from filename (remove extension)
    const name = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
    
    return {
      id: Math.random().toString(36).substring(7),
      file,
      preview,
      name,
      status: 'pending',
      progress: 0,
    }
  }, [])

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return

    const imageFiles = Array.from(files).filter((file) => {
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        return false
      }
      // Check file size
      if (file.size > maxSizeBytes) {
        alert(`Failas "${file.name}" per didelis (max ${maxSizeMB}MB)`)
        return false
      }
      return true
    })

    // Check max files limit
    if (drafts.length + imageFiles.length > maxFiles) {
      alert(`Max ${maxFiles} nuotraukų vienu metu`)
      return
    }

    const newDrafts = imageFiles.map(createDraft)
    setDrafts((prev) => [...prev, ...newDrafts])
  }, [drafts.length, createDraft, maxFiles, maxSizeBytes, maxSizeMB])

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
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const removeDraft = useCallback((id: string) => {
    setDrafts((prev) => {
      const draft = prev.find((d) => d.id === id)
      if (draft) {
        URL.revokeObjectURL(draft.preview)
      }
      return prev.filter((d) => d.id !== id)
    })
  }, [])

  const updateDraftName = useCallback((id: string, name: string) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, name } : d))
    )
  }, [])

  const clearAll = useCallback(() => {
    drafts.forEach((d) => URL.revokeObjectURL(d.preview))
    setDrafts([])
  }, [drafts])

  const handleProcess = useCallback(async () => {
    if (drafts.length === 0) return

    setIsProcessing(true)
    
    // Update all to uploading status
    setDrafts((prev) =>
      prev.map((d) => ({ ...d, status: 'uploading', progress: 0 }))
    )

    try {
      await onProcess(drafts)
      
      // Mark all as success
      setDrafts((prev) =>
        prev.map((d) => ({ ...d, status: 'success', progress: 100 }))
      )
      
      // Clear after short delay
      setTimeout(() => {
        clearAll()
      }, 2000)
    } catch (error) {
      // Mark all as error
      setDrafts((prev) =>
        prev.map((d) => ({
          ...d,
          status: 'error',
          error: 'Įkėlimo klaida',
        }))
      )
    } finally {
      setIsProcessing(false)
    }
  }, [drafts, onProcess, clearAll])

  const pendingCount = drafts.filter((d) => d.status === 'pending').length
  const uploadingCount = drafts.filter((d) => d.status === 'uploading').length
  const successCount = drafts.filter((d) => d.status === 'success').length
  const errorCount = drafts.filter((d) => d.status === 'error').length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Masinis nuotraukų įkėlimas</span>
          {drafts.length > 0 && (
            <Badge variant="secondary">
              {drafts.length} nuotrauka{drafts.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Drop Zone */}
        {drafts.length === 0 ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              isDragging
                ? 'border-rose-500 bg-rose-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="flex flex-col items-center text-muted-foreground">
              <Upload className="w-12 h-12 mb-4" />
              <p className="text-lg font-medium mb-2">
                Tempkite nuotraukas čia
              </p>
              <p className="text-sm mb-4">arba</p>
              <label>
                <Button type="button" variant="outline" className="cursor-pointer">
                  <FileImage className="w-4 h-4 mr-2" />
                  Pasirinkti failus
                </Button>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </label>
              <p className="text-xs text-gray-400 mt-4">
                PNG, JPG, WEBP (max {maxSizeMB}MB, max {maxFiles} failų)
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Status Bar */}
            <div className="flex items-center gap-4 text-sm">
              {pendingCount > 0 && (
                <Badge variant="outline" className="gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {pendingCount} laukia
                </Badge>
              )}
              {uploadingCount > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Upload className="w-3 h-3 animate-pulse" />
                  {uploadingCount} keliama
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto p-2">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className={`relative border rounded-lg overflow-hidden group ${
                    draft.status === 'success'
                      ? 'border-green-500'
                      : draft.status === 'error'
                      ? 'border-red-500'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="aspect-square bg-gray-100">
                    <img
                      src={draft.preview}
                      alt={draft.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Status Overlay */}
                  {draft.status !== 'pending' && (
                    <div
                      className={`absolute inset-0 flex items-center justify-center ${
                        draft.status === 'uploading'
                          ? 'bg-black/30'
                          : draft.status === 'success'
                          ? 'bg-green-500/20'
                          : 'bg-red-500/20'
                      }`}
                    >
                      {draft.status === 'uploading' && (
                        <div className="w-full px-4">
                          <Progress value={draft.progress} className="h-2" />
                        </div>
                      )}
                      {draft.status === 'success' && (
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                      )}
                      {draft.status === 'error' && (
                        <AlertCircle className="w-8 h-8 text-red-600" />
                      )}
                    </div>
                  )}
                  
                  {/* Remove Button */}
                  {draft.status === 'pending' && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeDraft(draft.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                  
                  {/* Name Input */}
                  <div className="p-2 bg-white">
                    <input
                      type="text"
                      value={draft.name}
                      onChange={(e) => updateDraftName(draft.id, e.target.value)}
                      disabled={draft.status !== 'pending'}
                      className="w-full text-sm border-0 p-0 focus:ring-0 truncate"
                      placeholder="Produkto pavadinimas"
                    />
                  </div>
                </div>
              ))}
              
              {/* Add More Button */}
              <label className="cursor-pointer">
                <div className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-gray-400 hover:bg-gray-50 transition-colors">
                  <ImageIcon className="w-8 h-8 mb-2" />
                  <span className="text-xs">Pridėti daugiau</span>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
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
                Išvalyti viską
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDrafts([])}
                  disabled={isProcessing}
                >
                  Atšaukti
                </Button>
                <Button
                  type="button"
                  onClick={handleProcess}
                  disabled={isProcessing || pendingCount === 0}
                >
                  {isProcessing ? 'Apdorojama...' : `Įkelti ${pendingCount} produktų`}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
