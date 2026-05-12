import { ref, set, update } from 'firebase/database'
import { db } from '@/firebase'
import { recomputeAllUserScores } from '@/scoring/recompute'
import type {
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
  if (answers.tournamentWinner?.trim()) {
    cleaned.tournamentWinner = answers.tournamentWinner.trim()
  }
  if (answers.topScorer?.trim()) {
    cleaned.topScorer = answers.topScorer.trim()
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

export async function setUserPaid(uid: string, paid: boolean): Promise<void> {
  await set(ref(db, `users/${uid}/paid`), paid)
}

export async function setLockBonusAt(timestamp: number): Promise<void> {
  await set(ref(db, 'meta/config/lockBonusAt'), timestamp)
}

export async function recomputeNow(): Promise<void> {
  await recomputeAllUserScores()
}
