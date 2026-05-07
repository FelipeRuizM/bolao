import { useMemo } from 'react'
import { useMatches } from '@/hooks/useMatches'
import { useMyPredictions } from '@/hooks/usePrediction'
import { useAuth } from '@/hooks/useAuth'
import { useSync } from '@/hooks/useSync'
import { useLocale, useT, bcp47 } from '@/i18n'
import { MatchCard } from '@/components/MatchCard'
import type { Match } from '@/types'

function dateKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

function formatDateHeader(isoDate: string, locale: string): string {
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

  const grouped = useMemo(() => {
    if (!matches) return null
    const groups: Record<string, Match[]> = {}
    for (const m of matches) {
      const k = dateKey(m.kickoffAt)
      ;(groups[k] ??= []).push(m)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [matches])

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 sm:px-4 sm:py-6 space-y-6">
      <h1 className="text-2xl font-bold px-1">{t('matches.title')}</h1>

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
