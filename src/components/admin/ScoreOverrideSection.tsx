import { useMemo, useState } from 'react'
import { useMatches } from '@/hooks/useMatches'
import { overrideMatchResult } from '@/api/admin'
import { useLocale, useT, bcp47 } from '@/i18n'
import { AdminButton, AdminCard, StatusLine } from './AdminCard'
import type { Match, MatchStatus } from '@/types'

const STATUSES: MatchStatus[] = ['SCHEDULED', 'LIVE', 'FT']

function formatLabel(m: Match, locale: string): string {
  const d = new Date(m.kickoffAt).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  })
  return `${m.homeTeam} vs ${m.awayTeam} · ${d}`
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
                <span className="truncate">{formatLabel(m, bcp47(locale))}</span>
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

      {selected && <OverrideForm match={selected} onClose={() => setSelectedId(null)} />}
    </AdminCard>
  )
}

function OverrideForm({ match, onClose }: { match: Match; onClose: () => void }) {
  const t = useT()
  const [home, setHome] = useState(match.score?.home ?? 0)
  const [away, setAway] = useState(match.score?.away ?? 0)
  const [status, setStatus] = useState<MatchStatus>(match.status)
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    setBusy(true)
    setOk(null)
    setErr(null)
    try {
      const score = status === 'SCHEDULED' ? null : { home, away }
      await overrideMatchResult(match.id, score, status)
      setOk(t('admin.overrideOk'))
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-slate-800/60 rounded-xl p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-sm">
          {match.homeTeam} vs {match.awayTeam}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-200"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">{match.homeTeam}</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={20}
            value={home}
            onChange={(e) => setHome(Number(e.target.value) || 0)}
            disabled={status === 'SCHEDULED'}
            className="rounded bg-slate-900 border border-slate-700 px-3 py-2 text-base text-center tabular-nums focus:outline-none focus:border-brand-500 disabled:opacity-50"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">{match.awayTeam}</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={20}
            value={away}
            onChange={(e) => setAway(Number(e.target.value) || 0)}
            disabled={status === 'SCHEDULED'}
            className="rounded bg-slate-900 border border-slate-700 px-3 py-2 text-base text-center tabular-nums focus:outline-none focus:border-brand-500 disabled:opacity-50"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">{t('admin.statusLabel')}</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as MatchStatus)}
          className="rounded bg-slate-900 border border-slate-700 px-3 py-2 text-base focus:outline-none focus:border-brand-500"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <AdminButton
        label={t('admin.saveOverride')}
        busyLabel={t('admin.saving')}
        busy={busy}
        onClick={save}
      />
      <StatusLine ok={ok} err={err} />
    </div>
  )
}
