import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { HelpCircle, Trash2 } from 'lucide-react'
import { onValue, ref } from 'firebase/database'
import { db } from '@/firebase'
import { useAuth } from '@/hooks/useAuth'
import { useUsers } from '@/hooks/useUsers'
import { useMatches } from '@/hooks/useMatches'
import { useMyPredictions } from '@/hooks/usePrediction'
import { usePrizePerUser } from '@/hooks/useMetaConfig'
import { useSync } from '@/hooks/useSync'
import { useT } from '@/i18n'
import { MatchCard } from '@/components/MatchCard'
import { RankOverTime } from '@/components/RankOverTime'
import { formatBRL, splitPrize } from '@/utils/currency'
import type { UserScore } from '@/types'

interface LeaderboardRow {
  uid: string
  displayName: string
  total: number
  isAdmin: boolean
}

// Podium styling for the top three rows, blended straight into the leaderboard:
// gold, silver, bronze — a tinted row, a colored rank, and a matching prize pill.
const MEDALS = [
  {
    row: 'bg-gradient-to-r from-amber-500/10 to-transparent',
    rank: 'text-amber-300',
    pill: 'bg-amber-400/15 text-amber-300 border border-amber-400/30',
  },
  {
    row: 'bg-gradient-to-r from-slate-300/10 to-transparent',
    rank: 'text-slate-200',
    pill: 'bg-slate-300/15 text-slate-200 border border-slate-300/30',
  },
  {
    row: 'bg-gradient-to-r from-orange-500/10 to-transparent',
    rank: 'text-orange-300',
    pill: 'bg-orange-500/15 text-orange-300 border border-orange-500/30',
  },
] as const

export function Home() {
  const { user } = useAuth()
  const t = useT()
  const prizePerUser = usePrizePerUser()
  useSync()
  // Users come pre-filtered to the current user's friend group, so the whole
  // leaderboard (and the prize/chart derived from it) stays group-scoped.
  const users = useUsers()
  const { matches } = useMatches()
  const myPredictions = useMyPredictions(user?.uid)
  const [scores, setScores] = useState<Record<string, UserScore> | null>(null)

  // Featured match: the earliest live game, else the next one up. A SCHEDULED
  // match past kickoff sorts first, which is right — it's probably live.
  const featured = useMemo(() => {
    if (!matches) return null
    return (
      matches.find((m) => m.status === 'LIVE') ??
      matches.find((m) => m.status === 'SCHEDULED') ??
      null
    )
  }, [matches])

  useEffect(() => {
    return onValue(ref(db, 'scores'), (snap) => {
      setScores((snap.val() ?? {}) as Record<string, UserScore>)
    })
  }, [])

  const rows = useMemo<LeaderboardRow[] | null>(() => {
    if (scores === null) return null
    const list: LeaderboardRow[] = Object.entries(users).map(([uid, profile]) => ({
      uid,
      displayName: profile.displayName ?? profile.email ?? uid.slice(0, 6),
      total: scores[uid]?.total ?? 0,
      isAdmin: profile.role === 'admin',
    }))
    list.sort((a, b) => b.total - a.total)
    return list
  }, [users, scores])

  // Everyone in the group plays (and has paid in), but admins don't contribute
  // to the prize pot.
  const payingCount = useMemo(
    () => rows?.filter((r) => !r.isAdmin).length ?? 0,
    [rows],
  )
  const showPrize = payingCount > 0 && prizePerUser > 0
  const prizeTotal = payingCount * prizePerUser
  const prizeSplit = splitPrize(prizeTotal)
  // Money each podium spot wins, indexed by rank (0 = 1st). Drives the pill on
  // the top-three rows when there's a pot.
  const prizeByRank = [prizeSplit.first, prizeSplit.second, prizeSplit.third]

  return (
    <div className="max-w-2xl lg:max-w-5xl mx-auto px-3 py-4 sm:px-4 sm:py-6 space-y-4">
      <div className="flex items-center gap-2 px-1">
        <h1 className="text-2xl font-bold">{t('home.title')}</h1>
        <Link
          to="/points"
          aria-label={t('points.helpIconLabel')}
          title={t('points.helpIconLabel')}
          className="text-slate-400 hover:text-brand-400 transition-colors"
        >
          <HelpCircle size={20} />
        </Link>
      </div>

      {featured && (
        <section className="space-y-2 animate-fade-up">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
            {featured.status === 'LIVE' ? t('home.liveNow') : t('home.upNext')}
          </h2>
          <MatchCard match={featured} myPrediction={myPredictions[featured.id]} />
        </section>
      )}

      {rows === null && <p className="text-slate-400">{t('home.loading')}</p>}
      {rows !== null && rows.length === 0 && (
        <p className="text-slate-400">{t('home.noPlayers')}</p>
      )}
      {rows !== null && rows.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
          <ol className="divide-y divide-slate-800 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
            {rows.map((row, i) => {
              const medal = MEDALS[i]
              const prize = showPrize && i < prizeByRank.length ? prizeByRank[i] : null
              // Wooden-spoon marker — only when there's a clear last place below
              // the podium, so it never lands on a medal row.
              const isLast = rows.length > 3 && i === rows.length - 1
              const isMe = row.uid === user?.uid
              return (
                <li key={row.uid}>
                  <Link
                    to={`/players/${row.uid}`}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-800/60 ${
                      medal?.row ?? ''
                    } ${isMe ? 'ring-1 ring-inset ring-brand-500/40' : ''}`}
                  >
                    <span
                      className={`w-8 text-center font-mono ${medal ? `font-bold ${medal.rank}` : 'text-slate-500'}`}
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate min-w-0 flex items-center gap-1.5">
                      <span className="truncate">{row.displayName}</span>
                      {isLast && (
                        <span
                          title={t('home.lastPlaceTitle')}
                          aria-label={t('home.lastPlaceTitle')}
                          className="shrink-0 inline-flex items-center gap-0.5 text-slate-500"
                        >
                          <Trash2 size={14} />
                          <span aria-hidden="true">😂</span>
                        </span>
                      )}
                    </span>
                    {prize != null && (
                      <span
                        className={`shrink-0 text-xs font-bold tabular-nums px-2 py-0.5 rounded-full ${medal?.pill ?? ''}`}
                      >
                        {formatBRL(prize)}
                      </span>
                    )}
                    <span className="font-bold text-brand-500 tabular-nums">{row.total}</span>
                  </Link>
                </li>
              )
            })}
          </ol>
          <RankOverTime highlightUid={user?.uid ?? null} />
        </div>
      )}
    </div>
  )
}
