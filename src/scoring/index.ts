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

export const STAGE_MULTIPLIERS: Record<Stage, number> = {
  group: 1,
  r32: 1,
  r16: 1.5,
  qf: 2,
  sf: 2.5,
  '3rd': 2.5,
  final: 3,
}

export const BRAZIL_MULTIPLIER = 3
const BRAZIL_NAME = 'Brazil'

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

export function multiplierFor(stage: Stage, homeTeam: string, awayTeam: string): number {
  const stageMult = STAGE_MULTIPLIERS[stage]
  const brazilMult = homeTeam === BRAZIL_NAME || awayTeam === BRAZIL_NAME ? BRAZIL_MULTIPLIER : 1
  return stageMult * brazilMult
}

export interface ComputePointsArgs {
  prediction: Score
  actual: Score
  stage: Stage
  homeTeam: string
  awayTeam: string
  pointValues?: PointValues
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
}: ComputePointsArgs): ComputePointsResult {
  const tier = classifyTier(prediction, actual)
  const base = tier === 'wrong' ? 0 : pointValues[tier]
  const multiplier = multiplierFor(stage, homeTeam, awayTeam)
  return { tier, base, multiplier, total: base * multiplier }
}
