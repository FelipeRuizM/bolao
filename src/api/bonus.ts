import { ref, set, serverTimestamp } from 'firebase/database'
import { db } from '@/firebase'

export class BonusLockedError extends Error {
  constructor() {
    super('Bonus picks are locked — tournament has already started.')
    this.name = 'BonusLockedError'
  }
}

export interface BonusPickInput {
  tournamentWinner: string
  topScorer: string
  bestPlayer: string
  bestYoungPlayer: string
  bestGoalkeeper: string
}

export async function submitBonusPicks(
  uid: string,
  picks: BonusPickInput,
  lockAt: number | null,
): Promise<void> {
  if (lockAt !== null && Date.now() >= lockAt) {
    throw new BonusLockedError()
  }
  const cleaned: BonusPickInput = {
    tournamentWinner: picks.tournamentWinner.trim(),
    topScorer: picks.topScorer.trim(),
    bestPlayer: picks.bestPlayer.trim(),
    bestYoungPlayer: picks.bestYoungPlayer.trim(),
    bestGoalkeeper: picks.bestGoalkeeper.trim(),
  }
  if (Object.values(cleaned).some((v) => !v)) {
    throw new Error('All fields are required.')
  }
  await set(ref(db, `bonusPicks/${uid}`), {
    ...cleaned,
    submittedAt: serverTimestamp(),
  })
}
