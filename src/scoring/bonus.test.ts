import { describe, it, expect } from 'vitest'
import { computeBonusPoints, normalizeBonusAnswer } from './index'

describe('normalizeBonusAnswer', () => {
  it('lowercases, strips diacritics and trims', () => {
    expect(normalizeBonusAnswer('  Vinícius Júnior  ')).toBe('vinicius junior')
    expect(normalizeBonusAnswer('Mbappé')).toBe('mbappe')
  })

  it('returns empty string for undefined / null', () => {
    expect(normalizeBonusAnswer(undefined)).toBe('')
    expect(normalizeBonusAnswer(null)).toBe('')
  })
})

describe('computeBonusPoints', () => {
  it('awards both bonuses when both correct', () => {
    const r = computeBonusPoints(
      { tournamentWinner: 'Brazil', topScorer: 'Vinicius Jr' },
      { tournamentWinner: 'Brazil', topScorer: 'vinicius jr' },
    )
    expect(r).toEqual({ tournamentWinner: 20, topScorer: 15, total: 35 })
  })

  it('awards none when neither matches', () => {
    const r = computeBonusPoints(
      { tournamentWinner: 'France', topScorer: 'Mbappé' },
      { tournamentWinner: 'Brazil', topScorer: 'Messi' },
    )
    expect(r.total).toBe(0)
  })

  it('awards none when answers are not set yet', () => {
    const r = computeBonusPoints({ tournamentWinner: 'Brazil', topScorer: 'Vini' }, {})
    expect(r.total).toBe(0)
  })

  it('respects custom values', () => {
    const r = computeBonusPoints(
      { tournamentWinner: 'Brazil', topScorer: 'Vini' },
      { tournamentWinner: 'Brazil', topScorer: 'vini' },
      { tournamentWinner: 50, topScorer: 100 },
    )
    expect(r.total).toBe(150)
  })

  it('matches case-insensitively and ignores diacritics', () => {
    const r = computeBonusPoints(
      { tournamentWinner: 'BRAZIL', topScorer: 'mbappe' },
      { tournamentWinner: 'Brazil', topScorer: 'Mbappé' },
    )
    expect(r.total).toBe(35)
  })
})
