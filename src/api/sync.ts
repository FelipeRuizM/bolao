import { get, ref, runTransaction, update } from 'firebase/database'
import { db } from '@/firebase'
import { fetchSeasonEvents, mapStatus, parseScore, teamKey } from './liveScores'
import { recomputeAllUserScores } from '@/scoring/recompute'
import type { Match } from '@/types'

const SYNC_THROTTLE_MS = 2 * 60 * 1000 // 2 minutes
const SYNC_STUCK_MS = 30 * 1000 // claim if syncingBy is older than this

export type SyncOutcome =
  | { ran: true; changed: number }
  | { ran: false; reason: 'throttled' | 'another-client-syncing' }

/**
 * Try to sync match results. Throttled across all clients via /meta/sync.
 * - If last sync < 2 min ago: skip.
 * - Otherwise claim the lock via transaction; only one client wins.
 */
export async function maybeSync(uid: string): Promise<SyncOutcome> {
  const syncRef = ref(db, 'meta/sync')
  const snap = await get(syncRef)
  const sync = (snap.val() ?? { lastSyncedAt: 0, syncingBy: null }) as {
    lastSyncedAt: number
    syncingBy: string | null
    claimedAt?: number
  }

  if (Date.now() - sync.lastSyncedAt < SYNC_THROTTLE_MS) {
    return { ran: false, reason: 'throttled' }
  }

  const tx = await runTransaction(syncRef, (current) => {
    const c = (current ?? { lastSyncedAt: 0, syncingBy: null }) as {
      lastSyncedAt: number
      syncingBy: string | null
      claimedAt?: number
    }
    if (Date.now() - c.lastSyncedAt < SYNC_THROTTLE_MS) return c
    if (c.syncingBy && Date.now() - (c.claimedAt ?? 0) < SYNC_STUCK_MS) return c
    return { lastSyncedAt: c.lastSyncedAt, syncingBy: uid, claimedAt: Date.now() }
  })

  if (!tx.committed || tx.snapshot.val()?.syncingBy !== uid) {
    return { ran: false, reason: 'another-client-syncing' }
  }

  try {
    const changed = await runSync()
    await update(syncRef, { lastSyncedAt: Date.now(), syncingBy: null, claimedAt: null })
    return { ran: true, changed }
  } catch (err) {
    await update(syncRef, { syncingBy: null, claimedAt: null })
    throw err
  }
}

/** Force a sync regardless of throttle (admin button). Still uses the lock. */
export async function forceSync(uid: string): Promise<{ changed: number }> {
  const syncRef = ref(db, 'meta/sync')
  const tx = await runTransaction(syncRef, (current) => {
    const c = (current ?? { lastSyncedAt: 0, syncingBy: null }) as {
      lastSyncedAt: number
      syncingBy: string | null
      claimedAt?: number
    }
    if (c.syncingBy && Date.now() - (c.claimedAt ?? 0) < SYNC_STUCK_MS) return c
    return { lastSyncedAt: c.lastSyncedAt, syncingBy: uid, claimedAt: Date.now() }
  })
  if (!tx.committed || tx.snapshot.val()?.syncingBy !== uid) {
    throw new Error('Another client is syncing right now.')
  }
  try {
    const changed = await runSync()
    await update(syncRef, { lastSyncedAt: Date.now(), syncingBy: null, claimedAt: null })
    return { changed }
  } catch (err) {
    await update(syncRef, { syncingBy: null, claimedAt: null })
    throw err
  }
}

async function runSync(): Promise<number> {
  const [events, matchesSnap] = await Promise.all([
    fetchSeasonEvents(),
    get(ref(db, 'matches')),
  ])
  const matches = (matchesSnap.val() ?? {}) as Record<string, Match>

  // Build an index of matches keyed by date + sorted (homeKey, awayKey)
  // (sorted because some sources flip home/away). This is for fuzzy match.
  const matchIndex: Record<string, Match> = {}
  for (const m of Object.values(matches)) {
    const date = new Date(m.kickoffAt).toISOString().slice(0, 10)
    const k = matchPairKey(date, m.homeTeam, m.awayTeam)
    matchIndex[k] = m
    // also previous and next day to handle UTC date drift
    const dayMs = 24 * 60 * 60 * 1000
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
      !!newScore && (!match.score || match.score.home !== newScore.home || match.score.away !== newScore.away)

    if (statusChanged) updates[`matches/${match.id}/status`] = newStatus
    if (scoreChanged && newScore) updates[`matches/${match.id}/score`] = newScore

    if (statusChanged || scoreChanged) {
      changed++
      if (newStatus === 'FT') scoresMayHaveChanged = true
    }
  }

  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates)
  }
  if (scoresMayHaveChanged) {
    await recomputeAllUserScores()
  }
  return changed
}

function matchPairKey(date: string, t1: string, t2: string): string {
  const a = teamKey(t1)
  const b = teamKey(t2)
  return `${date}|${[a, b].sort().join('-')}`
}
