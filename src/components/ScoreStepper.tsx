import { useT } from '@/i18n'

interface Props {
  label: string
  value: number
  onChange: (v: number) => void
  disabled?: boolean
  max?: number
  emblem?: string
}

export function ScoreStepper({ label, value, onChange, disabled = false, max = 20 }: Props) {
  const t = useT()
  return (
    <div className="flex items-center gap-3 sm:gap-6 bg-slate-900/90 rounded-3xl p-2 sm:p-3 border border-slate-700/50 shadow-2xl shrink-0 backdrop-blur-md">
      <button
        type="button"
        aria-label={t('scoreStepper.decrease', { label })}
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={disabled || value === 0}
        className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-slate-800 text-slate-300 text-4xl sm:text-5xl font-bold hover:bg-slate-700 hover:text-white active:scale-95 transition-all disabled:opacity-30 disabled:hover:bg-slate-800 disabled:active:scale-100 flex items-center justify-center shrink-0 shadow-md"
      >
        −
      </button>
      
      <div className="text-5xl sm:text-7xl font-black tabular-nums w-14 sm:w-24 text-center text-brand-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.4)]">
        {value}
      </div>
      
      <button
        type="button"
        aria-label={t('scoreStepper.increase', { label })}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value === max}
        className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-slate-800 text-slate-300 text-4xl sm:text-5xl font-bold hover:bg-slate-700 hover:text-white active:scale-95 transition-all disabled:opacity-30 disabled:hover:bg-slate-800 disabled:active:scale-100 flex items-center justify-center shrink-0 shadow-md"
      >
        +
      </button>
    </div>
  )
}
