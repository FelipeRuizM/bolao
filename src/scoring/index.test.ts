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

  it('Brazil group game = 3x (Brazil rule supersedes)', () => {
    expect(multiplierFor('group', 'Brazil', 'Serbia')).toBe(3)
  })

  it('Brazil quarter-final = 12x (4 stage * 3 brazil)', () => {
    expect(multiplierFor('qf', 'Brazil', 'France')).toBe(12)
  })

  it('Brazil final = 18x (6 stage * 3 brazil — stacked)', () => {
    expect(multiplierFor('final', 'Brazil', 'Argentina')).toBe(18)
  })

  it('Brazil semi-final = 15x (5 stage * 3 brazil)', () => {
    expect(multiplierFor('sf', 'Brazil', 'Germany')).toBe(15)
  })

  it('Brazil round of 16 = 9x (3 stage * 3 brazil)', () => {
    expect(multiplierFor('r16', 'Brazil', 'Croatia')).toBe(9)
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

  it('round of 32 with Brazil = 6x (2 stage * 3 brazil)', () => {
    expect(multiplierFor('r32', 'Brazil', 'Senegal')).toBe(6)
  })

  it('explicit stageMultipliers override beats the default table', () => {
    expect(multiplierFor('r32', 'Spain', 'Morocco', { group: 1, r32: 2, r16: 2.5, qf: 3, sf: 4, '3rd': 4, final: 5 })).toBe(2)
  })

  it('big game multiplier stacks on top of stage and Brazil rule', () => {
    // group * Brazil * bigGame = 1 * 3 * 2 = 6
    expect(
      multiplierFor('group', 'Brazil', 'Serbia', undefined, {
        matchId: 'm1',
        bigGames: { m1: 2 },
      }),
    ).toBe(6)
  })

  it('big game multiplier only applies to the configured match', () => {
    expect(
      multiplierFor('group', 'Spain', 'Morocco', undefined, {
        matchId: 'm2',
        bigGames: { m1: 2 },
      }),
    ).toBe(1)
  })

  it('multiple big games each apply to their own match', () => {
    const bigGames = { m1: 2, m2: 4 }
    expect(multiplierFor('group', 'Spain', 'Morocco', undefined, { matchId: 'm1', bigGames })).toBe(2)
    expect(multiplierFor('group', 'Spain', 'Morocco', undefined, { matchId: 'm2', bigGames })).toBe(4)
    expect(multiplierFor('group', 'Spain', 'Morocco', undefined, { matchId: 'm3', bigGames })).toBe(1)
  })

  it('big game multiplier ignored when matchId missing', () => {
    expect(
      multiplierFor('group', 'Spain', 'Morocco', undefined, {
        bigGames: { m1: 2 },
      }),
    ).toBe(1)
  })

  it('big game multiplier ignored when non-positive', () => {
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

  it('exact score on Brazil final flagged as big game = 10 * 6 * 3 * 2 = 360', () => {
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
    expect(r.multiplier).toBe(36)
    expect(r.total).toBe(360)
  })
})
