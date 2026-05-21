import { useState, useMemo, type Dispatch, type SetStateAction } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Receipt, Euro, User } from 'lucide-react'
import { format } from 'date-fns'

const STAFF_MEMBERS = [
  { value: 'egidija', label: 'Egidija' },
  { value: 'eili', label: 'Eili' },
  { value: 'gintare', label: 'Gintarė' },
] as const

interface OrderItem {
  id: string
  type: 'dress' | 'alteration' | 'extra' | 'fitting' | 'custom'
  description: string
  price: number
  deleted?: boolean
  deletedAt?: string
  deletedBy?: string
}

export interface Payment {
  id: string
  date: string
  amount: string
  method: 'cash' | 'card' | 'link'
  notes: string
}

interface Section6OrderListProps {
  orderItems: OrderItem[]
  payments: Payment[]
  setPayments: Dispatch<SetStateAction<Payment[]>>
  onRemoveItem?: (id: string, deletedBy: string) => void
}

const categoryLabels: Record<string, string> = {
  dress: 'Dress',
  alteration: 'Alteration',
  extra: 'Extra',
  fitting: 'Fitting',
  custom: 'Custom',
}

const paymentMethodLabels: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  link: 'Link',
}

export function Section6OrderList({ orderItems, payments, setPayments, onRemoveItem }: Section6OrderListProps) {
  const [staffMember, setStaffMember] = useState<string>('')

  // Filter non-deleted items for totals
  const activeItems = orderItems.filter(item => !item.deleted)

  // Calculate totals
  const totalAmount = useMemo(() => {
    return activeItems.reduce((sum, item) => sum + item.price, 0)
  }, [activeItems])

  const totalPaid = useMemo(() => {
    return payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
  }, [payments])

  const balanceRemaining = totalAmount - totalPaid

  // Add new payment row
  const addPayment = () => {
    setPayments(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        date: format(new Date(), 'yyyy-MM-dd'),
        amount: '',
        method: 'cash',
        notes: '',
      },
    ])
  }

  // Update payment
  const updatePayment = (id: string, field: keyof Payment, value: string) => {
    setPayments(prev =>
      prev.map(p => (p.id === id ? { ...p, [field]: value } : p))
    )
  }

  // Remove payment
  const removePayment = (id: string) => {
    setPayments(prev => prev.filter(p => p.id !== id))
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Staff Member for Deletion */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <User className="w-5 h-5 text-blue-600" />
            <div className="flex-1">
              <Label className="text-sm">Staff Member (required for deletion)</Label>
              <Select
                value={staffMember}
                onValueChange={(value) => setStaffMember(value)}
              >
                <SelectTrigger className="w-48">
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
          </div>
        </CardContent>
      </Card>

      {/* Order Summary Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="w-5 h-5 text-rose-600" />
            Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orderItems.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Order is empty. Add items from other sections.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeItems.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100">
                        {categoryLabels[item.type] || item.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.price)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (onRemoveItem && staffMember) {
                            onRemoveItem(item.id, staffMember)
                          }
                        }}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-100"
                        disabled={!staffMember}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 border-gray-200">
                  <TableCell colSpan={4} className="text-right font-bold text-lg">
                    Viso:
                  </TableCell>
                  <TableCell className="text-right font-bold text-lg text-rose-600">
                    {formatCurrency(totalAmount)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Deleted Items */}
      {orderItems.some(item => item.deleted) && (
        <Card className="bg-gray-50 border-gray-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-gray-600">
              <Trash2 className="w-5 h-5" />
              Deleted Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Deleted By</TableHead>
                  <TableHead>Deleted At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderItems.filter(item => item.deleted).map((item) => (
                  <TableRow key={item.id} className="bg-gray-100">
                    <TableCell className="text-gray-500 line-through">{item.description}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                        {categoryLabels[item.type] || item.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium text-gray-500 line-through">
                      {formatCurrency(item.price)}
                    </TableCell>
                    <TableCell className="text-gray-600">{item.deletedBy || 'Unknown'}</TableCell>
                    <TableCell className="text-gray-600">{item.deletedAt || 'Unknown'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Payments Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Euro className="w-5 h-5 text-green-600" />
            Payments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {payments.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No payments yet. Add the first payment.
            </p>
          ) : (
            <div className="space-y-3">
              {payments.map((payment, index) => (
                <div
                  key={payment.id}
                  className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg border border-gray-200"
                >
                  {/* Payment Number */}
                  <div className="col-span-1">
                    <span className="text-sm font-medium text-muted-foreground">
                      {index + 1}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs">Date</Label>
                    <Input
                      type="date"
                      value={payment.date}
                      onChange={(e) =>
                        updatePayment(payment.id, 'date', e.target.value)
                      }
                    />
                  </div>

                  {/* Amount */}
                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs">Amount (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={payment.amount}
                      onChange={(e) =>
                        updatePayment(payment.id, 'amount', e.target.value)
                      }
                    />
                  </div>

                  {/* Method */}
                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs">Method</Label>
                    <Select
                      value={payment.method}
                      onValueChange={(value) =>
                        updatePayment(payment.id, 'method', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="link">Link</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Notes */}
                  <div className="col-span-5 space-y-1">
                    <Label className="text-xs">Payment notes</Label>
                    <Input
                      placeholder="e.g.: Advance, order confirmation..."
                      value={payment.notes}
                      onChange={(e) =>
                        updatePayment(payment.id, 'notes', e.target.value)
                      }
                    />
                  </div>

                  {/* Remove Button */}
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePayment(payment.id)}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Payment Button */}
          <Button
            type="button"
            variant="outline"
            onClick={addPayment}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add payment
          </Button>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card className="bg-gradient-to-r from-rose-50 to-gold-50 border-rose-200">
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total order</p>
              <p className="text-2xl font-bold text-rose-600">
                {formatCurrency(totalAmount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Paid</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalPaid)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Balance</p>
              <p
                className={`text-2xl font-bold ${
                  balanceRemaining > 0 ? 'text-rose-600' : 'text-green-600'
                }`}
              >
                {formatCurrency(balanceRemaining)}
              </p>
            </div>
          </div>

          {balanceRemaining <= 0 && totalAmount > 0 && (
            <p className="text-center mt-4 text-green-600 font-medium">
              ✅ Order fully paid!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
