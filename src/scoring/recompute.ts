import { get, ref, update } from 'firebase/database'
import { db } from '@/firebase'
import { computeAllUserScores } from './computeAll'
import type { BonusAnswers, BonusValues, PointValues } from './index'
import type { BonusPick, Match, Prediction, UserScore } from '@/types'

/**
 * Recompute every player's leaderboard total from /matches, /predictions,
 * and /bonusPicks (if /meta/config/bonusAnswers is set). Writes /scores.
 *
 * Note on reads: typical security rules grant per-match prediction reads only
 * after kickoff (status != "SCHEDULED"), so reading the whole /predictions
 * subtree from the browser is rejected as Permission Denied. We read each FT
 * match's predictions individually — each one passes the per-match rule.
 * /bonusPicks is read defensively in case the bonus lock is still in the
 * future (rules usually hide bonus picks until the lock).
 */
export async function recomputeAllUserScores(): Promise<void> {
  const [matchesSnap, configSnap, usersSnap] = await Promise.all([
    get(ref(db, 'matches')),
    get(ref(db, 'meta/config')),
    get(ref(db, 'users')),
  ])

  const matches = (matchesSnap.val() ?? {}) as Record<string, Match>
  const config = (configSnap.val() ?? {}) as {
    pointValues?: PointValues
    bonusValues?: BonusValues
    bonusAnswers?: BonusAnswers
  }
  const users = (usersSnap.val() ?? {}) as Record<string, unknown>

  // Per-FT-match prediction reads (each is individually readable post-kickoff).
  const ftMatchIds = Object.entries(matches)
    .filter(([, m]) => m.status === 'FT' && !!m.score)
    .map(([id]) => id)

  const predEntries = await Promise.all(
    ftMatchIds.map(async (id): Promise<[string, Record<string, Prediction>]> => {
      const snap = await get(ref(db, `predictions/${id}`))
      return [id, (snap.val() ?? {}) as Record<string, Prediction>]
    }),
  )
  const predictions: Record<string, Record<string, Prediction>> = Object.fromEntries(predEntries)

  let bonusPicks: Record<string, BonusPick> = {}
  try {
    const snap = await get(ref(db, 'bonusPicks'))
    bonusPicks = (snap.val() ?? {}) as Record<string, BonusPick>
  } catch (err) {
    // Pre-lock the rules typically hide /bonusPicks. Treat as no bonuses.
    console.info('[recompute] /bonusPicks not readable yet, skipping bonus credit:', err)
  }

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
