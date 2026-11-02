import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OrderStatusBadge, MovementTypeBadge } from './status-badge'

describe('Status Badge Components', () => {
  it('renders order status badges with proper labels', () => {
    const { rerender } = render(<OrderStatusBadge status="Pending" />)
    expect(screen.getByText('Pending')).toBeInTheDocument()

    rerender(<OrderStatusBadge status="Confirmed" />)
    expect(screen.getByText('Confirmed')).toBeInTheDocument()

    rerender(<OrderStatusBadge status="Completed" />)
    expect(screen.getByText('Completed')).toBeInTheDocument()

    rerender(<OrderStatusBadge status="Cancelled" />)
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
  })

  it('renders movement type badges correctly', () => {
    const { rerender } = render(<MovementTypeBadge type="initial" />)
    expect(screen.getByText('Initial Stock')).toBeInTheDocument()

    rerender(<MovementTypeBadge type="sale" />)
    expect(screen.getByText('Sale Deducted')).toBeInTheDocument()

    rerender(<MovementTypeBadge type="adjustment" />)
    expect(screen.getByText('Manual Adjustment')).toBeInTheDocument()
  })
})
