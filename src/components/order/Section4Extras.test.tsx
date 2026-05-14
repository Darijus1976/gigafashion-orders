import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Section4Extras } from './Section4Extras'

describe('Section4Extras', () => {
  it('should render 4 category tiles in 2x2 grid', () => {
    render(<Section4Extras onAddToOrder={vi.fn()} />)
    
    expect(screen.getByText(/krepšiai/i)).toBeInTheDocument()
    expect(screen.getByText(/veilės/i)).toBeInTheDocument()
    expect(screen.getByText(/diržai/i)).toBeInTheDocument()
    expect(screen.getByText(/galvajuostės/i)).toBeInTheDocument()
  })

  it('should open dialog when category tile is clicked', async () => {
    render(<Section4Extras onAddToOrder={vi.fn()} />)
    
    fireEvent.click(screen.getByText(/krepšiai/i))
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  it('should display products for selected category', async () => {
    render(<Section4Extras onAddToOrder={vi.fn()} />)
    
    fireEvent.click(screen.getByText(/krepšiai/i))
    
    await waitFor(() => {
      expect(screen.getByText(/perlų rankinė/i)).toBeInTheDocument()
      expect(screen.getByText(/satinio delninė/i)).toBeInTheDocument()
    })
  })

  it('should add extra to order when product is selected', async () => {
    const onAddToOrder = vi.fn()
    render(<Section4Extras onAddToOrder={onAddToOrder} />)
    
    fireEvent.click(screen.getByText(/krepšiai/i))
    
    await waitFor(() => {
      const addButtons = screen.getAllByText(/pridėti/i)
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
    render(<Section4Extras onAddToOrder={onAddToOrder} />)
    
    fireEvent.click(screen.getByText(/krepšiai/i))
    
    await waitFor(() => {
      const addButtons = screen.getAllByText(/pridėti/i)
      fireEvent.click(addButtons[0])
    })
    
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('should show product count on tiles', () => {
    render(<Section4Extras onAddToOrder={vi.fn()} />)
    
    const tiles = screen.getAllByText(/prekės/i)
    expect(tiles.length).toBe(4)
  })
})
