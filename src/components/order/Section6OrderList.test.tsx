import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Section6OrderList } from './Section6OrderList'

describe('Section6OrderList', () => {
  const mockOrderItems = [
    { id: '1', type: 'dress' as const, description: 'Klasikinė suknelė', price: 240.00 },
    { id: '2', type: 'alteration' as const, description: 'Trumpesnės rankovės', price: 25.00 },
    { id: '3', type: 'extra' as const, description: 'Perlų rankinė', price: 45.00 },
  ]

  it('should display empty state when no items', () => {
    render(<Section6OrderList orderItems={[]} />)
    
    expect(screen.getByText(/order is empty/i)).toBeInTheDocument()
  })

  it('should display order items in table', () => {
    render(<Section6OrderList orderItems={mockOrderItems} />)
    
    expect(screen.getByText(/klasikinė suknelė/i)).toBeInTheDocument()
    expect(screen.getByText(/trumpesnės rankovės/i)).toBeInTheDocument()
    expect(screen.getByText(/perlų rankinė/i)).toBeInTheDocument()
  })

  it('should calculate and display total', () => {
    render(<Section6OrderList orderItems={mockOrderItems} />)
    
    // Total should be 240 + 25 + 45 = 310
    expect(screen.getByText(/€310\.00/)).toBeInTheDocument()
  })

  it('should add payment row', () => {
    render(<Section6OrderList orderItems={mockOrderItems} />)
    
    fireEvent.click(screen.getByText(/add payment/i))
    
    // Should have date input for payment
    expect(screen.getByText(/data/i)).toBeInTheDocument()
  })

  it('should update balance when payment is added', () => {
    render(<Section6OrderList orderItems={mockOrderItems} />)
    
    fireEvent.click(screen.getByText(/add payment/i))
    
    const amountInputs = screen.getAllByPlaceholderText(/0\.00/i)
    fireEvent.change(amountInputs[0], { target: { value: '100' } })
    
    // Balance should show €210.00 remaining
    expect(screen.getByText(/€210\.00/)).toBeInTheDocument()
  })

  it('should show paid status when fully paid', () => {
    render(<Section6OrderList orderItems={mockOrderItems} />)
    
    fireEvent.click(screen.getByText(/add payment/i))
    
    const amountInputs = screen.getAllByPlaceholderText(/0\.00/i)
    fireEvent.change(amountInputs[0], { target: { value: '310' } })
    
    // Should show paid confirmation
    expect(screen.getByText(/order fully paid/i)).toBeInTheDocument()
  })

  it('should display category labels in English', () => {
    render(<Section6OrderList orderItems={mockOrderItems} />)

    expect(screen.getByText(/dress/i)).toBeInTheDocument()
    expect(screen.getByText(/alteration/i)).toBeInTheDocument()
    expect(screen.getByText(/extra/i)).toBeInTheDocument()
  })

  it('should allow payment method selection', () => {
    render(<Section6OrderList orderItems={mockOrderItems} />)
    
    fireEvent.click(screen.getByText(/add payment/i))
    
    const methodSelect = screen.getByText(/cash/i)
    expect(methodSelect).toBeInTheDocument()
  })
})
