import { z } from 'zod'

// Phone validation for IE/EU format
const phoneRegex = /^(\+353|0)[1-9][0-9]{7,8}$/

export const clientInfoSchema = z.object({
  clientName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  phone: z
    .string()
    .regex(phoneRegex, 'Enter valid phone number (+353 or 08x format)'),
  visitDate: z.string().min(1, 'Select visit date and time'),
  occasion: z.enum([
    'christening',
    'communion',
    'confirmation',
    'debs',
    'wedding',
    'wedding_alteration',
    'other',
  ], {
    required_error: 'Select occasion',
  }),
  occasionCustom: z.string().optional(),
  eventDate: z.string().optional(),
})

export type ClientInfoFormData = z.infer<typeof clientInfoSchema>

// Occasion labels in English
export const occasionLabels: Record<string, string> = {
  christening: 'Christening',
  communion: 'Communion',
  confirmation: 'Confirmation',
  debs: 'Debs',
  wedding: 'Wedding',
  wedding_alteration: 'Wedding Alteration',
  other: 'Other',
}

// Occasion values
export const occasionOptions = [
  { value: 'christening', label: 'Christening' },
  { value: 'communion', label: 'Communion' },
  { value: 'confirmation', label: 'Confirmation' },
  { value: 'debs', label: 'Debs' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'wedding_alteration', label: 'Wedding Alteration' },
  { value: 'other', label: 'Other' },
] as const
