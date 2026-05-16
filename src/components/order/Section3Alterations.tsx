import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Check } from 'lucide-react'

export interface AlterationRow {
  id: string
  description: string
  price: string
  isConfirmed: boolean
}

interface AlterationItem {
  id: string
  description: string
  price: number
}

interface Section3AlterationsProps {
  onAddToOrder: (item: AlterationItem) => void
  onRemoveFromOrder: (id: string) => void
  rows: AlterationRow[]
  setRows: React.Dispatch<React.SetStateAction<AlterationRow[]>>
}

export const MIN_ALTERATION_ROWS = 5
export const MAX_ALTERATION_ROWS = 10

export function Section3Alterations({ onAddToOrder, onRemoveFromOrder, rows, setRows }: Section3AlterationsProps) {
  const confirmedCount = rows.filter(r => r.isConfirmed).length
  const canAddMore = rows.length < MAX_ALTERATION_ROWS
  const canRemove = rows.length > MIN_ALTERATION_ROWS

  const updateRow = (id: string, field: keyof AlterationRow, value: string) => {
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
            ? { ...row, description: '', price: '', isConfirmed: false }
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
            className={`grid grid-cols-12 gap-2 items-start p-3 rounded-lg border ${
              row.isConfirmed
                ? 'border-green-300 bg-green-50'
                : 'border-gray-200'
            }`}
          >
            {/* Row Number */}
            <div className="col-span-1 flex items-center justify-center">
              <span className="text-sm font-medium text-muted-foreground">
                {index + 1}
              </span>
            </div>

            {/* Description Input */}
            <div className="col-span-6 space-y-1">
              {index === 0 && (
                <Label htmlFor={`desc-${row.id}`} className="text-xs">
                  Alteration description
                </Label>
              )}
              <Input
                id={`desc-${row.id}`}
                placeholder="e.g. Longer sleeves, additional embroidered strip..."
                value={row.description}
                onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, row.id)}
                disabled={row.isConfirmed}
                className={row.isConfirmed ? 'bg-white' : ''}
              />
            </div>

            {/* Price Input */}
            <div className="col-span-3 space-y-1">
              {index === 0 && (
                <Label htmlFor={`price-${row.id}`} className="text-xs">
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
                onKeyDown={(e) => handleKeyDown(e, row.id)}
                disabled={row.isConfirmed}
                className={row.isConfirmed ? 'bg-white' : ''}
              />
            </div>

            {/* Actions */}
            <div className="col-span-2 flex items-center justify-end gap-1">
              {!row.isConfirmed ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => confirmRow(row.id)}
                  disabled={!row.description.trim()}
                  className="text-green-600 hover:text-green-700 hover:bg-green-100"
                >
                  <Check className="w-4 h-4" />
                </Button>
              ) : (
                <span className="text-xs text-green-600 font-medium">Pridėta</span>
              )}
              
              {(canRemove || row.description || row.price || row.isConfirmed) && (
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
            </div>
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
          {rows.length >= MAX_ALTERATION_ROWS && (
            <span className="ml-2 text-xs text-muted-foreground">(max {MAX_ALTERATION_ROWS})</span>
          )}
        </Button>

        <p className="text-sm text-muted-foreground">
          Rows: {rows.length} | Confirmed: {confirmedCount}
        </p>
      </div>

      {/* Instructions */}
      <p className="text-xs text-muted-foreground">
        * Press Enter or ✓ button to add alteration to order
      </p>
    </div>
  )
}
