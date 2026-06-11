import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { HelpCircle } from 'lucide-react'
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
import { PointsFeed } from '@/components/PointsFeed'
import { PRIZE_SHARES, formatBRL, splitPrize } from '@/utils/currency'
import type { UserScore } from '@/types'

interface LeaderboardRow {
  uid: string
  displayName: string
  total: number
  paid: boolean
  isAdmin: boolean
}

type Filter = 'all' | 'pool'

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
  const [filter, setFilter] = useState<Filter>('pool')

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
      paid: !!profile.paid,
      isAdmin: profile.role === 'admin',
    }))
    list.sort((a, b) => b.total - a.total)
    return list
  }, [users, scores])

  const hasPaid = useMemo(() => rows?.some((r) => r.paid) ?? false, [rows])
  const effectiveFilter: Filter = filter === 'pool' && !hasPaid ? 'all' : filter

  const visibleRows = useMemo(() => {
    if (!rows) return null
    return effectiveFilter === 'pool' ? rows.filter((r) => r.paid) : rows
  }, [rows, effectiveFilter])

  const filterUids = useMemo(() => {
    if (!rows || effectiveFilter !== 'pool') return undefined
    return rows.filter((r) => r.paid).map((r) => r.uid)
  }, [rows, effectiveFilter])

  // Admins play (and appear in the paid pool) but don't contribute to the prize.
  const payingCount = useMemo(
    () => rows?.filter((r) => r.paid && !r.isAdmin).length ?? 0,
    [rows],
  )
  const showPrize = payingCount > 0 && prizePerUser > 0
  const prizeTotal = payingCount * prizePerUser

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 sm:px-4 sm:py-6 space-y-4">
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
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
        {hasPaid && (
          <div className="flex rounded-lg bg-slate-800/60 border border-slate-700 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setFilter('pool')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                effectiveFilter === 'pool'
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('home.filterPool')}
            </button>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                effectiveFilter === 'all'
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('home.filterAll')}
            </button>
          </div>
        )}
      </div>

      {featured && (
        <section className="space-y-2 animate-fade-up">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
            {featured.status === 'LIVE' ? t('home.liveNow') : t('home.upNext')}
          </h2>
          <MatchCard match={featured} myPrediction={myPredictions[featured.id]} />
        </section>
      )}

      {showPrize && (
        <div
          key={`${payingCount}-${prizePerUser}`}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500/20 via-brand-500/10 to-transparent border border-brand-500/30 px-4 py-3 sm:px-5 sm:py-4 space-y-3 animate-fade-up"
        >
          <div className="absolute -top-8 -right-6 w-32 h-32 bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] sm:text-xs uppercase tracking-wider text-brand-300/80 font-semibold">
                {t('home.prizePoolLabel')}
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-brand-300 tabular-nums leading-tight mt-0.5">
                {formatBRL(prizeTotal)}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[10px] sm:text-xs text-slate-400 tabular-nums">
                {t('home.prizePoolBreakdown', { count: payingCount, amount: formatBRL(prizePerUser) })}
              </div>
            </div>
          </div>
          <PrizeSplit total={prizeTotal} />
        </div>
      )}

      {rows === null && <p className="text-slate-400">{t('home.loading')}</p>}
      {rows !== null && rows.length === 0 && (
        <p className="text-slate-400">{t('home.noPlayers')}</p>
      )}
      {visibleRows !== null && visibleRows.length === 0 && rows !== null && rows.length > 0 && (
        <p className="text-slate-400 px-1">{t('home.poolEmpty')}</p>
      )}
      {visibleRows !== null && visibleRows.length > 0 && (
        <>
          <ol className="divide-y divide-slate-800 rounded-xl bg-slate-900 border border-slate-800">
            {visibleRows.map((row, i) => (
              <li key={row.uid}>
                <Link
                  to={`/players/${row.uid}`}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-800/60 transition-colors ${
                    row.uid === user?.uid ? 'bg-slate-800/40' : ''
                  }`}
                >
                  <span className="w-8 text-center text-slate-500 font-mono">{i + 1}</span>
                  <span className="flex-1 truncate flex items-center gap-2 min-w-0">
                    <span className="truncate">{row.displayName}</span>
                    {row.paid && (
                      <span
                        title={t('home.paidBadgeTitle')}
                        className="shrink-0 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      >
                        {t('home.paidBadge')}
                      </span>
                    )}
                  </span>
                  <span className="font-bold text-brand-500 tabular-nums">{row.total}</span>
                </Link>
              </li>
            ))}
          </ol>
          <PointsFeed />
          <RankOverTime highlightUid={user?.uid ?? null} filterUids={filterUids} />
        </>
      )}
    </div>
  )
}

function PrizeSplit({ total }: { total: number }) {
  const t = useT()
  const split = splitPrize(total)
  const slots = [
    {
      label: t('home.prizeFirst'),
      amount: split.first,
      pct: PRIZE_SHARES.first,
      // gold
      colorClasses: 'border-amber-400/50 bg-amber-400/10 text-amber-300',
      pctClasses: 'text-amber-200/70',
    },
    {
      label: t('home.prizeSecond'),
      amount: split.second,
      pct: PRIZE_SHARES.second,
      // silver
      colorClasses: 'border-slate-300/40 bg-slate-300/10 text-slate-200',
      pctClasses: 'text-slate-300/70',
    },
    {
      label: t('home.prizeThird'),
      amount: split.third,
      pct: PRIZE_SHARES.third,
      // bronze
      colorClasses: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
      pctClasses: 'text-orange-200/70',
    },
  ]
  return (
    <div className="relative grid grid-cols-3 gap-2">
      {slots.map((s) => (
        <div
          key={s.label}
          className={`rounded-lg border px-2 py-2 sm:px-3 sm:py-2.5 text-center ${s.colorClasses}`}
        >
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-[10px] sm:text-xs font-bold tracking-wide">{s.label}</span>
            <span className={`text-[9px] sm:text-[10px] tabular-nums ${s.pctClasses}`}>
              {Math.round(s.pct * 100)}%
            </span>
          </div>
          <div className="text-sm sm:text-base font-extrabold tabular-nums leading-tight mt-0.5">
            {formatBRL(s.amount)}
          </div>
        </div>
      ))}
    </div>
  )
}
