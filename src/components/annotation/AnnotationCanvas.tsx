import { useEffect, useRef, useCallback, useState } from 'react'
import { Canvas, PencilBrush, FabricObject } from 'fabric'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Save, RotateCcw, ZoomIn, ZoomOut, PenTool } from 'lucide-react'

interface AnnotationCanvasProps {
  imageUrl: string
  onSave: (annotatedImageUrl: string) => void
  onCancel: () => void
  isLoading?: boolean
}

export function AnnotationCanvas({
  imageUrl,
  onSave,
  onCancel,
  isLoading = false,
}: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<Canvas | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isReady, setIsReady] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [isDrawing, setIsDrawing] = useState(false)
  const [pressure, setPressure] = useState(0)
  const [brushSize, setBrushSize] = useState(3)
  const [brushColor, setBrushColor] = useState('#ef4444') // rose-500
  
  // Zoom and Pan state
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })
  const [initialPinchDistance, setInitialPinchDistance] = useState(0)
  const [initialZoom, setInitialZoom] = useState(1)
  const [isPinching, setIsPinching] = useState(false)

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return

    // Create fabric canvas
    const canvas = new Canvas(canvasRef.current, {
      isDrawingMode: true,
      selection: false,
      allowTouchScrolling: false,
    })

    fabricCanvasRef.current = canvas

    // Setup pencil brush
    const brush = new PencilBrush(canvas)
    brush.color = brushColor
    brush.width = brushSize
    brush.strokeLineCap = 'round'
    brush.strokeLineJoin = 'round'
    canvas.freeDrawingBrush = brush

    // Load image onto canvas
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const fabricImg = new FabricObject(img, {
        selectable: false,
        evented: false,
        scaleX: canvas.width! / img.width,
        scaleY: canvas.height! / img.height,
      })
      
      // Set canvas dimensions to match image
      canvas.setDimensions({
        width: img.width,
        height: img.height,
      })
      
      // Add image as background
      canvas.setBackgroundImage(fabricImg, () => {
        canvas.renderAll()
        setIsReady(true)
      })
    }
    img.src = imageUrl

    // Cleanup
    return () => {
      canvas.dispose()
      fabricCanvasRef.current = null
    }
  }, [imageUrl])

  // Update brush settings
  useEffect(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.freeDrawingBrush!.color = brushColor
      fabricCanvasRef.current.freeDrawingBrush!.width = brushSize
    }
  }, [brushColor, brushSize])

  // Handle S-Pen / stylus / touch / mouse detection
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!fabricCanvasRef.current) return

    // Accept all input types: pen (S-Pen), touch (finger), mouse
    // For S-Pen, also apply pressure sensitivity
    const isPen = e.pointerType === 'pen'
    const isStylus = e.pointerType === 'pen' || (e as any).twist !== undefined // Some styluses report differently
    
    setIsDrawing(true)
    
    if (isPen || isStylus) {
      // Pressure sensitivity (0 to 1)
      const pressureValue = e.pressure || 0.5
      setPressure(pressureValue)
      
      // Adjust brush width based on pressure
      const adjustedWidth = Math.max(1, brushSize * pressureValue * 2)
      fabricCanvasRef.current.freeDrawingBrush!.width = adjustedWidth
    }
  }, [brushSize])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawing || !fabricCanvasRef.current) return

    const isPen = e.pointerType === 'pen'
    const isStylus = e.pointerType === 'pen' || (e as any).twist !== undefined
    
    if (isPen || isStylus) {
      const pressureValue = e.pressure || 0.5
      setPressure(pressureValue)
      
      const adjustedWidth = Math.max(1, brushSize * pressureValue * 2)
      fabricCanvasRef.current.freeDrawingBrush!.width = adjustedWidth
    }
  }, [isDrawing, brushSize])

  const handlePointerUp = useCallback(() => {
    setIsDrawing(false)
    setPressure(0)
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.freeDrawingBrush!.width = brushSize
    }
  }, [brushSize])

  // Zoom functionality with pan reset when zooming out to 1
  const handleZoomIn = useCallback(() => {
    if (!fabricCanvasRef.current) return
    const newZoom = Math.min(zoom + 0.25, 3)
    setZoom(newZoom)
    fabricCanvasRef.current.setZoom(newZoom)
    fabricCanvasRef.current.renderAll()
  }, [zoom])

  const handleZoomOut = useCallback(() => {
    if (!fabricCanvasRef.current) return
    const newZoom = Math.max(zoom - 0.25, 0.5)
    setZoom(newZoom)
    fabricCanvasRef.current.setZoom(newZoom)
    // Reset pan when zooming to 1 or below
    if (newZoom <= 1) {
      setPanPosition({ x: 0, y: 0 })
      fabricCanvasRef.current.absolutePan({ x: 0, y: 0 })
    }
    fabricCanvasRef.current.renderAll()
  }, [zoom])

  // Pinch-to-zoom handlers
  const getDistance = useCallback((touch1: Touch, touch2: Touch) => {
    return Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY)
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      e.preventDefault()
      setIsPinching(true)
      const distance = getDistance(e.touches[0], e.touches[1])
      setInitialPinchDistance(distance)
      setInitialZoom(zoom)
    } else if (e.touches.length === 1 && zoom > 1) {
      // Pan start
      const touch = e.touches[0]
      setIsPanning(true)
      setLastPanPoint({ x: touch.clientX, y: touch.clientY })
    }
  }, [zoom, getDistance])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!fabricCanvasRef.current) return

    if (e.touches.length === 2 && isPinching) {
      // Pinch zoom
      e.preventDefault()
      const distance = getDistance(e.touches[0], e.touches[1])
      const scale = distance / initialPinchDistance
      const newZoom = Math.min(Math.max(initialZoom * scale, 0.5), 3)
      setZoom(newZoom)
      fabricCanvasRef.current.setZoom(newZoom)
      fabricCanvasRef.current.renderAll()
    } else if (e.touches.length === 1 && isPanning && zoom > 1) {
      // Pan
      e.preventDefault()
      const touch = e.touches[0]
      const deltaX = touch.clientX - lastPanPoint.x
      const deltaY = touch.clientY - lastPanPoint.y
      
      const newPanX = panPosition.x + deltaX
      const newPanY = panPosition.y + deltaY
      
      setPanPosition({ x: newPanX, y: newPanY })
      setLastPanPoint({ x: touch.clientX, y: touch.clientY })
      
      fabricCanvasRef.current.absolutePan({ x: -newPanX, y: -newPanY })
      fabricCanvasRef.current.renderAll()
    }
  }, [isPinching, isPanning, zoom, panPosition, lastPanPoint, initialPinchDistance, initialZoom, getDistance])

  const handleTouchEnd = useCallback(() => {
    setIsPinching(false)
    setIsPanning(false)
  }, [])

  // Mouse pan for desktop (when zoomed and holding space or middle mouse)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom > 1 && (e.button === 1 || e.button === 2 || (e.button === 0 && e.shiftKey))) {
      e.preventDefault()
      setIsPanning(true)
      setLastPanPoint({ x: e.clientX, y: e.clientY })
    }
  }, [zoom])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!fabricCanvasRef.current || !isPanning || zoom <= 1) return
    
    const deltaX = e.clientX - lastPanPoint.x
    const deltaY = e.clientY - lastPanPoint.y
    
    const newPanX = panPosition.x + deltaX
    const newPanY = panPosition.y + deltaY
    
    setPanPosition({ x: newPanX, y: newPanY })
    setLastPanPoint({ x: e.clientX, y: e.clientY })
    
    fabricCanvasRef.current.absolutePan({ x: -newPanX, y: -newPanY })
    fabricCanvasRef.current.renderAll()
  }, [isPanning, zoom, panPosition, lastPanPoint])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  // Clear canvas (keep background)
  const handleClear = useCallback(() => {
    if (!fabricCanvasRef.current) return
    fabricCanvasRef.current.getObjects().forEach((obj) => {
      if (obj !== fabricCanvasRef.current!.backgroundImage) {
        fabricCanvasRef.current!.remove(obj)
      }
    })
    fabricCanvasRef.current.renderAll()
  }, [])

  // Save annotated image - flatten canvas to single PNG
  const handleSave = useCallback(async () => {
    if (!fabricCanvasRef.current) return

    try {
      const canvas = fabricCanvasRef.current
      
      // Reset zoom and pan before saving to get full image
      const originalZoom = canvas.getZoom()
      const originalPan = panPosition
      
      if (originalZoom !== 1 || originalPan.x !== 0 || originalPan.y !== 0) {
        canvas.setZoom(1)
        canvas.absolutePan({ x: 0, y: 0 })
        canvas.renderAll()
      }
      
      // Get data URL as PNG
      const dataUrl = canvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1,
        left: 0,
        top: 0,
        width: canvas.getWidth(),
        height: canvas.getHeight(),
      })
      
      // Restore zoom and pan
      if (originalZoom !== 1 || originalPan.x !== 0 || originalPan.y !== 0) {
        canvas.setZoom(originalZoom)
        canvas.absolutePan({ x: -originalPan.x, y: -originalPan.y })
        canvas.renderAll()
      }

      // Convert data URL to blob
      const response = await fetch(dataUrl)
      const blob = await response.blob()
      
      // Pass blob to parent for Supabase upload
      onSave(dataUrl)
    } catch (error) {
      console.error('Error saving annotation:', error)
      throw error
    }
  }, [onSave, panPosition])

  // Preset colors
  const colors = [
    { name: 'Raudona', value: '#ef4444' },
    { name: 'Mėlyna', value: '#3b82f6' },
    { name: 'Žalia', value: '#22c55e' },
    { name: 'Geltona', value: '#eab308' },
    { name: 'Juoda', value: '#000000' },
    { name: 'Balta', value: '#ffffff' },
  ]

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <PenTool className="w-5 h-5" />
          Piešimas ant nuotraukos
          {isDrawing && pressure > 0 && (
            <Badge variant="secondary" className="ml-2">
              Slėgis: {Math.round(pressure * 100)}%
            </Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Priartinimas: {Math.round(zoom * 100)}%
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 3}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-4 p-3 bg-gray-50 rounded-lg">
          {/* Brush Size */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Dydis:</span>
            <input
              type="range"
              min="1"
              max="50"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-24"
            />
            <span className="text-sm w-8">{brushSize}px</span>
          </div>

          {/* Brush Color */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Spalva:</span>
            <div className="flex gap-1">
              {colors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setBrushColor(color.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                    brushColor === color.value ? 'border-gray-800 scale-110' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Išvalyti
            </Button>
          </div>
        </div>

        {/* Canvas Container */}
        <div
          ref={containerRef}
          className="relative border rounded-lg overflow-hidden bg-gray-100"
          style={{ height: '500px' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={(e) => e.preventDefault()}
        >
          {!isReady && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
              <span className="ml-2 text-muted-foreground">Kraunama...</span>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 touch-none ${isPanning ? 'cursor-grabbing' : zoom > 1 ? 'cursor-grab' : 'cursor-crosshair'}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
          
          {/* Zoom/Pan indicator */}
          {(zoom > 1 || panPosition.x !== 0 || panPosition.y !== 0) && (
            <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              {Math.round(zoom * 100)}% | Pan: {Math.round(panPosition.x)}, {Math.round(panPosition.y)}
            </div>
          )}
        </div>

        {/* Info */}
        <p className="text-sm text-muted-foreground">
          Naudokite S-Pen arba pelę piešimui. Palaikomas slėgio jautrumas su S-Pen.
          <br />
          <span className="text-xs">
            <strong>Pinch-to-zoom:</strong> du pirštais priartinkite/nutolinkite. 
            <strong>Pan:</strong> tempkite su vienu pirštu kai priartinta (arba Shift+pelė).
          </span>
        </p>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Atšaukti
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isLoading || !isReady}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saugojama...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Išsaugoti
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
