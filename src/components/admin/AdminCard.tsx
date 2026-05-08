import type { ReactNode } from 'react'

export function AdminCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
      <header>
        <h2 className="font-semibold text-base sm:text-lg">{title}</h2>
        {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
      </header>
      {children}
    </section>
  )
}

export function AdminButton({
  label,
  busy,
  busyLabel,
  onClick,
  variant = 'primary',
}: {
  label: string
  busy?: boolean
  busyLabel?: string
  onClick: () => void
  variant?: 'primary' | 'danger'
}) {
  const styles =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700'
      : 'bg-brand-600 hover:bg-brand-700'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`w-full sm:w-auto rounded ${styles} text-white disabled:opacity-50 px-4 py-3 font-semibold min-h-11`}
    >
      {busy ? busyLabel ?? label : label}
    </button>
  )
}

export function StatusLine({
  ok,
  err,
}: {
  ok?: string | null
  err?: string | null
}) {
  if (!ok && !err) return null
  if (ok) return <p className="text-sm text-emerald-400">{ok}</p>
  return <p className="text-sm text-red-400 break-words">{err}</p>
}

export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-300 flex-1">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value)
          onChange(Number.isFinite(n) ? n : 0)
        }}
        className="w-24 rounded bg-slate-800 border border-slate-700 px-3 py-2 text-base text-right tabular-nums focus:outline-none focus:border-brand-500"
      />
    </label>
  )
}
