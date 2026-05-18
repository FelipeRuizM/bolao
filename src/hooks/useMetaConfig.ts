import { useEffect, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { db } from '@/firebase'
import type { BigGameConfig } from '@/scoring'

export function useBigGame(): BigGameConfig | null {
  const [value, setValue] = useState<BigGameConfig | null>(null)
  useEffect(() => {
    return onValue(ref(db, 'meta/config/bigGame'), (snap) => {
      const v = snap.val() as BigGameConfig | null
      setValue(
        v && typeof v.matchId === 'string' && Number.isFinite(v.multiplier) && v.multiplier > 0
          ? v
          : null,
      )
    })
  }, [])
  return value
}

export function usePrizePerUser(): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    return onValue(ref(db, 'meta/config/prizePerUser'), (snap) => {
      const v = snap.val()
      setValue(typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0)
    })
  }, [])
  return value
}
