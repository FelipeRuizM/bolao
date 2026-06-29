import { describe, it, expect } from 'vitest'
import { classifyTier, computePoints, multiplierFor } from './index'

describe('classifyTier', () => {
  it('exact score wins over everything else', () => {
    expect(classifyTier({ home: 2, away: 1 }, { home: 2, away: 1 })).toBe('exact')
  })

  it('correct goal difference (same outcome, same GD, not exact) -> goalDifference', () => {
    // pred 2-1, actual 3-2 — both home wins by 1
    expect(classifyTier({ home: 2, away: 1 }, { home: 3, away: 2 })).toBe('goalDifference')
  })

  it('draw vs draw with different scoreline -> goalDifference (GD=0)', () => {
    expect(classifyTier({ home: 1, away: 1 }, { home: 2, away: 2 })).toBe('goalDifference')
  })

  it('correct winner score (winner team correct, GD wrong) -> winnerScore', () => {
    // pred 2-0 home win, actual 2-1 home win. Home (winner) score matches.
    expect(classifyTier({ home: 2, away: 0 }, { home: 2, away: 1 })).toBe('winnerScore')
  })

  it('correct loser score (loser team correct, GD wrong, winner wrong) -> loserScore', () => {
    // pred 3-1 home win, actual 2-1 home win. Loser (away) score matches.
    expect(classifyTier({ home: 3, away: 1 }, { home: 2, away: 1 })).toBe('loserScore')
  })

  it('outcome only (winner team correct but no other match) -> outcome', () => {
    // pred 4-2 home win, actual 1-0 home win. Same outcome, different GD, no score matches.
    expect(classifyTier({ home: 4, away: 2 }, { home: 1, away: 0 })).toBe('outcome')
  })

  it('wrong outcome -> wrong', () => {
    expect(classifyTier({ home: 2, away: 1 }, { home: 0, away: 1 })).toBe('wrong')
  })

  it('predicted draw, actual non-draw -> wrong', () => {
    expect(classifyTier({ home: 1, away: 1 }, { home: 2, away: 0 })).toBe('wrong')
  })
})

describe('multiplierFor', () => {
  it('group stage with no Brazil = 1x', () => {
    expect(multiplierFor('group', 'Spain', 'Morocco')).toBe(1)
  })

  it('Brazil group game = 3x (legacy ×3 preserved for the group stage)', () => {
    expect(multiplierFor('group', 'Brazil', 'Serbia')).toBe(3)
  })

  it('Brazil quarter-final = 6x (4 stage + 2 brazil knockout)', () => {
    expect(multiplierFor('qf', 'Brazil', 'France')).toBe(6)
  })

  it('Brazil final = 8x (6 stage + 2 brazil knockout)', () => {
    expect(multiplierFor('final', 'Brazil', 'Argentina')).toBe(8)
  })

  it('Brazil semi-final = 7x (5 stage + 2 brazil knockout)', () => {
    expect(multiplierFor('sf', 'Brazil', 'Germany')).toBe(7)
  })

  it('Brazil round of 16 = 5x (3 stage + 2 brazil knockout)', () => {
    expect(multiplierFor('r16', 'Brazil', 'Croatia')).toBe(5)
  })

  it('Argentina vs Spain semi-final = 5x (no Brazil)', () => {
    expect(multiplierFor('sf', 'Argentina', 'Spain')).toBe(5)
  })

  it('non-Brazil final = 6x', () => {
    expect(multiplierFor('final', 'Argentina', 'France')).toBe(6)
  })

  it('round of 32 (no Brazil) = 2x — admin can override via /meta/config', () => {
    expect(multiplierFor('r32', 'Spain', 'Morocco')).toBe(2)
  })

  it('round of 32 with Brazil = 4x (2 stage + 2 brazil knockout)', () => {
    expect(multiplierFor('r32', 'Brazil', 'Senegal')).toBe(4)
  })

  it('explicit stageMultipliers override beats the default table', () => {
    expect(multiplierFor('r32', 'Spain', 'Morocco', { group: 1, r32: 2, r16: 2.5, qf: 3, sf: 4, '3rd': 4, final: 5 })).toBe(2)
  })

  it('big game adds a flat +1 on top of stage and Brazil rule', () => {
    // group Brazil (1 * 3) + big game (+1) = 4
    expect(
      multiplierFor('group', 'Brazil', 'Serbia', undefined, {
        matchId: 'm1',
        bigGames: { m1: 2 },
      }),
    ).toBe(4)
  })

  it('big game +1 only applies to the configured match', () => {
    expect(
      multiplierFor('group', 'Spain', 'Morocco', undefined, {
        matchId: 'm2',
        bigGames: { m1: 2 },
      }),
    ).toBe(1)
  })

  it('every flagged big game adds the same flat +1 regardless of stored value', () => {
    const bigGames = { m1: 2, m2: 4 }
    expect(multiplierFor('group', 'Spain', 'Morocco', undefined, { matchId: 'm1', bigGames })).toBe(2)
    expect(multiplierFor('group', 'Spain', 'Morocco', undefined, { matchId: 'm2', bigGames })).toBe(2)
    expect(multiplierFor('group', 'Spain', 'Morocco', undefined, { matchId: 'm3', bigGames })).toBe(1)
  })

  it('big game +1 ignored when matchId missing', () => {
    expect(
      multiplierFor('group', 'Spain', 'Morocco', undefined, {
        bigGames: { m1: 2 },
      }),
    ).toBe(1)
  })

  it('big game +1 ignored when the flag is non-positive', () => {
    expect(
      multiplierFor('group', 'Spain', 'Morocco', undefined, {
        matchId: 'm1',
        bigGames: { m1: 0 },
      }),
    ).toBe(1)
  })
})

