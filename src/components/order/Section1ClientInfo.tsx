import { useState } from 'react'
import { clientInfoSchema, occasionOptions, type ClientInfoFormData } from '@/lib/utils/validation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Section1ClientInfoProps {
  onSubmit?: (data: ClientInfoFormData) => void
  defaultValues?: Partial<ClientInfoFormData>
  onDataChange?: (data: Partial<ClientInfoFormData>) => void
}

export function Section1ClientInfo({ onSubmit, defaultValues, onDataChange }: Section1ClientInfoProps) {
  const [errors, setErrors] = useState<Partial<Record<keyof ClientInfoFormData, string>>>({})
  const selectedOccasion = defaultValues?.occasion
  const isOtherOccasion = selectedOccasion === 'other'

  const handleFieldChange = (
    field: keyof ClientInfoFormData,
    value: ClientInfoFormData[keyof ClientInfoFormData]
  ) => {
    onDataChange?.({
      ...defaultValues,
      [field]: value,
    })
  }

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = clientInfoSchema.safeParse(defaultValues)

    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ClientInfoFormData, string>> = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ClientInfoFormData
        fieldErrors[field] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setErrors({})
    onSubmit?.(result.data)
  }

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      {/* Client Name */}
      <div className="space-y-2">
        <Label htmlFor="clientName">
          Client Name <span className="text-rose-600">*</span>
        </Label>
        <Input
          id="clientName"
          value={defaultValues?.clientName ?? ''}
          onChange={(event) => handleFieldChange('clientName', event.target.value)}
          placeholder="Enter full name"
          className={errors.clientName ? 'border-rose-500' : ''}
        />
        {errors.clientName && (
          <p className="text-sm text-rose-600">{errors.clientName}</p>
        )}
      </div>

      {/* Phone Number */}
      <div className="space-y-2">
        <Label htmlFor="phone">
          Phone Number <span className="text-rose-600">*</span>
        </Label>
        <Input
          id="phone"
          value={defaultValues?.phone ?? ''}
          onChange={(event) => handleFieldChange('phone', event.target.value)}
          placeholder="+353... or 08x..."
          className={errors.phone ? 'border-rose-500' : ''}
        />
        {errors.phone && (
          <p className="text-sm text-rose-600">{errors.phone}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Format: +353XXXXXXXX or 08XXXXXXXX
        </p>
      </div>

      {/* Visit Date & Time */}
      <div className="space-y-2">
        <Label htmlFor="visitDate">
          Visit Date & Time <span className="text-rose-600">*</span>
        </Label>
        <Input
          id="visitDate"
          type="datetime-local"
          value={defaultValues?.visitDate ?? ''}
          onChange={(event) => handleFieldChange('visitDate', event.target.value)}
          className={errors.visitDate ? 'border-rose-500' : ''}
        />
        {errors.visitDate && (
          <p className="text-sm text-rose-600">{errors.visitDate}</p>
        )}
      </div>

      {/* Occasion */}
      <div className="space-y-2">
        <Label htmlFor="occasion">
          Occasion <span className="text-rose-600">*</span>
        </Label>
        <Select
          value={selectedOccasion}
          onValueChange={(value) => {
            const occasion = value as ClientInfoFormData['occasion']
            onDataChange?.({
              ...defaultValues,
              occasion,
            })
          }}
        >
          <SelectTrigger className={errors.occasion ? 'border-rose-500' : ''}>
            <SelectValue placeholder="Select occasion" />
          </SelectTrigger>
          <SelectContent>
            {occasionOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.occasion && (
          <p className="text-sm text-rose-600">{errors.occasion}</p>
        )}
      </div>

      {/* Other Occasion Text Field (conditional) */}
      {isOtherOccasion && (
        <div className="space-y-2">
          <Label htmlFor="occasionCustom">
            Other Occasion <span className="text-rose-600">*</span>
          </Label>
          <Input
            id="occasionCustom"
            value={defaultValues?.occasionCustom ?? ''}
            onChange={(event) => handleFieldChange('occasionCustom', event.target.value)}
            placeholder="Specify occasion"
          />
        </div>
      )}

      {/* Event Date */}
      <div className="space-y-2">
        <Label htmlFor="eventDate">Event Date</Label>
        <Input
          id="eventDate"
          type="date"
          value={defaultValues?.eventDate ?? ''}
          onChange={(event) => handleFieldChange('eventDate', event.target.value)}
        />
      </div>

      {/* Submit Button */}
      <Button type="submit" className="w-full">
        Continue to Dress Selection
      </Button>
    </form>
  )
}
