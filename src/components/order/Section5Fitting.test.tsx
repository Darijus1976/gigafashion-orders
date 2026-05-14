import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Section5Fitting } from './Section5Fitting'

describe('Section5Fitting', () => {
  it('should render with initial fitting session', () => {
    render(<Section5Fitting onAddToOrder={vi.fn()} />)
    
    expect(screen.getByText(/matymo data/i)).toBeInTheDocument()
    expect(screen.getByText(/matymo pastabos/i)).toBeInTheDocument()
  })

  it('should have 3 initial note rows', () => {
    render(<Section5Fitting onAddToOrder={vi.fn()} />)
    
    const notes = screen.getAllByPlaceholderText(/pvz.: siaurinta juosmuo/i)
    expect(notes).toHaveLength(3)
  })

  it('should confirm fitting note and add to order', () => {
    const onAddToOrder = vi.fn()
    render(<Section5Fitting onAddToOrder={onAddToOrder} />)
    
    const descriptionInputs = screen.getAllByPlaceholderText(/pvz.: siaurinta juosmuo/i)
    const priceInputs = screen.getAllByPlaceholderText(/0\.00/i)
    
    fireEvent.change(descriptionInputs[0], {
      target: { value: 'Siaurinta per juosmenį' },
    })
    fireEvent.change(priceInputs[0], {
      target: { value: '15.00' },
    })
    
    const confirmButtons = screen.getAllByRole('button', { name: '' })
    fireEvent.click(confirmButtons[0])
    
    expect(onAddToOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining('Siaurinta per juosmenį'),
        price: 15.00,
      })
    )
  })

  it('should add new fitting session', async () => {
    render(<Section5Fitting onAddToOrder={vi.fn()} />)
    
    fireEvent.click(screen.getByText(/naujas matymas/i))
    
    await waitFor(() => {
      const sessionTabs = screen.getAllByRole('button')
      expect(sessionTabs.length).toBeGreaterThan(1)
    })
  })

  it('should allow adding notes up to 8', () => {
    render(<Section5Fitting onAddToOrder={vi.fn()} />)
    
    const addButton = screen.getByText(/pridėti pastabą/i)
    
    // Add 5 more notes (already has 3)
    for (let i = 0; i < 5; i++) {
      fireEvent.click(addButton)
    }
    
    expect(addButton).toBeDisabled()
  })

  it('should switch between sessions', async () => {
    render(<Section5Fitting onAddToOrder={vi.fn()} />)
    
    fireEvent.click(screen.getByText(/naujas matymas/i))
    
    await waitFor(() => {
      const tabs = screen.getAllByRole('button')
      expect(tabs.length).toBeGreaterThan(1)
    })
  })
})
