// openfootball worldcup.json — a community-maintained file that holds both the
// fixture list AND final scores once games are played. It's the source for the
// schedule import (see fixtures.ts) and, here, a final-score fallback for the
// sync: TheSportsDB's free tier is missing some fixtures entirely (e.g.
// Australia vs Turkey), and openfootball fills those final scores in.
//
// No Firebase imports — this module is imported by the Node sync script too.
export const OPENFOOTBALL_2026_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'

export interface OpenFootballMatch {
  round: string
  date: string
  time: string
  team1: string
  team2: string
  group?: string
  ground?: string
  score?: { ft?: [number, number] }
}

interface OpenFootballFile {
  name: string
  matches: OpenFootballMatch[]
}

/** A finished fixture with a confirmed final score, from openfootball. */
export interface FixtureResult {
  date: string
  home: string
  away: string
  score: { home: number; away: number }
}

export async function fetchOpenFootballMatches(): Promise<OpenFootballMatch[]> {
  const res = await fetch(OPENFOOTBALL_2026_URL, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`openfootball fetch failed: ${res.status}`)
  const data = (await res.json()) as OpenFootballFile
  return data.matches
}

/**
 * Final scores only, for the sync fallback. Tolerant: returns [] on any failure
 * so a fetch hiccup can't break the sync (TheSportsDB is still the primary).
 */
export async function fetchFixtureResults(): Promise<FixtureResult[]> {
  let matches: OpenFootballMatch[]
  try {
    matches = await fetchOpenFootballMatches()
  } catch {
    return []
  }
  const out: FixtureResult[] = []
  for (const m of matches) {
    const ft = m.score?.ft
    if (Array.isArray(ft) && ft.length === 2 && Number.isFinite(ft[0]) && Number.isFinite(ft[1])) {
      out.push({ date: m.date, home: m.team1, away: m.team2, score: { home: ft[0], away: ft[1] } })
    }
  }
  return out
}
