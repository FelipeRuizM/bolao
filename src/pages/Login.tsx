import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useT } from '@/i18n'
import { LocaleSwitcher } from '@/components/LocaleSwitcher'

export function Login() {
  const { signIn, status } = useAuth()
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (status === 'signed-in') return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.signInFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <LocaleSwitcher />
      </div>
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 bg-slate-900 p-6 rounded-xl border border-slate-800"
      >
        <div className="text-center">
          <div className="text-3xl">⚽</div>
          <h1 className="text-2xl font-bold">{t('login.title')}</h1>
          <p className="text-sm text-slate-400">{t('login.subtitle')}</p>
        </div>
        <label className="block">
          <span className="text-sm text-slate-300">{t('login.email')}</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-base focus:outline-none focus:border-brand-500"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-300">{t('login.password')}</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-base focus:outline-none focus:border-brand-500"
          />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded bg-brand-600 hover:bg-brand-700 px-4 py-3 font-semibold disabled:opacity-50 min-h-11"
        >
          {busy ? t('login.signingIn') : t('login.signIn')}
        </button>
        <p className="text-xs text-slate-500 text-center">{t('login.noPublicSignup')}</p>
      </form>
    </div>
  )
}
