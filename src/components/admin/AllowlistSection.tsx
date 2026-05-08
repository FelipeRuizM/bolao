import { useEffect, useState } from 'react'
import { setAllowedEmails } from '@/api/admin'
import { useConfig } from '@/hooks/useConfig'
import { useT } from '@/i18n'
import { AdminButton, AdminCard, StatusLine } from './AdminCard'

export function AllowlistSection() {
  const t = useT()
  const config = useConfig()
  const [emails, setEmails] = useState<string[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (config) setEmails(config.allowedEmails)
  }, [config])

  async function save(next: string[]) {
    setBusy(true)
    setOk(null)
    setErr(null)
    try {
      await setAllowedEmails(next)
      setEmails(next)
      setOk(t('admin.allowlistSaved'))
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  function add() {
    const e = newEmail.trim().toLowerCase()
    if (!e || emails.includes(e)) {
      setNewEmail('')
      return
    }
    void save([...emails, e])
    setNewEmail('')
  }

  function remove(email: string) {
    void save(emails.filter((e) => e !== email))
  }

  return (
    <AdminCard title={t('admin.allowlistHeading')} description={t('admin.allowlistDesc')}>
      <div className="flex gap-2">
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder="friend@example.com"
          className="flex-1 rounded bg-slate-800 border border-slate-700 px-3 py-2 text-base focus:outline-none focus:border-brand-500"
        />
        <AdminButton label={t('admin.allowlistAdd')} busy={busy} onClick={add} />
      </div>

      <ul className="space-y-1 max-h-64 overflow-y-auto">
        {emails.length === 0 && (
          <li className="text-sm text-slate-500 italic">{t('admin.allowlistEmpty')}</li>
        )}
        {emails.map((email) => (
          <li
            key={email}
            className="flex items-center justify-between bg-slate-800/60 rounded px-3 py-2 text-sm gap-2"
          >
            <span className="truncate">{email}</span>
            <button
              type="button"
              onClick={() => remove(email)}
              disabled={busy}
              className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 shrink-0 px-2 py-1"
            >
              {t('admin.allowlistRemove')}
            </button>
          </li>
        ))}
      </ul>
      <StatusLine ok={ok} err={err} />
    </AdminCard>
  )
}
