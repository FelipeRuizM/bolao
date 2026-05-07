import { useState } from 'react'
import { importFixturesToFirebase } from '@/api/fixtures'

export function Admin() {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onImport() {
    setBusy(true)
    setResult(null)
    setError(null)
    try {
      const { count } = await importFixturesToFirebase()
      setResult(`Imported ${count} matches into /matches.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 sm:px-4 sm:py-6 space-y-6">
      <h1 className="text-2xl font-bold px-1">Admin</h1>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div>
          <h2 className="font-semibold">Import fixtures</h2>
          <p className="text-sm text-slate-400 mt-1">
            Pulls the 2026 World Cup schedule from{' '}
            <a
              href="https://github.com/openfootball/worldcup.json"
              target="_blank"
              rel="noreferrer"
              className="text-brand-500 underline"
            >
              openfootball
            </a>{' '}
            and writes all matches to <span className="font-mono">/matches</span>. Re-running
            overwrites existing fixtures (keeps any score data only if present in the source).
          </p>
        </div>
        <button
          onClick={onImport}
          disabled={busy}
          className="w-full sm:w-auto rounded bg-brand-600 hover:bg-brand-700 disabled:opacity-50 px-4 py-3 font-semibold min-h-11"
        >
          {busy ? 'Importing…' : 'Import fixtures now'}
        </button>
        {result && <p className="text-sm text-emerald-400">{result}</p>}
        {error && <p className="text-sm text-red-400 break-all">{error}</p>}
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h2 className="font-semibold">More tools</h2>
        <p className="text-sm text-slate-400 mt-1">
          Manual score override, leaderboard recompute, point-value editing, and force-sync
          arrive in Phase 7.
        </p>
      </section>
    </div>
  )
}
