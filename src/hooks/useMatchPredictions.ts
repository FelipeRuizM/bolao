import { useEffect, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { db } from '@/firebase'
import type { Prediction } from '@/types'

/**
 * Returns every player's prediction for a single match.
 * Only subscribes once kickoff has passed — the security rules deny reading the
 * parent path until then, so subscribing earlier would fail with a
 * permission_denied error. Gating on kickoff time (not match status) means
 * picks reveal the moment the game starts, even if the live-score sync hasn't
 * yet flipped the match to LIVE.
 */
export function useMatchPredictions(matchId: string | undefined, kickoffAt: number | undefined) {
  const [predictions, setPredictions] = useState<Record<string, Prediction> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!matchId || kickoffAt === undefined || Date.now() < kickoffAt) {
      setPredictions(null)
      setError(null)
      return
    }
    return onValue(
      ref(db, `predictions/${matchId}`),
      (snap) => {
        setPredictions((snap.val() as Record<string, Prediction> | null) ?? {})
        setError(null)
      },
      (err) => setError(err.message),
    )
  }, [matchId, kickoffAt])

  return { predictions, error }
}

/**
 * Value-free "who has picked" map: matchId -> { uid: true }. Readable before
 * kickoff (unlike /predictions), so the UI can show *that* someone picked
 * without revealing the score. Returns null while loading or if the read is
 * denied (e.g. the `predictionStatus` rule isn't deployed yet), so callers can
 * simply hide the indicator rather than show a misleading "nobody picked".
 */
/**
 * Value-free "who has picked" map for a single match: { uid: true }. Readable
 * before kickoff. Returns null while loading or if denied, so callers can hide.
 */
export function useMatchPickStatus(matchId: string | undefined): Record<string, boolean> | null {
  const [data, setData] = useState<Record<string, boolean> | null>(null)

  useEffect(() => {
    if (!matchId) return
    return onValue(
      ref(db, `predictionStatus/${matchId}`),
      (snap) => setData((snap.val() as Record<string, boolean> | null) ?? {}),
      () => setData(null),
    )
  }, [matchId])

  return data
}

export function useAllPickStatus(): Record<string, Record<string, boolean>> | null {
  const [data, setData] = useState<Record<string, Record<string, boolean>> | null>(null)

  useEffect(() => {
    return onValue(
      ref(db, 'predictionStatus'),
      (snap) => setData((snap.val() as Record<string, Record<string, boolean>> | null) ?? {}),
      () => setData(null),
    )
  }, [])

  return data
}
