/**
 * Hard reset for demo testing: wipes ALL predictions, ALL scores, and any
 * existing demo matches, then re-seeds fresh demo matches with kickoffs
 * relative to "now". Use this between test runs to start from a clean slate.
 *
 * DESTRUCTIVE — clears /predictions and /scores entirely. This is fine in
 * pre-tournament testing (no real predictions yet); do NOT run during the
 * actual tournament.
 *
 * Auth: same env vars as daily-snapshot.ts.
 *
 * Run: npx tsx scripts/reset-demo.ts
 */
import { buildDemoMatches, initAdmin } from './seed-demo-matches'
import type { Match } from '../src/types'

async function main(): Promise<void> {
  const db = initAdmin()

  console.log('Wiping /predictions ...')
  await db.ref('predictions').remove()

  console.log('Wiping /scores ...')
  await db.ref('scores').remove()

  console.log('Removing existing demo matches ...')
  const matchesSnap = await db.ref('matches').get()
  const matches = (matchesSnap.val() ?? {}) as Record<string, Match>
  const demoIds = Object.keys(matches).filter((id) => id.startsWith('demo-'))
  if (demoIds.length > 0) {
    const deletes: Record<string, null> = {}
    for (const id of demoIds) {
      deletes[`matches/${id}`] = null
    }
    await db.ref().update(deletes)
    console.log(`  removed ${demoIds.length} demo match(es)`)
  } else {
    console.log('  none found')
  }

  console.log('Seeding fresh demo matches ...')
  const demos = buildDemoMatches()
  const updates: Record<string, Match> = {}
  for (const m of demos) {
    updates[`matches/${m.id}`] = m
  }
  await db.ref().update(updates as unknown as Record<string, unknown>)

  console.log(`\nReset complete. ${demos.length} fresh demo matches seeded:`)
  for (const m of demos) {
    const when = new Date(m.kickoffAt).toISOString()
    console.log(`  ${m.id}  ${m.homeTeam} vs ${m.awayTeam}  ${m.stage.padEnd(5)}  kickoff=${when}`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('reset-demo failed:', err)
    process.exit(1)
  })
