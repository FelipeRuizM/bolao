import { useEffect, useState } from 'react'
import { get, onValue, ref } from 'firebase/database'
import { db } from '@/firebase'
import type { Match, Prediction } from '@/types'

export function useMyPrediction(matchId: string | undefined, uid: string | undefined) {
  const [prediction, setPrediction] = useState<Prediction | null | undefined>(undefined)

  useEffect(() => {
    if (!matchId || !uid) {
      setPrediction(null)
      return
    }
    return onValue(ref(db, `predictions/${matchId}/${uid}`), (snap) => {
      setPrediction((snap.val() as Prediction | null) ?? null)
    })
  }, [matchId, uid])

  return prediction
}

export function useMyPredictions(uid: string | undefined) {
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({})

  useEffect(() => {
    if (!uid) return
    return onValue(ref(db, `userPredictions/${uid}`), (snap) => {
      setPredictions((snap.val() as Record<string, Prediction> | null) ?? {})
    })
  }, [uid])

  return predictions
}

/**
 * Fetches any player's predictions for matches that have already started.
 * Reads the per-match `predictions/{matchId}/{uid}` path (publicly readable
 * post-kickoff), so it works for other players — unlike `userPredictions`,
 * which the rules only expose to its owner. Picks for SCHEDULED matches are
 * intentionally excluded (still secret until kickoff).
 */
export function usePlayerPredictions(uid: string | undefined, matches: Match[] | null) {
  const [predictions, setPredictions] = useState<Record<string, Prediction> | null>(null)

  // Only re-fetch when the set of started matches changes, not on every tick.
  const startedIds = (matches ?? [])
    .filter((m) => m.status !== 'SCHEDULED')
    .map((m) => m.id)
  const startedKey = startedIds.join(',')

  useEffect(() => {
    if (!uid || matches === null) {
      setPredictions(null)
      return
    }
    let cancelled = false
    const ids = startedKey ? startedKey.split(',') : []
    Promise.all(
      ids.map(async (id): Promise<[string, Prediction | null]> => {
        try {
          const snap = await get(ref(db, `predictions/${id}/${uid}`))
          return [id, (snap.val() as Prediction | null) ?? null]
        } catch {
          return [id, null]
        }
      }),
    ).then((entries) => {
      if (cancelled) return
      const out: Record<string, Prediction> = {}
      for (const [id, pred] of entries) if (pred) out[id] = pred
      setPredictions(out)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, startedKey, matches === null])

  return predictions
}
