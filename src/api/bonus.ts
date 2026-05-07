import { ref, set, serverTimestamp } from 'firebase/database'
import { db } from '@/firebase'

export class BonusLockedError extends Error {
  constructor() {
    super('Bonus picks are locked — tournament has already started.')
    this.name = 'BonusLockedError'
  }
}

export async function submitBonusPicks(
  uid: string,
  tournamentWinner: string,
  topScorer: string,
  lockAt: number | null,
): Promise<void> {
  if (lockAt !== null && Date.now() >= lockAt) {
    throw new BonusLockedError()
  }
  const cleanWinner = tournamentWinner.trim()
  const cleanScorer = topScorer.trim()
  if (!cleanWinner || !cleanScorer) {
    throw new Error('Both fields are required.')
  }
  await set(ref(db, `bonusPicks/${uid}`), {
    tournamentWinner: cleanWinner,
    topScorer: cleanScorer,
    submittedAt: serverTimestamp(),
  })
}
