import { useEffect, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { db } from '@/firebase'
import {
  DEFAULT_BONUS_VALUES,
  DEFAULT_POINTS,
  DEFAULT_STAGE_MULTIPLIERS,
  type BonusAnswers,
  type BonusValues,
  type PointValues,
  type StageMultipliers,
} from '@/scoring'

interface GroupEntry {
  email?: string
  group?: string
}

export interface Config {
  pointValues: PointValues
  bonusValues: BonusValues
  bonusAnswers: BonusAnswers
  stageMultipliers: StageMultipliers
  allowedEmails: string[]
  /** Lowercased email → friend group, for pre-assigning groups before first login. */
  userGroups: Record<string, string>
  lockBonusAt: number | null
}

interface RawConfig {
  pointValues?: PointValues
  bonusValues?: BonusValues
  bonusAnswers?: BonusAnswers
  stageMultipliers?: StageMultipliers
  allowedEmails?: string[] | Record<string, string>
  userGroups?: GroupEntry[] | Record<string, GroupEntry>
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

      const rawGroups = val.userGroups
      const groupEntries: GroupEntry[] = Array.isArray(rawGroups)
        ? rawGroups
        : rawGroups && typeof rawGroups === 'object'
        ? Object.values(rawGroups)
        : []
      const userGroups: Record<string, string> = {}
      for (const e of groupEntries) {
        if (e?.email && e?.group) userGroups[e.email.toLowerCase()] = e.group
      }

      setConfig({
        pointValues: val.pointValues ?? DEFAULT_POINTS,
        bonusValues: val.bonusValues ?? DEFAULT_BONUS_VALUES,
        bonusAnswers: val.bonusAnswers ?? {},
        stageMultipliers: val.stageMultipliers ?? DEFAULT_STAGE_MULTIPLIERS,
        allowedEmails: allowed.filter((e): e is string => typeof e === 'string'),
        userGroups,
        lockBonusAt: typeof val.lockBonusAt === 'number' ? val.lockBonusAt : null,
      })
    })
  }, [])

  return config
}
