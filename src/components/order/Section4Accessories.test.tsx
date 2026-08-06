import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Section4Accessories } from './Section4Accessories'

describe('Section4Accessories', () => {
  it('should render 6 category tiles in 3x2 grid', () => {
    render(<Section4Accessories onAddToOrder={vi.fn()} />)

    expect(screen.getByText(/bags/i)).toBeInTheDocument()
    expect(screen.getByText(/veils/i)).toBeInTheDocument()
    expect(screen.getByText(/belts/i)).toBeInTheDocument()
    expect(screen.getByText(/headbands/i)).toBeInTheDocument()
    expect(screen.getByText(/tiaras/i)).toBeInTheDocument()
    expect(screen.getByText(/cuffs\/gloves/i)).toBeInTheDocument()
  })

  it('should open dialog when category tile is clicked', async () => {
    render(<Section4Accessories onAddToOrder={vi.fn()} />)
    
    fireEvent.click(screen.getByText(/bags/i))
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  it('should display products for selected category', async () => {
    render(<Section4Accessories onAddToOrder={vi.fn()} />)
    
    fireEvent.click(screen.getByText(/bags/i))
    
    await waitFor(() => {
      expect(screen.getByText(/perlų rankinė/i)).toBeInTheDocument()
      expect(screen.getByText(/satinio delninė/i)).toBeInTheDocument()
    })
  })

  it('should add accessory to order when product is selected', async () => {
    const onAddToOrder = vi.fn()
    render(<Section4Accessories onAddToOrder={onAddToOrder} />)
    
    fireEvent.click(screen.getByText(/bags/i))
    
    await waitFor(() => {
      const addButtons = screen.getAllByText(/add/i)
      fireEvent.click(addButtons[0])
    })
    
    expect(onAddToOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Perlų rankinė',
        price: 45.00,
      })
    )
  })

  it('should close dialog after adding product', async () => {
    const onAddToOrder = vi.fn()
    render(<Section4Accessories onAddToOrder={onAddToOrder} />)
    
    fireEvent.click(screen.getByText(/bags/i))
    
    await waitFor(() => {
      const addButtons = screen.getAllByText(/add/i)
      fireEvent.click(addButtons[0])
    })
    
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('should show product count on tiles', () => {
    render(<Section4Accessories onAddToOrder={vi.fn()} />)
    
    const tiles = screen.getAllByText(/products/i)
    expect(tiles.length).toBe(6)
  })
})
