import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { Section2DressSelect } from './Section2DressSelect'

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/image.webp' } })),
      })),
    },
    from: vi.fn((table: string) => {
      if (table !== 'products') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ order: vi.fn(() => ({ order: vi.fn(() => Promise.resolve({ data: [], error: null })) })) })) })) }
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            neq: vi.fn(() => ({
              order: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({
                  data: [
                    {
                      id: '1',
                      name: 'Klasikinė komunijos suknelė',
                      catalogue: 'communion',
                      extras_type: null,
                      price: 240.00,
                      description: null,
                      image_url: null,
                      is_active: true,
                      display_order: 1,
                    },
                    {
                      id: '2',
                      name: 'Klasikinė krikštynų suknelė',
                      catalogue: 'christening',
                      extras_type: null,
                      price: 200.00,
                      description: null,
                      image_url: null,
                      is_active: true,
                      display_order: 2,
                    },
                  ],
                  error: null,
                })),
              })),
            })),
          })),
        })),
      }
    }),
  },
}))

describe('Section2DressSelect', () => {
  it('should render two selection mode cards initially', () => {
    render(<Section2DressSelect onAddToOrder={vi.fn()} />)
    
    expect(screen.getByText(/our catalogue dress/i)).toBeInTheDocument()
    expect(screen.getByText(/custom dress/i)).toBeInTheDocument()
  })

  it('should show catalogue mode when catalogue card is clicked', () => {
    render(<Section2DressSelect occasion="communion" onAddToOrder={vi.fn()} />)
    
    fireEvent.click(screen.getByText(/our catalogue dress/i))
    
    expect(screen.getByText(/komunija katalogas/i)).toBeInTheDocument()
  })

  it('should show custom dress form when custom card is clicked', () => {
    render(<Section2DressSelect onAddToOrder={vi.fn()} />)
    
    fireEvent.click(screen.getByText(/custom dress/i))
    
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/price/i)).toBeInTheDocument()
  })

  it('should filter products by occasion', async () => {
    render(<Section2DressSelect occasion="christening" onAddToOrder={vi.fn()} />)
    
    fireEvent.click(screen.getByText(/our catalogue dress/i))
    
    await waitFor(() => {
      expect(screen.getByText(/krikštynų suknelė/i)).toBeInTheDocument()
      expect(screen.queryByText(/komunijos suknelė/i)).not.toBeInTheDocument()
    })
  })

  it('should add catalogue dress to order when product is clicked', async () => {
    const onAddToOrder = vi.fn()
    render(<Section2DressSelect occasion="communion" onAddToOrder={onAddToOrder} />)
    
    fireEvent.click(screen.getByText(/our catalogue dress/i))
    const product = await screen.findByText(/klasikinė komunijos suknelė/i)
    fireEvent.click(product)
    
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
    
    fireEvent.click(screen.getByText(/custom dress/i))
    
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'Raudona suknelė su nėriniais' },
    })
    fireEvent.change(screen.getByLabelText(/price/i), {
      target: { value: '350' },
    })
    
    fireEvent.click(screen.getByText(/add custom dress to order/i))
    
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
    
    fireEvent.click(screen.getByText(/our catalogue dress/i))
    expect(screen.getByText(/change selection/i)).toBeInTheDocument()
    
    fireEvent.click(screen.getByText(/change selection/i))
    expect(screen.getByText(/our catalogue dress/i)).toBeInTheDocument()
    expect(screen.getByText(/custom dress/i)).toBeInTheDocument()
  })
})
