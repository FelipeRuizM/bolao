import { get, ref, update } from 'firebase/database'
import { db } from '@/firebase'
import { computePoints, DEFAULT_POINTS, type PointValues } from './index'
import type { Match, Prediction, UserScore } from '@/types'

interface UsersIndex {
  [uid: string]: { displayName?: string; email?: string; role?: string } | undefined
}

/**
 * Recompute every player's leaderboard total from the current state of
 * /matches and /predictions, and write to /scores/{uid}.
 * Cheap for small pools (~10 users × ~104 matches = ~1k evaluations).
 */
export async function recomputeAllUserScores(): Promise<void> {
  const [matchesSnap, predsSnap, configSnap, usersSnap] = await Promise.all([
    get(ref(db, 'matches')),
    get(ref(db, 'predictions')),
    get(ref(db, 'meta/config/pointValues')),
    get(ref(db, 'users')),
  ])

  const matches = (matchesSnap.val() ?? {}) as Record<string, Match>
  const allPreds = (predsSnap.val() ?? {}) as Record<string, Record<string, Prediction>>
  const pointValues = (configSnap.val() as PointValues | null) ?? DEFAULT_POINTS
  const users = (usersSnap.val() ?? {}) as UsersIndex

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

    updates[`scores/${uid}` as unknown as string] = { total, perMatch, bonusPts: 0 }
  }

  // Two-step: write each user score path under root with multi-path update.
  const flat: Record<string, UserScore> = {}
  for (const [k, v] of Object.entries(updates)) flat[k] = v
  if (Object.keys(flat).length > 0) {
    await update(ref(db), flat)
  }
}
