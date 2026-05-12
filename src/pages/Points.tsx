import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { setPointValues, setStageMultipliers } from '@/api/admin'
import { NumberField, StatusLine } from '@/components/admin/AdminCard'
import { useAuth } from '@/hooks/useAuth'
import { useConfig } from '@/hooks/useConfig'
import { useT } from '@/i18n'
import {
  BRAZIL_MULTIPLIER,
  DEFAULT_POINTS,
  DEFAULT_STAGE_MULTIPLIERS,
  type PointValues,
  type StageMultipliers,
} from '@/scoring'
import type { Stage } from '@/types'

const STAGES: Stage[] = ['group', 'r32', 'r16', 'qf', 'sf', '3rd', 'final']

const STAGE_KEY: Record<Stage, string> = {
  group: 'stages.group',
  r32: 'stages.r32',
  r16: 'stages.r16',
  qf: 'stages.qf',
  sf: 'stages.sf',
  '3rd': 'stages.third',
  final: 'stages.final',
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
      <h2 className="font-semibold text-base sm:text-lg mb-3">{title}</h2>
      {children}
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800 last:border-b-0 text-sm">
      <span className="text-slate-300">{label}</span>
      <span className="text-slate-100 font-semibold tabular-nums">{value}</span>
    </div>
  )
}

function formatMultiplier(n: number): string {
  return `${Number.isInteger(n) ? n : n.toFixed(2).replace(/\.?0+$/, '')}×`
}

export function Points() {
  const t = useT()
  const { isAdmin } = useAuth()
  const config = useConfig()

  const pv = config?.pointValues
  const bv = config?.bonusValues
  const sm = config?.stageMultipliers ?? DEFAULT_STAGE_MULTIPLIERS

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 sm:px-4 sm:py-6 space-y-5">
      <header className="px-1">
        <Link to="/" className="text-sm text-brand-400 hover:text-brand-300">
          {t('points.back')}
        </Link>
        <h1 className="text-2xl font-bold mt-1">{t('points.title')}</h1>
        <p className="text-sm text-slate-400 mt-1">{t('points.intro')}</p>
      </header>

      <Card title={t('points.tiersHeading')}>
        <p className="text-xs text-slate-400 mb-3">{t('points.tiersDesc')}</p>
        {isAdmin ? (
          <PointValuesEditor initial={pv ?? DEFAULT_POINTS} />
        ) : (
          <>
            <Row label={t('tier.exact')} value={`${pv?.exact ?? '–'} ${t('points.pts')}`} />
            <Row label={t('tier.goalDifference')} value={`${pv?.goalDifference ?? '–'} ${t('points.pts')}`} />
            <Row label={t('tier.winnerScore')} value={`${pv?.winnerScore ?? '–'} ${t('points.pts')}`} />
            <Row label={t('tier.loserScore')} value={`${pv?.loserScore ?? '–'} ${t('points.pts')}`} />
            <Row label={t('tier.outcome')} value={`${pv?.outcome ?? '–'} ${t('points.pts')}`} />
          </>
        )}
      </Card>

      <Card title={t('points.stagesHeading')}>
        <p className="text-xs text-slate-400 mb-3">{t('points.stagesDesc')}</p>
        {isAdmin ? (
          <StageMultipliersEditor initial={sm} />
        ) : (
          <>
            {STAGES.map((s) => (
              <Row key={s} label={t(STAGE_KEY[s])} value={formatMultiplier(sm[s])} />
            ))}
          </>
        )}
      </Card>

      <Card title={t('points.brazilHeading')}>
        <Row label={t('points.brazilRow')} value={formatMultiplier(BRAZIL_MULTIPLIER)} />
        <p className="text-xs text-slate-400 mt-3">{t('points.brazilDesc')}</p>
      </Card>

      <Card title={t('points.bonusHeading')}>
        <Row label={t('bonus.tournamentWinnerLabel')} value={`${bv?.tournamentWinner ?? '–'} ${t('points.pts')}`} />
        <Row label={t('bonus.topScorerLabel')} value={`${bv?.topScorer ?? '–'} ${t('points.pts')}`} />
        <p className="text-xs text-slate-400 mt-3">{t('points.bonusDesc')}</p>
      </Card>

      <Card title={t('points.exampleHeading')}>
        <Example />
      </Card>
    </div>
  )
}

function Example() {
  const t = useT()
  const config = useConfig()
  const gd = config?.pointValues.goalDifference ?? 5
  const stageFinal = config?.stageMultipliers.final ?? DEFAULT_STAGE_MULTIPLIERS.final
  const total = gd * stageFinal * BRAZIL_MULTIPLIER
  return (
    <div className="text-sm text-slate-300 space-y-2">
      <p>{t('points.exampleScenario')}</p>
      <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
        <li>{t('points.exampleStep1', { n: gd })}</li>
        <li>{t('points.exampleStep2', { n: formatMultiplier(stageFinal) })}</li>
        <li>{t('points.exampleStep3', { n: formatMultiplier(BRAZIL_MULTIPLIER) })}</li>
      </ul>
      <p className="text-slate-100 font-semibold">
        {t('points.exampleTotal', { n: total })}
      </p>
    </div>
  )
}

function PointValuesEditor({ initial }: { initial: PointValues }) {
  const t = useT()
  const [values, setValues] = useState<PointValues>(initial)
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => { setValues(initial) }, [initial])

  async function save() {
    setBusy(true)
    setOk(null)
    setErr(null)
    try {
      await setPointValues(values)
      setOk(t('points.savedAndRecomputed'))
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  function patch<K extends keyof PointValues>(key: K, v: number) {
    setValues((prev) => ({ ...prev, [key]: v }))
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <NumberField label={t('tier.exact')} value={values.exact} onChange={(v) => patch('exact', v)} />
        <NumberField label={t('tier.goalDifference')} value={values.goalDifference} onChange={(v) => patch('goalDifference', v)} />
        <NumberField label={t('tier.winnerScore')} value={values.winnerScore} onChange={(v) => patch('winnerScore', v)} />
        <NumberField label={t('tier.loserScore')} value={values.loserScore} onChange={(v) => patch('loserScore', v)} />
        <NumberField label={t('tier.outcome')} value={values.outcome} onChange={(v) => patch('outcome', v)} />
      </div>
      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="w-full sm:w-auto rounded bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 px-4 py-3 font-semibold min-h-11"
      >
        {busy ? t('points.saving') : t('points.save')}
      </button>
      <StatusLine ok={ok} err={err} />
    </div>
  )
}

function StageMultipliersEditor({ initial }: { initial: StageMultipliers }) {
  const t = useT()
  const [values, setValues] = useState<StageMultipliers>(initial)
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setValues(initial)
    // initial is a fresh object from useConfig each render, but its contents
    // only change when the underlying RTDB value does — safe to track on
    // identity since useConfig only re-emits on change.
  }, [initial])

  async function save() {
    setBusy(true)
    setOk(null)
    setErr(null)
    try {
      await setStageMultipliers(values)
      setOk(t('points.savedAndRecomputed'))
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  function patch(stage: Stage, v: number) {
    setValues((prev) => ({ ...prev, [stage]: v }))
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {STAGES.map((s) => (
          <NumberField
            key={s}
            label={t(STAGE_KEY[s])}
            value={values[s]}
            onChange={(v) => patch(s, v)}
            min={0}
            max={20}
            step={0.25}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="w-full sm:w-auto rounded bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 px-4 py-3 font-semibold min-h-11"
      >
        {busy ? t('points.saving') : t('points.save')}
      </button>
      <StatusLine ok={ok} err={err} />
    </div>
  )
}
