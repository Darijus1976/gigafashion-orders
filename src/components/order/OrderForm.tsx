import { useState, useEffect } from 'react'
import { Section1ClientInfo } from './Section1ClientInfo'
import { Section2DressSelect } from './Section2DressSelect'
import { MIN_ALTERATION_ROWS, Section3Alterations, type AlterationRow } from './Section3Alterations'
import { Section4Extras } from './Section4Extras'
import { MIN_FITTING_NOTES, Section5Fitting, type FittingSession } from './Section5Fitting'
import { Section6OrderList } from './Section6OrderList'
import { OrderFormFooter } from './OrderFormFooter'
import { getNextOrderNumber } from '@/lib/utils/orderNumber'
import type { ClientInfoFormData } from '@/lib/utils/validation'
import type { Database } from '@/lib/supabase/types'

type Occasion = Database['public']['Tables']['orders']['Row']['occasion']
const CLIENT_INFO_DRAFT_KEY = 'gigafashion-client-info-draft'
const ALTERATIONS_DRAFT_KEY = 'gigafashion-alterations-draft'
const FITTING_DRAFT_KEY = 'gigafashion-fitting-draft'

const createInitialAlterationRows = (): AlterationRow[] =>
  Array.from({ length: MIN_ALTERATION_ROWS }, () => ({
    id: crypto.randomUUID(),
    description: '',
    price: '',
    isConfirmed: false,
  }))

const getInitialAlterationRows = (): AlterationRow[] => {
  try {
    const savedDraft = window.localStorage.getItem(ALTERATIONS_DRAFT_KEY)
    const parsedDraft = savedDraft ? JSON.parse(savedDraft) : null
    return Array.isArray(parsedDraft) && parsedDraft.length > 0
      ? parsedDraft
      : createInitialAlterationRows()
  } catch {
    return createInitialAlterationRows()
  }
}

const createInitialFittingSessions = (): FittingSession[] => [
  {
    id: crypto.randomUUID(),
    date: new Date().toISOString().split('T')[0],
    notes: Array.from({ length: MIN_FITTING_NOTES }, () => ({
      id: crypto.randomUUID(),
      description: '',
      price: '',
      isConfirmed: false,
    })),
    photoUrls: [],
    isActive: true,
  },
]

const getInitialFittingSessions = (): FittingSession[] => {
  try {
    const savedDraft = window.localStorage.getItem(FITTING_DRAFT_KEY)
    const parsedDraft = savedDraft ? JSON.parse(savedDraft) : null
    return Array.isArray(parsedDraft) && parsedDraft.length > 0
      ? parsedDraft
      : createInitialFittingSessions()
  } catch {
    return createInitialFittingSessions()
  }
}

interface OrderItem {
  id: string
  type: 'dress' | 'alteration' | 'extra' | 'fitting' | 'custom'
  description: string
  price: number
  productId?: string
  imageUrl?: string
  deleted?: boolean
  deletedAt?: string
  deletedBy?: string
}

interface OrderFormProps {
  orderNumber?: string
}

