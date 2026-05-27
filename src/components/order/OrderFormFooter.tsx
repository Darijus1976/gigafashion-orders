import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Save, User, Calendar } from 'lucide-react'
import { format } from 'date-fns'

const STAFF_MEMBERS = [
  { value: 'egidija', label: 'Egidija' },
  { value: 'eili', label: 'Eili' },
  { value: 'gintare', label: 'Gintarė' },
] as const

type StaffMember = (typeof STAFF_MEMBERS)[number]['value']

interface OrderFormFooterProps {
  onSave: (data: {
    staffMember: StaffMember
    orderDate: string
  }) => void
  isSaving?: boolean
  totalAmount: number
}

export function OrderFormFooter({
  onSave,
  isSaving = false,
  totalAmount,
}: OrderFormFooterProps) {
  const [staffMember, setStaffMember] = useState<StaffMember | ''>('')
  const [orderDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [isValid, setIsValid] = useState(false)

  useEffect(() => {
    setIsValid(staffMember !== '')
  }, [staffMember])

  const handleSave = () => {
    if (staffMember) {
      onSave({
        staffMember,
        orderDate,
      })
    }
  }

  return (
    <div className="relative sm:fixed sm:bottom-0 sm:left-0 sm:right-0 bg-white border-t border-gray-200 p-4 shadow-lg sm:z-50">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left side - Staff and Date */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
          {/* Staff Member Select */}
          <div className="space-y-1 w-full sm:w-48">
            <Label htmlFor="staff-member" className="text-xs flex items-center gap-1">
              <User className="w-3 h-3" />
              Staff Member <span className="text-rose-600">*</span>
            </Label>
            <Select
              value={staffMember}
              onValueChange={(value) => setStaffMember(value as StaffMember)}
            >
              <SelectTrigger id="staff-member">
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                {STAFF_MEMBERS.map((member) => (
                  <SelectItem key={member.value} value={member.value}>
                    {member.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Order Date (Read-only) */}
          <div className="space-y-1 w-full sm:w-40">
            <Label htmlFor="order-date" className="text-xs flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Order Date
            </Label>
            <Input
              id="order-date"
              type="date"
              value={orderDate}
              readOnly
              className="bg-gray-50 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Right side - Total and Save Button */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          {/* Total Amount Display */}
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total Order</p>
            <p className="text-xl font-bold text-rose-600">
              {new Intl.NumberFormat('en-IE', {
                style: 'currency',
                currency: 'EUR',
              }).format(totalAmount)}
            </p>
          </div>

          {/* Save Button */}
          <Button
            size="lg"
            onClick={handleSave}
            disabled={!isValid || isSaving}
            className="w-full sm:w-auto min-w-[160px]"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'SAVE'}
          </Button>
        </div>
      </div>

      {/* Warning if not valid */}
      {!isValid && (
        <p className="text-xs text-rose-600 text-center sm:text-left mt-2 sm:mt-0 max-w-4xl mx-auto">
          * Select staff member to save order
        </p>
      )}
    </div>
  )
}
