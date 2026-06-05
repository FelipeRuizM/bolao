/**
 * Seeds a full "points simulation" into the DEV database so you can see how
 * scoring renders across the app — the leaderboard, the per-player breakdown
 * pages (/players/:uid), "My Picks", and each match's "Everyone's picks".
 *
 * What it creates (all namespaced for easy teardown):
 *   - 6 demo players in /users          (uid prefix `demo-user-`)
 *   - 7 demo matches in /matches        (id  prefix `demo-pts-`)
 *       5 finished (FT) with results, 1 LIVE, 1 SCHEDULED
 *       includes Brazil games (3×), stage multipliers, and one BIG GAME (2×)
 *   - predictions for every player, hand-tuned to hit every scoring tier
 *     (exact / goal-difference / winner-score / loser-score / outcome / wrong)
 *   - bonus picks + bonus answers so a couple of players show bonus points
 *   - /scores recomputed from the above (this is what the UI reads)
 *
 * It does NOT touch real users beyond recomputing their totals (which is what
 * the app does anyway). Tear it all down with: clear-demo-points.ts
 *
 * Auth (see scripts/_firebase-admin.ts): set FIREBASE_DATABASE_URL and
 * FIREBASE_SERVICE_ACCOUNT_PATH to the DEV project. Run:
 *
 *   npx tsx scripts/seed-demo-points.ts
 */
import { computeAllUserScores } from '../src/scoring/computeAll'
import type {
  BonusAnswers,
  BonusValues,
  PointValues,
  StageMultipliers,
} from '../src/scoring/index'
import { normalizeBigGames } from '../src/scoring/index'
import type { BonusPick, Match, Prediction, UserProfile } from '../src/types'
import { initAdmin } from './_firebase-admin'

export const MATCH_PREFIX = 'demo-pts-'
export const USER_PREFIX = 'demo-user-'
export const BIG_GAME_ID = 'demo-pts-004'

const HOUR = 60 * 60 * 1000

function hoursAgo(h: number): number {
  return Date.now() - h * HOUR
}
function daysFromNow(d: number): number {
  return Date.now() + d * 24 * HOUR
}

interface DemoMatch {
  id: string
  homeTeam: string
  awayTeam: string
  stage: Match['stage']
  status: Match['status']
  kickoffAt: number
  group?: string
  score?: { home: number; away: number }
}

const MATCHES: DemoMatch[] = [
  // Brazil group game → 3× multiplier.
  { id: 'demo-pts-001', homeTeam: 'Brazil', awayTeam: 'Serbia', stage: 'group', group: 'Demo G', status: 'FT', kickoffAt: hoursAgo(50), score: { home: 2, away: 0 } },
  // Plain group game → 1×.
  { id: 'demo-pts-002', homeTeam: 'Argentina', awayTeam: 'Mexico', stage: 'group', group: 'Demo G', status: 'FT', kickoffAt: hoursAgo(48), score: { home: 1, away: 1 } },
  // Round of 16 → 3×.
  { id: 'demo-pts-003', homeTeam: 'France', awayTeam: 'Germany', stage: 'r16', status: 'FT', kickoffAt: hoursAgo(26), score: { home: 3, away: 1 } },
  // Quarter-final (4×) AND big game (2×) → 8×.
  { id: 'demo-pts-004', homeTeam: 'Spain', awayTeam: 'Portugal', stage: 'qf', status: 'FT', kickoffAt: hoursAgo(24), score: { home: 2, away: 2 } },
  // Brazil semi-final → 5× × 3× = 15×.
  { id: 'demo-pts-005', homeTeam: 'Brazil', awayTeam: 'England', stage: 'sf', status: 'FT', kickoffAt: hoursAgo(2), score: { home: 1, away: 0 } },
  // In progress — no score yet (shows "picked, pending").
  { id: 'demo-pts-006', homeTeam: 'Netherlands', awayTeam: 'Croatia', stage: 'group', group: 'Demo H', status: 'LIVE', kickoffAt: hoursAgo(0.5) },
  // Upcoming — future kickoff (picks stay hidden on other players' pages).
  { id: 'demo-pts-007', homeTeam: 'Brazil', awayTeam: 'Argentina', stage: 'final', status: 'SCHEDULED', kickoffAt: daysFromNow(2) },
]

interface DemoPlayer {
  uid: string
  displayName: string
  paid: boolean
  // [home, away] per match id; covers the finished + live matches.
  picks: Record<string, [number, number]>
  bonus?: BonusPick
}

