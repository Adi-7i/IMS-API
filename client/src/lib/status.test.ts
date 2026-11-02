import { describe, it, expect } from 'vitest'
import {
  ORDER_STATUSES,
  ORDER_STATUS_CONFIG,
  canTransitionOrderStatus,
  MOVEMENT_TYPE_CONFIG,
} from './status'

describe('Status & State Machine Utilities', () => {
  it('defines the 4 required order statuses', () => {
    expect(ORDER_STATUSES).toEqual(['Pending', 'Confirmed', 'Completed', 'Cancelled'])
  })

  it('provides styling configuration for all statuses', () => {
    ORDER_STATUSES.forEach((st) => {
      expect(ORDER_STATUS_CONFIG[st]).toBeDefined()
      expect(ORDER_STATUS_CONFIG[st].label).toBe(st)
    })
  })

  it('correctly validates allowed and forbidden state transitions', () => {
    // From Pending
    expect(canTransitionOrderStatus('Pending', 'Confirmed')).toBe(true)
    expect(canTransitionOrderStatus('Pending', 'Cancelled')).toBe(true)
    expect(canTransitionOrderStatus('Pending', 'Completed')).toBe(false)

    // From Confirmed
    expect(canTransitionOrderStatus('Confirmed', 'Completed')).toBe(true)
    expect(canTransitionOrderStatus('Confirmed', 'Cancelled')).toBe(true)
    expect(canTransitionOrderStatus('Confirmed', 'Pending')).toBe(false)

    // Terminal states
    expect(canTransitionOrderStatus('Completed', 'Cancelled')).toBe(false)
    expect(canTransitionOrderStatus('Completed', 'Pending')).toBe(false)
    expect(canTransitionOrderStatus('Cancelled', 'Pending')).toBe(false)
    expect(canTransitionOrderStatus('Cancelled', 'Confirmed')).toBe(false)
  })

  it('defines configs for all movement types', () => {
    const types = ['initial', 'sale', 'cancellation_reversal', 'adjustment'] as const
    types.forEach((type) => {
      expect(MOVEMENT_TYPE_CONFIG[type]).toBeDefined()
      expect(MOVEMENT_TYPE_CONFIG[type].label).toBeTruthy()
    })
  })
})
