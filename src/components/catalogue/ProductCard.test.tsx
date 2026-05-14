import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProductCard } from './ProductCard'

describe('ProductCard', () => {
  const mockProduct = {
    id: '1',
    name: 'Test Wedding Dress',
    catalogue: 'wedding' as const,
    price: 250.00,
    image_url: null,
    is_active: true,
    display_order: 1,
    occasion_tags: ['wedding', 'formal'],
    extras_type: null,
  }

  it('should render product name and price', () => {
    render(<ProductCard product={mockProduct} />)
    
    expect(screen.getByText('Test Wedding Dress')).toBeInTheDocument()
    expect(screen.getByText('€250.00')).toBeInTheDocument()
  })

  it('should show placeholder when no image', () => {
    render(<ProductCard product={mockProduct} />)
    
    expect(screen.getByText('Nuotrauka')).toBeInTheDocument()
  })

  it('should call onAddToOrder when add button clicked', () => {
    const onAddToOrder = vi.fn()
    render(<ProductCard product={mockProduct} onAddToOrder={onAddToOrder} />)
    
    fireEvent.click(screen.getByText(/pridėti/i))
    
    expect(onAddToOrder).toHaveBeenCalledWith(mockProduct)
  })

  it('should not show add button when onAddToOrder not provided', () => {
    render(<ProductCard product={mockProduct} />)
    
    expect(screen.queryByText(/pridėti/i)).not.toBeInTheDocument()
  })

  it('should display occasion tags', () => {
    render(<ProductCard product={mockProduct} />)
    
    expect(screen.getByText('wedding')).toBeInTheDocument()
    expect(screen.getByText('formal')).toBeInTheDocument()
  })
})
