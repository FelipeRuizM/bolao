import { describe, it, expect } from 'vitest'
import { computeBonusPoints, normalizeBonusAnswer, DEFAULT_BONUS_VALUES } from './index'

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
  it('awards winner + scorer bonuses when both correct', () => {
    const r = computeBonusPoints(
      { tournamentWinner: 'Brazil', topScorer: 'Vinicius Jr' },
      { tournamentWinner: 'Brazil', topScorer: 'vinicius jr' },
    )
    expect(r.tournamentWinner).toBe(20)
    expect(r.topScorer).toBe(15)
    expect(r.total).toBe(35)
  })

  it('awards every category when all five are correct', () => {
    const r = computeBonusPoints(
      {
        tournamentWinner: 'Brazil',
        topScorer: 'Vini',
        bestPlayer: 'Rodri',
        bestYoungPlayer: 'Yamal',
        bestGoalkeeper: 'Alisson',
      },
      {
        tournamentWinner: 'Brazil',
        topScorer: 'vini',
        bestPlayer: 'rodri',
        bestYoungPlayer: 'yamal',
        bestGoalkeeper: 'alisson',
      },
    )
    expect(r).toEqual({
      tournamentWinner: 20,
      topScorer: 15,
      bestPlayer: 15,
      bestYoungPlayer: 10,
      bestGoalkeeper: 10,
      total: 70,
    })
  })

  it('awards only the new categories that match', () => {
    const r = computeBonusPoints(
      { bestPlayer: 'Rodri', bestGoalkeeper: 'Alisson' },
      { bestPlayer: 'rodri', bestYoungPlayer: 'Yamal', bestGoalkeeper: 'Donnarumma' },
    )
    expect(r.bestPlayer).toBe(15)
    expect(r.bestYoungPlayer).toBe(0)
    expect(r.bestGoalkeeper).toBe(0)
    expect(r.total).toBe(15)
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
      { ...DEFAULT_BONUS_VALUES, tournamentWinner: 50, topScorer: 100 },
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
