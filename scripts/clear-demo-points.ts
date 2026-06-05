/**
 * Tears down everything seeded by seed-demo-points.ts: demo matches
 * (`demo-pts-*`), demo players (`demo-user-*`) and their predictions / bonus
 * picks / scores, the demo big-game multiplier, and the demo bonus answers.
 * Then recomputes /scores for the remaining (real) users and wipes
 * /scoreHistory (rebuilt by the next daily-snapshot run).
 *
 * Run: npx tsx scripts/clear-demo-points.ts
 */
import { computeAllUserScores } from '../src/scoring/computeAll'
import { normalizeBigGames } from '../src/scoring/index'
import type {
  BonusAnswers,
  BonusValues,
  PointValues,
  StageMultipliers,
} from '../src/scoring/index'
import type { BonusPick, Match, Prediction } from '../src/types'
import { BIG_GAME_ID, MATCH_PREFIX, USER_PREFIX } from './seed-demo-points'
import { initAdmin } from './_firebase-admin'

async function main(): Promise<void> {
  const db = initAdmin()

  const [matchesSnap, usersSnap] = await Promise.all([
    db.ref('matches').get(),
    db.ref('users').get(),
  ])
  const matches = (matchesSnap.val() ?? {}) as Record<string, Match>
  const users = (usersSnap.val() ?? {}) as Record<string, unknown>

  const demoMatchIds = Object.keys(matches).filter((id) => id.startsWith(MATCH_PREFIX))
  const demoUserIds = Object.keys(users).filter((id) => id.startsWith(USER_PREFIX))

  if (demoMatchIds.length === 0 && demoUserIds.length === 0) {
    console.log('No demo-points data found — nothing to clear.')
    return
  }

  const deletes: Record<string, null> = {}
  for (const id of demoMatchIds) {
    deletes[`matches/${id}`] = null
    deletes[`predictions/${id}`] = null
  }
  for (const uid of demoUserIds) {
    deletes[`users/${uid}`] = null
    deletes[`userPredictions/${uid}`] = null
    deletes[`bonusPicks/${uid}`] = null
    deletes[`scores/${uid}`] = null
  }
  // Demo-introduced config.
  deletes[`meta/config/bigGames/${BIG_GAME_ID}`] = null
  deletes['meta/config/bonusAnswers'] = null

  await db.ref().update(deletes)
  console.log(`Removed ${demoMatchIds.length} demo match(es) and ${demoUserIds.length} demo player(s).`)

  // Recompute scores for the remaining (real) users.
  const [m2, p2, configSnap, u2, b2] = await Promise.all([
    db.ref('matches').get(),
    db.ref('predictions').get(),
    db.ref('meta/config').get(),
    db.ref('users').get(),
    db.ref('bonusPicks').get(),
  ])
  const config = (configSnap.val() ?? {}) as {
    pointValues?: PointValues
    bonusValues?: BonusValues
    bonusAnswers?: BonusAnswers
    stageMultipliers?: StageMultipliers
    bigGames?: Record<string, number> | null
    bigGame?: { matchId: string; multiplier: number } | null
  }

  const computed = computeAllUserScores({
    matches: (m2.val() ?? {}) as Record<string, Match>,
    predictions: (p2.val() ?? {}) as Record<string, Record<string, Prediction>>,
    users: (u2.val() ?? {}) as Record<string, unknown>,
    bonusPicks: (b2.val() ?? {}) as Record<string, BonusPick>,
    pointValues: config.pointValues,
    bonusValues: config.bonusValues,
    bonusAnswers: config.bonusAnswers,
    stageMultipliers: config.stageMultipliers,
    bigGames: normalizeBigGames(config.bigGames, config.bigGame),
  })

  const scoreUpdates: Record<string, unknown> = {}
  for (const [uid, score] of Object.entries(computed)) {
    scoreUpdates[`scores/${uid}`] = score
  }
  if (Object.keys(scoreUpdates).length > 0) await db.ref().update(scoreUpdates)

  await db.ref('scoreHistory').remove()
  console.log('Recomputed real scores and wiped /scoreHistory.')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('clear-demo-points failed:', err)
    process.exit(1)
  })
