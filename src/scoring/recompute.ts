import { get, ref, set, update } from 'firebase/database'
import { db } from '@/firebase'
import { computeAllUserScores } from './computeAll'
import { normalizeBigGames } from './index'
import type {
  BigGameConfig,
  BonusAnswers,
  BonusValues,
  PointValues,
  StageMultipliers,
} from './index'
import type { BonusPick, Match, Prediction, UserScore } from '@/types'

type ComputeOpts = Omit<Parameters<typeof computeAllUserScores>[0], 'matches'>

/**
 * Load everything the scoring engine needs, read from the browser.
 *
 * Note on reads: typical security rules grant per-match prediction reads only
 * after kickoff (status != "SCHEDULED"), so reading the whole /predictions
 * subtree from the browser is rejected as Permission Denied. We read each FT
 * match's predictions individually — each one passes the per-match rule.
 * /bonusPicks is read defensively in case the bonus lock is still in the
 * future (rules usually hide bonus picks until the lock).
 */
async function loadComputeInputs(): Promise<{
  matches: Record<string, Match>
  computeOpts: ComputeOpts
}> {
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
    stageMultipliers?: StageMultipliers
    bigGames?: Record<string, number> | null
    bigGame?: BigGameConfig | null
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

  const computeOpts: ComputeOpts = {
    predictions,
    users,
    bonusPicks,
    pointValues: config.pointValues,
    bonusValues: config.bonusValues,
    bonusAnswers: config.bonusAnswers,
    stageMultipliers: config.stageMultipliers,
    bigGames: normalizeBigGames(config.bigGames, config.bigGame),
  }

  return { matches, computeOpts }
}

/**
 * Recompute every player's leaderboard total from /matches, /predictions,
 * and /bonusPicks (if /meta/config/bonusAnswers is set). Writes /scores.
 *
 * Also rebuilds /scoreHistory — one cumulative snapshot per FT match — so the
 * rank-over-time chart refreshes as soon as a game finishes (a sync recomputes
 * scores on every client), not only when the nightly snapshot cron runs.
 */
export async function recomputeAllUserScores(): Promise<void> {
  const { matches, computeOpts } = await loadComputeInputs()

  const computed = computeAllUserScores({ matches, ...computeOpts })

  const updates: Record<string, UserScore> = {}
  for (const [uid, score] of Object.entries(computed)) {
    updates[`scores/${uid}`] = score
  }

  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates as unknown as Record<string, unknown>)
  }

  await writeScoreHistory(matches, computeOpts)
}

/**
 * Rebuild only /scoreHistory (the rank-over-time chart) from current data,
 * without touching /scores. Unlike the background rebuild below, this lets a
 * write failure propagate, so an admin who triggers it sees a permissions or
 * network error instead of a silent no-op. Returns how many per-match points
 * the chart now has.
 */
export async function rebuildScoreHistoryNow(): Promise<{ points: number }> {
  const { matches, computeOpts } = await loadComputeInputs()
  const history = buildScoreHistory(matches, computeOpts)
  await set(ref(db, 'scoreHistory'), history)
  return { points: Object.keys(history).length }
}

/**
 * Build /scoreHistory: one cumulative snapshot per FT match, in kickoff order
 * (tiebreak: match id). Each snapshot scores only the FT matches up to and
 * including that match, so the chart gains one point per finished game. Keyed
 * `{kickoffAt}_{matchId}` so a lexical sort is chronological.
 */
function buildScoreHistory(
  matches: Record<string, Match>,
  computeOpts: ComputeOpts,
): Record<string, Record<string, number>> {
  const ftMatches = Object.values(matches)
    .filter((m) => m.status === 'FT' && m.score)
    .sort((a, b) => a.kickoffAt - b.kickoffAt || a.id.localeCompare(b.id))

  const history: Record<string, Record<string, number>> = {}
  const matchesUpTo: Record<string, Match> = {}
  for (const m of ftMatches) {
    matchesUpTo[m.id] = m
    const snapshot = computeAllUserScores({ matches: matchesUpTo, ...computeOpts })
    const point: Record<string, number> = {}
    for (const [uid, score] of Object.entries(snapshot)) point[uid] = score.total
    history[`${m.kickoffAt}_${m.id}`] = point
  }
  return history
}

/**
 * Write /scoreHistory as part of the background recompute. Failures are
 * swallowed: the chart is a non-critical view, and security rules may not grant
 * /scoreHistory writes to every client — the nightly cron is the backstop.
 * Admins who want a guaranteed, error-surfacing rebuild use rebuildScoreHistoryNow.
 */
async function writeScoreHistory(
  matches: Record<string, Match>,
  computeOpts: ComputeOpts,
): Promise<void> {
  try {
    await set(ref(db, 'scoreHistory'), buildScoreHistory(matches, computeOpts))
  } catch (err) {
    console.info('[recompute] /scoreHistory not writable, leaving chart to the cron:', err)
  }
}
