import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { HelpCircle } from 'lucide-react'
import { onValue, ref } from 'firebase/database'
import { db } from '@/firebase'
import { useAuth } from '@/hooks/useAuth'
import { usePrizePerUser } from '@/hooks/useMetaConfig'
import { useSync } from '@/hooks/useSync'
import { useT } from '@/i18n'
import { RankOverTime } from '@/components/RankOverTime'
import { formatBRL } from '@/utils/currency'
import type { UserScore, UserProfile } from '@/types'

interface LeaderboardRow {
  uid: string
  displayName: string
  total: number
  paid: boolean
}

type Filter = 'all' | 'pool'

export function Home() {
  const { user } = useAuth()
  const t = useT()
  const prizePerUser = usePrizePerUser()
  useSync()
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    let users: Record<string, UserProfile> | null = null
    let scores: Record<string, UserScore> = {}

    const compose = () => {
      if (!users) return
      const list: LeaderboardRow[] = Object.entries(users).map(([uid, profile]) => ({
        uid,
        displayName: profile.displayName ?? profile.email ?? uid.slice(0, 6),
        total: scores[uid]?.total ?? 0,
        paid: !!profile.paid,
      }))
      list.sort((a, b) => b.total - a.total)
      setRows(list)
    }

    const unsubUsers = onValue(ref(db, 'users'), (snap) => {
      users = (snap.val() ?? {}) as Record<string, UserProfile>
      compose()
    })
    const unsubScores = onValue(ref(db, 'scores'), (snap) => {
      scores = (snap.val() ?? {}) as Record<string, UserScore>
      compose()
    })
    return () => {
      unsubUsers()
      unsubScores()
    }
  }, [])

  const visibleRows = useMemo(() => {
    if (!rows) return null
    return filter === 'pool' ? rows.filter((r) => r.paid) : rows
  }, [rows, filter])

  const filterUids = useMemo(() => {
    if (!rows || filter !== 'pool') return undefined
    return rows.filter((r) => r.paid).map((r) => r.uid)
  }, [rows, filter])

  const paidCount = useMemo(() => rows?.filter((r) => r.paid).length ?? 0, [rows])
  const showPrize = paidCount > 0 && prizePerUser > 0
  const prizeTotal = paidCount * prizePerUser

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
        {rows !== null && rows.some((r) => r.paid) && (
          <div className="flex rounded-lg bg-slate-800/60 border border-slate-700 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filter === 'all'
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('home.filterAll')}
            </button>
            <button
              type="button"
              onClick={() => setFilter('pool')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filter === 'pool'
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('home.filterPool')}
            </button>
          </div>
        )}
      </div>

      {showPrize && (
        <div
          key={`${paidCount}-${prizePerUser}`}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500/20 via-brand-500/10 to-transparent border border-brand-500/30 px-4 py-3 sm:px-5 sm:py-4 flex items-center justify-between gap-3 animate-fade-up"
        >
          <div className="absolute -top-8 -right-6 w-32 h-32 bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="text-[10px] sm:text-xs uppercase tracking-wider text-brand-300/80 font-semibold">
              {t('home.prizePoolLabel')}
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-brand-300 tabular-nums leading-tight mt-0.5">
              {formatBRL(prizeTotal)}
            </div>
          </div>
          <div className="relative text-right shrink-0">
            <div className="text-[10px] sm:text-xs text-slate-400 tabular-nums">
              {t('home.prizePoolBreakdown', { count: paidCount, amount: formatBRL(prizePerUser) })}
            </div>
          </div>
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
              <li
                key={row.uid}
                className={`flex items-center gap-3 px-4 py-3 ${
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
              </li>
            ))}
          </ol>
          <RankOverTime highlightUid={user?.uid ?? null} filterUids={filterUids} />
        </>
      )}
    </div>
  )
}
