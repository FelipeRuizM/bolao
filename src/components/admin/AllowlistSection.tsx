import { useEffect, useState } from 'react'
import { setAllowedEmails, setUserGroups } from '@/api/admin'
import { useConfig } from '@/hooks/useConfig'
import { DEFAULT_GROUP } from '@/hooks/useUsers'
import { useT } from '@/i18n'
import { AdminButton, AdminCard, StatusLine } from './AdminCard'

export function AllowlistSection() {
  const t = useT()
  const config = useConfig()
  const [emails, setEmails] = useState<string[]>([])
  const [groups, setGroups] = useState<Record<string, string>>({})
  const [newEmail, setNewEmail] = useState('')
  const [newGroup, setNewGroup] = useState('')
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (config) {
      setEmails(config.allowedEmails)
      setGroups(config.userGroups)
    }
  }, [config])

  async function save(nextEmails: string[], nextGroups: Record<string, string>) {
    setBusy(true)
    setOk(null)
    setErr(null)
    try {
      await Promise.all([setAllowedEmails(nextEmails), setUserGroups(nextGroups)])
      setEmails(nextEmails)
      setGroups(nextGroups)
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
      setNewGroup('')
      return
    }
    const g = newGroup.trim()
    const nextGroups = { ...groups }
    if (g && g !== DEFAULT_GROUP) nextGroups[e] = g
    void save([...emails, e], nextGroups)
    setNewEmail('')
    setNewGroup('')
  }

  function remove(email: string) {
    const nextGroups = { ...groups }
    delete nextGroups[email]
    void save(emails.filter((e) => e !== email), nextGroups)
  }

  function changeGroup(email: string, group: string) {
    const g = group.trim()
    const nextGroups = { ...groups }
    if (g && g !== DEFAULT_GROUP) nextGroups[email] = g
    else delete nextGroups[email]
    void save(emails, nextGroups)
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
          className="flex-1 min-w-0 rounded bg-slate-800 border border-slate-700 px-3 py-2 text-base focus:outline-none focus:border-brand-500"
        />
        <input
          type="text"
          value={newGroup}
          onChange={(e) => setNewGroup(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder={DEFAULT_GROUP}
          aria-label={t('admin.groupLabel')}
          className="w-24 shrink-0 rounded bg-slate-800 border border-slate-700 px-2 py-2 text-base focus:outline-none focus:border-brand-500"
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
            <span className="flex-1 min-w-0 truncate">{email}</span>
            <input
              type="text"
              defaultValue={groups[email] ?? ''}
              disabled={busy}
              placeholder={DEFAULT_GROUP}
              aria-label={t('admin.groupLabel')}
              onBlur={(e) => {
                if ((e.target.value.trim() || DEFAULT_GROUP) !== (groups[email] ?? DEFAULT_GROUP)) {
                  changeGroup(email, e.target.value)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
              className="w-20 shrink-0 rounded bg-slate-800 border border-slate-700 px-2 py-1 text-xs focus:outline-none focus:border-brand-500 disabled:opacity-50"
            />
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
