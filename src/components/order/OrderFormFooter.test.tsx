import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OrderFormFooter } from './OrderFormFooter'

describe('OrderFormFooter', () => {
  it('should render staff member dropdown', () => {
    render(<OrderFormFooter onSave={vi.fn()} totalAmount={310} />)
    
    expect(screen.getByText(/darbuotojas/i)).toBeInTheDocument()
    expect(screen.getByText(/egidija/i)).toBeInTheDocument()
    expect(screen.getByText(/eili/i)).toBeInTheDocument()
    expect(screen.getByText(/gintarė/i)).toBeInTheDocument()
  })

  it('should render auto-filled current date', () => {
    render(<OrderFormFooter onSave={vi.fn()} totalAmount={310} />)
    
    expect(screen.getByText(/užsakymo data/i)).toBeInTheDocument()
    const dateInput = screen.getByDisplayValue(/202\d-\d{2}-\d{2}/)
    expect(dateInput).toBeDisabled()
  })

  it('should display total amount', () => {
    render(<OrderFormFooter onSave={vi.fn()} totalAmount={310.5} />)
    
    expect(screen.getByText(/€310.50/)).toBeInTheDocument()
  })

  it('should disable save button when staff not selected', () => {
    render(<OrderFormFooter onSave={vi.fn()} totalAmount={310} />)
    
    const saveButton = screen.getByText(/išsaugoti/i)
    expect(saveButton).toBeDisabled()
  })

  it('should enable save button when staff is selected', () => {
    render(<OrderFormFooter onSave={vi.fn()} totalAmount={310} />)
    
    fireEvent.click(screen.getByText(/pasirinkite darbuotoją/i))
    fireEvent.click(screen.getByText(/egidija/i))
    
    const saveButton = screen.getByText(/išsaugoti/i)
    expect(saveButton).not.toBeDisabled()
  })

  it('should call onSave with staff member and date', () => {
    const onSave = vi.fn()
    render(<OrderFormFooter onSave={onSave} totalAmount={310} />)
    
    fireEvent.click(screen.getByText(/pasirinkite darbuotoją/i))
    fireEvent.click(screen.getByText(/egidija/i))
    
    fireEvent.click(screen.getByText(/išsaugoti/i))
    
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        staffMember: 'egidija',
        orderDate: expect.any(String),
      })
    )
  })

  it('should show saving state', () => {
    render(<OrderFormFooter onSave={vi.fn()} totalAmount={310} isSaving={true} />)
    
    fireEvent.click(screen.getByText(/pasirinkite darbuotoją/i))
    fireEvent.click(screen.getByText(/egidija/i))
    
    expect(screen.getByText(/išsaugoma/i)).toBeInTheDocument()
  })

  it('should show warning when staff not selected', () => {
    render(<OrderFormFooter onSave={vi.fn()} totalAmount={310} />)
    
    expect(screen.getByText(/pasirinkite darbuotoją/i)).toBeInTheDocument()
  })
})
