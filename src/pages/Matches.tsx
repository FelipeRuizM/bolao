import { useMemo, useState } from 'react'
import { useMatches } from '@/hooks/useMatches'
import { useMyPredictions } from '@/hooks/usePrediction'
import { useAuth } from '@/hooks/useAuth'
import { useSync } from '@/hooks/useSync'
import { isPredictionOpen, predictionOpensAt } from '@/api/predictions'
import { useLocale, useT, bcp47 } from '@/i18n'
import { MatchCard } from '@/components/MatchCard'
import { brDayKey } from '@/utils/datetime'
import type { Match } from '@/types'

type Filter = 'open' | 'future' | 'previous' | 'all'

const FILTERS: Filter[] = ['open', 'future', 'previous', 'all']
const FILTER_LABEL: Record<Filter, string> = {
  open: 'matches.filterOpen',
  future: 'matches.filterFuture',
  previous: 'matches.filterPrevious',
  all: 'matches.filterAll',
}

function formatDateHeader(isoDate: string, locale: string): string {
  // Build noon so the rendered weekday/day always matches `isoDate` regardless
  // of the runtime zone (the day key is already in Brazil time).
  const d = new Date(`${isoDate}T12:00:00`)
  return d.toLocaleDateString(locale, { weekday: 'long', month: 'short', day: 'numeric' })
}

export function Matches() {
  const { matches, error } = useMatches()
  const { user } = useAuth()
  const myPredictions = useMyPredictions(user?.uid)
  const { locale } = useLocale()
  const t = useT()
  useSync()
  const [filter, setFilter] = useState<Filter>('open')

  const visibleMatches = useMemo(() => {
    if (!matches) return null
    const now = Date.now()
    switch (filter) {
      case 'all':
        return matches
      case 'previous':
        return matches.filter((m) => m.status === 'FT')
      case 'future':
        // Scheduled games still beyond the prediction window (not pickable yet).
        return matches.filter((m) => m.status === 'SCHEDULED' && now < predictionOpensAt(m.kickoffAt))
      case 'open':
      default:
        // Pickable right now: prediction window open, plus live games.
        return matches.filter(
          (m) => m.status !== 'FT' && (m.status === 'LIVE' || isPredictionOpen(m.kickoffAt, now)),
        )
    }
  }, [matches, filter])

  // How many currently-pickable open games the user still hasn't predicted.
  // Live games are excluded (picks are locked once a match kicks off).
  const openUnpickedCount = useMemo(() => {
    if (!matches) return 0
    const now = Date.now()
    return matches.filter((m) => isPredictionOpen(m.kickoffAt, now) && !myPredictions[m.id]).length
  }, [matches, myPredictions])

  const grouped = useMemo(() => {
    if (!visibleMatches) return null
    const groups: Record<string, Match[]> = {}
    for (const m of visibleMatches) {
      const k = brDayKey(m.kickoffAt)
      ;(groups[k] ??= []).push(m)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [visibleMatches])

  return (
    <div className="max-w-5xl mx-auto px-3 py-4 sm:px-4 sm:py-6 space-y-6">
      <div className="space-y-3 px-1">
        <h1 className="text-2xl font-bold">{t('matches.title')}</h1>
        {matches !== null && matches.length > 0 && (
          <div className="flex rounded-lg bg-slate-800/60 border border-slate-700 p-0.5 text-xs font-medium">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`flex-1 px-2 py-1.5 rounded-md text-center transition-colors ${
                  filter === f
                    ? 'bg-slate-700 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t(FILTER_LABEL[f])}
              </button>
            ))}
          </div>
        )}
      </div>

      {filter === 'open' && openUnpickedCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-sm text-brand-200">
          <span className="text-lg leading-none" aria-hidden="true">⏰</span>
          <span className="font-medium">
            {t(openUnpickedCount === 1 ? 'matches.unpickedOne' : 'matches.unpickedMany', {
              count: openUnpickedCount,
            })}
          </span>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded p-3">
          {error}
        </p>
      )}

      {matches !== null && matches.length === 0 && !error && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-400 text-sm">
          {t('matches.noMatches')}
        </div>
      )}

      {visibleMatches !== null && visibleMatches.length === 0 && matches !== null && matches.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-400 text-sm">
          {t(
            filter === 'previous'
              ? 'matches.noPrevious'
              : filter === 'future'
                ? 'matches.noFuture'
                : 'matches.noOpen',
          )}
        </div>
      )}

      {grouped === null && !error && <p className="text-slate-400 text-sm">{t('matches.loading')}</p>}

      {grouped?.map(([date, dayMatches]) => (
        <section key={date} className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide px-1 sticky top-0 bg-slate-950/95 backdrop-blur py-1 z-10">
            {formatDateHeader(date, bcp47(locale))}
          </h2>
          <div className="space-y-2">
            {dayMatches.map((m) => (
              <MatchCard key={m.id} match={m} myPrediction={myPredictions[m.id]} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
