import { useEffect, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { db } from '@/firebase'
import type { BonusPick } from '@/types'
import type { BonusAnswers } from '@/scoring'

/**
 * One player's bonus pick. Readable for your own uid anytime; for others, once
 * the bonus lock has passed (per the security rules). On a denied read the value
 * resolves to null, so callers simply render nothing.
 */
export function useBonusPick(uid: string | undefined) {
  const [pick, setPick] = useState<BonusPick | null | undefined>(undefined)
  useEffect(() => {
    if (!uid) {
      setPick(null)
      return
    }
    return onValue(
      ref(db, `bonusPicks/${uid}`),
      (snap) => setPick((snap.val() as BonusPick | null) ?? null),
      () => setPick(null),
    )
  }, [uid])
  return pick
}

export function useBonusAnswers() {
  const [answers, setAnswers] = useState<BonusAnswers>({})
  useEffect(() => {
    return onValue(ref(db, 'meta/config/bonusAnswers'), (snap) => {
      setAnswers((snap.val() as BonusAnswers | null) ?? {})
    })
  }, [])
  return answers
}
