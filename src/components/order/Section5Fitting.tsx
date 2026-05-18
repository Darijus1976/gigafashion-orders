import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, Check, Calendar, Scissors } from 'lucide-react'
import { format } from 'date-fns'
import { ImageUploader } from '@/components/annotation/ImageUploader'

export interface FittingNote {
  id: string
  description: string
  price: string
  isConfirmed: boolean
}

export interface FittingSession {
  id: string
  date: string
  notes: FittingNote[]
  photoUrls: string[]
  isActive: boolean
}

interface FittingItem {
  id: string
  description: string
  price: number
  fittingSessionId: string
}

interface Section5FittingProps {
  onAddToOrder: (item: FittingItem) => void
  onRemoveFromOrder: (id: string) => void
  orderId: string
  sessions: FittingSession[]
  setSessions: React.Dispatch<React.SetStateAction<FittingSession[]>>
}

export const MIN_FITTING_NOTES = 3
export const MAX_FITTING_NOTES = 8

export function Section5Fitting({ onAddToOrder, onRemoveFromOrder, orderId, sessions, setSessions }: Section5FittingProps) {
  const activeSession = sessions.find(s => s.isActive) || sessions[0]

  const updateNote = (sessionId: string, noteId: string, field: keyof FittingNote, value: string) => {
    setSessions(prev =>
      prev.map(session =>
        session.id === sessionId
          ? {
              ...session,
              notes: session.notes.map(note =>
                note.id === noteId ? { ...note, [field]: value, isConfirmed: false } : note
              ),
            }
          : session
      )
    )
    onRemoveFromOrder(noteId)
  }

  const confirmNote = (sessionId: string, noteId: string) => {
    const session = sessions.find(s => s.id === sessionId)
    if (!session) return
    const note = session.notes.find(n => n.id === noteId)
    
    if (note && note.description.trim()) {
      const price = parseFloat(note.price) || 0
      onRemoveFromOrder(note.id)
      onAddToOrder({
        id: note.id,
        description: `Fitting (${format(new Date(session.date), 'yyyy-MM-dd')}): ${note.description}`,
        price: price,
        fittingSessionId: sessionId,
      })
      
      setSessions(prev =>
        prev.map(s =>
          s.id === sessionId
            ? {
                ...s,
                notes: s.notes.map(n => (n.id === noteId ? { ...n, isConfirmed: true } : n)),
              }
            : s
        )
      )
    }
  }

  const addNote = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId)
    if (session && session.notes.length < MAX_FITTING_NOTES) {
      setSessions(prev =>
        prev.map(s =>
          s.id === sessionId
            ? {
                ...s,
                notes: [
                  ...s.notes,
                  {
                    id: crypto.randomUUID(),
                    description: '',
                    price: '',
                    isConfirmed: false,
                  },
                ],
              }
            : s
        )
      )
    }
  }

  const removeNote = (sessionId: string, noteId: string) => {
    const session = sessions.find(s => s.id === sessionId)
    onRemoveFromOrder(noteId)
    if (session && session.notes.length > MIN_FITTING_NOTES) {
      setSessions(prev =>
        prev.map(s =>
          s.id === sessionId
            ? { ...s, notes: s.notes.filter(n => n.id !== noteId) }
            : s
        )
      )
    } else {
      setSessions(prev =>
        prev.map(s =>
          s.id === sessionId
            ? {
                ...s,
                notes: s.notes.map(n =>
                  n.id === noteId
                    ? { ...n, description: '', price: '', isConfirmed: false }
                    : n
                ),
              }
            : s
        )
      )
    }
  }

  const updateSessionDate = (sessionId: string, date: string) => {
    setSessions(prev =>
      prev.map(s => (s.id === sessionId ? { ...s, date } : s))
    )
  }

  const addSessionPhotos = (sessionId: string, urls: string[]) => {
    setSessions(prev =>
      prev.map(s =>
        s.id === sessionId
          ? { ...s, photoUrls: [...(s.photoUrls || []), ...urls] }
          : s
      )
    )
  }

  const addNewSession = () => {
    // Deactivate current sessions
    setSessions(prev =>
      prev.map(s => ({ ...s, isActive: false })).concat({
        id: crypto.randomUUID(),
        date: format(new Date(), 'yyyy-MM-dd'),
        notes: Array.from({ length: MIN_FITTING_NOTES }, () => ({
          id: crypto.randomUUID(),
          description: '',
          price: '',
          isConfirmed: false,
        })),
        photoUrls: [],
        isActive: true,
      })
    )
  }

  const switchSession = (sessionId: string) => {
    setSessions(prev =>
      prev.map(s => ({ ...s, isActive: s.id === sessionId }))
    )
  }

  return (
    <div className="space-y-6">
      {/* Session Tabs */}
      {sessions.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {sessions.map((session, index) => (
            <Button
              key={session.id}
              variant={session.isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => switchSession(session.id)}
            >
              <Calendar className="w-4 h-4 mr-1" />
              Fitting #{index + 1} ({session.date})
            </Button>
          ))}
        </div>
      )}

      {/* Active Session */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Scissors className="w-5 h-5 text-rose-600" />
            Fitting details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Input */}
          <div className="space-y-2">
            <Label htmlFor="fitting-date">
              Fitting date <span className="text-rose-600">*</span>
            </Label>
            <Input
              id="fitting-date"
              type="date"
              value={activeSession.date}
              onChange={(e) => updateSessionDate(activeSession.id, e.target.value)}
            />
          </div>

          {/* Fitting Notes */}
          <div className="space-y-3">
            <Label>Fitting notes and alterations</Label>
            
            {activeSession.notes.map((note, index) => (
              <div
                key={note.id}
                className={`grid grid-cols-12 gap-2 items-start p-3 rounded-lg border ${
                  note.isConfirmed
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200'
                }`}
              >
                {/* Note Number */}
                <div className="col-span-1 flex items-center justify-center">
                  <span className="text-sm font-medium text-muted-foreground">
                    {index + 1}
                  </span>
                </div>

                {/* Description Input */}
                <div className="col-span-6">
                  <Input
                    placeholder="Pvz.: Siaurinta juosmuo, sutrumpinta suknelė..."
                    value={note.description}
                    onChange={(e) =>
                      updateNote(activeSession.id, note.id, 'description', e.target.value)
                    }
                    disabled={note.isConfirmed}
                    className={note.isConfirmed ? 'bg-white' : ''}
                  />
                </div>

                {/* Price Input */}
                <div className="col-span-3">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={note.price}
                    onChange={(e) =>
                      updateNote(activeSession.id, note.id, 'price', e.target.value)
                    }
                    disabled={note.isConfirmed}
                    className={note.isConfirmed ? 'bg-white' : ''}
                  />
                </div>

                {/* Actions */}
                <div className="col-span-2 flex items-center justify-end gap-1">
                  {!note.isConfirmed ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => confirmNote(activeSession.id, note.id)}
                      disabled={!note.description.trim()}
                      className="text-green-600 hover:text-green-700 hover:bg-green-100"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  ) : (
                    <span className="text-xs text-green-600 font-medium">Pridėta</span>
                  )}
                  
                  {(activeSession.notes.length > MIN_FITTING_NOTES || note.description || note.price || note.isConfirmed) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeNote(activeSession.id, note.id)}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add Note Button */}
          <Button
            type="button"
            variant="outline"
            onClick={() => addNote(activeSession.id)}
            disabled={activeSession.notes.length >= MAX_FITTING_NOTES}
            className="w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add note
            {activeSession.notes.length >= MAX_FITTING_NOTES && (
              <span className="ml-2 text-xs text-muted-foreground">(max {MAX_FITTING_NOTES})</span>
            )}
          </Button>

          {/* Fitting Photos Upload */}
          <div className="space-y-2">
            <Label>Fitting photos</Label>
            {activeSession.photoUrls?.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {activeSession.photoUrls.map((url) => (
                  <img
                    key={url}
                    src={url}
                    alt="Fitting"
                    className="aspect-square w-full rounded-md object-cover border"
                  />
                ))}
              </div>
            )}
            <ImageUploader 
              orderId={orderId}
              section="fitting"
              maxFiles={10}
              maxSizeMB={10}
              onUploadComplete={(urls) => addSessionPhotos(activeSession.id, urls)}
            />
            <p className="text-xs text-muted-foreground">
              Photos are optional, but uploaded photos will stay saved with this fitting.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Add New Session Button */}
      <Button
        type="button"
        variant="outline"
        onClick={addNewSession}
        className="w-full"
      >
        <Plus className="w-4 h-4 mr-2" />
        New Fitting
      </Button>

      <p className="text-xs text-muted-foreground">
        * Press Enter or ✓ button to add note to order
      </p>
    </div>
  )
}
