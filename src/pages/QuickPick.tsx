import { useEffect, useMemo, useState } from 'react'
import { useMatches } from '@/hooks/useMatches'
import { useMyPredictions } from '@/hooks/usePrediction'
import { useAuth } from '@/hooks/useAuth'
import { useSync } from '@/hooks/useSync'
import { isPredictionOpen } from '@/api/predictions'
import { submitPrediction } from '@/api/predictions'
import { useT, useLocale } from '@/i18n'
import { brDayKey } from '@/utils/datetime'
import { getTeamEmblemUrl } from '@/utils/emblems'
import type { Match, Prediction } from '@/types'

/** Common football scorelines, offered as one-tap chips. */
const COMMON_SCORES: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
  [2, 0],
  [0, 2],
  [2, 1],
  [1, 2],
]

const AUTOSAVE_MS = 700

type QuickFilter = 'topick' | 'all'

const QUICK_FILTERS: QuickFilter[] = ['topick', 'all']
const QUICK_FILTER_LABEL: Record<QuickFilter, string> = {
  topick: 'quickPick.filterToPick',
  all: 'quickPick.filterAll',
}

function formatDateHeader(isoDate: string, locale: string): string {
  const d = new Date(`${isoDate}T12:00:00`)
  return d.toLocaleDateString(locale, { weekday: 'long', month: 'short', day: 'numeric' })
}

