import { useEffect, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { db } from '@/firebase'
import {
  DEFAULT_BONUS_VALUES,
  DEFAULT_POINTS,
  type BonusAnswers,
  type BonusValues,
  type PointValues,
} from '@/scoring'

export interface Config {
  pointValues: PointValues
  bonusValues: BonusValues
  bonusAnswers: BonusAnswers
  allowedEmails: string[]
  lockBonusAt: number | null
}

interface RawConfig {
  pointValues?: PointValues
  bonusValues?: BonusValues
  bonusAnswers?: BonusAnswers
  allowedEmails?: string[] | Record<string, string>
  lockBonusAt?: number
}

export function useConfig() {
  const [config, setConfig] = useState<Config | null>(null)

  useEffect(() => {
    return onValue(ref(db, 'meta/config'), (snap) => {
      const val = (snap.val() ?? {}) as RawConfig
      const rawAllowed = val.allowedEmails
      const allowed: string[] = Array.isArray(rawAllowed)
        ? rawAllowed
        : rawAllowed && typeof rawAllowed === 'object'
        ? Object.values(rawAllowed)
        : []
      setConfig({
        pointValues: val.pointValues ?? DEFAULT_POINTS,
        bonusValues: val.bonusValues ?? DEFAULT_BONUS_VALUES,
        bonusAnswers: val.bonusAnswers ?? {},
        allowedEmails: allowed.filter((e): e is string => typeof e === 'string'),
        lockBonusAt: typeof val.lockBonusAt === 'number' ? val.lockBonusAt : null,
      })
    })
  }, [])

  return config
}
