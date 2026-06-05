import { describe, it, expect } from 'vitest'
import { brDayKey, formatBR } from './datetime'

describe('Brazil-time formatting', () => {
  // 11pm BRT on Jun 11 2026 = 02:00 UTC on Jun 12 (BRT is UTC-3).
  const lateNight = Date.UTC(2026, 5, 12, 2, 0, 0)

  it('buckets a late-night match on the correct Brazil calendar day, not the UTC day', () => {
    // UTC would say 2026-06-12; Brazil time is still 2026-06-11.
    expect(brDayKey(lateNight)).toBe('2026-06-11')
  })

  it('renders the time in Brazil time (23:00, not the viewer local time)', () => {
    expect(formatBR(lateNight, 'pt-BR', { hour: '2-digit', minute: '2-digit' })).toBe('23:00')
  })

  it('renders the date in Brazil time', () => {
    expect(formatBR(lateNight, 'pt-BR', { day: 'numeric', month: 'numeric' })).toBe('11/06')
  })

  it('an afternoon match stays on the same day in both zones', () => {
    const afternoon = Date.UTC(2026, 5, 11, 19, 0, 0) // 16:00 BRT Jun 11
    expect(brDayKey(afternoon)).toBe('2026-06-11')
  })
})
