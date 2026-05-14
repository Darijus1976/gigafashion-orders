import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Section2DressSelect } from './Section2DressSelect'

describe('Section2DressSelect', () => {
  it('should render two selection mode cards initially', () => {
    render(<Section2DressSelect onAddToOrder={vi.fn()} />)
    
    expect(screen.getByText(/mūsų katalogo suknelė/i)).toBeInTheDocument()
    expect(screen.getByText(/individuali suknelė/i)).toBeInTheDocument()
  })

  it('should show catalogue mode when catalogue card is clicked', () => {
    render(<Section2DressSelect occasion="communion" onAddToOrder={vi.fn()} />)
    
    fireEvent.click(screen.getByText(/mūsų katalogo suknelė/i))
    
    expect(screen.getByText(/komunija katalogas/i)).toBeInTheDocument()
  })

  it('should show custom dress form when custom card is clicked', () => {
    render(<Section2DressSelect onAddToOrder={vi.fn()} />)
    
    fireEvent.click(screen.getByText(/individuali suknelė/i))
    
    expect(screen.getByLabelText(/aprašymas/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/kaina/i)).toBeInTheDocument()
  })

  it('should filter products by occasion', () => {
    render(<Section2DressSelect occasion="christening" onAddToOrder={vi.fn()} />)
    
    fireEvent.click(screen.getByText(/mūsų katalogo suknelė/i))
    
    expect(screen.getByText(/krikštynų suknelė/i)).toBeInTheDocument()
    expect(screen.queryByText(/komunijos suknelė/i)).not.toBeInTheDocument()
  })

  it('should add catalogue dress to order when product is selected', () => {
    const onAddToOrder = vi.fn()
    render(<Section2DressSelect occasion="communion" onAddToOrder={onAddToOrder} />)
    
    fireEvent.click(screen.getByText(/mūsų katalogo suknelė/i))
    fireEvent.click(screen.getByText(/komunijos suknelė/i))
    
    const addButton = screen.getByText(/pridėti į užsakymą/i)
    fireEvent.click(addButton)
    
    expect(onAddToOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'catalogue',
        description: 'Klasikinė komunijos suknelė',
        price: 240.00,
      })
    )
  })

  it('should add custom dress to order when form is filled', () => {
    const onAddToOrder = vi.fn()
    render(<Section2DressSelect onAddToOrder={onAddToOrder} />)
    
    fireEvent.click(screen.getByText(/individuali suknelė/i))
    
    fireEvent.change(screen.getByLabelText(/aprašymas/i), {
      target: { value: 'Raudona suknelė su nėriniais' },
    })
    fireEvent.change(screen.getByLabelText(/kaina/i), {
      target: { value: '350' },
    })
    
    fireEvent.click(screen.getByText(/pridėti individualią suknelę/i))
    
    expect(onAddToOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'custom',
        description: 'Raudona suknelė su nėriniais',
        price: 350,
      })
    )
  })

  it('should allow changing selection mode', () => {
    render(<Section2DressSelect onAddToOrder={vi.fn()} />)
    
    fireEvent.click(screen.getByText(/mūsų katalogo suknelė/i))
    expect(screen.getByText(/keisti pasirinkimą/i)).toBeInTheDocument()
    
    fireEvent.click(screen.getByText(/keisti pasirinkimą/i))
    expect(screen.getByText(/mūsų katalogo suknelė/i)).toBeInTheDocument()
    expect(screen.getByText(/individuali suknelė/i)).toBeInTheDocument()
  })
})
