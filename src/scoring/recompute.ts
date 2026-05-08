import { get, ref, update } from 'firebase/database'
import { db } from '@/firebase'
import { computeAllUserScores } from './computeAll'
import type { BonusAnswers, BonusValues, PointValues } from './index'
import type { BonusPick, Match, Prediction, UserScore } from '@/types'

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
  const predictions = (predsSnap.val() ?? {}) as Record<string, Record<string, Prediction>>
  const config = (configSnap.val() ?? {}) as {
    pointValues?: PointValues
    bonusValues?: BonusValues
    bonusAnswers?: BonusAnswers
  }
  const users = (usersSnap.val() ?? {}) as Record<string, unknown>
  const bonusPicks = (bonusPicksSnap.val() ?? {}) as Record<string, BonusPick>

  const computed = computeAllUserScores({
    matches,
    predictions,
    users,
    bonusPicks,
    pointValues: config.pointValues,
    bonusValues: config.bonusValues,
    bonusAnswers: config.bonusAnswers,
  })

  const updates: Record<string, UserScore> = {}
  for (const [uid, score] of Object.entries(computed)) {
    updates[`scores/${uid}`] = score
  }

  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates as unknown as Record<string, unknown>)
  }
}
