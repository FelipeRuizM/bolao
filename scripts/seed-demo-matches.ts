/**
 * Seeds short demo matches for end-to-end testing before the real tournament.
 *
 * Writes ~6 matches into /matches with IDs `demo-001` through `demo-006`,
 * spread from "+5 minutes from now" through "+3 days from now". Real team
 * names so emblems load. After running, sign in to the app, submit
 * predictions, watch the kickoff lock kick in, then use the admin Score
 * Override section to flip the result and confirm scoring works end-to-end.
 *
 * Auth: same env vars as daily-snapshot.ts:
 *   FIREBASE_SERVICE_ACCOUNT  (raw JSON)
 *   FIREBASE_DATABASE_URL
 *
 * Run:  npx tsx scripts/seed-demo-matches.ts
 * Tear down with: npx tsx scripts/clear-demo-matches.ts
 */
import admin from 'firebase-admin'
import type { Match } from '../src/types'

function initAdmin(): admin.database.Database {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT
  const databaseURL = process.env.FIREBASE_DATABASE_URL
  if (!serviceAccountJson) throw new Error('FIREBASE_SERVICE_ACCOUNT env var is required')
  if (!databaseURL) throw new Error('FIREBASE_DATABASE_URL env var is required')
  const credential = admin.credential.cert(JSON.parse(serviceAccountJson))
  admin.initializeApp({ credential, databaseURL })
  return admin.database()
}

function minutesFromNow(min: number): number {
  return Date.now() + min * 60_000
}

function daysFromNowAtNoon(days: number): number {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(12, 0, 0, 0)
  return d.getTime()
}

const DEMO_MATCHES: Match[] = [
  {
    id: 'demo-001',
    homeTeam: 'Brazil',
    awayTeam: 'France',
    kickoffAt: minutesFromNow(5),
    stage: 'group',
    status: 'SCHEDULED',
    group: 'Demo A',
  },
  {
    id: 'demo-002',
    homeTeam: 'Argentina',
    awayTeam: 'Spain',
    kickoffAt: minutesFromNow(15),
    stage: 'group',
    status: 'SCHEDULED',
    group: 'Demo A',
  },
  {
    id: 'demo-003',
    homeTeam: 'England',
    awayTeam: 'Germany',
    kickoffAt: minutesFromNow(60),
    stage: 'group',
    status: 'SCHEDULED',
    group: 'Demo B',
  },
  {
    id: 'demo-004',
    homeTeam: 'Portugal',
    awayTeam: 'Netherlands',
    kickoffAt: daysFromNowAtNoon(1),
    stage: 'r16',
    status: 'SCHEDULED',
  },
  {
    id: 'demo-005',
    homeTeam: 'Brazil',
    awayTeam: 'Mexico',
    kickoffAt: daysFromNowAtNoon(2),
    stage: 'qf',
    status: 'SCHEDULED',
  },
  {
    id: 'demo-006',
    homeTeam: 'Brazil',
    awayTeam: 'Argentina',
    kickoffAt: daysFromNowAtNoon(3),
    stage: 'final',
    status: 'SCHEDULED',
  },
]

async function main(): Promise<void> {
  const db = initAdmin()

  const updates: Record<string, Match> = {}
  for (const m of DEMO_MATCHES) {
    updates[`matches/${m.id}`] = m
  }
  await db.ref().update(updates as unknown as Record<string, unknown>)

  console.log(`Seeded ${DEMO_MATCHES.length} demo matches:`)
  for (const m of DEMO_MATCHES) {
    const when = new Date(m.kickoffAt).toISOString()
    console.log(`  ${m.id}  ${m.homeTeam} vs ${m.awayTeam}  ${m.stage.padEnd(5)}  kickoff=${when}`)
  }
  console.log('\nNext steps:')
  console.log('  1. Sign in, submit predictions for demo-001..006.')
  console.log('  2. Wait for demo-001 kickoff (+5min), confirm prediction form locks.')
  console.log('  3. Admin → Score Override: set demo-001 to FT with a score, watch leaderboard.')
  console.log('  4. Trigger the Daily snapshot workflow to populate the rank chart.')
  console.log('  5. When done, run: npx tsx scripts/clear-demo-matches.ts')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('seed-demo-matches failed:', err)
    process.exit(1)
  })
