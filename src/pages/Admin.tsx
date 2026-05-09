import { useState } from 'react'
import { importFixturesToFirebase } from '@/api/fixtures'
import { forceSync } from '@/api/sync'
import { useAuth } from '@/hooks/useAuth'
import { useT } from '@/i18n'
import { AdminButton, AdminCard, StatusLine } from '@/components/admin/AdminCard'
import { RecomputeSection } from '@/components/admin/RecomputeSection'
import { ScoreOverrideSection } from '@/components/admin/ScoreOverrideSection'
import { PointValuesSection } from '@/components/admin/PointValuesSection'
import { BonusAdminSection } from '@/components/admin/BonusAdminSection'
import { AllowlistSection } from '@/components/admin/AllowlistSection'
import { PlayersSection } from '@/components/admin/PlayersSection'

function ImportFixturesSection() {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function run() {
    setBusy(true)
    setOk(null)
    setErr(null)
    try {
      const { count } = await importFixturesToFirebase()
      setOk(t('admin.importedCount', { count }))
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AdminCard title={t('admin.importFixturesHeading')} description={t('admin.importFixturesDesc')}>
      <AdminButton
        label={t('admin.importNow')}
        busyLabel={t('admin.importing')}
        busy={busy}
        onClick={run}
      />
      <StatusLine ok={ok} err={err} />
    </AdminCard>
  )
}

function SyncSection() {
  const t = useT()
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function run() {
    if (!user) return
    setBusy(true)
    setOk(null)
    setErr(null)
    try {
      const { changed } = await forceSync(user.uid)
      setOk(t('admin.syncRanOk', { changed }))
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AdminCard title={t('admin.syncHeading')} description={t('admin.syncDesc')}>
      <AdminButton
        label={t('admin.syncNow')}
        busyLabel={t('admin.syncing')}
        busy={busy}
        onClick={run}
      />
      <StatusLine ok={ok} err={err} />
    </AdminCard>
  )
}

export function Admin() {
  const t = useT()
  return (
    <div className="max-w-2xl mx-auto px-3 py-4 sm:px-4 sm:py-6 space-y-6">
      <h1 className="text-2xl font-bold px-1">{t('admin.title')}</h1>

      <ImportFixturesSection />
      <SyncSection />
      <RecomputeSection />
      <ScoreOverrideSection />
      <PointValuesSection />
      <BonusAdminSection />
      <AllowlistSection />
      <PlayersSection />
    </div>
  )
}
