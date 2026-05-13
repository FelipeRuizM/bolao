import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { onValue, ref } from 'firebase/database'
import { db } from '@/firebase'
import { useAuth } from '@/hooks/useAuth'
import { useT } from '@/i18n'
import { changePassword, updateDisplayName } from '@/api/profile'
import type { UserProfile } from '@/types'

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
      <h2 className="font-semibold text-base sm:text-lg">{title}</h2>
      {children}
    </section>
  )
}

export function Profile() {
  const { user } = useAuth()
  const t = useT()

  if (!user) {
    return <div className="p-6 text-slate-400">{t('matchDetail.loading')}</div>
  }

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 sm:px-4 sm:py-6 space-y-5">
      <header className="px-1">
        <Link to="/" className="text-sm text-brand-400 hover:text-brand-300">
          {t('profile.back')}
        </Link>
        <h1 className="text-2xl font-bold mt-1">{t('profile.title')}</h1>
        <p className="text-sm text-slate-400 mt-1">{user.email}</p>
      </header>

      <DisplayNameSection uid={user.uid} />
      <PasswordSection />
    </div>
  )
}

function DisplayNameSection({ uid }: { uid: string }) {
  const t = useT()
  const [current, setCurrent] = useState<string | null>(null)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    return onValue(ref(db, `users/${uid}`), (snap) => {
      const profile = snap.val() as UserProfile | null
      const name = profile?.displayName ?? ''
      setCurrent(name)
      setValue(name)
    })
  }, [uid])

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setOk(null)
    setErr(null)
    try {
      await updateDisplayName(uid, value)
      setOk(t('profile.displayNameSaved'))
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const dirty = current !== null && value.trim() !== current && value.trim().length > 0

  return (
    <Card title={t('profile.displayNameHeading')}>
      <p className="text-xs text-slate-400">{t('profile.displayNameDesc')}</p>
      <form onSubmit={save} className="space-y-3">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={40}
          required
          className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-3 text-base focus:outline-none focus:border-brand-500"
        />
        <button
          type="submit"
          disabled={busy || !dirty}
          className="w-full sm:w-auto rounded bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 px-4 py-3 font-semibold min-h-11"
        >
          {busy ? t('profile.saving') : t('profile.save')}
        </button>
        {ok && <p className="text-sm text-emerald-400">{ok}</p>}
        {err && <p className="text-sm text-red-400 break-words">{err}</p>}
      </form>
    </Card>
  )
}

function PasswordSection() {
  const { user } = useAuth()
  const t = useT()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setBusy(true)
    setOk(null)
    setErr(null)
    if (newPassword !== confirm) {
      setErr(t('profile.passwordsDoNotMatch'))
      setBusy(false)
      return
    }
    try {
      await changePassword(user, currentPassword, newPassword)
      setOk(t('profile.passwordChanged'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirm('')
    } catch (e) {
      setErr(mapAuthError(e, t))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title={t('profile.passwordHeading')}>
      <p className="text-xs text-slate-400">{t('profile.passwordDesc')}</p>
      <form onSubmit={save} className="space-y-3">
        <PasswordField
          label={t('profile.currentPassword')}
          value={currentPassword}
          autoComplete="current-password"
          onChange={setCurrentPassword}
        />
        <PasswordField
          label={t('profile.newPassword')}
          value={newPassword}
          autoComplete="new-password"
          onChange={setNewPassword}
        />
        <PasswordField
          label={t('profile.confirmNewPassword')}
          value={confirm}
          autoComplete="new-password"
          onChange={setConfirm}
        />
        <button
          type="submit"
          disabled={busy || !currentPassword || !newPassword || !confirm}
          className="w-full sm:w-auto rounded bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 px-4 py-3 font-semibold min-h-11"
        >
          {busy ? t('profile.saving') : t('profile.changePassword')}
        </button>
        {ok && <p className="text-sm text-emerald-400">{ok}</p>}
        {err && <p className="text-sm text-red-400 break-words">{err}</p>}
      </form>
    </Card>
  )
}

function PasswordField({
  label,
  value,
  autoComplete,
  onChange,
}: {
  label: string
  value: string
  autoComplete: string
  onChange: (v: string) => void
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-300">{label}</span>
      <input
        type="password"
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        minLength={6}
        className="mt-1 w-full rounded bg-slate-800 border border-slate-700 px-3 py-3 text-base focus:outline-none focus:border-brand-500"
      />
    </label>
  )
}

function mapAuthError(e: unknown, t: ReturnType<typeof useT>): string {
  if (e && typeof e === 'object' && 'code' in e) {
    const code = (e as { code: string }).code
    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      return t('profile.errCurrentPasswordWrong')
    }
    if (code === 'auth/weak-password') {
      return t('profile.errWeakPassword')
    }
    if (code === 'auth/too-many-requests') {
      return t('profile.errTooManyAttempts')
    }
  }
  return e instanceof Error ? e.message : String(e)
}
