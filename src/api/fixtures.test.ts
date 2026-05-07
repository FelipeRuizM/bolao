import { describe, it, expect } from 'vitest'
import { parseKickoff, roundToStage, slugify, matchId } from './fixtures'

describe('parseKickoff', () => {
  it('parses local time + negative UTC offset to UTC ms', () => {
    // 2026-06-11 13:00 UTC-6 → 19:00 UTC
    const ms = parseKickoff('2026-06-11', '13:00 UTC-6')
    expect(new Date(ms).toISOString()).toBe('2026-06-11T19:00:00.000Z')
  })

  it('parses single-digit hour with positive offset', () => {
    const ms = parseKickoff('2026-06-15', '9:00 UTC+2')
    expect(new Date(ms).toISOString()).toBe('2026-06-15T07:00:00.000Z')
  })

  it('throws on bad format', () => {
    expect(() => parseKickoff('2026-06-11', 'not a time')).toThrow()
  })
})

describe('roundToStage', () => {
  it.each([
    ['Matchday 1', 'group'],
    ['Matchday 14', 'group'],
    ['Round of 32', 'r32'],
    ['Round of 16', 'r16'],
    ['Quarter-finals', 'qf'],
    ['Semi-finals', 'sf'],
    ['3rd-place play-off', '3rd'],
    ['Match for third place', '3rd'],
    ['Final', 'final'],
  ])('%s → %s', (round, expected) => {
    expect(roundToStage(round)).toBe(expected)
  })
})

describe('slugify + matchId', () => {
  it('handles spaces and ampersands', () => {
    expect(slugify('Bosnia & Herzegovina')).toBe('bosnia-herzegovina')
  })

  it('handles diacritics', () => {
    expect(slugify('Curaçao')).toBe('curacao')
  })

  it('matchId is stable and Firebase-key-safe', () => {
    const id = matchId('2026-06-11', 'Mexico', 'South Africa')
    expect(id).toBe('2026-06-11_mexico_south-africa')
    expect(id).not.toMatch(/[.#$/[\]]/)
  })
})

describe('normalizeMatch', () => {
  it('omits group field for knockout matches (Firebase rejects undefined)', async () => {
    const { normalizeMatch } = await import('./fixtures')
    const knockout = normalizeMatch({
      round: 'Round of 32',
      date: '2026-06-28',
      time: '12:00 UTC-4',
      team1: '2A',
      team2: '2B',
    })
    expect('group' in knockout).toBe(false)
  })

  it('keeps group field for group-stage matches', async () => {
    const { normalizeMatch } = await import('./fixtures')
    const groupMatch = normalizeMatch({
      round: 'Matchday 1',
      date: '2026-06-11',
      time: '13:00 UTC-6',
      team1: 'Mexico',
      team2: 'South Africa',
      group: 'Group A',
    })
    expect(groupMatch.group).toBe('Group A')
  })
})
