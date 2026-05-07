import { get, ref, update } from 'firebase/database'
import { db } from '@/firebase'
import {
  computePoints,
  computeBonusPoints,
  DEFAULT_POINTS,
  DEFAULT_BONUS_VALUES,
  type BonusAnswers,
  type BonusValues,
  type PointValues,
} from './index'
import type { BonusPick, Match, Prediction, UserScore } from '@/types'

interface UsersIndex {
  [uid: string]: { displayName?: string; email?: string; role?: string } | undefined
}

/**
 * Recompute every player's leaderboard total from /matches, /predictions,
 * and /bonusPicks (if /meta/config/bonusAnswers is set). Writes /scores.
 */
export async function recomputeAllUserScores(): Promise<void> {
  const [matchesSnap, predsSnap, configSnap, usersSnap, bonusPicksSnap] = await Promise.all([
    get(ref(db, 'matches')),
    get(ref(db, 'predictions')),
    get(ref(db, 'meta/config')),
    get(ref(db, 'users')),
    get(ref(db, 'bonusPicks')),
  ])

  const matches = (matchesSnap.val() ?? {}) as Record<string, Match>
  const allPreds = (predsSnap.val() ?? {}) as Record<string, Record<string, Prediction>>
  const config = (configSnap.val() ?? {}) as {
    pointValues?: PointValues
    bonusValues?: BonusValues
    bonusAnswers?: BonusAnswers
  }
  const users = (usersSnap.val() ?? {}) as UsersIndex
  const bonusPicks = (bonusPicksSnap.val() ?? {}) as Record<string, BonusPick>

  const pointValues = config.pointValues ?? DEFAULT_POINTS
  const bonusValues = config.bonusValues ?? DEFAULT_BONUS_VALUES
  const bonusAnswers = config.bonusAnswers ?? {}

  const updates: Record<string, UserScore> = {}

  for (const uid of Object.keys(users)) {
    let total = 0
    const perMatch: Record<string, number> = {}

    for (const [matchId, match] of Object.entries(matches)) {
      if (match.status !== 'FT' || !match.score) continue
      const pred = allPreds[matchId]?.[uid]
      if (!pred) continue
      const result = computePoints({
        prediction: { home: pred.home, away: pred.away },
        actual: match.score,
        stage: match.stage,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        pointValues,
      })
      perMatch[matchId] = result.total
      total += result.total
    }

    const myBonus = bonusPicks[uid]
    let bonusPts = 0
    if (myBonus) {
      bonusPts = computeBonusPoints(myBonus, bonusAnswers, bonusValues).total
      total += bonusPts
    }

    updates[`scores/${uid}`] = { total, perMatch, bonusPts }
  }

  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates as unknown as Record<string, unknown>)
  }
}
