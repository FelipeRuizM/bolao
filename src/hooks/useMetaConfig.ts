import { useEffect, useMemo, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { db } from '@/firebase'
import { normalizeBigGames, type BigGameConfig, type BigGames } from '@/scoring'

/**
 * Live map of big games (matchId -> multiplier). Merges the new `bigGames`
 * map with any legacy single `bigGame` value so old data keeps applying.
 */
export function useBigGames(): BigGames {
  const [map, setMap] = useState<Record<string, unknown> | null>(null)
  const [legacy, setLegacy] = useState<BigGameConfig | null>(null)
  useEffect(() => {
    const unsubMap = onValue(ref(db, 'meta/config/bigGames'), (snap) => {
      setMap((snap.val() ?? null) as Record<string, unknown> | null)
    })
    const unsubLegacy = onValue(ref(db, 'meta/config/bigGame'), (snap) => {
      setLegacy((snap.val() ?? null) as BigGameConfig | null)
    })
    return () => {
      unsubMap()
      unsubLegacy()
    }
  }, [])
  return useMemo(() => normalizeBigGames(map, legacy), [map, legacy])
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
