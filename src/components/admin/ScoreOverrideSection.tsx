import { useMemo, useState } from 'react'
import { useMatches } from '@/hooks/useMatches'
import { useLocale, useT, bcp47, type TFunction } from '@/i18n'
import { AdminCard } from './AdminCard'
import { MatchOverrideForm } from './MatchOverrideForm'
import { formatBR } from '@/utils/datetime'
import type { Match } from '@/types'

function formatLabel(m: Match, locale: string, t: TFunction): string {
  const d = formatBR(m.kickoffAt, locale, { month: 'short', day: 'numeric' })
  return `${t.team(m.homeTeam)} vs ${t.team(m.awayTeam)} · ${d}`
}

export function ScoreOverrideSection() {
  const t = useT()
  const { locale } = useLocale()
  const { matches } = useMatches()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const results = useMemo(() => {
    if (!matches) return []
    const s = search.trim().toLowerCase()
    if (!s) return []
    return matches
      .filter(
        (m) =>
          m.homeTeam.toLowerCase().includes(s) ||
          m.awayTeam.toLowerCase().includes(s) ||
          m.id.includes(s),
      )
      .slice(0, 20)
  }, [matches, search])

  const selected = matches?.find((m) => m.id === selectedId)

  return (
    <AdminCard title={t('admin.scoreOverrideHeading')} description={t('admin.scoreOverrideDesc')}>
      <input
        type="search"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setSelectedId(null)
        }}
        placeholder={t('admin.searchMatchesPlaceholder')}
        className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-base focus:outline-none focus:border-brand-500"
      />

      {!selected && results.length > 0 && (
        <ul className="space-y-1 max-h-64 overflow-y-auto">
          {results.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setSelectedId(m.id)}
                className="w-full text-left bg-slate-800/60 hover:bg-slate-800 rounded px-3 py-2 text-sm flex justify-between items-center gap-2"
              >
                <span className="truncate">{formatLabel(m, bcp47(locale), t)}</span>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {m.status}
                  {m.score && ` · ${m.score.home}-${m.score.away}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!selected && search.trim() && results.length === 0 && (
        <p className="text-xs text-slate-500">{t('admin.noMatchesFound')}</p>
      )}

      {selected && <MatchOverrideForm match={selected} onClose={() => setSelectedId(null)} />}
    </AdminCard>
  )
}
