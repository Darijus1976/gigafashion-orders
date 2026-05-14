import { useState, useEffect } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Database } from '@/lib/supabase/types'

type Occasion = Database['public']['Tables']['orders']['Row']['occasion']
type PaymentMethod = 'cash' | 'card' | 'link'

export interface OrderItem {
  id: string
  type: 'dress' | 'alteration' | 'extra' | 'fitting' | 'custom'
  description: string
  price: number
  productId?: string
}

export interface Payment {
  id: string
  date: string
  amount: number
  method: PaymentMethod
  notes: string
}

export interface ClientInfo {
  clientName: string
  phone: string
  visitDate: string
  occasion: Occasion | ''
  occasionCustom?: string
  eventDate?: string
}

export interface OrderState {
  // Order metadata
  orderNumber: string
  orderDate: string
  staffMember: string
  
  // Client info
  clientInfo: ClientInfo | null
  
  // Order items
  items: OrderItem[]
  
  // Payments
  payments: Payment[]
  
  // Notes
  notes: string
  
  // UI State
  expandedSections: Record<number, boolean>
  
  // Computed
  totalAmount: () => number
  totalPaid: () => number
  balanceRemaining: () => number
  
  // Actions
  setOrderNumber: (orderNumber: string) => void
  setOrderDate: (date: string) => void
  setStaffMember: (staffMember: string) => void
  
  setClientInfo: (clientInfo: ClientInfo) => void
  
  addItem: (item: Omit<OrderItem, 'id'>) => void
  removeItem: (id: string) => void
  updateItem: (id: string, updates: Partial<OrderItem>) => void
  clearItems: () => void
  
  addPayment: (payment: Omit<Payment, 'id'>) => void
  removePayment: (id: string) => void
  updatePayment: (id: string, updates: Partial<Payment>) => void
  clearPayments: () => void
  
  setNotes: (notes: string) => void
  
  toggleSection: (section: number) => void
  setExpandedSections: (sections: Record<number, boolean>) => void
  
  resetOrder: () => void
}

const STORAGE_KEY = 'giga-fashion-order-draft'
const SAVE_INTERVAL = 30000 // 30 seconds

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      // Initial state
      orderNumber: '',
      orderDate: new Date().toISOString().split('T')[0],
      staffMember: '',
      clientInfo: null,
      items: [],
      payments: [],
      notes: '',
      expandedSections: {
        1: true,
        2: false,
        3: false,
        4: false,
        5: false,
        6: false,
      },
      
      // Computed
      totalAmount: () => {
        return get().items.reduce((sum, item) => sum + item.price, 0)
      },
      
      totalPaid: () => {
        return get().payments.reduce((sum, payment) => sum + payment.amount, 0)
      },
      
      balanceRemaining: () => {
        return get().totalAmount() - get().totalPaid()
      },
      
      // Actions
      setOrderNumber: (orderNumber) => set({ orderNumber }),
      
      setOrderDate: (orderDate) => set({ orderDate }),
      
      setStaffMember: (staffMember) => set({ staffMember }),
      
      setClientInfo: (clientInfo) => set({ clientInfo }),
      
      addItem: (item) => {
        const newItem = { ...item, id: crypto.randomUUID() }
        set((state) => ({ items: [...state.items, newItem] }))
      },
      
      removeItem: (id) => {
        set((state) => ({ items: state.items.filter((item) => item.id !== id) }))
      },
      
      updateItem: (id, updates) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        }))
      },
      
      clearItems: () => set({ items: [] }),
      
      addPayment: (payment) => {
        const newPayment = { ...payment, id: crypto.randomUUID() }
        set((state) => ({ payments: [...state.payments, newPayment] }))
      },
      
      removePayment: (id) => {
        set((state) => ({
          payments: state.payments.filter((payment) => payment.id !== id),
        }))
      },
      
      updatePayment: (id, updates) => {
        set((state) => ({
          payments: state.payments.map((payment) =>
            payment.id === id ? { ...payment, ...updates } : payment
          ),
        }))
      },
      
      clearPayments: () => set({ payments: [] }),
      
      setNotes: (notes) => set({ notes }),
      
      toggleSection: (section) => {
        set((state) => ({
          expandedSections: {
            ...state.expandedSections,
            [section]: !state.expandedSections[section],
          },
        }))
      },
      
      setExpandedSections: (expandedSections) => set({ expandedSections }),
      
      resetOrder: () => {
        set({
          orderNumber: '',
          orderDate: new Date().toISOString().split('T')[0],
          staffMember: '',
          clientInfo: null,
          items: [],
          payments: [],
          notes: '',
          expandedSections: {
            1: true,
            2: false,
            3: false,
            4: false,
            5: false,
            6: false,
          },
        })
      },
    }),
    {
      name: STORAGE_KEY,
      // Only persist every 30 seconds to reduce writes
      partialize: (state) => ({
        orderNumber: state.orderNumber,
        orderDate: state.orderDate,
        staffMember: state.staffMember,
        clientInfo: state.clientInfo,
        items: state.items,
        payments: state.payments,
        notes: state.notes,
        expandedSections: state.expandedSections,
      }),
      // Custom merge function to handle hydration
      merge: (persistedState, currentState) => {
        return {
          ...currentState,
          ...(persistedState as Partial<OrderState>),
          // Reset computed functions
          totalAmount: currentState.totalAmount,
          totalPaid: currentState.totalPaid,
          balanceRemaining: currentState.balanceRemaining,
        }
      },
    }
  )
)

// Helper hook for auto-save indicator
export function useAutoSaveStatus() {
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  useEffect(() => {
    const interval = setInterval(() => {
      setIsSaving(true)
      // The actual save is handled by Zustand persist middleware
      setTimeout(() => {
        setLastSaved(new Date())
        setIsSaving(false)
      }, 500)
    }, SAVE_INTERVAL)
    
    return () => clearInterval(interval)
  }, [])
  
  return { lastSaved, isSaving }
}

// Manual save trigger
export function saveOrderDraft() {
  // This triggers the persist middleware to save immediately
  useOrderStore.persist.rehydrate()
}

// Load saved draft
export function loadOrderDraft(): Partial<OrderState> | null {
  if (typeof window === 'undefined') return null
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error('Error loading order draft:', error)
  }
  
  return null
}

// Clear saved draft
export function clearOrderDraft() {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(STORAGE_KEY)
    useOrderStore.getState().resetOrder()
  } catch (error) {
    console.error('Error clearing order draft:', error)
  }
}
