import { useState, useEffect } from 'react'
import { Section1ClientInfo } from './Section1ClientInfo'
import { Section2DressSelect } from './Section2DressSelect'
import { MIN_ALTERATION_ROWS, Section3Alterations, type AlterationRow } from './Section3Alterations'
import { Section4Extras } from './Section4Extras'
import { MIN_FITTING_NOTES, Section5Fitting, type FittingSession } from './Section5Fitting'
import { Section6OrderList, type Payment } from './Section6OrderList'
import { OrderFormFooter } from './OrderFormFooter'
import { getNextOrderNumber } from '@/lib/utils/orderNumber'
import { clientInfoSchema } from '@/lib/utils/validation'
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
  blankOnMount?: boolean
}

export function OrderForm({ orderNumber: initialOrderNumber, blankOnMount = false }: OrderFormProps) {
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
  const [payments, setPayments] = useState<Payment[]>([])
  const [alterationRows, setAlterationRows] = useState<AlterationRow[]>(
    initialOrderNumber || blankOnMount ? createInitialAlterationRows : getInitialAlterationRows
  )
  const [fittingSessions, setFittingSessions] = useState<FittingSession[]>(
    initialOrderNumber || blankOnMount ? createInitialFittingSessions : getInitialFittingSessions
  )
  const [isSaving, setIsSaving] = useState(false)
  const [skipPdf, setSkipPdf] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [savedOrderId, setSavedOrderId] = useState<string | null>(null)
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

    if (initialOrderNumber || blankOnMount) {
      return initialData
    }

    try {
      const savedDraft = window.localStorage.getItem(CLIENT_INFO_DRAFT_KEY)
      return savedDraft ? { ...initialData, ...JSON.parse(savedDraft) } : initialData
    } catch {
      return initialData
    }
  })

  useEffect(() => {
    if (!blankOnMount || initialOrderNumber) return
    window.localStorage.removeItem(CLIENT_INFO_DRAFT_KEY)
    window.localStorage.removeItem(ALTERATIONS_DRAFT_KEY)
    window.localStorage.removeItem(FITTING_DRAFT_KEY)
  }, [blankOnMount, initialOrderNumber])

  // Fetch order number on mount if not provided
  useEffect(() => {
    if (!orderNumber && !initialOrderNumber) {
      getNextOrderNumber()
        .then(setOrderNumber)
        .catch(console.error)
    }
  }, [orderNumber, initialOrderNumber])

  useEffect(() => {
    if (initialOrderNumber) return
    window.localStorage.setItem(CLIENT_INFO_DRAFT_KEY, JSON.stringify(clientInfoData))
  }, [clientInfoData, initialOrderNumber])

  useEffect(() => {
    if (initialOrderNumber) return
    window.localStorage.setItem(ALTERATIONS_DRAFT_KEY, JSON.stringify(alterationRows))
  }, [alterationRows, initialOrderNumber])

  useEffect(() => {
    if (initialOrderNumber) return
    window.localStorage.setItem(FITTING_DRAFT_KEY, JSON.stringify(fittingSessions))
  }, [fittingSessions, initialOrderNumber])

  useEffect(() => {
    if (!initialOrderNumber) return

    const loadExistingOrder = async () => {
      try {
        setLoadError(null)
        const response = await fetch(`/api/get-order?orderNumber=${encodeURIComponent(initialOrderNumber)}`)
        const responseText = await response.text()
        let result: {
          order?: any
          items?: any[]
          payments?: any[]
          fittingSessions?: FittingSession[]
          error?: string
          details?: string
        } = {}

        if (responseText) {
          try {
            result = JSON.parse(responseText)
          } catch {
            throw new Error(responseText)
          }
        }

        if (!response.ok) {
          throw new Error(result.details || result.error || responseText || 'Failed to load order')
        }

        const order = result.order
        if (!order) {
          throw new Error('Order response did not include order data')
        }

        setSavedOrderId(order.id)
        setClientInfoData({
          clientName: order.client_name,
          phone: order.phone,
          visitDate: order.visit_date?.slice(0, 16) || '',
          occasion: order.occasion,
          occasionCustom: order.occasion_custom || '',
          eventDate: order.event_date || '',
        })
        setSelectedOccasion(order.occasion)
        const loadedItems = (Array.isArray(result.items) ? result.items : []).map((item: any) => ({
            id: item.id,
            type: item.item_type,
            description: item.description,
            price: Number(item.price) || 0,
            productId: item.product_id || undefined,
            imageUrl: item.image_url || undefined,
            deleted: item.deleted || false,
            deletedAt: item.deleted_at || undefined,
            deletedBy: item.deleted_by || undefined,
          }))
        setOrderItems(loadedItems)
        setPayments((Array.isArray(result.payments) ? result.payments : []).map((payment: any) => ({
          id: payment.id,
          date: payment.payment_date || new Date().toISOString().split('T')[0],
          amount: String(payment.amount ?? ''),
          method: payment.method === 'payment_link' ? 'link' : (payment.method || 'cash'),
          notes: payment.notes || '',
          acceptedBy: payment.accepted_by || '',
        })))
        const loadedAlterations = loadedItems
          .filter((item: OrderItem) => item.type === 'alteration')
          .map((item: OrderItem) => ({
            id: item.id,
            description: item.description,
            price: String(item.price),
            isConfirmed: true,
          }))
        setAlterationRows(
          loadedAlterations.length > 0
            ? loadedAlterations.concat(
              Array.from({ length: Math.max(0, MIN_ALTERATION_ROWS - loadedAlterations.length) }, () => ({
                id: crypto.randomUUID(),
                description: '',
                price: '',
                isConfirmed: false,
              }))
            )
            : createInitialAlterationRows()
        )
        setFittingSessions(
          Array.isArray(result.fittingSessions) && result.fittingSessions.length > 0
            ? result.fittingSessions
            : createInitialFittingSessions()
        )
      } catch (error) {
        console.error('Error loading order:', error)
        setLoadError(error instanceof Error ? error.message : 'Failed to load order')
      }
    }

    loadExistingOrder()
  }, [initialOrderNumber])

  // Calculate total amount from active (non-deleted) order items
  const totalAmount = orderItems.filter(item => !item.deleted).reduce((sum, item) => sum + item.price, 0)

  const resetToBlankOrder = async () => {
    window.localStorage.removeItem(CLIENT_INFO_DRAFT_KEY)
    window.localStorage.removeItem(ALTERATIONS_DRAFT_KEY)
    window.localStorage.removeItem(FITTING_DRAFT_KEY)
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
    setPayments([])
    setAlterationRows(createInitialAlterationRows())
    setFittingSessions(createInitialFittingSessions())
    setOrderNumber('')

    if (!initialOrderNumber) {
      try {
        setOrderNumber(await getNextOrderNumber())
      } catch (error) {
        console.error(error)
      }
    }
  }

  const triggerPdfGeneration = (orderId: string, mode: 'full' | 'fiting' | 'all' = 'full', skipPdf = false) => {
    const blob = new Blob([JSON.stringify({ orderId })], { type: 'application/json' });
    navigator.sendBeacon(`/api/generate-pdf?mode=${mode}&skipPdf=${skipPdf}`, blob);
  }

  const handleSaveOrder = async (data: {
    staffMember: string
    orderDate: string
  }, pdfMode: 'full' | 'fiting' | 'all' = 'full', skipPdf = false, noRedirect = false) => {
    setIsSaving(true)
    try {
      const clientInfoResult = clientInfoSchema.safeParse(clientInfoData)

      if (!clientInfoResult.success) {
        setIsExpanded(prev => ({ ...prev, 1: true }))
        const firstIssue = clientInfoResult.error.issues[0]
        throw new Error(firstIssue?.message || 'Please complete client information before saving')
      }

      const activeItems = orderItems.filter(item => !item.deleted)
      const deletedItems = orderItems.filter(item => item.deleted)
      const paymentsToSave = payments
        .filter(payment => payment.amount.trim())
        .filter(payment => payment.acceptedBy.trim())
        .map(payment => ({
          id: payment.id,
          paymentDate: payment.date,
          amount: parseFloat(payment.amount) || 0,
          method: payment.method === 'link' ? 'payment_link' : payment.method,
          notes: payment.notes,
          acceptedBy: payment.acceptedBy,
        }))
      const alterationItemsFromRows: OrderItem[] = alterationRows
        .filter(row => row.description.trim())
        .map(row => ({
          id: row.id,
          type: 'alteration',
          description: row.description.trim(),
          price: parseFloat(row.price) || 0,
        }))
      const fittingItemsFromSessions: OrderItem[] = fittingSessions.flatMap(session =>
        session.notes
          .filter(note => note.description.trim())
          .map(note => ({
            id: note.id,
            type: 'fitting',
            description: `Fitting (${session.date}): ${note.description.trim()}`,
            price: parseFloat(note.price) || 0,
          }))
      )
      const activeItemsWithoutGeneratedItems = activeItems.filter(
        item => item.type !== 'alteration' && item.type !== 'fitting'
      )
      const itemsToSave = [
        ...activeItemsWithoutGeneratedItems,
        ...alterationItemsFromRows,
        ...fittingItemsFromSessions,
        ...deletedItems,
      ]
      const primaryDress = itemsToSave.find(item => item.type === 'dress' || item.type === 'custom')
      const response = await fetch('/api/save-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderNumber,
          clientName: clientInfoResult.data.clientName,
          phone: clientInfoResult.data.phone,
          visitDate: clientInfoResult.data.visitDate,
          occasion: clientInfoResult.data.occasion,
          occasionCustom: clientInfoResult.data.occasionCustom,
          eventDate: clientInfoResult.data.eventDate,
          dressType: primaryDress?.type === 'custom' ? 'custom' : 'catalogue',
          staffMember: data.staffMember,
          totalAmount,
          totalPaid: paymentsToSave.reduce((sum, payment) => sum + payment.amount, 0),
          items: itemsToSave,
          payments: paymentsToSave,
          fittingSessions,
          orderId: savedOrderId,
          isExistingOrder: Boolean(initialOrderNumber),
        }),
      })

      const responseText = await response.text()
      let result: { orderNumber?: string; orderId?: string; error?: string; details?: string } = {}

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
      if (initialOrderNumber) {
        if (result.orderId) triggerPdfGeneration(result.orderId, pdfMode, skipPdf)
        alert(`Order saved: ${result.orderNumber}`)
        if (!noRedirect) window.location.href = '/admin'
        return
      }

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
      setPayments([])
      setAlterationRows(createInitialAlterationRows())
      setFittingSessions(createInitialFittingSessions())
      setOrderNumber(initialOrderNumber ? orderNumber : await getNextOrderNumber())
      if (result.orderId) triggerPdfGeneration(result.orderId, pdfMode, skipPdf)
      alert(`Order saved: ${result.orderNumber}`)
      window.location.href = '/admin'
    } catch (error) {
      setIsSaving(false)
      alert(error instanceof Error ? error.message : 'Failed to save order')
    }
  }

  const handleSaveFitting = async () => {
    if (!initialOrderNumber) {
      alert('Please save the order first before saving fitting data')
      return
    }
    await handleSaveOrder({ staffMember: '', orderDate: '' }, 'fiting', false, true)
  }

  const toggleSection = (section: number) => {
    setIsExpanded(prev => ({ ...prev, [section]: !prev[section] }))
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
    imageUrls?: string[]
  }) => {
    const orderItem: OrderItem = {
      id: item.id,
      type: item.type === 'catalogue' ? 'dress' : 'custom',
      description: item.description,
      price: item.price,
      productId: item.productId,
      imageUrl: item.imageUrls ? JSON.stringify(item.imageUrls) : item.imageUrl,
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
      imageUrl: item.imageUrl,
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
      {loadError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Failed to load saved order: {loadError}
        </div>
      )}

      {/* Order Number Header */}
      <div className="flex items-center justify-between p-4 bg-rose-50 rounded-lg border border-rose-200">
        <div>
          <h1 className="text-3xl font-bold text-rose-700">Giga Fashion</h1>
          <p className="text-muted-foreground">Kliento užsakymo forma</p>
        </div>
        <div className="flex items-center gap-3">
          {!initialOrderNumber && (
            <button
              type="button"
              onClick={resetToBlankOrder}
              className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
            >
              New Blank Order
            </button>
          )}
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Order Number</p>
            <p className="text-lg font-bold text-rose-600">
              {orderNumber || 'Generating...'}
            </p>
          </div>
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
            orderId={savedOrderId || orderNumber}
            sessions={fittingSessions}
            setSessions={setFittingSessions}
            onSaveFitting={handleSaveFitting}
            isSaving={isSaving}
          />
        </div>
      </div>

      {/* Section 6 - Order List */}
      <div className="rounded-lg border border-gray-200">
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
              payments={payments}
              setPayments={setPayments}
              orderId={savedOrderId}
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
        skipPdf={skipPdf}
        setSkipPdf={setSkipPdf}
      />
    </div>
  )
}
