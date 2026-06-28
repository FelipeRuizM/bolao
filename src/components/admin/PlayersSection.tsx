import { useEffect, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { db } from '@/firebase'
import { setUserGroup, setUserHidden } from '@/api/admin'
import { DEFAULT_GROUP } from '@/hooks/useUsers'
import { useT } from '@/i18n'
import { AdminCard, StatusLine } from './AdminCard'
import type { UserProfile } from '@/types'

interface Row {
  uid: string
  displayName: string
  email: string
  group: string
  hidden: boolean
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
        group: p.group?.trim() || '',
        hidden: p.hidden === true,
      }))
      list.sort((a, b) => a.displayName.localeCompare(b.displayName))
      setRows(list)
    })
  }, [])

  async function saveGroup(uid: string, group: string) {
    setSavingUid(uid)
    setErr(null)
    try {
      await setUserGroup(uid, group)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setSavingUid(null)
    }
  }

  async function toggleHidden(uid: string, hidden: boolean) {
    setSavingUid(uid)
    setErr(null)
    try {
      await setUserHidden(uid, hidden)
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
            className={`flex items-center justify-between bg-slate-800/60 rounded px-3 py-2 text-sm gap-3 ${
              row.hidden ? 'opacity-60' : ''
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="truncate font-medium text-slate-100 flex items-center gap-1.5">
                <span className="truncate">{row.displayName}</span>
                {row.hidden && (
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400 border border-slate-600 rounded px-1.5">
                    {t('admin.playerHiddenBadge')}
                  </span>
                )}
              </div>
              {row.email && (
                <div className="truncate text-xs text-slate-500">{row.email}</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => toggleHidden(row.uid, !row.hidden)}
              disabled={savingUid === row.uid}
              className="shrink-0 text-xs font-semibold text-slate-300 hover:text-slate-100 border border-slate-600 rounded px-2 py-1 disabled:opacity-50"
            >
              {row.hidden ? t('admin.showPlayer') : t('admin.hidePlayer')}
            </button>
            <input
              type="text"
              defaultValue={row.group}
              disabled={savingUid === row.uid}
              placeholder={DEFAULT_GROUP}
              aria-label={t('admin.groupLabel')}
              onBlur={(e) => {
                if (e.target.value.trim() !== row.group) saveGroup(row.uid, e.target.value)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
              className="w-20 shrink-0 rounded bg-slate-800 border border-slate-700 px-2 py-1 text-xs focus:outline-none focus:border-brand-500 disabled:opacity-50"
            />
          </li>
        ))}
      </ul>
      <StatusLine err={err} />
    </AdminCard>
  )
}
