import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Section1ClientInfo } from './Section1ClientInfo'

describe('Section1ClientInfo', () => {
  it('should render all form fields', () => {
    render(<Section1ClientInfo />)
    
    expect(screen.getByLabelText(/kliento vardas/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/telefono numeris/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/vizito data/i)).toBeInTheDocument()
    expect(screen.getByText(/proga/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/įvykio data/i)).toBeInTheDocument()
  })

  it('should validate required fields', async () => {
    const onSubmit = vi.fn()
    render(<Section1ClientInfo onSubmit={onSubmit} />)
    
    // Try to submit empty form
    const form = screen.getByRole('form')
    fireEvent.submit(form)
    
    await waitFor(() => {
      expect(screen.getByText(/vardas turi būti bent 2 simbolių/i)).toBeInTheDocument()
    })
  })

  it('should validate phone format', async () => {
    const onSubmit = vi.fn()
    render(<Section1ClientInfo onSubmit={onSubmit} />)
    
    const phoneInput = screen.getByLabelText(/telefono numeris/i)
    fireEvent.change(phoneInput, { target: { value: 'invalid' } })
    
    const form = screen.getByRole('form')
    fireEvent.submit(form)
    
    await waitFor(() => {
      expect(screen.getByText(/įveskite teisingą telefono numerį/i)).toBeInTheDocument()
    })
  })

  it('should show custom occasion field when "Kita" is selected', async () => {
    render(<Section1ClientInfo />)
    
    // Select "other" option
    const occasionSelect = screen.getByText(/pasirinkite progą/i)
    fireEvent.click(occasionSelect)
    
    await waitFor(() => {
      const otherOption = screen.getByText(/kita/i)
      fireEvent.click(otherOption)
    })
    
    await waitFor(() => {
      expect(screen.getByLabelText(/kita proga/i)).toBeInTheDocument()
    })
  })

  it('should submit valid form data', async () => {
    const onSubmit = vi.fn()
    render(<Section1ClientInfo onSubmit={onSubmit} />)
    
    // Fill in valid data
    fireEvent.change(screen.getByLabelText(/kliento vardas/i), {
      target: { value: 'Jonas Jonaitis' },
    })
    fireEvent.change(screen.getByLabelText(/telefono numeris/i), {
      target: { value: '+35312345678' },
    })
    fireEvent.change(screen.getByLabelText(/vizito data/i), {
      target: { value: '2025-05-15T10:00' },
    })
    
    const form = screen.getByRole('form')
    fireEvent.submit(form)
    
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          clientName: 'Jonas Jonaitis',
          phone: '+35312345678',
          visitDate: '2025-05-15T10:00',
        })
      )
    })
  })
})
