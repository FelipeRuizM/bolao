/**
 * Nightly cron — runs at 00:00 BRT (= 03:00 UTC).
 *
 *   1. Fetch latest TheSportsDB events for the World Cup.
 *   2. Apply any new statuses/scores to /matches.
 *   3. Recompute every player's total in /scores.
 *   4. Write a snapshot of totals to /scoreHistory/{YYYY-MM-DD}/{uid}
 *      so the rank-over-time chart has a fresh data point each day.
 *
 * Auth: Firebase Admin SDK with a service account key supplied via
 * FIREBASE_SERVICE_ACCOUNT (raw JSON string) and FIREBASE_DATABASE_URL.
 */
import admin from 'firebase-admin'
import { fetchSeasonEvents } from '../src/api/liveScores'
import { deriveMatchUpdates } from '../src/api/syncMerge'
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

/**
 * The date label for the snapshot, in BRT (UTC-3, no DST).
 * The cron fires at 00:00 BRT — we look back 1s so the label is the day
 * that just ended (e.g. cron at 00:00 on the 15th writes label "...-14").
 */
function brtDateLabel(now: number = Date.now()): string {
  const oneSecondAgoMs = now - 1000
  const brt = new Date(oneSecondAgoMs - 3 * 60 * 60 * 1000)
  return brt.toISOString().slice(0, 10)
}

/**
 * Reads --date YYYY-MM-DD from CLI args and returns it if valid, else null.
 * Lets the user backfill past days locally without waiting for the cron.
 */
function parseDateArg(): string | null {
  const idx = process.argv.indexOf('--date')
  if (idx === -1) return null
  const val = process.argv[idx + 1]
  if (!val || !/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    throw new Error(`--date expects YYYY-MM-DD, got: ${val ?? '(missing)'}`)
  }
  return val
}

async function main(): Promise<void> {
  const db = initAdmin()

  console.log('Fetching events from TheSportsDB…')
  const events = await fetchSeasonEvents()

  console.log('Reading current state from Firebase…')
  const [matchesSnap, predsSnap, configSnap, usersSnap, bonusPicksSnap] = await Promise.all([
    db.ref('matches').get(),
    db.ref('predictions').get(),
    db.ref('meta/config').get(),
    db.ref('users').get(),
    db.ref('bonusPicks').get(),
  ])

  const matches = (matchesSnap.val() ?? {}) as Record<string, Match>
  const predictions = (predsSnap.val() ?? {}) as Record<string, Record<string, Prediction>>
  const config = (configSnap.val() ?? {}) as {
    pointValues?: PointValues
    bonusValues?: BonusValues
    bonusAnswers?: BonusAnswers
  }
  const users = (usersSnap.val() ?? {}) as Record<string, unknown>
  const bonusPicks = (bonusPicksSnap.val() ?? {}) as Record<string, BonusPick>

  console.log(
    `Merging ${events.length} events against ${Object.keys(matches).length} matches…`,
  )
  const { updates: matchUpdates, changed } = deriveMatchUpdates(events, matches)

  if (Object.keys(matchUpdates).length > 0) {
    await db.ref().update(matchUpdates)
    console.log(`Wrote ${Object.keys(matchUpdates).length} match field updates (${changed} matches changed).`)
    // Re-apply locally so the recompute below sees up-to-date data without re-reading.
    for (const [path, value] of Object.entries(matchUpdates)) {
      const parts = path.split('/')
      if (parts[0] !== 'matches') continue
      const id = parts[1]
      const field = parts[2]
      if (!id || !matches[id]) continue
      if (field === 'status') matches[id].status = value as Match['status']
      else if (field === 'score') matches[id].score = value as Match['score']
    }
  } else {
    console.log('No match updates.')
  }

  console.log('Recomputing scores…')
  const computed = computeAllUserScores({
    matches,
    predictions,
    users,
    bonusPicks,
    pointValues: config.pointValues,
    bonusValues: config.bonusValues,
    bonusAnswers: config.bonusAnswers,
  })

  const dateLabel = parseDateArg() ?? brtDateLabel()
  console.log(`Writing scores + snapshot for ${dateLabel}…`)

  const writes: Record<string, unknown> = {}
  for (const [uid, score] of Object.entries(computed)) {
    writes[`scores/${uid}`] = score
    writes[`scoreHistory/${dateLabel}/${uid}`] = score.total
  }

  if (Object.keys(writes).length > 0) {
    await db.ref().update(writes)
  }

  console.log(`Done. ${Object.keys(computed).length} player(s) updated; snapshot=${dateLabel}.`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('daily-snapshot failed:', err)
    process.exit(1)
  })
