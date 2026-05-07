import { useEffect, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { db } from '@/firebase'
import type { Prediction } from '@/types'

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
