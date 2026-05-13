import { ref, serverTimestamp, update } from 'firebase/database'
import { db } from '@/firebase'

/** Picking opens 7 days before kickoff and closes at kickoff. */
export const PREDICTION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

export function predictionOpensAt(kickoffAt: number): number {
  return kickoffAt - PREDICTION_WINDOW_MS
}

export function isPredictionOpen(kickoffAt: number, now: number = Date.now()): boolean {
  return now >= predictionOpensAt(kickoffAt) && now < kickoffAt
}

export class PredictionLockedError extends Error {
  constructor() {
    super('Predictions are locked — match has already started.')
    this.name = 'PredictionLockedError'
  }
}

export class PredictionNotOpenError extends Error {
  constructor(opensAt: number) {
    super(`Predictions open at ${new Date(opensAt).toISOString()}.`)
    this.name = 'PredictionNotOpenError'
  }
}

export async function submitPrediction(
  matchId: string,
  uid: string,
  home: number,
  away: number,
  kickoffAt: number,
): Promise<void> {
  const now = Date.now()
  if (now >= kickoffAt) {
    throw new PredictionLockedError()
  }
  if (now < predictionOpensAt(kickoffAt)) {
    throw new PredictionNotOpenError(predictionOpensAt(kickoffAt))
  }
  if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
    throw new Error('Score must be non-negative integers.')
  }
  const payload = { home, away, submittedAt: serverTimestamp() }
  await update(ref(db), {
    [`predictions/${matchId}/${uid}`]: payload,
    [`userPredictions/${uid}/${matchId}`]: payload,
  })
}
