import { describe, it, expect } from 'vitest'
import { formatPaise, paiseToRupees, rupeesToPaise } from './currency'

describe('Currency Utilities', () => {
  it('formats paise to Indian Rupee representation correctly', () => {
    expect(formatPaise(59900)).toMatch(/₹\s?599\.00/)
    expect(formatPaise(0)).toMatch(/₹\s?0\.00/)
    expect(formatPaise(125050)).toMatch(/₹\s?1,250\.50/)
  })

  it('handles null, undefined, or NaN gracefully', () => {
    expect(formatPaise(null)).toBe('₹0.00')
    expect(formatPaise(undefined)).toBe('₹0.00')
    expect(formatPaise(NaN)).toBe('₹0.00')
  })

  it('converts paise to rupees decimal correctly', () => {
    expect(paiseToRupees(59900)).toBe(599)
    expect(paiseToRupees(15025)).toBe(150.25)
    expect(paiseToRupees(0)).toBe(0)
  })

  it('converts rupees string or number to integer paise without float errors', () => {
    expect(rupeesToPaise('599.00')).toBe(59900)
    expect(rupeesToPaise('599.50')).toBe(59950)
    expect(rupeesToPaise(599.5)).toBe(59950)
    expect(rupeesToPaise(0.99)).toBe(99)
    expect(rupeesToPaise(-10)).toBe(0)
    expect(rupeesToPaise('invalid')).toBe(0)
  })
})
