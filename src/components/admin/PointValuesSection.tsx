import { useEffect, useState } from 'react'
import { setPointValues } from '@/api/admin'
import { useConfig } from '@/hooks/useConfig'
import { DEFAULT_POINTS, type PointValues } from '@/scoring'
import { useT } from '@/i18n'
import { AdminButton, AdminCard, NumberField, StatusLine } from './AdminCard'

export function PointValuesSection() {
  const t = useT()
  const config = useConfig()
  const [values, setValues] = useState<PointValues>(DEFAULT_POINTS)
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (config) setValues(config.pointValues)
  }, [config])

  async function save() {
    setBusy(true)
    setOk(null)
    setErr(null)
    try {
      await setPointValues(values)
      setOk(t('admin.savedAndRecomputed'))
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
    <AdminCard title={t('admin.pointValuesHeading')} description={t('admin.pointValuesDesc')}>
      <div className="space-y-2">
        <NumberField label={t('admin.pointsExact')} value={values.exact} onChange={(v) => patch('exact', v)} />
        <NumberField label={t('admin.pointsGoalDiff')} value={values.goalDifference} onChange={(v) => patch('goalDifference', v)} />
        <NumberField label={t('admin.pointsWinnerScore')} value={values.winnerScore} onChange={(v) => patch('winnerScore', v)} />
        <NumberField label={t('admin.pointsLoserScore')} value={values.loserScore} onChange={(v) => patch('loserScore', v)} />
        <NumberField label={t('admin.pointsOutcome')} value={values.outcome} onChange={(v) => patch('outcome', v)} />
      </div>
      <AdminButton
        label={t('admin.saveAndRecompute')}
        busyLabel={t('admin.saving')}
        busy={busy}
        onClick={save}
      />
      <StatusLine ok={ok} err={err} />
    </AdminCard>
  )
}
