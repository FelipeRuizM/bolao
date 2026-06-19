import { describe, it, expect } from 'vitest'
import { deriveMatchUpdates } from './syncMerge'
import type { TSDBEvent } from './liveScores'
import type { FixtureResult } from './openfootball'
import type { Match } from '../types'

const HOUR = 60 * 60 * 1000

/** A match plus the UTC date string of its kickoff (used to key feed events). */
function startedMatch(over: Partial<Match> = {}): { match: Match; date: string } {
  const kickoffAt = Date.now() - 2 * HOUR
  const match: Match = {
    id: 'm1',
    homeTeam: 'Australia',
    awayTeam: 'Turkey',
    kickoffAt,
    stage: 'group',
    status: 'SCHEDULED',
    ...over,
  }
  return { match, date: new Date(kickoffAt).toISOString().slice(0, 10) }
}

function tsdbEvent(date: string, over: Partial<TSDBEvent> = {}): TSDBEvent {
  return {
    idEvent: 'e1',
    strHomeTeam: 'Australia',
    strAwayTeam: 'Turkey',
    dateEvent: date,
    intHomeScore: null,
    intAwayScore: null,
    ...over,
  }
}

describe('deriveMatchUpdates — TheSportsDB', () => {
  it('flips a SCHEDULED match to LIVE with a score', () => {
    const { match, date } = startedMatch()
    const { updates, changed, scoresMayHaveChanged } = deriveMatchUpdates(
      [tsdbEvent(date, { strStatus: '2H', intHomeScore: '0', intAwayScore: '1' })],
      { m1: match },
    )
    expect(updates['matches/m1/status']).toBe('LIVE')
    expect(updates['matches/m1/score']).toEqual({ home: 0, away: 1 })
    expect(changed).toBe(1)
    expect(scoresMayHaveChanged).toBe(false)
  })

  it('marks FT and flags a possible score change', () => {
    const { match, date } = startedMatch({ status: 'LIVE', score: { home: 0, away: 1 } })
    const { updates, scoresMayHaveChanged } = deriveMatchUpdates(
      [tsdbEvent(date, { strStatus: 'FT', intHomeScore: '2', intAwayScore: '1' })],
      { m1: match },
    )
    expect(updates['matches/m1/status']).toBe('FT')
    expect(updates['matches/m1/score']).toEqual({ home: 2, away: 1 })
    expect(scoresMayHaveChanged).toBe(true)
  })
})

describe('deriveMatchUpdates — manual override guard', () => {
  it('ignores a feed score lower than a manual override', () => {
    const { match, date } = startedMatch({
      status: 'LIVE',
      score: { home: 2, away: 0 },
      manualOverride: true,
    })
    const { updates, changed } = deriveMatchUpdates(
      [tsdbEvent(date, { strStatus: '2H', intHomeScore: '1', intAwayScore: '0' })],
      { m1: match },
    )
    expect(updates).toEqual({})
    expect(changed).toBe(0)
  })

  it('accepts a feed score with more total goals than the override', () => {
    const { match, date } = startedMatch({
      status: 'LIVE',
      score: { home: 2, away: 0 },
      manualOverride: true,
    })
    const { updates } = deriveMatchUpdates(
      [tsdbEvent(date, { strStatus: '2H', intHomeScore: '2', intAwayScore: '1' })],
      { m1: match },
    )
    expect(updates['matches/m1/score']).toEqual({ home: 2, away: 1 })
  })

  it('lets the feed finalize (FT) an override even with a lower score', () => {
    const { match, date } = startedMatch({
      status: 'LIVE',
      score: { home: 2, away: 0 },
      manualOverride: true,
    })
    const { updates, scoresMayHaveChanged } = deriveMatchUpdates(
      [tsdbEvent(date, { strStatus: 'FT', intHomeScore: '1', intAwayScore: '0' })],
      { m1: match },
    )
    expect(updates['matches/m1/status']).toBe('FT')
    expect(updates['matches/m1/score']).toEqual({ home: 1, away: 0 })
    expect(scoresMayHaveChanged).toBe(true)
  })

  it('keeps a finalized override locked against a regressing feed', () => {
    const { match, date } = startedMatch({
      status: 'FT',
      score: { home: 2, away: 0 },
      manualOverride: true,
    })
    const { updates, changed } = deriveMatchUpdates(
      [tsdbEvent(date, { strStatus: 'FT', intHomeScore: '1', intAwayScore: '0' })],
      { m1: match },
    )
    expect(updates).toEqual({})
    expect(changed).toBe(0)
  })
})

describe('deriveMatchUpdates — openfootball fallback', () => {
  const result = (date: string, home = 2, away = 0): FixtureResult => ({
    date,
    home: 'Australia',
    away: 'Turkey',
    score: { home, away },
  })

  it('finalizes a started match TheSportsDB has no event for', () => {
    const { match, date } = startedMatch()
    const { updates, changed, scoresMayHaveChanged } = deriveMatchUpdates([], { m1: match }, [
      result(date),
    ])
    expect(updates['matches/m1/status']).toBe('FT')
    expect(updates['matches/m1/score']).toEqual({ home: 2, away: 0 })
    expect(changed).toBe(1)
    expect(scoresMayHaveChanged).toBe(true)
  })

  it('does not override a match TheSportsDB already settled this pass', () => {
    const { match, date } = startedMatch()
    const { updates } = deriveMatchUpdates(
      [tsdbEvent(date, { strStatus: 'FT', intHomeScore: '1', intAwayScore: '0' })],
      { m1: match },
      [result(date, 2, 1)], // openfootball disagrees — ignored, TSDB wins
    )
    expect(updates['matches/m1/score']).toEqual({ home: 1, away: 0 })
  })

  it('ignores a result for a match that has not kicked off', () => {
    const future = Date.now() + 48 * HOUR
    const match: Match = {
      id: 'm1',
      homeTeam: 'Australia',
      awayTeam: 'Turkey',
      kickoffAt: future,
      stage: 'group',
      status: 'SCHEDULED',
    }
    const date = new Date(future).toISOString().slice(0, 10)
    const { updates, changed } = deriveMatchUpdates([], { m1: match }, [result(date)])
    expect(updates).toEqual({})
    expect(changed).toBe(0)
  })

  it('leaves an already-final match untouched (no redundant writes)', () => {
    const { match, date } = startedMatch({ status: 'FT', score: { home: 2, away: 0 } })
    const { updates, changed } = deriveMatchUpdates([], { m1: match }, [result(date)])
    expect(updates).toEqual({})
    expect(changed).toBe(0)
  })
})
