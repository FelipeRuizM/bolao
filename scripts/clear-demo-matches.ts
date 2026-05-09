/**
 * Removes demo matches and their predictions, then recomputes scores.
 * Looks for any /matches/<id> where id starts with "demo-".
 *
 * Run: npx tsx scripts/clear-demo-matches.ts
 */
import admin from 'firebase-admin'
import { computeAllUserScores } from '../src/scoring/computeAll'
import type {
  BonusAnswers,
  BonusValues,
  PointValues,
} from '../src/scoring/index'
import type { BonusPick, Match, Prediction } from '../src/types'

function initAdmin(): admin.database.Database {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT
  const databaseURL = process.env.FIREBASE_DATABASE_URL
  if (!serviceAccountJson) throw new Error('FIREBASE_SERVICE_ACCOUNT env var is required')
  if (!databaseURL) throw new Error('FIREBASE_DATABASE_URL env var is required')
  const credential = admin.credential.cert(JSON.parse(serviceAccountJson))
  admin.initializeApp({ credential, databaseURL })
  return admin.database()
}

async function main(): Promise<void> {
  const db = initAdmin()

  const [matchesSnap, predsSnap] = await Promise.all([
    db.ref('matches').get(),
    db.ref('predictions').get(),
  ])
  const matches = (matchesSnap.val() ?? {}) as Record<string, Match>
  const predictions = (predsSnap.val() ?? {}) as Record<string, Record<string, Prediction>>

  const demoIds = Object.keys(matches).filter((id) => id.startsWith('demo-'))
  if (demoIds.length === 0) {
    console.log('No demo matches found.')
    return
  }

  const deletes: Record<string, null> = {}
  for (const id of demoIds) {
    deletes[`matches/${id}`] = null
    deletes[`predictions/${id}`] = null
  }
  await db.ref().update(deletes)
  console.log(`Removed ${demoIds.length} demo match(es) and their predictions.`)

  // Recompute scores so leaderboard / scoreHistory don't keep stale demo points.
  const [matchesSnap2, predsSnap2, configSnap, usersSnap, bonusPicksSnap] = await Promise.all([
    db.ref('matches').get(),
    db.ref('predictions').get(),
    db.ref('meta/config').get(),
    db.ref('users').get(),
    db.ref('bonusPicks').get(),
  ])
  const cleanMatches = (matchesSnap2.val() ?? {}) as Record<string, Match>
  const cleanPreds = (predsSnap2.val() ?? {}) as Record<string, Record<string, Prediction>>
  const config = (configSnap.val() ?? {}) as {
    pointValues?: PointValues
    bonusValues?: BonusValues
    bonusAnswers?: BonusAnswers
  }
  const users = (usersSnap.val() ?? {}) as Record<string, unknown>
  const bonusPicks = (bonusPicksSnap.val() ?? {}) as Record<string, BonusPick>

  const computed = computeAllUserScores({
    matches: cleanMatches,
    predictions: cleanPreds,
    users,
    bonusPicks,
    pointValues: config.pointValues,
    bonusValues: config.bonusValues,
    bonusAnswers: config.bonusAnswers,
  })

  const scoreUpdates: Record<string, unknown> = {}
  for (const [uid, score] of Object.entries(computed)) {
    scoreUpdates[`scores/${uid}`] = score
  }
  if (Object.keys(scoreUpdates).length > 0) {
    await db.ref().update(scoreUpdates)
  }

  // Suppress unused-import warning — `predictions` was read only for the delete summary.
  void predictions
  console.log(`Recomputed ${Object.keys(computed).length} player score(s).`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('clear-demo-matches failed:', err)
    process.exit(1)
  })
