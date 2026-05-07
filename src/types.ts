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
}

export interface Prediction {
  home: number
  away: number
  submittedAt: number
}

export interface BonusPick {
  tournamentWinner?: string
  topScorer?: string
  lockedAt?: number
}

export interface UserProfile {
  displayName: string
  role: 'player' | 'admin'
  email: string
}

export interface UserScore {
  total: number
  perMatch: Record<string, number>
  bonusPts: number
}
