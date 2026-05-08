import { useState } from 'react'
import { recomputeNow } from '@/api/admin'
import { useT } from '@/i18n'
import { AdminButton, AdminCard, StatusLine } from './AdminCard'

export function RecomputeSection() {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function run() {
    setBusy(true)
    setOk(null)
    setErr(null)
    try {
      await recomputeNow()
      setOk(t('admin.recomputeOk'))
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AdminCard title={t('admin.recomputeHeading')} description={t('admin.recomputeDesc')}>
      <AdminButton
        label={t('admin.recomputeNow')}
        busyLabel={t('admin.recomputing')}
        busy={busy}
        onClick={run}
      />
      <StatusLine ok={ok} err={err} />
    </AdminCard>
  )
}
