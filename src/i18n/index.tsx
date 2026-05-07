import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import en from './locales/en'
import pt from './locales/pt'

const dicts = { en, pt } as const
export type Locale = keyof typeof dicts
export const LOCALES: Locale[] = ['en', 'pt']

interface LocaleContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)
const STORAGE_KEY = 'wc-pool-locale'

function detectInitialLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'pt') return stored
  } catch {
    // localStorage may be unavailable (SSR, privacy modes)
  }
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('pt')) {
    return 'pt'
  }
  return 'en'
}

function lookup(dict: unknown, path: string[]): string | undefined {
  let cur: unknown = dict
  for (const p of path) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[p]
  }
  return typeof cur === 'string' ? cur : undefined
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(detectInitialLocale)

  useEffect(() => {
    document.documentElement.lang = locale
    try {
      localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      // ignored
    }
  }, [locale])

  function t(key: string, params?: Record<string, string | number>): string {
    const path = key.split('.')
    const val = lookup(dicts[locale], path) ?? lookup(dicts.en, path)
    if (val == null) {
      console.warn(`Missing translation: ${key}`)
      return key
    }
    if (!params) return val
    return val.replace(/\{(\w+)\}/g, (_, k: string) =>
      params[k] !== undefined ? String(params[k]) : `{${k}}`,
    )
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>
  )
}

export function useT() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useT must be used inside <LocaleProvider>')
  return ctx.t
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used inside <LocaleProvider>')
  return ctx
}

/** Returns 'en-US' or 'pt-BR' for use with toLocaleString(). */
export function bcp47(locale: Locale): string {
  return locale === 'pt' ? 'pt-BR' : 'en-US'
}
