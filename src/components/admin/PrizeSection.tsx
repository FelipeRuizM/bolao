import { useEffect, useState } from 'react'
import { setPrizePerUser } from '@/api/admin'
import { usePrizePerUser } from '@/hooks/useMetaConfig'
import { useT } from '@/i18n'
import { formatBRL } from '@/utils/currency'
import { AdminButton, AdminCard, StatusLine } from './AdminCard'

export function PrizeSection() {
  const t = useT()
  const current = usePrizePerUser()
  const [draft, setDraft] = useState<number>(current)
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setDraft(current)
  }, [current])

  async function save() {
    setBusy(true)
    setOk(null)
    setErr(null)
    try {
      await setPrizePerUser(draft)
      setOk(t('admin.prizeSaved', { amount: formatBRL(draft) }))
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AdminCard title={t('admin.prizeHeading')} description={t('admin.prizeDesc')}>
      <label className="flex items-center justify-between gap-3 text-sm">
        <span className="text-slate-300 flex-1">{t('admin.prizePerUserLabel')}</span>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-sm">R$</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={0.01}
            value={draft}
            onChange={(e) => {
              const n = Number(e.target.value)
              setDraft(Number.isFinite(n) ? n : 0)
            }}
            className="w-32 rounded bg-slate-800 border border-slate-700 px-3 py-2 text-base text-right tabular-nums focus:outline-none focus:border-brand-500"
          />
        </div>
      </label>
      <p className="text-xs text-slate-500">
        {t('admin.prizePreview', { amount: formatBRL(draft) })}
      </p>
      <AdminButton
        label={t('admin.prizeSave')}
        busyLabel={t('admin.saving')}
        busy={busy}
        onClick={save}
      />
      <StatusLine ok={ok} err={err} />
    </AdminCard>
  )
}
