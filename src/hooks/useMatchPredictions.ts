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
