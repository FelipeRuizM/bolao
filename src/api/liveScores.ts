// TheSportsDB free public API.
// Free key "3" works for events; "123" is also valid for testing.
// FIFA World Cup league id = 4429.
const TSDB_BASE = 'https://www.thesportsdb.com/api/v1/json/3'
const FIFA_WORLD_CUP_LEAGUE_ID = '4429'
const SEASON = '2026'

export interface TSDBEvent {
  idEvent: string
  strEvent?: string
  strHomeTeam?: string
  strAwayTeam?: string
  intHomeScore: string | null
  intAwayScore: string | null
  dateEvent?: string
  strTime?: string
  strStatus?: string
  strPostponed?: string
}

interface TSDBResponse {
  events: TSDBEvent[] | null
}

/** Fetch and parse one TSDB event feed. Tolerant: returns [] on any failure so
 *  one bad or rate-limited endpoint can't sink the others in the merge below. */
async function fetchEventFeed(url: string): Promise<TSDBEvent[]> {
  try {
    const res = await fetch(url, { cache: 'no-cache' })
    if (!res.ok) return []
    const data = (await res.json()) as TSDBResponse
    return data.events ?? []
  } catch {
    return []
  }
}

/** YYYY-MM-DD (UTC) for now shifted by `offsetDays`. */
function utcDay(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/**
 * Every known World Cup result, plus live in-play games.
 *
 * The season feed (eventsseason.php) carries the full schedule and final
 * scores, but on the free key it's heavily cached and lags reality by hours —
 * it doesn't surface in-play games, so live scores never update from it alone.
 * The per-day feed (eventsday.php) is fresh and reports live status, so we
 * overlay today ±1 day (a UTC window, to span kickoff time zones) on top of the
 * season feed. Events are merged by idEvent with the fresher day feed winning,
 * so a game the season feed still lists as scheduled picks up its live score.
 */
export async function fetchSeasonEvents(): Promise<TSDBEvent[]> {
  const seasonUrl = `${TSDB_BASE}/eventsseason.php?id=${FIFA_WORLD_CUP_LEAGUE_ID}&s=${SEASON}`
  const dayUrls = [-1, 0, 1].map(
    (d) => `${TSDB_BASE}/eventsday.php?d=${utcDay(d)}&l=${FIFA_WORLD_CUP_LEAGUE_ID}`,
  )

  const [season, ...days] = await Promise.all([
    fetchEventFeed(seasonUrl),
    ...dayUrls.map(fetchEventFeed),
  ])

  const byId = new Map<string, TSDBEvent>()
  for (const e of season) byId.set(e.idEvent, e)
  for (const e of days.flat()) byId.set(e.idEvent, e)
  return [...byId.values()]
}

/**
 * Normalize a team name for fuzzy matching across sources.
 * Lowercases, removes diacritics, strips "and"/"&" and non-alphanumeric.
 */
export function normalizeTeam(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(and|e|the|y)\b/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

/**
 * Map of openfootball name → equivalent TheSportsDB name.
 * Only entries where the simple normalized match would fail.
 * (Verified by inspection of TSDB FIFA WC team listings.)
 */
const TEAM_ALIAS: Record<string, string[]> = {
  USA: ['United States'],
  'South Korea': ['Korea Republic'],
  Iran: ['IR Iran'],
  'Bosnia & Herzegovina': ['Bosnia and Herzegovina', 'Bosnia-Herzegovina'],
  'Ivory Coast': ["Cote d'Ivoire", 'Côte d’Ivoire'],
  'Czech Republic': ['Czechia'],
  'DR Congo': ['Democratic Republic of the Congo', 'DR Congo'],
}

const aliasIndex: Record<string, string> = (() => {
  const out: Record<string, string> = {}
  for (const [canonical, aliases] of Object.entries(TEAM_ALIAS)) {
    out[normalizeTeam(canonical)] = normalizeTeam(canonical)
    for (const a of aliases) out[normalizeTeam(a)] = normalizeTeam(canonical)
  }
  return out
})()

/** Returns a canonical key shared by both sources for the same team. */
export function teamKey(name: string): string {
  const n = normalizeTeam(name)
  return aliasIndex[n] ?? n
}

/** TheSportsDB status string → our MatchStatus. */
export function mapStatus(strStatus: string | undefined | null): 'SCHEDULED' | 'LIVE' | 'FT' {
  if (!strStatus) return 'SCHEDULED'
  const s = strStatus.toLowerCase()
  if (s === 'ft' || s === 'aet' || s.includes('finished') || s.includes('full time')) return 'FT'
  if (s === 'ns' || s === 'tbd' || s === 'pst' || s.includes('not started') || s.includes('postpone')) return 'SCHEDULED'
  return 'LIVE'
}

export function parseScore(event: TSDBEvent): { home: number; away: number } | null {
  if (event.intHomeScore == null || event.intAwayScore == null) return null
  const home = Number(event.intHomeScore)
  const away = Number(event.intAwayScore)
  if (Number.isNaN(home) || Number.isNaN(away)) return null
  return { home, away }
}
