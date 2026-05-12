/**
 * Nightly cron — runs at 00:00 BRT (= 03:00 UTC).
 *
 *   1. Fetch latest TheSportsDB events for the World Cup.
 *   2. Apply any new statuses/scores to /matches.
 *   3. Recompute every player's total in /scores.
 *   4. Rebuild /scoreHistory as one snapshot per FT match: for each finished
 *      match (in kickoff order), write totals computed against only the FT
 *      matches with kickoffAt <= that match. Keyed by
 *      `{kickoffAt}_{matchId}` so lexical sort = chronological order. The
 *      rank-over-time chart then has a point per match instead of per day.
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

  const scoreWrites: Record<string, unknown> = {}
  for (const [uid, score] of Object.entries(computed)) {
    scoreWrites[`scores/${uid}`] = score
  }
  if (Object.keys(scoreWrites).length > 0) {
    await db.ref().update(scoreWrites)
  }

  // Rebuild scoreHistory from scratch: wipe, then write one snapshot per FT
  // match (kickoff order). Two writes because RTDB rejects shallow-null + deep
  // writes on the same path in one update.
  const ftMatches = Object.values(matches)
    .filter((m) => m.status === 'FT' && m.score)
    .sort((a, b) => a.kickoffAt - b.kickoffAt || a.id.localeCompare(b.id))

  console.log(`Rebuilding scoreHistory with ${ftMatches.length} per-match snapshot(s)…`)
  await db.ref('scoreHistory').remove()

  // Walk the sorted ftMatches array by index so simultaneous kickoffs step up
  // one match at a time (tiebreak = id.localeCompare in the sort above).
  // Using `kickoffAt <= m.kickoffAt` would collapse all tied matches into the
  // earliest snapshot.
  const historyWrites: Record<string, unknown> = {}
  const matchesUpTo: Record<string, Match> = {}

  for (const m of ftMatches) {
    matchesUpTo[m.id] = m
    const snapshot = computeAllUserScores({
      matches: matchesUpTo,
      predictions,
      users,
      bonusPicks,
      pointValues: config.pointValues,
      bonusValues: config.bonusValues,
      bonusAnswers: config.bonusAnswers,
    })
    const key = `${m.kickoffAt}_${m.id}`
    for (const [uid, score] of Object.entries(snapshot)) {
      historyWrites[`scoreHistory/${key}/${uid}`] = score.total
    }
  }
  if (Object.keys(historyWrites).length > 0) {
    await db.ref().update(historyWrites)
  }

  console.log(`Done. ${Object.keys(computed).length} player(s) updated; ${ftMatches.length} match snapshot(s).`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('daily-snapshot failed:', err)
    process.exit(1)
  })
