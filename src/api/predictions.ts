import { ref, serverTimestamp, update } from 'firebase/database'
import { db } from '@/firebase'

export class PredictionLockedError extends Error {
  constructor() {
    super('Predictions are locked — match has already started.')
    this.name = 'PredictionLockedError'
  }
}

export async function submitPrediction(
  matchId: string,
  uid: string,
  home: number,
  away: number,
  kickoffAt: number,
): Promise<void> {
  if (Date.now() >= kickoffAt) {
    throw new PredictionLockedError()
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
