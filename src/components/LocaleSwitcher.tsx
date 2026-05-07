import { LOCALES, useLocale, type Locale } from '@/i18n'

const FLAGS: Record<Locale, string> = { en: 'EN', pt: 'PT' }

export function LocaleSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLocale()
  return (
    <div
      role="group"
      className={`inline-flex rounded-full border border-slate-700 overflow-hidden ${
        compact ? 'text-[11px]' : 'text-xs'
      }`}
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          className={`px-2.5 ${compact ? 'py-1' : 'py-1.5'} font-bold tracking-wider ${
            locale === l ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          {FLAGS[l]}
        </button>
      ))}
    </div>
  )
}
