/**
 * Dev helper: reopen a match for picking again. Sets status back to SCHEDULED,
 * clears any score, and moves kickoff into the near future so the 7-day
 * prediction window is open. Handy for re-testing the pick flow.
 *
 * Usage (dry-run by default — prints the change without writing):
 *   FIREBASE_DATABASE_URL=... FIREBASE_SERVICE_ACCOUNT_PATH=... \
 *     tsx scripts/reopen-match.ts "USA" "Paraguay" [--in-days=2] [--apply]
 *
 * NEVER point this at production. It targets whatever FIREBASE_DATABASE_URL says.
 */
import { initAdmin } from './_firebase-admin'
import type { Match } from '../src/types'

const norm = (s: string): string => s.trim().toLowerCase()

// A few name aliases so e.g. "USA" still matches stored "United States".
const ALIASES: Record<string, string[]> = {
  usa: ['usa', 'united states', 'united states of america'],
}
const aliasesFor = (arg: string): string[] => ALIASES[norm(arg)] ?? [norm(arg)]

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const inDaysArg = args.find((a) => a.startsWith('--in-days='))
  const inDays = inDaysArg ? Number(inDaysArg.split('=')[1]) : 2
  const [teamA = 'USA', teamB = 'Paraguay'] = args.filter((a) => !a.startsWith('--'))
  const wantA = aliasesFor(teamA)
  const wantB = aliasesFor(teamB)

  const db = initAdmin()
  console.log(`DB: ${process.env.FIREBASE_DATABASE_URL}`)

  const snap = await db.ref('matches').get()
  const matches = (snap.val() ?? {}) as Record<string, Match>

  const found = Object.entries(matches).filter(([, m]) => {
    const pair = new Set([norm(m.homeTeam), norm(m.awayTeam)])
    return wantA.some((x) => pair.has(x)) && wantB.some((x) => pair.has(x))
  })

  if (found.length === 0) {
    console.error(`No match found for "${teamA}" vs "${teamB}".`)
    process.exit(1)
  }
  if (found.length > 1) {
    console.error(`Ambiguous — ${found.length} matches matched:`)
    for (const [id, m] of found) console.log(`  ${id}: ${m.homeTeam} vs ${m.awayTeam} (${m.stage})`)
    process.exit(1)
  }

  const [id, m] = found[0]!
  const newKickoff = Date.now() + inDays * 24 * 60 * 60 * 1000

  console.log('\nMatch found:')
  console.log(`  id:      ${id}`)
  console.log(`  teams:   ${m.homeTeam} vs ${m.awayTeam}`)
  console.log(`  stage:   ${m.stage}${m.group ? ` (${m.group})` : ''}`)
  console.log(`  status:  ${m.status}  ->  SCHEDULED`)
  console.log(`  score:   ${m.score ? `${m.score.home}-${m.score.away}` : '—'}  ->  (cleared)`)
  console.log(`  kickoff: ${new Date(m.kickoffAt).toISOString()}  ->  ${new Date(newKickoff).toISOString()}`)

  if (!apply) {
    console.log('\nDry run — nothing written. Re-run with --apply to reopen.')
    return
  }

  await db.ref(`matches/${id}`).update({ status: 'SCHEDULED', score: null, kickoffAt: newKickoff })
  console.log('\n✓ Reopened. Predictions are open until the new kickoff.')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('reopen-match failed:', err)
    process.exit(1)
  })
