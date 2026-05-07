interface Props {
  label: string
  value: number
  onChange: (v: number) => void
  disabled?: boolean
  max?: number
}

export function ScoreStepper({ label, value, onChange, disabled = false, max = 20 }: Props) {
  return (
    <div className="flex items-center gap-3 bg-slate-800 rounded-2xl p-3">
      <button
        type="button"
        aria-label={`Decrease ${label} score`}
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={disabled || value === 0}
        className="w-14 h-14 rounded-full bg-slate-700 text-3xl font-bold active:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
      >
        −
      </button>
      <div className="flex-1 text-center min-w-0">
        <div className="text-xs text-slate-400 truncate uppercase tracking-wide">{label}</div>
        <div className="text-5xl font-bold tabular-nums leading-none mt-1">{value}</div>
      </div>
      <button
        type="button"
        aria-label={`Increase ${label} score`}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value === max}
        className="w-14 h-14 rounded-full bg-slate-700 text-3xl font-bold active:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
      >
        +
      </button>
    </div>
  )
}
