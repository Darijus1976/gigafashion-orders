import { useState, useEffect } from 'react'
import { Section1ClientInfo } from './Section1ClientInfo'
import { Section2DressSelect } from './Section2DressSelect'
import { Section3Alterations } from './Section3Alterations'
import { Section4Extras } from './Section4Extras'
import { Section5Fitting } from './Section5Fitting'
import { Section6OrderList } from './Section6OrderList'
import { OrderFormFooter } from './OrderFormFooter'
import { getNextOrderNumber } from '@/lib/utils/orderNumber'
import type { ClientInfoFormData } from '@/lib/utils/validation'
import type { Database } from '@/lib/supabase/types'

type Occasion = Database['public']['Tables']['orders']['Row']['occasion']

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
  const [isSaving, setIsSaving] = useState(false)
  const [orderNumber, setOrderNumber] = useState<string>(initialOrderNumber || '')

  // Fetch order number on mount if not provided
  useEffect(() => {
    if (!orderNumber && !initialOrderNumber) {
      getNextOrderNumber()
        .then(setOrderNumber)
        .catch(console.error)
    }
  }, [orderNumber, initialOrderNumber])

  // Calculate total amount from order items
  const totalAmount = orderItems.reduce((sum, item) => sum + item.price, 0)

  const handleSaveOrder = async (data: {
    staffMember: string
    orderDate: string
  }) => {
    setIsSaving(true)
    console.log('Saving order:', {
      staffMember: data.staffMember,
      orderDate: data.orderDate,
      totalAmount,
      items: orderItems,
    })
    // TODO: Implement actual save logic with Supabase
    // await supabase.from('orders').insert(...)
    setTimeout(() => {
      setIsSaving(false)
      alert('Order saved!')
    }, 1000)
  }

  const toggleSection = (section: number) => {
    setIsExpanded(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handleClientInfoSubmit = (data: ClientInfoFormData) => {
    console.log('Client info submitted:', data)
    setSelectedOccasion(data.occasion)
    // TODO: Save to Zustand store
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
        {isExpanded[1] && (
          <div className="border-t border-gray-200 p-4">
            <Section1ClientInfo onSubmit={handleClientInfoSubmit} />
          </div>
        )}
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
        {isExpanded[3] && (
          <div className="border-t border-gray-200 p-4">
            <Section3Alterations onAddToOrder={handleAddAlterationToOrder} />
          </div>
        )}
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
        {isExpanded[5] && (
          <div className="border-t border-gray-200 p-4">
            <Section5Fitting 
              onAddToOrder={handleAddFittingToOrder}
              orderId={orderNumber}
            />
          </div>
        )}
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
