import type { Match } from '../types'
import { mapStatus, parseScore, teamKey, type TSDBEvent } from './liveScores'

export interface MergeResult {
  /** Multi-path update payload — keys are absolute paths under the root. */
  updates: Record<string, unknown>
  changed: number
  scoresMayHaveChanged: boolean
}

/**
 * Pure merge: given the latest TSDB events and the current /matches state,
 * derive what needs to change in /matches. No Firebase deps so this runs
 * in both browser and Node.
 */
export function deriveMatchUpdates(
  events: TSDBEvent[],
  matches: Record<string, Match>,
): MergeResult {
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

  const updates: Record<string, unknown> = {}
  let changed = 0
  let scoresMayHaveChanged = false

  for (const event of events) {
    if (!event.dateEvent || !event.strHomeTeam || !event.strAwayTeam) continue
    const k = matchPairKey(event.dateEvent, event.strHomeTeam, event.strAwayTeam)
    const match = matchIndex[k]
    if (!match) continue

    const newStatus = mapStatus(event.strStatus)
    const newScore = parseScore(event)

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
  }

  return { updates, changed, scoresMayHaveChanged }
}

function matchPairKey(date: string, t1: string, t2: string): string {
  const a = teamKey(t1)
  const b = teamKey(t2)
  return `${date}|${[a, b].sort().join('-')}`
}
