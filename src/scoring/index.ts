import type { Score, Stage } from '../types'

export interface PointValues {
  exact: number
  goalDifference: number
  winnerScore: number
  loserScore: number
  outcome: number
}

export const DEFAULT_POINTS: PointValues = {
  exact: 10,
  goalDifference: 5,
  winnerScore: 4,
  loserScore: 2,
  outcome: 1,
}

export interface BonusValues {
  tournamentWinner: number
  topScorer: number
}

export const DEFAULT_BONUS_VALUES: BonusValues = {
  tournamentWinner: 20,
  topScorer: 15,
}

export interface BonusAnswers {
  tournamentWinner?: string
  topScorer?: string
}

export function normalizeBonusAnswer(s: string | undefined | null): string {
  if (!s) return ''
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function computeBonusPoints(
  pick: { tournamentWinner?: string; topScorer?: string },
  answers: BonusAnswers,
  values: BonusValues = DEFAULT_BONUS_VALUES,
): { tournamentWinner: number; topScorer: number; total: number } {
  const winnerOk =
    !!answers.tournamentWinner &&
    normalizeBonusAnswer(pick.tournamentWinner) === normalizeBonusAnswer(answers.tournamentWinner)
  const scorerOk =
    !!answers.topScorer &&
    normalizeBonusAnswer(pick.topScorer) === normalizeBonusAnswer(answers.topScorer)
  const tw = winnerOk ? values.tournamentWinner : 0
  const ts = scorerOk ? values.topScorer : 0
  return { tournamentWinner: tw, topScorer: ts, total: tw + ts }
}

export const DEFAULT_STAGE_MULTIPLIERS: Record<Stage, number> = {
  group: 1,
  r32: 2,
  r16: 3,
  qf: 4,
  sf: 5,
  '3rd': 3,
  final: 6,
}

export type StageMultipliers = Record<Stage, number>

export const BRAZIL_MULTIPLIER = 3
const BRAZIL_NAME = 'Brazil'

export function isBrazilMatch(homeTeam: string, awayTeam: string): boolean {
  return homeTeam === BRAZIL_NAME || awayTeam === BRAZIL_NAME
}

/** Legacy single-match shape, kept for back-compat reads/migration. */
export interface BigGameConfig {
  matchId: string
  multiplier: number
}

/** Map of matchId -> multiplier (>0). Multiple matches can be "big games". */
export type BigGames = Record<string, number>

/**
 * Normalize stored big-game config into a clean map of positive multipliers,
 * folding in any legacy single `bigGame` value so old data keeps applying.
 */
export function normalizeBigGames(
  bigGames: Record<string, unknown> | null | undefined,
  legacy?: BigGameConfig | null,
): BigGames {
  const out: BigGames = {}
  if (
    legacy &&
    typeof legacy.matchId === 'string' &&
    Number.isFinite(legacy.multiplier) &&
    legacy.multiplier > 0
  ) {
    out[legacy.matchId] = legacy.multiplier
  }
  if (bigGames) {
    for (const [id, v] of Object.entries(bigGames)) {
      const n = typeof v === 'number' ? v : Number(v)
      if (Number.isFinite(n) && n > 0) out[id] = n
    }
  }
  return out
}

export function bigGameMultiplier(
  matchId: string | undefined,
  bigGames: BigGames | null | undefined,
): number {
  if (!matchId || !bigGames) return 1
  const m = bigGames[matchId]
  return typeof m === 'number' && Number.isFinite(m) && m > 0 ? m : 1
}

export type Tier = 'exact' | 'goalDifference' | 'winnerScore' | 'loserScore' | 'outcome' | 'wrong'

function outcome(s: Score): 'home' | 'away' | 'draw' {
  if (s.home > s.away) return 'home'
  if (s.home < s.away) return 'away'
  return 'draw'
}

export function classifyTier(prediction: Score, actual: Score): Tier {
  if (prediction.home === actual.home && prediction.away === actual.away) return 'exact'

  const predOutcome = outcome(prediction)
  const actualOutcome = outcome(actual)
  if (predOutcome !== actualOutcome) return 'wrong'

  const predGD = prediction.home - prediction.away
  const actualGD = actual.home - actual.away
  if (predGD === actualGD) return 'goalDifference'

  if (actualOutcome === 'draw') return 'outcome'

  // Real match has a winner. Determine the winning side per actual.
  const winnerIsHome = actual.home > actual.away
  const actualWinnerGoals = winnerIsHome ? actual.home : actual.away
  const actualLoserGoals = winnerIsHome ? actual.away : actual.home
  const predWinnerGoals = winnerIsHome ? prediction.home : prediction.away
  const predLoserGoals = winnerIsHome ? prediction.away : prediction.home

  if (predWinnerGoals === actualWinnerGoals) return 'winnerScore'
  if (predLoserGoals === actualLoserGoals) return 'loserScore'
  return 'outcome'
}

export function multiplierFor(
  stage: Stage,
  homeTeam: string,
  awayTeam: string,
  stageMultipliers: StageMultipliers = DEFAULT_STAGE_MULTIPLIERS,
  options: { matchId?: string; bigGames?: BigGames | null } = {},
): number {
  const stageMult = stageMultipliers[stage]
  const brazilMult = homeTeam === BRAZIL_NAME || awayTeam === BRAZIL_NAME ? BRAZIL_MULTIPLIER : 1
  const bigGameMult = bigGameMultiplier(options.matchId, options.bigGames)
  return stageMult * brazilMult * bigGameMult
}

export function isBigGame(matchId: string, bigGames: BigGames | null | undefined): boolean {
  return bigGameMultiplier(matchId, bigGames) > 1
}

export interface ComputePointsArgs {
  prediction: Score
  actual: Score
  stage: Stage
  homeTeam: string
  awayTeam: string
  pointValues?: PointValues
  stageMultipliers?: StageMultipliers
  matchId?: string
  bigGames?: BigGames | null
}

export interface ComputePointsResult {
  tier: Tier
  base: number
  multiplier: number
  total: number
}

export function computePoints({
  prediction,
  actual,
  stage,
  homeTeam,
  awayTeam,
  pointValues = DEFAULT_POINTS,
  stageMultipliers = DEFAULT_STAGE_MULTIPLIERS,
  matchId,
  bigGames,
}: ComputePointsArgs): ComputePointsResult {
  const tier = classifyTier(prediction, actual)
  const base = tier === 'wrong' ? 0 : pointValues[tier]
  const multiplier = multiplierFor(stage, homeTeam, awayTeam, stageMultipliers, { matchId, bigGames })
  return { tier, base, multiplier, total: base * multiplier }
}
