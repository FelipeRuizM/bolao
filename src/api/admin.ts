import { get, ref, set, update } from 'firebase/database'
import { db } from '@/firebase'
import { rebuildScoreHistoryNow, recomputeAllUserScores } from '@/scoring/recompute'
import { BONUS_KEYS } from '@/scoring'
import type {
  BigGameConfig,
  BonusAnswers,
  BonusValues,
  PointValues,
  StageMultipliers,
} from '@/scoring'
import type { MatchStatus, Score } from '@/types'

export async function overrideMatchResult(
  matchId: string,
  score: Score | null,
  status: MatchStatus,
): Promise<void> {
  const updates: Record<string, unknown> = {
    [`matches/${matchId}/status`]: status,
    [`matches/${matchId}/score`]: score,
  }
  await update(ref(db), updates)
  await recomputeAllUserScores()
}

export async function setPointValues(values: PointValues): Promise<void> {
  await set(ref(db, 'meta/config/pointValues'), values)
  await recomputeAllUserScores()
}

export async function setStageMultipliers(values: StageMultipliers): Promise<void> {
  await set(ref(db, 'meta/config/stageMultipliers'), values)
  await recomputeAllUserScores()
}

export async function setBonusValues(values: BonusValues): Promise<void> {
  await set(ref(db, 'meta/config/bonusValues'), values)
  await recomputeAllUserScores()
}

export async function setBonusAnswers(answers: BonusAnswers): Promise<void> {
  const cleaned: BonusAnswers = {}
  for (const key of BONUS_KEYS) {
    const trimmed = answers[key]?.trim()
    if (trimmed) cleaned[key] = trimmed
  }
  // RTDB: writing null deletes the key.
  const value = Object.keys(cleaned).length === 0 ? null : cleaned
  await set(ref(db, 'meta/config/bonusAnswers'), value)
  await recomputeAllUserScores()
}

export async function setAllowedEmails(emails: string[]): Promise<void> {
  const unique = Array.from(
    new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean)),
  )
  await set(ref(db, 'meta/config/allowedEmails'), unique)
}

/**
 * Persist the email→group pre-assignment map (used to stamp a new member's
 * group on first login). Stored as a list of `{ email, group }` because emails
 * contain '.', which RTDB keys disallow. Entries with the default group are
 * dropped so the map only records explicit non-default assignments.
 */
export async function setUserGroups(map: Record<string, string>): Promise<void> {
  const entries = Object.entries(map)
    .map(([email, group]) => ({ email: email.trim().toLowerCase(), group: group.trim() }))
    .filter((e) => e.email && e.group)
  await set(ref(db, 'meta/config/userGroups'), entries.length > 0 ? entries : null)
}

/** Set (or clear, when blank) the friend group of an existing user. */
export async function setUserGroup(uid: string, group: string): Promise<void> {
  const g = group.trim()
  await set(ref(db, `users/${uid}/group`), g || null)
}

export async function setLockBonusAt(timestamp: number): Promise<void> {
  await set(ref(db, 'meta/config/lockBonusAt'), timestamp)
}

export async function recomputeNow(): Promise<void> {
  await recomputeAllUserScores()
}

/** Rebuild only the rank-over-time chart (/scoreHistory). Surfaces errors. */
export async function rebuildGraphNow(): Promise<{ points: number }> {
  return rebuildScoreHistoryNow()
}

export async function setPrizePerUser(amount: number): Promise<void> {
  const value = Number.isFinite(amount) && amount >= 0 ? amount : 0
  await set(ref(db, 'meta/config/prizePerUser'), value)
}

/**
 * Fold any legacy single `bigGame` into the `bigGames` map and clear it, so
 * the old single-match config is migrated the first time an admin edits.
 * Mutates `updates` (a multi-path update object).
 */
async function migrateLegacyBigGame(updates: Record<string, unknown>): Promise<void> {
  const snap = await get(ref(db, 'meta/config/bigGame'))
  const legacy = snap.val() as BigGameConfig | null
  if (
    legacy &&
    typeof legacy.matchId === 'string' &&
    Number.isFinite(legacy.multiplier) &&
    legacy.multiplier > 0
  ) {
    const key = `meta/config/bigGames/${legacy.matchId}`
    if (!(key in updates)) updates[key] = legacy.multiplier
  }
  updates['meta/config/bigGame'] = null
}

/** Add or update a single big game (matchId -> multiplier). */
export async function setBigGame(matchId: string, multiplier: number): Promise<void> {
  if (!matchId || !Number.isFinite(multiplier) || multiplier <= 0) return
  const updates: Record<string, unknown> = {
    [`meta/config/bigGames/${matchId}`]: multiplier,
  }
  await migrateLegacyBigGame(updates)
  await update(ref(db), updates)
  await recomputeAllUserScores()
}

/** Remove a single big game by matchId. */
export async function removeBigGame(matchId: string): Promise<void> {
  if (!matchId) return
  const updates: Record<string, unknown> = {}
  await migrateLegacyBigGame(updates)
  // Applied after migration so it wins if the removed match was the legacy one.
  updates[`meta/config/bigGames/${matchId}`] = null
  await update(ref(db), updates)
  await recomputeAllUserScores()
}
