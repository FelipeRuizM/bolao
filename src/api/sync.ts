import { get, ref, runTransaction, update } from 'firebase/database'
import { db } from '@/firebase'
import { fetchSeasonEvents } from './liveScores'
import { deriveMatchUpdates } from './syncMerge'
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
  const { updates, changed, scoresMayHaveChanged } = deriveMatchUpdates(events, matches)

  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates)
  }
  if (scoresMayHaveChanged) {
    await recomputeAllUserScores()
  }
  return changed
}
