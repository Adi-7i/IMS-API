import { describe, it, expect } from 'vitest'
import { formatDate, formatDateTime, formatRelativeTime } from './date'

describe('Date Utilities', () => {
  it('formats dates properly', () => {
    const formatted = formatDate('2026-11-02T12:00:00Z')
    expect(formatted).not.toBe('—')
    expect(formatted).toContain('2026')
  })

  it('formats datetime strings with time components', () => {
    const formatted = formatDateTime('2026-11-02T14:30:00Z')
    expect(formatted).not.toBe('—')
    expect(formatted).toContain('2026')
  })

  it('returns em-dash for null, empty or invalid dates', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate('')).toBe('—')
    expect(formatDate('invalid-date')).toBe('—')
    expect(formatDateTime(null)).toBe('—')
    expect(formatRelativeTime(null)).toBe('—')
  })

  it('formats relative time for recent events', () => {
    const now = new Date().toISOString()
    expect(formatRelativeTime(now)).toBe('Just now')
  })
})
