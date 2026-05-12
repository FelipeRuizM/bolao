/**
 * Seeds short demo matches for end-to-end testing before the real tournament.
 *
 * Writes ~6 matches into /matches with IDs `demo-001` through `demo-006`,
 * spread from "+5 minutes from now" through "+3 days from now". Real team
 * names so emblems load. After running, sign in to the app, submit
 * predictions, watch the kickoff lock kick in, then use the admin Score
 * Override section to flip the result and confirm scoring works end-to-end.
 *
 * Auth: see scripts/_firebase-admin.ts.
 *
 * Run:  npx tsx scripts/seed-demo-matches.ts
 * Tear down with: npx tsx scripts/clear-demo-matches.ts
 */
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import type { Match } from '../src/types'
import { initAdmin } from './_firebase-admin'

export { initAdmin }

function minutesFromNow(min: number): number {
  return Date.now() + min * 60_000
}

function daysFromNowAtNoon(days: number): number {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(12, 0, 0, 0)
  return d.getTime()
}

/**
 * Build the demo match list with kickoff times relative to *now*. Called at
 * seed time so each run gets fresh future kickoffs even if the previous run
 * was hours/days ago.
 */
export function buildDemoMatches(): Match[] {
  return [
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
}

async function main(): Promise<void> {
  const db = initAdmin()
  const demos = buildDemoMatches()

  const updates: Record<string, Match> = {}
  for (const m of demos) {
    updates[`matches/${m.id}`] = m
  }
  await db.ref().update(updates as unknown as Record<string, unknown>)

  console.log(`Seeded ${demos.length} demo matches:`)
  for (const m of demos) {
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

// Only run main() when invoked directly (not when imported by reset-demo.ts).
const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (invokedDirectly) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('seed-demo-matches failed:', err)
      process.exit(1)
    })
}
