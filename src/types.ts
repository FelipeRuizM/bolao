export type Stage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | '3rd' | 'final'
export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'FT'

export interface Score {
  home: number
  away: number
}

export interface Match {
  id: string
  homeTeam: string
  awayTeam: string
  kickoffAt: number
  stage: Stage
  status: MatchStatus
  score?: Score
  group?: string
  /**
   * Set when an admin manually overrides the score/status. While true, the live
   * sync may only raise the score (more total goals) or finalize the match (FT);
   * it can't walk a manually-entered score back down. See deriveMatchUpdates.
   */
  manualOverride?: boolean
}

export interface Prediction {
  home: number
  away: number
  submittedAt: number
}

export interface BonusPick {
  tournamentWinner?: string
  topScorer?: string
  bestPlayer?: string
  bestYoungPlayer?: string
  bestGoalkeeper?: string
  lockedAt?: number
}

export interface UserProfile {
  displayName: string
  role: 'player' | 'admin'
  email: string
  /** Friend group this user belongs to. Undefined = the default group. */
  group?: string
}

export interface UserScore {
  total: number
  perMatch: Record<string, number>
  bonusPts: number
}
