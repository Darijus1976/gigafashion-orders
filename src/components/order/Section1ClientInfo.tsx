import { occasionOptions, type ClientInfoFormData } from '@/lib/utils/validation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Section1ClientInfoProps {
  defaultValues?: Partial<ClientInfoFormData>;
  onDataChange?: (data: Partial<ClientInfoFormData>) => void;
}

export function Section1ClientInfo({ defaultValues, onDataChange }: Section1ClientInfoProps) {
  const selectedOccasion = defaultValues?.occasion;
  const isOtherOccasion = selectedOccasion === 'other';

  const handleFieldChange = (field: keyof ClientInfoFormData, value: ClientInfoFormData[keyof ClientInfoFormData]) => {
    onDataChange?.({ ...defaultValues, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="clientName" className="text-base font-semibold">Client Name <span className="text-rose-600">*</span></Label>
        <Input id="clientName" value={defaultValues?.clientName ?? ''} onChange={(e) => handleFieldChange('clientName', e.target.value)} placeholder="Enter full name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-base font-semibold">Phone Number <span className="text-rose-600">*</span></Label>
        <Input id="phone" type="tel" inputMode="tel" value={defaultValues?.phone ?? ''} onChange={(e) => handleFieldChange('phone', e.target.value)} placeholder="Enter phone number" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="visitDate" className="text-base font-semibold">Visit Date & Time <span className="text-rose-600">*</span></Label>
        <Input id="visitDate" type="datetime-local" value={defaultValues?.visitDate ?? ''} onChange={(e) => handleFieldChange('visitDate', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="occasion" className="text-base font-semibold">Occasion <span className="text-rose-600">*</span></Label>
        <Select value={selectedOccasion} onValueChange={(value) => { onDataChange?.({ ...defaultValues, occasion: value as ClientInfoFormData['occasion'] }) }}>
          <SelectTrigger><SelectValue placeholder="Select occasion" /></SelectTrigger>
          <SelectContent>{occasionOptions.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}</SelectContent>
        </Select>
      </div>
      {isOtherOccasion && (
        <div className="space-y-2">
          <Label htmlFor="occasionCustom" className="text-base font-semibold">Other Occasion <span className="text-rose-600">*</span></Label>
          <Input id="occasionCustom" value={defaultValues?.occasionCustom ?? ''} onChange={(e) => handleFieldChange('occasionCustom', e.target.value)} placeholder="Specify occasion" />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="eventDate" className="text-base font-semibold">Event Date</Label>
        <Input id="eventDate" type="date" value={defaultValues?.eventDate ?? ''} onChange={(e) => handleFieldChange('eventDate', e.target.value)} />
      </div>
    </div>
  );
}
