import { useMemo, useState } from 'react'
import { removeBigGame, setBigGame } from '@/api/admin'
import { useBigGames } from '@/hooks/useMetaConfig'
import { useMatches } from '@/hooks/useMatches'
import { bcp47, useLocale, useT, type TFunction } from '@/i18n'
import { AdminButton, AdminCard, StatusLine } from './AdminCard'
import type { Match } from '@/types'

function formatLabel(m: Match, locale: string, t: TFunction): string {
  const d = new Date(m.kickoffAt).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  })
  return `${t.team(m.homeTeam)} vs ${t.team(m.awayTeam)} · ${d}`
}

export function BigGameSection() {
  const t = useT()
  const { locale } = useLocale()
  const { matches } = useMatches()
  const bigGames = useBigGames()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [multiplier, setMultiplier] = useState<number>(2)
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const current = useMemo(() => {
    if (!matches) return []
    return Object.entries(bigGames)
      .map(([matchId, mult]) => ({ match: matches.find((m) => m.id === matchId), matchId, mult }))
      .filter((x): x is { match: Match; matchId: string; mult: number } => !!x.match)
      .sort((a, b) => a.match.kickoffAt - b.match.kickoffAt)
  }, [bigGames, matches])

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

  async function save() {
    if (!selected) return
    setBusy(true)
    setOk(null)
    setErr(null)
    try {
      await setBigGame(selected.id, multiplier)
      setOk(t('admin.bigGameSaved'))
      setSelectedId(null)
      setSearch('')
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function clear(matchId: string) {
    setBusy(true)
    setOk(null)
    setErr(null)
    try {
      await removeBigGame(matchId)
      setOk(t('admin.bigGameCleared'))
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AdminCard title={t('admin.bigGameHeading')} description={t('admin.bigGameDesc')}>
      {current.length > 0 && (
        <ul className="space-y-2">
          {current.map(({ match, matchId, mult }) => (
            <li
              key={matchId}
              className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2 text-sm flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="text-rose-300 font-semibold truncate">
                  {formatLabel(match, bcp47(locale), t)}
                </div>
                <div className="text-xs text-rose-400/80">
                  {t('admin.bigGameCurrent', { n: mult })}
                </div>
              </div>
              <button
                type="button"
                onClick={() => clear(matchId)}
                disabled={busy}
                className="shrink-0 text-xs font-semibold text-rose-300 hover:text-rose-200 border border-rose-500/40 rounded px-2 py-1 disabled:opacity-50"
              >
                {t('admin.bigGameClear')}
              </button>
            </li>
          ))}
        </ul>
      )}

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
                className="w-full text-left bg-slate-800/60 hover:bg-slate-800 rounded px-3 py-2 text-sm truncate"
              >
                {formatLabel(m, bcp47(locale), t)}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!selected && search.trim() && results.length === 0 && (
        <p className="text-xs text-slate-500">{t('admin.noMatchesFound')}</p>
      )}

      {selected && (
        <div className="bg-slate-800/60 rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm truncate">
              {formatLabel(selected, bcp47(locale), t)}
            </span>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="text-xs text-slate-400 hover:text-slate-200 shrink-0"
            >
              ✕
            </button>
          </div>

          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-300 flex-1">{t('admin.bigGameMultiplierLabel')}</span>
            <input
              type="number"
              inputMode="decimal"
              min={1}
              step={0.5}
              value={multiplier}
              onChange={(e) => {
                const n = Number(e.target.value)
                setMultiplier(Number.isFinite(n) && n > 0 ? n : 1)
              }}
              className="w-24 rounded bg-slate-900 border border-slate-700 px-3 py-2 text-base text-right tabular-nums focus:outline-none focus:border-brand-500"
            />
          </label>
          <p className="text-xs text-slate-500">
            {t('admin.bigGameStackingHint', { n: multiplier })}
          </p>

          <AdminButton
            label={t('admin.bigGameSave')}
            busyLabel={t('admin.saving')}
            busy={busy}
            onClick={save}
          />
        </div>
      )}

      <StatusLine ok={ok} err={err} />
    </AdminCard>
  )
}
