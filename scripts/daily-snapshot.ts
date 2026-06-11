/**
 * Score sync — two modes, selected by the SYNC_MODE env var:
 *
 *   live (cron every 10 min): exits immediately unless a game is in progress
 *   (status LIVE, or SCHEDULED with kickoff in the past). When one is, syncs
 *   TheSportsDB and — only if a match actually changed — recomputes scores,
 *   so the leaderboard updates minutes after each final whistle.
 *
 *   full (nightly 00:00 BRT cron + manual dispatch): unconditional sync,
 *   recompute and history rebuild; reconciles anything live mode missed.
 *
 * Pipeline:
 *   1. Fetch latest TheSportsDB events for the World Cup.
 *   2. Apply any new statuses/scores to /matches.
 *   3. Recompute every player's total in /scores.
 *   4. Rebuild /scoreHistory as one snapshot per FT match: for each finished
 *      match (in kickoff order), write totals computed against only the FT
 *      matches with kickoffAt <= that match. Keyed by
 *      `{kickoffAt}_{matchId}` so lexical sort = chronological order. The
 *      rank-over-time chart then has a point per match instead of per day.
 *
 * Auth: see scripts/_firebase-admin.ts.
 */
import { fetchSeasonEvents } from '../src/api/liveScores'
import { deriveMatchUpdates } from '../src/api/syncMerge'
import { computeAllUserScores } from '../src/scoring/computeAll'
import type {
  BonusAnswers,
  BonusValues,
  PointValues,
  StageMultipliers,
} from '../src/scoring/index'
import type { BonusPick, Match, Prediction } from '../src/types'
import { initAdmin } from './_firebase-admin'

async function main(): Promise<void> {
  const mode = process.env.SYNC_MODE === 'live' ? 'live' : 'full'
  const db = initAdmin()

  const matchesSnap = await db.ref('matches').get()
  const matches = (matchesSnap.val() ?? {}) as Record<string, Match>

  if (mode === 'live') {
    // A game counts as in progress until our own DB says FT — a SCHEDULED
    // match past kickoff is either live or missed, so keep polling either way.
    const now = Date.now()
    const inProgress = Object.values(matches).filter(
      (m) => m.status === 'LIVE' || (m.status === 'SCHEDULED' && m.kickoffAt <= now),
    )
    if (inProgress.length === 0) {
      console.log('Live mode: no game in progress, nothing to do.')
      return
    }
    console.log(`Live mode: ${inProgress.length} game(s) in progress.`)
  }

  console.log('Fetching events from TheSportsDB…')
  const [events, predsSnap, configSnap, usersSnap, bonusPicksSnap] = await Promise.all([
    fetchSeasonEvents(),
    db.ref('predictions').get(),
    db.ref('meta/config').get(),
    db.ref('users').get(),
    db.ref('bonusPicks').get(),
  ])
  const predictions = (predsSnap.val() ?? {}) as Record<string, Record<string, Prediction>>
  const config = (configSnap.val() ?? {}) as {
    pointValues?: PointValues
    bonusValues?: BonusValues
    bonusAnswers?: BonusAnswers
    stageMultipliers?: StageMultipliers
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

  if (mode === 'live' && changed === 0) {
    console.log('Live mode: no score/status changes — skipping recompute.')
    return
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
    stageMultipliers: config.stageMultipliers,
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
