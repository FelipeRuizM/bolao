import { useT } from '@/i18n'

interface Props {
  label: string
  value: number
  onChange: (v: number) => void
  disabled?: boolean
  max?: number
}

function Triangle({ direction }: { direction: 'up' | 'down' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="w-6 h-6 sm:w-7 sm:h-7"
    >
      {direction === 'up' ? (
        <polygon points="12,5 22,19 2,19" />
      ) : (
        <polygon points="2,5 22,5 12,19" />
      )}
    </svg>
  )
}

export function ScoreStepper({ label, value, onChange, disabled = false, max = 20 }: Props) {
  const t = useT()
  return (
    <div className="flex flex-col items-center gap-3 sm:gap-4 select-none">
      <button
        type="button"
        aria-label={t('scoreStepper.increase', { label })}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value === max}
        className="text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors min-w-11 min-h-11 flex items-center justify-center active:scale-90"
      >
        <Triangle direction="up" />
      </button>

      <div className="text-7xl sm:text-9xl font-extrabold text-white tabular-nums leading-none">
        {value}
      </div>

      <button
        type="button"
        aria-label={t('scoreStepper.decrease', { label })}
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={disabled || value === 0}
        className="text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors min-w-11 min-h-11 flex items-center justify-center active:scale-90"
      >
        <Triangle direction="down" />
      </button>
    </div>
  )
}
