import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DisconnectedState } from './disconnected-state'

describe('DisconnectedState Component', () => {
  it('renders default title and description', () => {
    render(<DisconnectedState />)
    expect(screen.getByText('Integration Pending')).toBeInTheDocument()
    const matches = screen.getAllByText(/Phase 3/i)
    expect(matches.length).toBeGreaterThan(0)
  })

  it('renders target endpoint when provided', () => {
    render(
      <DisconnectedState
        title="Orders Pending"
        endpoint="GET /api/orders"
        variant="table"
      />,
    )
    expect(screen.getByText('Orders Pending')).toBeInTheDocument()
    expect(screen.getByText('GET /api/orders')).toBeInTheDocument()
  })

  it('renders inline variant cleanly', () => {
    render(
      <DisconnectedState
        title="Inline Test"
        endpoint="POST /api/products"
        variant="inline"
      />,
    )
    expect(screen.getByText('Inline Test')).toBeInTheDocument()
    expect(screen.getByText('POST /api/products')).toBeInTheDocument()
  })
})
