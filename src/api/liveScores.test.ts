import { describe, it, expect } from 'vitest'
import { mapStatus, normalizeTeam, parseScore, teamKey } from './liveScores'

describe('normalizeTeam', () => {
  it('lowercases and strips spaces', () => {
    expect(normalizeTeam('Brazil')).toBe('brazil')
    expect(normalizeTeam('South Korea')).toBe('southkorea')
  })

  it('strips diacritics', () => {
    expect(normalizeTeam('Curaçao')).toBe('curacao')
    expect(normalizeTeam("Côte d'Ivoire")).toBe('cotedivoire')
  })

  it('drops "and"/"&"', () => {
    expect(normalizeTeam('Bosnia & Herzegovina')).toBe('bosniaherzegovina')
    expect(normalizeTeam('Bosnia and Herzegovina')).toBe('bosniaherzegovina')
  })
})

describe('teamKey aliases', () => {
  it('maps USA and United States to the same key', () => {
    expect(teamKey('USA')).toBe(teamKey('United States'))
  })

  it('maps South Korea and Korea Republic to the same key', () => {
    expect(teamKey('South Korea')).toBe(teamKey('Korea Republic'))
  })

  it('maps Bosnia variants to the same key', () => {
    expect(teamKey('Bosnia & Herzegovina')).toBe(teamKey('Bosnia and Herzegovina'))
    expect(teamKey('Bosnia & Herzegovina')).toBe(teamKey('Bosnia-Herzegovina'))
  })

  it('preserves Brazil unchanged', () => {
    expect(teamKey('Brazil')).toBe('brazil')
  })
})

describe('mapStatus', () => {
  it.each([
    ['Match Finished', 'FT'],
    ['FT', 'FT'],
    ['AET', 'FT'],
    ['Not Started', 'SCHEDULED'],
    ['NS', 'SCHEDULED'],
    ['Postponed', 'SCHEDULED'],
    ['1H', 'LIVE'],
    ['HT', 'LIVE'],
    ['2H', 'LIVE'],
  ])('%s → %s', (input, expected) => {
    expect(mapStatus(input)).toBe(expected)
  })

  it('treats undefined as SCHEDULED', () => {
    expect(mapStatus(undefined)).toBe('SCHEDULED')
  })
})

describe('parseScore', () => {
  it('returns null when scores are absent', () => {
    expect(parseScore({ idEvent: '1', intHomeScore: null, intAwayScore: null })).toBeNull()
  })

  it('parses string scores to numbers', () => {
    expect(parseScore({ idEvent: '1', intHomeScore: '2', intAwayScore: '0' })).toEqual({
      home: 2,
      away: 0,
    })
  })
})
