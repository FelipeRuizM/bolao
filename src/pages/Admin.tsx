import { useState } from 'react'
import { importFixturesToFirebase } from '@/api/fixtures'
import { forceSync } from '@/api/sync'
import { useAuth } from '@/hooks/useAuth'
import { useT } from '@/i18n'

export function Admin() {
  const { user } = useAuth()
  const t = useT()
  const [importBusy, setImportBusy] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [importErr, setImportErr] = useState<string | null>(null)
  const [syncBusy, setSyncBusy] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [syncErr, setSyncErr] = useState<string | null>(null)

  async function onImport() {
    setImportBusy(true)
    setImportMsg(null)
    setImportErr(null)
    try {
      const { count } = await importFixturesToFirebase()
      setImportMsg(t('admin.importedCount', { count }))
    } catch (err) {
      setImportErr(err instanceof Error ? err.message : String(err))
    } finally {
      setImportBusy(false)
    }
  }

  async function onSync() {
    if (!user) return
    setSyncBusy(true)
    setSyncMsg(null)
    setSyncErr(null)
    try {
      const { changed } = await forceSync(user.uid)
      setSyncMsg(t('admin.syncRanOk', { changed }))
    } catch (err) {
      setSyncErr(err instanceof Error ? err.message : String(err))
    } finally {
      setSyncBusy(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 sm:px-4 sm:py-6 space-y-6">
      <h1 className="text-2xl font-bold px-1">{t('admin.title')}</h1>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div>
          <h2 className="font-semibold">{t('admin.importFixturesHeading')}</h2>
          <p className="text-sm text-slate-400 mt-1">{t('admin.importFixturesDesc')}</p>
        </div>
        <button
          onClick={onImport}
          disabled={importBusy}
          className="w-full sm:w-auto rounded bg-brand-600 hover:bg-brand-700 disabled:opacity-50 px-4 py-3 font-semibold min-h-11"
        >
          {importBusy ? t('admin.importing') : t('admin.importNow')}
        </button>
        {importMsg && <p className="text-sm text-emerald-400">{importMsg}</p>}
        {importErr && <p className="text-sm text-red-400 break-all">{importErr}</p>}
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div>
          <h2 className="font-semibold">{t('admin.syncHeading')}</h2>
          <p className="text-sm text-slate-400 mt-1">{t('admin.syncDesc')}</p>
        </div>
        <button
          onClick={onSync}
          disabled={syncBusy}
          className="w-full sm:w-auto rounded bg-brand-600 hover:bg-brand-700 disabled:opacity-50 px-4 py-3 font-semibold min-h-11"
        >
          {syncBusy ? t('admin.syncing') : t('admin.syncNow')}
        </button>
        {syncMsg && <p className="text-sm text-emerald-400">{syncMsg}</p>}
        {syncErr && <p className="text-sm text-red-400 break-all">{syncErr}</p>}
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h2 className="font-semibold">{t('admin.moreToolsHeading')}</h2>
        <p className="text-sm text-slate-400 mt-1">{t('admin.moreToolsDesc')}</p>
      </section>
    </div>
  )
}
