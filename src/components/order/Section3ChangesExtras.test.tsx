import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { Section3ChangesExtras, type ChangesExtrasRow, MIN_CHANGES_EXTRAS_ROWS, MAX_CHANGES_EXTRAS_ROWS } from './Section3ChangesExtras'

function createRows(count: number): ChangesExtrasRow[] {
  return Array.from({ length: count }, () => ({
    id: crypto.randomUUID(),
    description: '',
    price: '',
    isConfirmed: false,
  }))
}

interface TestWrapperProps {
  initialRows?: ChangesExtrasRow[]
  onAddToOrder?: (item: { id: string; description: string; price: number }) => void
  onRemoveFromOrder?: (id: string) => void
}

function TestWrapper({
  initialRows = createRows(MIN_CHANGES_EXTRAS_ROWS),
  onAddToOrder = vi.fn(),
  onRemoveFromOrder = vi.fn(),
}: TestWrapperProps) {
  const [rows, setRows] = useState(initialRows)
  return (
    <Section3ChangesExtras
      onAddToOrder={onAddToOrder}
      onRemoveFromOrder={onRemoveFromOrder}
      rows={rows}
      setRows={setRows}
    />
  )
}

describe('Section3ChangesExtras', () => {
  it('should render with 5 initial rows', () => {
    render(<TestWrapper />)

    const rows = screen.getAllByPlaceholderText(/longer sleeves/i)
    expect(rows).toHaveLength(5)
  })

  it('should allow adding rows up to 10', () => {
    render(<TestWrapper />)

    const addButton = screen.getByText(/add row/i)

    // Add 5 more rows
    for (let i = 0; i < 5; i++) {
      fireEvent.click(addButton)
    }

    const rows = screen.getAllByPlaceholderText(/longer sleeves/i)
    expect(rows).toHaveLength(10)

    // Button should be disabled at max
    expect(addButton).toBeDisabled()
  })

  it('should add change/extra to order automatically on blur', () => {
    const onAddToOrder = vi.fn()
    render(<TestWrapper onAddToOrder={onAddToOrder} />)

    const descriptionInputs = screen.getAllByPlaceholderText(/longer sleeves/i)
    const priceInputs = screen.getAllByPlaceholderText(/0\.00/i)

    fireEvent.change(descriptionInputs[0], {
      target: { value: 'Trumpesnės rankovės' },
    })
    fireEvent.change(priceInputs[0], {
      target: { value: '25.00' },
    })
    fireEvent.blur(priceInputs[0])

    expect(onAddToOrder).toHaveBeenCalledWith({
      id: expect.any(String),
      description: 'Trumpesnės rankovės',
      price: 25.00,
    })
  })

  it('should add change/extra to order when Enter is pressed', () => {
    const onAddToOrder = vi.fn()
    render(<TestWrapper onAddToOrder={onAddToOrder} />)

    const descriptionInputs = screen.getAllByPlaceholderText(/longer sleeves/i)
    const priceInputs = screen.getAllByPlaceholderText(/0\.00/i)

    fireEvent.change(descriptionInputs[0], {
      target: { value: 'Trumpesnės rankovės' },
    })
    fireEvent.change(priceInputs[0], {
      target: { value: '25.00' },
    })
    fireEvent.keyDown(descriptionInputs[0], { key: 'Enter' })

    expect(onAddToOrder).toHaveBeenCalledWith({
      id: expect.any(String),
      description: 'Trumpesnės rankovės',
      price: 25.00,
    })
  })

  it('should allow removing rows', () => {
    render(<TestWrapper />)

    // Add a row first to have 6 rows
    fireEvent.click(screen.getByText(/add row/i))

    const initialRows = screen.getAllByPlaceholderText(/longer sleeves/i)
    expect(initialRows).toHaveLength(6)

    // Remove a row
    const removeButtons = screen.getAllByRole('button', { name: '' })
    fireEvent.click(removeButtons[0])

    const remainingRows = screen.getAllByPlaceholderText(/longer sleeves/i)
    expect(remainingRows).toHaveLength(5)
  })

  it('should not show remove button for empty rows when minimum rows reached', () => {
    render(<TestWrapper />)

    // Initially has 5 empty rows and minimum is 5, remove buttons should not be rendered
    expect(screen.queryAllByRole('button', { name: '' })).toHaveLength(0)
  })

  it('should display row count', () => {
    render(<TestWrapper />)

    expect(screen.getByText(/rows: 5/i)).toBeInTheDocument()
  })
})