export function OrderForm({ orderNumber: initialOrderNumber }: OrderFormProps) {
  const [isExpanded, setIsExpanded] = useState<Record<number, boolean>>({
    1: true,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
  })
  
  const [selectedOccasion, setSelectedOccasion] = useState<Occasion | undefined>()
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [alterationRows, setAlterationRows] = useState<AlterationRow[]>(getInitialAlterationRows)
  const [fittingSessions, setFittingSessions] = useState<FittingSession[]>(getInitialFittingSessions)
  const [isSaving, setIsSaving] = useState(false)
  const [orderNumber, setOrderNumber] = useState<string>(initialOrderNumber || '')
  const [clientInfoData, setClientInfoData] = useState<Partial<ClientInfoFormData>>(() => {
    const initialData = {
      clientName: '',
      phone: '',
      visitDate: new Date().toISOString().slice(0, 16),
      occasion: undefined,
      occasionCustom: '',
      eventDate: '',
    }

    try {
      const savedDraft = window.localStorage.getItem(CLIENT_INFO_DRAFT_KEY)
      return savedDraft ? { ...initialData, ...JSON.parse(savedDraft) } : initialData
    } catch {
      return initialData
    }
  })

  // Fetch order number on mount if not provided
  useEffect(() => {
    if (!orderNumber && !initialOrderNumber) {
      getNextOrderNumber()
        .then(setOrderNumber)
        .catch(console.error)
    }
  }, [orderNumber, initialOrderNumber])

  useEffect(() => {
    window.localStorage.setItem(CLIENT_INFO_DRAFT_KEY, JSON.stringify(clientInfoData))
  }, [clientInfoData])

  useEffect(() => {
    window.localStorage.setItem(ALTERATIONS_DRAFT_KEY, JSON.stringify(alterationRows))
  }, [alterationRows])

  useEffect(() => {
    window.localStorage.setItem(FITTING_DRAFT_KEY, JSON.stringify(fittingSessions))
  }, [fittingSessions])

  useEffect(() => {
    if (!initialOrderNumber) return

    const loadExistingOrder = async () => {
      try {
        const response = await fetch(`/api/get-order?orderNumber=${encodeURIComponent(initialOrderNumber)}`)
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.details || result.error || 'Failed to load order')
        }

        const order = result.order
        setClientInfoData({
          clientName: order.client_name,
          phone: order.phone,
          visitDate: order.visit_date?.slice(0, 16) || '',
          occasion: order.occasion,
          occasionCustom: order.occasion_custom || '',
          eventDate: order.event_date || '',
        })
        setSelectedOccasion(order.occasion)
        setOrderItems(
          result.items.map((item: any) => ({
            id: item.id,
            type: item.item_type,
            description: item.description,
            price: Number(item.price) || 0,
            productId: item.product_id || undefined,
          }))
        )
        setFittingSessions(
          Array.isArray(result.fittingSessions) && result.fittingSessions.length > 0
            ? result.fittingSessions
            : createInitialFittingSessions()
        )
      } catch (error) {
        console.error('Error loading order:', error)
      }
    }

    loadExistingOrder()
  }, [initialOrderNumber])

  // Calculate total amount from order items
  const totalAmount = orderItems.reduce((sum, item) => sum + item.price, 0)

  const handleSaveOrder = async (data: {
    staffMember: string
    orderDate: string
  }) => {
    setIsSaving(true)
    try {
      const activeItems = orderItems.filter(item => !item.deleted)
      const primaryDress = activeItems.find(item => item.type === 'dress' || item.type === 'custom')
      const response = await fetch('/api/save-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderNumber,
          clientName: clientInfoData.clientName,
          phone: clientInfoData.phone,
          visitDate: clientInfoData.visitDate,
          occasion: clientInfoData.occasion,
          occasionCustom: clientInfoData.occasionCustom,
          eventDate: clientInfoData.eventDate,
          dressType: primaryDress?.type === 'custom' ? 'custom' : 'catalogue',
          staffMember: data.staffMember,
          totalAmount,
          totalPaid: 0,
          items: activeItems,
          fittingSessions,
        }),
      })

      const responseText = await response.text()
      let result: { orderNumber?: string; error?: string; details?: string } = {}

      if (responseText) {
        try {
          result = JSON.parse(responseText)
        } catch {
          throw new Error(responseText)
        }
      }

      if (!response.ok) {
        throw new Error(result.details || result.error || responseText || 'Failed to save order')
      }

      window.localStorage.removeItem(CLIENT_INFO_DRAFT_KEY)
      window.localStorage.removeItem(ALTERATIONS_DRAFT_KEY)
      window.localStorage.removeItem(FITTING_DRAFT_KEY)
      setIsSaving(false)
      setClientInfoData({
        clientName: '',
        phone: '',
        visitDate: new Date().toISOString().slice(0, 16),
        occasion: undefined,
        occasionCustom: '',
        eventDate: '',
      })
      setSelectedOccasion(undefined)
      setOrderItems([])
      setAlterationRows(createInitialAlterationRows())
      setFittingSessions(createInitialFittingSessions())
      setOrderNumber('')
      alert(`Order saved: ${result.orderNumber}`)
    } catch (error) {
      setIsSaving(false)
      alert(error instanceof Error ? error.message : 'Failed to save order')
    }
  }

  const toggleSection = (section: number) => {
    setIsExpanded(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handleClientInfoSubmit = (data: ClientInfoFormData) => {
    console.log('Client info submitted:', data)
    setClientInfoData(data)
    setSelectedOccasion(data.occasion)
    // TODO: Save to Zustand store
  }

  const handleClientInfoChange = (data: Partial<ClientInfoFormData>) => {
    setClientInfoData(data)
    setSelectedOccasion(data.occasion)
  }
  
  const handleAddDressToOrder = (item: {
    id: string
    type: 'catalogue' | 'custom'
    description: string
    price: number
    productId?: string
    imageUrl?: string
  }) => {
    const orderItem: OrderItem = {
      id: item.id,
      type: item.type === 'catalogue' ? 'dress' : 'custom',
      description: item.description,
      price: item.price,
      productId: item.productId,
      imageUrl: item.imageUrl,
    }
    setOrderItems(prev => [...prev, orderItem])
  }
  
  const handleAddAlterationToOrder = (item: {
    id: string
    description: string
    price: number
  }) => {
    const orderItem: OrderItem = {
      id: item.id,
      type: 'alteration',
      description: item.description,
      price: item.price,
    }
    setOrderItems(prev => [...prev, orderItem])
    console.log('Added alteration to order:', orderItem)
  }

  const handleRemoveAlterationFromOrder = (id: string) => {
    setOrderItems(prev => prev.filter(item => item.id !== id))
  }
  
  const handleAddExtraToOrder = (item: {
    id: string
    description: string
    price: number
    productId?: string
    imageUrl?: string
  }) => {
    const orderItem: OrderItem = {
      id: item.id,
      type: 'extra',
      description: item.description,
      price: item.price,
      productId: item.productId,
    }
    setOrderItems(prev => [...prev, orderItem])
    console.log('Added extra to order:', orderItem)
  }
  
  const handleAddFittingToOrder = (item: {
    id: string
    description: string
    price: number
    fittingSessionId: string
  }) => {
    const orderItem: OrderItem = {
      id: item.id,
      type: 'fitting',
      description: item.description,
      price: item.price,
    }
    setOrderItems(prev => [...prev, orderItem])
    console.log('Added fitting to order:', orderItem)
  }

  const handleRemoveFittingFromOrder = (id: string) => {
    setOrderItems(prev => prev.filter(item => item.id !== id))
  }

  return (
    <div className="space-y-4 pb-32">
      {/* Order Number Header */}
      <div className="flex items-center justify-between p-4 bg-rose-50 rounded-lg border border-rose-200">
        <h1 className="text-xl font-bold text-rose-800">
          New Order
        </h1>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Order Number</p>
          <p className="text-lg font-bold text-rose-600">
            {orderNumber || 'Generating...'}
          </p>
        </div>
      </div>

      {/* Section 1 - Client Info */}
      <div className="rounded-lg border border-gray-200">
        <button
          onClick={() => toggleSection(1)}
          className="flex w-full items-center justify-between p-4 text-left font-medium"
        >
          <span>1. Client Information</span>
          <span>{isExpanded[1] ? '−' : '+'}</span>
        </button>
        <div 
          className="border-t border-gray-200 p-4"
          style={{ display: isExpanded[1] ? 'block' : 'none' }}
        >
          <Section1ClientInfo 
            onSubmit={handleClientInfoSubmit} 
            defaultValues={clientInfoData}
            onDataChange={handleClientInfoChange}
          />
        </div>
      </div>

      {/* Section 2 - Dress Selection */}
      <div className="rounded-lg border border-gray-200">
        <button
          onClick={() => toggleSection(2)}
          className="flex w-full items-center justify-between p-4 text-left font-medium"
        >
          <span>2. Dress Selection</span>
          <span>{isExpanded[2] ? '−' : '+'}</span>
        </button>
        {isExpanded[2] && (
          <div className="border-t border-gray-200 p-4">
            <Section2DressSelect 
              occasion={selectedOccasion}
              onAddToOrder={handleAddDressToOrder}
              orderItems={orderItems}
              onRemoveItem={(id) => setOrderItems(prev => prev.filter(item => item.id !== id))}
            />
          </div>
        )}
      </div>

      {/* Section 3 - Alterations */}
      <div className="rounded-lg border border-gray-200">
        <button
          onClick={() => toggleSection(3)}
          className="flex w-full items-center justify-between p-4 text-left font-medium"
        >
          <span>3. Alterations</span>
          <span>{isExpanded[3] ? '−' : '+'}</span>
        </button>
        <div
          className="border-t border-gray-200 p-4"
          style={{ display: isExpanded[3] ? 'block' : 'none' }}
        >
          <Section3Alterations
            onAddToOrder={handleAddAlterationToOrder}
            onRemoveFromOrder={handleRemoveAlterationFromOrder}
            rows={alterationRows}
            setRows={setAlterationRows}
          />
        </div>
      </div>

      {/* Section 4 - Extras */}
      <div className="rounded-lg border border-gray-200">
        <button
          onClick={() => toggleSection(4)}
          className="flex w-full items-center justify-between p-4 text-left font-medium"
        >
          <span>4. Extras</span>
          <span>{isExpanded[4] ? '−' : '+'}</span>
        </button>
        {isExpanded[4] && (
          <div className="border-t border-gray-200 p-4">
            <Section4Extras onAddToOrder={handleAddExtraToOrder} />
          </div>
        )}
      </div>

      {/* Section 5 - Fitting */}
      <div className="rounded-lg border border-gray-200">
        <button
          onClick={() => toggleSection(5)}
          className="flex w-full items-center justify-between p-4 text-left font-medium"
        >
          <span>5. Fitting</span>
          <span>{isExpanded[5] ? '−' : '+'}</span>
        </button>
        <div
          className="border-t border-gray-200 p-4"
          style={{ display: isExpanded[5] ? 'block' : 'none' }}
        >
          <Section5Fitting
            onAddToOrder={handleAddFittingToOrder}
            onRemoveFromOrder={handleRemoveFittingFromOrder}
            orderId={orderNumber}
            sessions={fittingSessions}
            setSessions={setFittingSessions}
          />
        </div>
      </div>

      {/* Section 6 - Order List */}
      <div className="rounded-lg border border-gray-200 mb-32">
        <button
          onClick={() => toggleSection(6)}
          className="flex w-full items-center justify-between p-4 text-left font-medium"
        >
          <span>6. Order Summary</span>
          <span>{isExpanded[6] ? '−' : '+'}</span>
        </button>
        {isExpanded[6] && (
          <div className="border-t border-gray-200 p-4">
            <Section6OrderList 
              orderItems={orderItems}
              onRemoveItem={(id, deletedBy) => {
                setOrderItems(prev => prev.map(item => 
                  item.id === id 
                    ? { 
                        ...item, 
                        deleted: true, 
                        deletedAt: new Date().toISOString(), 
                        deletedBy 
                      } 
                    : item
                ))
              }}
            />
          </div>
        )}
      </div>

      {/* Footer with Save Button */}
      <OrderFormFooter
        onSave={handleSaveOrder}
        isSaving={isSaving}
        totalAmount={totalAmount}
      />
    </div>
  )
}
