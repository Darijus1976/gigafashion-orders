import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Section3Alterations } from './Section3Alterations'

describe('Section3Alterations', () => {
  it('should render with 5 initial rows', () => {
    render(<Section3Alterations onAddToOrder={vi.fn()} />)
    
    const rows = screen.getAllByPlaceholderText(/pataisymo aprašymas/i)
    expect(rows).toHaveLength(5)
  })

  it('should allow adding rows up to 10', () => {
    render(<Section3Alterations onAddToOrder={vi.fn()} />)
    
    const addButton = screen.getByText(/pridėti eilutę/i)
    
    // Add 5 more rows
    for (let i = 0; i < 5; i++) {
      fireEvent.click(addButton)
    }
    
    const rows = screen.getAllByPlaceholderText(/pataisymo aprašymas/i)
    expect(rows).toHaveLength(10)
    
    // Button should be disabled at max
    expect(addButton).toBeDisabled()
  })

  it('should confirm alteration and add to order', () => {
    const onAddToOrder = vi.fn()
    render(<Section3Alterations onAddToOrder={onAddToOrder} />)
    
    const descriptionInputs = screen.getAllByPlaceholderText(/pataisymo aprašymas/i)
    const priceInputs = screen.getAllByPlaceholderText(/0\.00/i)
    
    fireEvent.change(descriptionInputs[0], {
      target: { value: 'Trumpesnės rankovės' },
    })
    fireEvent.change(priceInputs[0], {
      target: { value: '25.00' },
    })
    
    // Press Enter to confirm
    fireEvent.keyDown(descriptionInputs[0], { key: 'Enter' })
    
    expect(onAddToOrder).toHaveBeenCalledWith({
      description: 'Trumpesnės rankovės',
      price: 25.00,
    })
    
    // Should show "Pridėta" label
    expect(screen.getByText(/pridėta/i)).toBeInTheDocument()
  })

  it('should allow removing rows', () => {
    render(<Section3Alterations onAddToOrder={vi.fn()} />)
    
    // Add a row first to have 6 rows
    fireEvent.click(screen.getByText(/pridėti eilutę/i))
    
    const initialRows = screen.getAllByPlaceholderText(/pataisymo aprašymas/i)
    expect(initialRows).toHaveLength(6)
    
    // Remove a row
    const removeButtons = screen.getAllByRole('button', { name: '' })
    fireEvent.click(removeButtons[0])
    
    const remainingRows = screen.getAllByPlaceholderText(/pataisymo aprašymas/i)
    expect(remainingRows).toHaveLength(5)
  })

  it('should not allow removing below 5 rows', () => {
    render(<Section3Alterations onAddToOrder={vi.fn()} />)
    
    // Initially has 5 rows, all remove buttons should be disabled
    const removeButtons = screen.getAllByRole('button', { name: '' })
    expect(removeButtons[0]).toBeDisabled()
  })

  it('should display row count and confirmed count', () => {
    render(<Section3Alterations onAddToOrder={vi.fn()} />)
    
    expect(screen.getByText(/eilučių: 5/i)).toBeInTheDocument()
    expect(screen.getByText(/patvirtintų: 0/i)).toBeInTheDocument()
  })
})
