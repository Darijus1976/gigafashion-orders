import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Pencil, Eraser, Undo2, Redo2, Trash2, Minus, Plus } from 'lucide-react'

export type ToolType = 'pen' | 'eraser'

interface AnnotationToolbarProps {
  currentTool: ToolType
  onToolChange: (tool: ToolType) => void
  brushColor: string
  onColorChange: (color: string) => void
  brushSize: number
  onSizeChange: (size: number) => void
  onUndo?: () => void
  onRedo?: () => void
  onClear?: () => void
  canUndo?: boolean
  canRedo?: boolean
}

const COLORS = [
  { value: '#000000', label: 'Juoda' },
  { value: '#ef4444', label: 'Raudona' },
  { value: '#3b82f6', label: 'Mėlyna' },
  { value: '#22c55e', label: 'Žalia' },
  { value: '#eab308', label: 'Geltona' },
  { value: '#a855f7', label: 'Violetinė' },
  { value: '#ffffff', label: 'Balta' },
]

export function AnnotationToolbar({
  currentTool,
  onToolChange,
  brushColor,
  onColorChange,
  brushSize,
  onSizeChange,
  onUndo,
  onRedo,
  onClear,
  canUndo = false,
  canRedo = false,
}: AnnotationToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 p-3 bg-gray-50 rounded-lg">
      {/* Tools */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Įrankis:</span>
        <div className="flex border rounded-md overflow-hidden">
          <Button
            type="button"
            variant={currentTool === 'pen' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onToolChange('pen')}
            className="rounded-none"
          >
            <Pencil className="w-4 h-4 mr-1" />
            Pieštukas
          </Button>
          <Button
            type="button"
            variant={currentTool === 'eraser' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onToolChange('eraser')}
            className="rounded-none"
          >
            <Eraser className="w-4 h-4 mr-1" />
            Trintukas
          </Button>
        </div>
      </div>

      {/* Color Picker */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Spalva:</span>
        <div className="flex gap-1">
          {COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => onColorChange(color.value)}
              className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                brushColor === color.value
                  ? 'border-gray-800 scale-110 ring-2 ring-offset-2 ring-gray-400'
                  : 'border-gray-300'
              }`}
              style={{ backgroundColor: color.value }}
              title={color.label}
            />
          ))}
        </div>
      </div>

      {/* Brush Size */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Storis:</span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => onSizeChange(Math.max(1, brushSize - 1))}
          >
            <Minus className="w-3 h-3" />
          </Button>
          <Slider
            value={[brushSize]}
            onValueChange={([value]) => onSizeChange(value)}
            min={1}
            max={50}
            step={1}
            className="w-24"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => onSizeChange(Math.min(50, brushSize + 1))}
          >
            <Plus className="w-3 h-3" />
          </Button>
          <span className="text-sm font-mono w-8">{brushSize}px</span>
        </div>
      </div>

      {/* Undo/Redo */}
      <div className="flex items-center gap-1 ml-auto">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
        >
          <Undo2 className="w-4 h-4 mr-1" />
          Atšaukti
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
        >
          <Redo2 className="w-4 h-4 mr-1" />
          Grąžinti
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClear}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Išvalyti
        </Button>
      </div>
    </div>
  )
}
