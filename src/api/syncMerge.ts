import type { Match } from '../types'
import { mapStatus, parseScore, teamKey, type TSDBEvent } from './liveScores'
import type { FixtureResult } from './openfootball'

export interface MergeResult {
  /** Multi-path update payload — keys are absolute paths under the root. */
  updates: Record<string, unknown>
  changed: number
  scoresMayHaveChanged: boolean
}

/**
 * Pure merge: given the latest TSDB events, optional openfootball final scores,
 * and the current /matches state, derive what needs to change in /matches. No
 * Firebase deps so this runs in both browser and Node.
 *
 * Priority: TheSportsDB is authoritative (it carries live, in-play scores).
 * openfootball final scores are a backstop for fixtures TSDB's free tier is
 * missing entirely — they only finalize a started match that TSDB hasn't
 * already settled this pass.
 */
export function deriveMatchUpdates(
  events: TSDBEvent[],
  matches: Record<string, Match>,
  fallbackResults: FixtureResult[] = [],
): MergeResult {
  const matchIndex = buildMatchIndex(matches)

  const updates: Record<string, unknown> = {}
  let changed = 0
  let scoresMayHaveChanged = false

  // Effective status per match id after each source is applied, so the
  // openfootball backstop below can tell which games TSDB already settled.
  const effectiveStatus: Record<string, Match['status']> = {}
  for (const m of Object.values(matches)) effectiveStatus[m.id] = m.status

  // 1) TheSportsDB — primary source, including live in-play scores.
  for (const event of events) {
    if (!event.dateEvent || !event.strHomeTeam || !event.strAwayTeam) continue
    const match = matchIndex[matchPairKey(event.dateEvent, event.strHomeTeam, event.strAwayTeam)]
    if (!match) continue

    const newStatus = mapStatus(event.strStatus)
    const newScore = parseScore(event)

    // A manually overridden match is protected from the lagging feed: accept an
    // update only when it raises the total goals or finalizes the match (FT).
    // This stops the API walking an admin's "2–0" back down to a stale "1–0".
    if (match.manualOverride && !overrideUpdateAllowed(match, newStatus, newScore)) {
      continue
    }

    const statusChanged = newStatus !== match.status
    const scoreChanged =
      !!newScore &&
      (!match.score || match.score.home !== newScore.home || match.score.away !== newScore.away)

    if (statusChanged) updates[`matches/${match.id}/status`] = newStatus
    if (scoreChanged && newScore) updates[`matches/${match.id}/score`] = newScore

    if (statusChanged || scoreChanged) {
      changed++
      if (newStatus === 'FT') scoresMayHaveChanged = true
    }
    effectiveStatus[match.id] = newStatus
  }

  // 2) openfootball final scores — backstop for fixtures TSDB doesn't carry.
  // Only finalize a started match that isn't already FT after the TSDB pass.
  // Same source as the schedule, so team names always match cleanly.
  const now = Date.now()
  for (const r of fallbackResults) {
    const match = matchIndex[matchPairKey(r.date, r.home, r.away)]
    if (!match) continue
    if (now < match.kickoffAt) continue
    if (effectiveStatus[match.id] === 'FT') continue

    const scoreChanged =
      !match.score || match.score.home !== r.score.home || match.score.away !== r.score.away

    updates[`matches/${match.id}/status`] = 'FT'
    if (scoreChanged) updates[`matches/${match.id}/score`] = r.score

    effectiveStatus[match.id] = 'FT'
    changed++
    scoresMayHaveChanged = true
  }

  return { updates, changed, scoresMayHaveChanged }
}

/**
 * For a manually overridden match, decide whether an incoming feed update may
 * apply. Allowed only when the match is being finalized (transitioning to FT)
 * or the new score has strictly more total goals than the current one — never
 * a regression. A finished override (already FT) stays locked.
 */
function overrideUpdateAllowed(
  match: Match,
  newStatus: Match['status'],
  newScore: { home: number; away: number } | null,
): boolean {
  if (newStatus === 'FT' && match.status !== 'FT') return true
  if (!newScore) return false
  const curTotal = (match.score?.home ?? 0) + (match.score?.away ?? 0)
  return newScore.home + newScore.away > curTotal
}

function buildMatchIndex(matches: Record<string, Match>): Record<string, Match> {
  const matchIndex: Record<string, Match> = {}
  const dayMs = 24 * 60 * 60 * 1000
  for (const m of Object.values(matches)) {
    const date = new Date(m.kickoffAt).toISOString().slice(0, 10)
    matchIndex[matchPairKey(date, m.homeTeam, m.awayTeam)] = m
    const prev = new Date(m.kickoffAt - dayMs).toISOString().slice(0, 10)
    const next = new Date(m.kickoffAt + dayMs).toISOString().slice(0, 10)
    matchIndex[matchPairKey(prev, m.homeTeam, m.awayTeam)] ??= m
    matchIndex[matchPairKey(next, m.homeTeam, m.awayTeam)] ??= m
  }
  return matchIndex
}

function matchPairKey(date: string, t1: string, t2: string): string {
  const a = teamKey(t1)
  const b = teamKey(t2)
  return `${date}|${[a, b].sort().join('-')}`
}
