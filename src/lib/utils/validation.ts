import { z } from 'zod'

export const clientInfoSchema = z.object({
  clientName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  phone: z
    .string()
    .min(1, 'Phone number is required'),
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