describe('computePoints integration', () => {
  it('exact score on Brazil group game = 10 * 3 = 30', () => {
    const r = computePoints({
      prediction: { home: 2, away: 0 },
      actual: { home: 2, away: 0 },
      stage: 'group',
      homeTeam: 'Brazil',
      awayTeam: 'Serbia',
    })
    expect(r.tier).toBe('exact')
    expect(r.base).toBe(10)
    expect(r.multiplier).toBe(3)
    expect(r.total).toBe(30)
  })

  it('correct GD on a non-Brazil group game = 5 * 1 = 5', () => {
    const r = computePoints({
      prediction: { home: 2, away: 1 },
      actual: { home: 3, away: 2 },
      stage: 'group',
      homeTeam: 'Spain',
      awayTeam: 'Morocco',
    })
    expect(r.tier).toBe('goalDifference')
    expect(r.total).toBe(5)
  })

  it('correct outcome on a non-Brazil final = 1 * 6 = 6', () => {
    const r = computePoints({
      prediction: { home: 4, away: 2 },
      actual: { home: 1, away: 0 },
      stage: 'final',
      homeTeam: 'Argentina',
      awayTeam: 'France',
    })
    expect(r.tier).toBe('outcome')
    expect(r.total).toBe(6)
  })

  it('wrong prediction returns 0 regardless of stage/Brazil', () => {
    const r = computePoints({
      prediction: { home: 2, away: 0 },
      actual: { home: 0, away: 1 },
      stage: 'final',
      homeTeam: 'Brazil',
      awayTeam: 'France',
    })
    expect(r.tier).toBe('wrong')
    expect(r.total).toBe(0)
  })

  it('tier ordering: pred 2-1 actual 3-2 yields exactly 5 (GD), not stacked', () => {
    const r = computePoints({
      prediction: { home: 2, away: 1 },
      actual: { home: 3, away: 2 },
      stage: 'group',
      homeTeam: 'Spain',
      awayTeam: 'Morocco',
    })
    expect(r.base).toBe(5)
    expect(r.total).toBe(5)
  })

  it('exact score on Brazil final flagged as big game = 10 * (6 + 2 + 1) = 90', () => {
    const r = computePoints({
      prediction: { home: 2, away: 1 },
      actual: { home: 2, away: 1 },
      stage: 'final',
      homeTeam: 'Brazil',
      awayTeam: 'Argentina',
      matchId: 'final-match',
      bigGames: { 'final-match': 2 },
    })
    expect(r.tier).toBe('exact')
    expect(r.multiplier).toBe(9)
    expect(r.total).toBe(90)
  })
})