const PLAYERS: DemoPlayer[] = [
  {
    uid: 'demo-user-ana',
    displayName: 'Ana Paula',
    paid: true,
    picks: {
      'demo-pts-001': [2, 0], // exact   → 30
      'demo-pts-002': [1, 1], // exact   → 10
      'demo-pts-003': [3, 1], // exact   → 30
      'demo-pts-004': [2, 1], // wrong   → 0
      'demo-pts-005': [1, 0], // exact   → 150
      'demo-pts-006': [1, 1],
    },
    bonus: { tournamentWinner: 'Brazil', topScorer: 'Vinicius Junior' }, // +35
  },
  {
    uid: 'demo-user-bruno',
    displayName: 'Bruno Costa',
    paid: true,
    picks: {
      'demo-pts-001': [3, 1], // goalDiff → 15
      'demo-pts-002': [2, 2], // goalDiff → 5
      'demo-pts-003': [2, 0], // goalDiff → 15
      'demo-pts-004': [1, 1], // goalDiff → 40
      'demo-pts-005': [2, 1], // goalDiff → 75
      'demo-pts-006': [0, 0],
    },
  },
  {
    uid: 'demo-user-carla',
    displayName: 'Carla Dias',
    paid: true,
    picks: {
      'demo-pts-001': [1, 0], // loserScore → 6
      'demo-pts-002': [0, 0], // goalDiff   → 5
      'demo-pts-003': [4, 2], // goalDiff   → 15
      'demo-pts-004': [3, 3], // goalDiff   → 40
      'demo-pts-005': [0, 1], // wrong      → 0
      'demo-pts-006': [2, 1],
    },
  },
  {
    uid: 'demo-user-diego',
    displayName: 'Diego Lima',
    paid: true,
    picks: {
      'demo-pts-001': [1, 2], // wrong      → 0
      'demo-pts-002': [1, 0], // wrong      → 0
      'demo-pts-003': [3, 1], // exact      → 30
      'demo-pts-004': [2, 2], // exact      → 80
      'demo-pts-005': [2, 0], // loserScore → 30
      'demo-pts-006': [1, 0],
    },
    bonus: { tournamentWinner: 'Brazil', topScorer: 'Kylian Mbappe' }, // +20 (winner only)
  },
  {
    uid: 'demo-user-elena',
    displayName: 'Elena Souza',
    paid: false,
    picks: {
      'demo-pts-001': [2, 0], // exact    → 30
      'demo-pts-002': [2, 1], // wrong    → 0
      'demo-pts-003': [1, 0], // outcome  → 3
      'demo-pts-004': [0, 0], // goalDiff → 40
      'demo-pts-005': [2, 1], // goalDiff → 75
      'demo-pts-006': [2, 2],
    },
    bonus: { tournamentWinner: 'Argentina', topScorer: 'Vinicius Junior' }, // +15 (scorer only)
  },
  {
    uid: 'demo-user-frank',
    displayName: 'Frank Alves',
    paid: false,
    picks: {
      'demo-pts-001': [0, 1], // wrong → 0
      'demo-pts-002': [3, 0], // wrong → 0
      'demo-pts-003': [0, 2], // wrong → 0
      'demo-pts-004': [2, 2], // exact → 80 (even a tail-ender can nail the big game)
      'demo-pts-005': [0, 0], // wrong → 0
      'demo-pts-006': [3, 1],
    },
  },
]

const BONUS_ANSWERS: BonusAnswers = {
  tournamentWinner: 'Brazil',
  topScorer: 'Vinicius Junior',
}

async function main(): Promise<void> {
  const db = initAdmin()
  const updates: Record<string, unknown> = {}

  // 1) Matches.
  for (const m of MATCHES) {
    const match: Match = {
      id: m.id,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      kickoffAt: m.kickoffAt,
      stage: m.stage,
      status: m.status,
      ...(m.group ? { group: m.group } : {}),
      ...(m.score ? { score: m.score } : {}),
    }
    updates[`matches/${m.id}`] = match
  }

  // 2) Players + 3) predictions (both mirror paths) + bonus picks.
  for (const p of PLAYERS) {
    const profile: UserProfile = {
      displayName: p.displayName,
      role: 'player',
      email: `${p.uid}@demo.local`,
      paid: p.paid,
    }
    updates[`users/${p.uid}`] = profile

    for (const [matchId, [home, away]] of Object.entries(p.picks)) {
      const match = MATCHES.find((m) => m.id === matchId)
      // Submit ~1h before kickoff for realism.
      const submittedAt = (match?.kickoffAt ?? Date.now()) - HOUR
      const pred: Prediction = { home, away, submittedAt }
      updates[`predictions/${matchId}/${p.uid}`] = pred
      updates[`userPredictions/${p.uid}/${matchId}`] = pred
    }

    if (p.bonus) updates[`bonusPicks/${p.uid}`] = p.bonus
  }

  // 4) Bonus answers + big game multiplier config.
  updates['meta/config/bonusAnswers'] = BONUS_ANSWERS
  updates[`meta/config/bigGames/${BIG_GAME_ID}`] = 2

  await db.ref().update(updates)
  console.log(`Seeded ${MATCHES.length} matches, ${PLAYERS.length} players, and their predictions.`)

  // 5) Recompute /scores from the full (real + demo) dataset, exactly like the app.
  const [matchesSnap, predsSnap, configSnap, usersSnap, bonusPicksSnap] = await Promise.all([
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
    matches: (matchesSnap.val() ?? {}) as Record<string, Match>,
    predictions: (predsSnap.val() ?? {}) as Record<string, Record<string, Prediction>>,
    users: (usersSnap.val() ?? {}) as Record<string, unknown>,
    bonusPicks: (bonusPicksSnap.val() ?? {}) as Record<string, BonusPick>,
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

  console.log('\nLeaderboard (demo players):')
  PLAYERS.map((p) => ({ name: p.displayName, total: computed[p.uid]?.total ?? 0 }))
    .sort((a, b) => b.total - a.total)
    .forEach((r, i) => console.log(`  ${i + 1}. ${r.name.padEnd(14)} ${r.total} pts`))

  console.log('\nOpen the app, sign in, and tap any player on the leaderboard to see the breakdown.')
  console.log('Tear down with: npx tsx scripts/clear-demo-points.ts')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('seed-demo-points failed:', err)
    process.exit(1)
  })