export function QuickPick() {
  const { matches } = useMatches()
  const { user } = useAuth()
  const myPredictions = useMyPredictions(user?.uid)
  const { locale } = useLocale()
  const t = useT()
  useSync()

  const [filter, setFilter] = useState<QuickFilter>('topick')

  const openMatches = useMemo(() => {
    if (!matches) return null
    const now = Date.now()
    return matches
      .filter((m) => isPredictionOpen(m.kickoffAt, now))
      .sort((a, b) => a.kickoffAt - b.kickoffAt || a.id.localeCompare(b.id))
  }, [matches])

  // "To pick" burns down as picks save: once a prediction lands, its row
  // drops from the list, leaving only matches that still need attention.
  const visibleMatches = useMemo(() => {
    if (!openMatches) return null
    return filter === 'topick' ? openMatches.filter((m) => !myPredictions[m.id]) : openMatches
  }, [openMatches, filter, myPredictions])

  const grouped = useMemo(() => {
    if (!visibleMatches) return null
    const groups: Record<string, Match[]> = {}
    for (const m of visibleMatches) (groups[brDayKey(m.kickoffAt)] ??= []).push(m)
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [visibleMatches])

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 sm:px-4 sm:py-6 space-y-5">
      <header className="space-y-1 px-1">
        <h1 className="text-2xl font-bold">{t('quickPick.title')}</h1>
        {openMatches && openMatches.length > 0 && (
          <p className="text-sm text-slate-400">
            {t('quickPick.subtitle', { count: openMatches.length })}
          </p>
        )}
        <p className="text-xs text-slate-500">{t('quickPick.hint')}</p>
      </header>

      {openMatches !== null && openMatches.length > 0 && (
        <div className="flex rounded-lg bg-slate-800/60 border border-slate-700 p-0.5 text-xs font-medium">
          {QUICK_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`flex-1 px-2 py-1.5 rounded-md text-center transition-colors ${
                filter === f ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t(QUICK_FILTER_LABEL[f])}
            </button>
          ))}
        </div>
      )}

      {openMatches === null && <p className="text-slate-400 px-1">{t('matchDetail.loading')}</p>}

      {openMatches !== null && openMatches.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-400 text-sm">
          {t('quickPick.empty')}
        </div>
      )}

      {visibleMatches !== null && visibleMatches.length === 0 && openMatches !== null && openMatches.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-400 text-sm">
          {t('quickPick.allPicked')}
        </div>
      )}

      {grouped?.map(([day, dayMatches]) => (
        <section key={day} className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-1">
            {formatDateHeader(day, locale)}
          </h2>
          <div className="space-y-2">
            {dayMatches.map((m) => (
              <QuickPickRow
                // Re-mount when an existing pick first loads so initial values are correct.
                key={myPredictions[m.id] ? `${m.id}_p` : m.id}
                match={m}
                uid={user!.uid}
                existing={myPredictions[m.id]}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function QuickPickRow({
  match,
  uid,
  existing,
}: {
  match: Match
  uid: string
  existing?: Prediction
}) {
  const [home, setHome] = useState(existing?.home ?? 0)
  const [away, setAway] = useState(existing?.away ?? 0)
  const [dirty, setDirty] = useState(false)
  const [status, setStatus] = useState<SaveStatus>(existing ? 'saved' : 'idle')

  // Debounced autosave: only runs once the user has actually touched this row,
  // so untouched 0–0 rows are never submitted. The effect re-runs whenever
  // home/away change, so this closure always captures the latest values.
  useEffect(() => {
    if (!dirty) return
    const timer = setTimeout(() => {
      submitPrediction(match.id, uid, home, away, match.kickoffAt)
        .then(() => {
          setStatus('saved')
          setDirty(false)
        })
        .catch(() => setStatus('error'))
    }, AUTOSAVE_MS)
    return () => clearTimeout(timer)
  }, [dirty, home, away, match.id, match.kickoffAt, uid])

  function apply(h: number, a: number) {
    setHome(h)
    setAway(a)
    setDirty(true)
    setStatus('saving')
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2.5">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <TeamSide team={match.homeTeam} align="start" />
        <MiniStepper
          homeValue={home}
          awayValue={away}
          onHome={(v) => apply(v, away)}
          onAway={(v) => apply(home, v)}
        />
        <TeamSide team={match.awayTeam} align="end" />
      </div>

      <div className="flex items-center gap-1.5">
        <div className="flex-1 flex gap-1.5 overflow-x-auto pb-0.5 -mb-0.5">
          {COMMON_SCORES.map(([h, a]) => {
            const active = home === h && away === a && status !== 'idle'
            return (
              <button
                key={`${h}-${a}`}
                type="button"
                onClick={() => apply(h, a)}
                className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold tabular-nums transition-colors ${
                  active
                    ? 'bg-brand-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {h}-{a}
              </button>
            )
          })}
        </div>
        <StatusBadge status={status} />
      </div>
    </div>
  )
}

function TeamSide({ team, align }: { team: string; align: 'start' | 'end' }) {
  const t = useT()
  return (
    <div className={`flex items-center gap-2 min-w-0 ${align === 'end' ? 'flex-row-reverse' : ''}`}>
      <img
        src={getTeamEmblemUrl(team)}
        alt=""
        onError={(e) => {
          e.currentTarget.src = getTeamEmblemUrl('fallback')
        }}
        className="w-7 h-7 object-contain shrink-0"
      />
      <span className="truncate text-sm font-semibold text-slate-100">{t.team(team)}</span>
    </div>
  )
}

function MiniStepper({
  homeValue,
  awayValue,
  onHome,
  onAway,
}: {
  homeValue: number
  awayValue: number
  onHome: (v: number) => void
  onAway: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-1">
      <Stepper value={homeValue} onChange={onHome} />
      <span className="text-slate-500 font-bold px-0.5">x</span>
      <Stepper value={awayValue} onChange={onAway} />
    </div>
  )
}

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const t = useT()
  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        aria-label={t('scoreStepper.increase', { label: '' })}
        onClick={() => onChange(Math.min(20, value + 1))}
        disabled={value >= 20}
        className="text-slate-400 hover:text-white disabled:opacity-30 leading-none text-xs px-2 py-0.5 active:scale-90"
      >
        ▲
      </button>
      <span className="text-2xl font-extrabold text-white tabular-nums leading-none w-7 text-center">
        {value}
      </span>
      <button
        type="button"
        aria-label={t('scoreStepper.decrease', { label: '' })}
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value === 0}
        className="text-slate-400 hover:text-white disabled:opacity-30 leading-none text-xs px-2 py-0.5 active:scale-90"
      >
        ▼
      </button>
    </div>
  )
}

function StatusBadge({ status }: { status: SaveStatus }) {
  const t = useT()
  if (status === 'idle') return <span className="w-12 shrink-0" />
  const map: Record<Exclude<SaveStatus, 'idle'>, { text: string; cls: string }> = {
    saving: { text: t('quickPick.saving'), cls: 'text-slate-500' },
    saved: { text: `✓ ${t('quickPick.saved')}`, cls: 'text-emerald-400' },
    error: { text: `! ${t('quickPick.error')}`, cls: 'text-red-400' },
  }
  const { text, cls } = map[status]
  return <span className={`shrink-0 text-[11px] font-semibold ${cls}`}>{text}</span>
}
