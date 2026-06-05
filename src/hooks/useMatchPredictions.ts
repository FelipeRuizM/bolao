import { useEffect, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { db } from '@/firebase'
import type { MatchStatus, Prediction } from '@/types'

/**
 * Returns every player's prediction for a single match.
 * Only subscribes if the match is no longer SCHEDULED — the security rules
 * deny reading the parent path until kickoff, so subscribing earlier would
 * fail with a permission_denied error.
 */
export function useMatchPredictions(matchId: string | undefined, status: MatchStatus | undefined) {
  const [predictions, setPredictions] = useState<Record<string, Prediction> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!matchId || !status || status === 'SCHEDULED') {
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
  }, [matchId, status])

  return { predictions, error }
}

/**
 * Value-free "who has picked" map: matchId -> { uid: true }. Readable before
 * kickoff (unlike /predictions), so the UI can show *that* someone picked
 * without revealing the score. Returns null while loading or if the read is
 * denied (e.g. the `predictionStatus` rule isn't deployed yet), so callers can
 * simply hide the indicator rather than show a misleading "nobody picked".
 */
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
