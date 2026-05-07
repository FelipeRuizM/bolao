import { useEffect, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { db } from '@/firebase'
import type { BonusPick } from '@/types'
import type { BonusAnswers } from '@/scoring'

export function useBonusLockAt() {
  const [lockAt, setLockAt] = useState<number | null | undefined>(undefined)
  useEffect(() => {
    return onValue(ref(db, 'meta/config/lockBonusAt'), (snap) => {
      const val = snap.val()
      setLockAt(typeof val === 'number' ? val : null)
    })
  }, [])
  return lockAt
}

export function useMyBonusPick(uid: string | undefined) {
  const [pick, setPick] = useState<BonusPick | null | undefined>(undefined)
  useEffect(() => {
    if (!uid) {
      setPick(null)
      return
    }
    return onValue(ref(db, `bonusPicks/${uid}`), (snap) => {
      setPick((snap.val() as BonusPick | null) ?? null)
    })
  }, [uid])
  return pick
}

export function useAllBonusPicks(isLocked: boolean) {
  const [picks, setPicks] = useState<Record<string, BonusPick> | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!isLocked) {
      setPicks(null)
      setError(null)
      return
    }
    return onValue(
      ref(db, 'bonusPicks'),
      (snap) => {
        setPicks((snap.val() as Record<string, BonusPick> | null) ?? {})
        setError(null)
      },
      (err) => setError(err.message),
    )
  }, [isLocked])
  return { picks, error }
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
