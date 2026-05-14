import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Save, X, Users } from 'lucide-react'

interface StaffSettingsProps {
  staffMembers: string[]
  onSave: (staff: string[]) => Promise<void>
  isLoading?: boolean
}

export function StaffSettings({
  staffMembers,
  onSave,
  isLoading = false,
}: StaffSettingsProps) {
  const [staff, setStaff] = useState<string[]>(staffMembers)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')

  const handleAdd = useCallback(() => {
    if (newName.trim()) {
      setStaff((prev) => [...prev, newName.trim()])
      setNewName('')
    }
  }, [newName])

  const handleRemove = useCallback((index: number) => {
    setStaff((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleEditStart = useCallback((index: number, value: string) => {
    setEditingIndex(index)
    setEditValue(value)
  }, [])

  const handleEditSave = useCallback(() => {
    if (editingIndex !== null && editValue.trim()) {
      setStaff((prev) =>
        prev.map((s, i) => (i === editingIndex ? editValue.trim() : s))
      )
      setEditingIndex(null)
      setEditValue('')
    }
  }, [editingIndex, editValue])

  const handleEditCancel = useCallback(() => {
    setEditingIndex(null)
    setEditValue('')
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await onSave(staff)
    } finally {
      setSaving(false)
    }
  }, [staff, onSave])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleAdd()
      }
    },
    [handleAdd]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Darbuotojų vardų valdymas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add New Staff */}
        <div className="flex gap-2">
          <Input
            placeholder="Naujo darbuotojo vardas..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Button
            type="button"
            onClick={handleAdd}
            disabled={!newName.trim()}
          >
            <Plus className="w-4 h-4 mr-2" />
            Pridėti
          </Button>
        </div>

        {/* Staff List */}
        <div className="space-y-2">
          {staff.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Darbuotojų sąrašas tuščias
            </p>
          ) : (
            staff.map((member, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-3 border rounded-lg"
              >
                {editingIndex === index ? (
                  <>
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1"
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleEditSave}
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleEditCancel}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span
                      className="flex-1 cursor-pointer hover:text-rose-600"
                      onClick={() => handleEditStart(index, member)}
                    >
                      {member}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleRemove(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* Info */}
        {staff.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Spustelėkite vardą, kad redaguotumėte. Iš viso: {staff.length} darbuotojų.
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end pt-4 border-t gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStaff(staffMembers)}
            disabled={saving || isLoading}
          >
            Atstatyti
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || isLoading}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saugoma...' : 'Išsaugoti'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
