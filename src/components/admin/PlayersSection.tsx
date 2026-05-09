import { useEffect, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { db } from '@/firebase'
import { setUserPaid } from '@/api/admin'
import { useT } from '@/i18n'
import { AdminCard, StatusLine } from './AdminCard'
import type { UserProfile } from '@/types'

interface Row {
  uid: string
  displayName: string
  email: string
  paid: boolean
}

export function PlayersSection() {
  const t = useT()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [savingUid, setSavingUid] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    return onValue(ref(db, 'users'), (snap) => {
      const users = (snap.val() ?? {}) as Record<string, UserProfile>
      const list: Row[] = Object.entries(users).map(([uid, p]) => ({
        uid,
        displayName: p.displayName ?? p.email ?? uid.slice(0, 6),
        email: p.email ?? '',
        paid: !!p.paid,
      }))
      list.sort((a, b) => a.displayName.localeCompare(b.displayName))
      setRows(list)
    })
  }, [])

  async function toggle(uid: string, paid: boolean) {
    setSavingUid(uid)
    setErr(null)
    try {
      await setUserPaid(uid, paid)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setSavingUid(null)
    }
  }

  return (
    <AdminCard
      title={t('admin.playersHeading')}
      description={t('admin.playersDesc')}
    >
      <ul className="space-y-1 max-h-80 overflow-y-auto">
        {rows === null && (
          <li className="text-sm text-slate-500 italic">{t('admin.playersLoading')}</li>
        )}
        {rows?.length === 0 && (
          <li className="text-sm text-slate-500 italic">{t('admin.playersEmpty')}</li>
        )}
        {rows?.map((row) => (
          <li
            key={row.uid}
            className="flex items-center justify-between bg-slate-800/60 rounded px-3 py-2 text-sm gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="truncate font-medium text-slate-100">{row.displayName}</div>
              {row.email && (
                <div className="truncate text-xs text-slate-500">{row.email}</div>
              )}
            </div>
            <label className="flex items-center gap-2 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={row.paid}
                disabled={savingUid === row.uid}
                onChange={(e) => toggle(row.uid, e.target.checked)}
                className="w-4 h-4 accent-brand-500"
              />
              <span className="text-xs text-slate-300">{t('admin.paidLabel')}</span>
            </label>
          </li>
        ))}
      </ul>
      <StatusLine err={err} />
    </AdminCard>
  )
}
