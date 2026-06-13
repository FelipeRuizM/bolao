/**
 * Dev helper: force a match into a given state (status / score / kickoff), for
 * testing the open, locked, live, and finished screens.
 *
 * Usage (dry-run by default; add --apply to write):
 *   tsx scripts/set-match-state.ts "USA" "Paraguay" --status=LIVE --score=2-0 --kickoff-in-days=-3 --apply
 *   tsx scripts/set-match-state.ts "USA" "Paraguay" --status=SCHEDULED --clear-score --kickoff-in-days=2 --apply
 *   tsx scripts/set-match-state.ts "USA" "Paraguay" --status=FT --score=4-1 --apply
 *
 * --score is home-away. --kickoff-in-days can be negative (past). Keep a past
 * kickoff 2+ days from the real match date, or the live sync will re-match the
 * fixture and overwrite this.
 *
 * Ending a match (--status=FT) recomputes /scores and /scoreHistory afterwards,
 * mirroring what the live sync does when a real game finishes — so the
 * leaderboard and rank-over-time graph update. Pass --recompute to force that
 * for any state, or --no-recompute to skip it.
 *
 * NEVER point at production (targets FIREBASE_DATABASE_URL).
 */
import { initAdmin } from './_firebase-admin'
import { computeAllUserScores } from '../src/scoring/computeAll'
import { normalizeBigGames } from '../src/scoring/index'
import type {
  BigGameConfig,
  BonusAnswers,
  BonusValues,
  PointValues,
  StageMultipliers,
} from '../src/scoring/index'
import type { BonusPick, Match, MatchStatus, Prediction, Score } from '../src/types'

type Db = ReturnType<typeof initAdmin>

const norm = (s: string): string => s.trim().toLowerCase()
const ALIASES: Record<string, string[]> = { usa: ['usa', 'united states', 'united states of america'] }
const aliasesFor = (arg: string): string[] => ALIASES[norm(arg)] ?? [norm(arg)]

function parseScore(v: string): Score {
  const m = /^(\d+)\s*[-x:]\s*(\d+)$/i.exec(v.trim())
  if (!m) throw new Error(`Bad --score "${v}". Use home-away, e.g. 2-0.`)
  return { home: Number(m[1]), away: Number(m[2]) }
}

const fmtScore = (s?: Score | null): string => (s ? `${s.home}-${s.away}` : '—')

/**
 * Recompute /scores and rebuild /scoreHistory from current DB state — the
 * server-side twin of the app's recomputeAllUserScores(). Admin reads bypass
 * security rules, so the whole /predictions tree can be read in one go.
 */
async function recompute(db: Db): Promise<void> {
  const [matchesSnap, predsSnap, configSnap, usersSnap, bonusSnap] = await Promise.all([
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
    stageMultipliers?: StageMultipliers
    bigGames?: Record<string, number> | null
    bigGame?: BigGameConfig | null
  }
  const users = (usersSnap.val() ?? {}) as Record<string, unknown>
  const bonusPicks = (bonusSnap.val() ?? {}) as Record<string, BonusPick>
  const opts = {
    predictions,
    users,
    bonusPicks,
    pointValues: config.pointValues,
    bonusValues: config.bonusValues,
    bonusAnswers: config.bonusAnswers,
    stageMultipliers: config.stageMultipliers,
    bigGames: normalizeBigGames(config.bigGames, config.bigGame),
  }

  const computed = computeAllUserScores({ matches, ...opts })
  const scoreWrites: Record<string, unknown> = {}
  for (const [uid, score] of Object.entries(computed)) scoreWrites[`scores/${uid}`] = score
  if (Object.keys(scoreWrites).length > 0) await db.ref().update(scoreWrites)

  // One cumulative snapshot per FT match (kickoff order), keyed so a lexical
  // sort is chronological — gives the chart a point per finished game.
  const ftMatches = Object.values(matches)
    .filter((m) => m.status === 'FT' && m.score)
    .sort((a, b) => a.kickoffAt - b.kickoffAt || a.id.localeCompare(b.id))
  const history: Record<string, Record<string, number>> = {}
  const matchesUpTo: Record<string, Match> = {}
  for (const m of ftMatches) {
    matchesUpTo[m.id] = m
    const snapshot = computeAllUserScores({ matches: matchesUpTo, ...opts })
    const point: Record<string, number> = {}
    for (const [uid, score] of Object.entries(snapshot)) point[uid] = score.total
    history[`${m.kickoffAt}_${m.id}`] = point
  }
  await db.ref('scoreHistory').set(history)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const flag = (name: string): string | undefined => {
    const a = args.find((x) => x.startsWith(`--${name}=`))
    return a?.slice(name.length + 3)
  }

  const statusArg = flag('status')?.toUpperCase()
  const scoreArg = flag('score')
  const clearScore = args.includes('--clear-score')
  const kickoffInDays = flag('kickoff-in-days')
  const [teamA = 'USA', teamB = 'Paraguay'] = args.filter((a) => !a.startsWith('--'))

  if (statusArg && !['SCHEDULED', 'LIVE', 'FT'].includes(statusArg)) {
    throw new Error(`Bad --status "${statusArg}". Use SCHEDULED | LIVE | FT.`)
  }

  let newStatus: MatchStatus | undefined
  if (statusArg) newStatus = statusArg as MatchStatus
  let newScore: Score | null | undefined
  if (clearScore) newScore = null
  else if (scoreArg) newScore = parseScore(scoreArg)
  let newKickoff: number | undefined
  if (kickoffInDays !== undefined) newKickoff = Date.now() + Number(kickoffInDays) * 86_400_000

  // Finishing a game recomputes by default (that's what the real sync does);
  // --recompute forces it for any state, --no-recompute opts out.
  const shouldRecompute = !args.includes('--no-recompute') && (args.includes('--recompute') || newStatus === 'FT')

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
    for (const [id, m] of found) console.log(`  ${id}: ${m.homeTeam} vs ${m.awayTeam}`)
    process.exit(1)
  }

  const [id, m] = found[0]!

  console.log('\nMatch:')
  console.log(`  id:      ${id}  (${m.homeTeam} vs ${m.awayTeam})`)
  console.log(`  status:  ${m.status}${newStatus ? `  ->  ${newStatus}` : ''}`)
  console.log(`  score:   ${fmtScore(m.score)}${newScore !== undefined ? `  ->  ${fmtScore(newScore)}` : ''}`)
  console.log(
    `  kickoff: ${new Date(m.kickoffAt).toISOString()}${newKickoff ? `  ->  ${new Date(newKickoff).toISOString()}` : ''}`,
  )
  if (shouldRecompute) console.log('  + recompute /scores and /scoreHistory afterwards')

  const updates: Record<string, unknown> = {}
  if (newStatus !== undefined) updates.status = newStatus
  if (newScore !== undefined) updates.score = newScore
  if (newKickoff !== undefined) updates.kickoffAt = newKickoff

  if (Object.keys(updates).length === 0 && !shouldRecompute) {
    console.log('\nNothing to change — pass --status / --score / --clear-score / --kickoff-in-days / --recompute.')
    return
  }
  if (!apply) {
    console.log('\nDry run — nothing written. Add --apply to write.')
    return
  }

  if (Object.keys(updates).length > 0) {
    await db.ref(`matches/${id}`).update(updates)
    console.log('\n✓ Match updated.')
  }
  if (shouldRecompute) {
    console.log('Recomputing /scores and /scoreHistory…')
    await recompute(db)
    console.log('✓ Leaderboard and graph recomputed.')
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('set-match-state failed:', err)
    process.exit(1)
  })
