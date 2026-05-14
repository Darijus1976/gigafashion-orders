import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
}

export function Section1ClientInfo({ onSubmit, defaultValues }: Section1ClientInfoProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ClientInfoFormData>({
    resolver: zodResolver(clientInfoSchema),
    defaultValues: {
      clientName: '',
      phone: '',
      visitDate: new Date().toISOString().slice(0, 16),
      occasion: undefined,
      occasionCustom: '',
      eventDate: '',
      ...defaultValues,
    },
  })

  const selectedOccasion = watch('occasion')
  const isOtherOccasion = selectedOccasion === 'other'

  const handleFormSubmit = (data: ClientInfoFormData) => {
    onSubmit?.(data)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Client Name */}
      <div className="space-y-2">
        <Label htmlFor="clientName">
          Client Name <span className="text-rose-600">*</span>
        </Label>
        <Input
          id="clientName"
          {...register('clientName')}
          placeholder="Enter full name"
          className={errors.clientName ? 'border-rose-500' : ''}
        />
        {errors.clientName && (
          <p className="text-sm text-rose-600">{errors.clientName.message}</p>
        )}
      </div>

      {/* Phone Number */}
      <div className="space-y-2">
        <Label htmlFor="phone">
          Phone Number <span className="text-rose-600">*</span>
        </Label>
        <Input
          id="phone"
          {...register('phone')}
          placeholder="+353... or 08x..."
          className={errors.phone ? 'border-rose-500' : ''}
        />
        {errors.phone && (
          <p className="text-sm text-rose-600">{errors.phone.message}</p>
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
          {...register('visitDate')}
          className={errors.visitDate ? 'border-rose-500' : ''}
        />
        {errors.visitDate && (
          <p className="text-sm text-rose-600">{errors.visitDate.message}</p>
        )}
      </div>

      {/* Occasion */}
      <div className="space-y-2">
        <Label htmlFor="occasion">
          Occasion <span className="text-rose-600">*</span>
        </Label>
        <Select
          value={selectedOccasion}
          onValueChange={(value) => setValue('occasion', value as ClientInfoFormData['occasion'])}
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
          <p className="text-sm text-rose-600">{errors.occasion.message}</p>
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
            {...register('occasionCustom')}
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
          {...register('eventDate')}
        />
      </div>

      {/* Submit Button */}
      <Button type="submit" className="w-full">
        Continue to Dress Selection
      </Button>
    </form>
  )
}
