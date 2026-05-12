import {
  computePoints,
  computeBonusPoints,
  DEFAULT_POINTS,
  DEFAULT_BONUS_VALUES,
  DEFAULT_STAGE_MULTIPLIERS,
  type BonusAnswers,
  type BonusValues,
  type PointValues,
  type StageMultipliers,
} from './index'
import type { BonusPick, Match, Prediction, UserScore } from '../types'

export interface ComputeAllInputs {
  matches: Record<string, Match>
  predictions: Record<string, Record<string, Prediction>>
  users: Record<string, unknown>
  bonusPicks: Record<string, BonusPick>
  pointValues?: PointValues
  bonusValues?: BonusValues
  bonusAnswers?: BonusAnswers
  stageMultipliers?: StageMultipliers
}

export function computeAllUserScores({
  matches,
  predictions,
  users,
  bonusPicks,
  pointValues = DEFAULT_POINTS,
  bonusValues = DEFAULT_BONUS_VALUES,
  bonusAnswers = {},
  stageMultipliers = DEFAULT_STAGE_MULTIPLIERS,
}: ComputeAllInputs): Record<string, UserScore> {
  const out: Record<string, UserScore> = {}

  for (const uid of Object.keys(users)) {
    let total = 0
    const perMatch: Record<string, number> = {}

    for (const [matchId, match] of Object.entries(matches)) {
      if (match.status !== 'FT' || !match.score) continue
      const pred = predictions[matchId]?.[uid]
      if (!pred) continue
      const result = computePoints({
        prediction: { home: pred.home, away: pred.away },
        actual: match.score,
        stage: match.stage,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        pointValues,
        stageMultipliers,
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

    out[uid] = { total, perMatch, bonusPts }
  }

  return out
}
