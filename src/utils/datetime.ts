/**
 * The whole app shows dates and times in Brazil time, regardless of where the
 * viewer's device is. All match `kickoffAt` values are absolute epoch ms, so we
 * only ever need to *render* them in this fixed zone — never to reinterpret the
 * stored instant. Intl handles DST for us.
 */
export const BR_TZ = 'America/Sao_Paulo'

/**
 * Format a timestamp in Brazil time. Output components are controlled by `opts`
 * (date-only options give a date-only string, etc.).
 */
export function formatBR(
  ms: number,
  locale: string,
  opts: Intl.DateTimeFormatOptions,
): string {
  return new Date(ms).toLocaleString(locale, { timeZone: BR_TZ, ...opts })
}

/**
 * Calendar day (YYYY-MM-DD) of a timestamp in Brazil time — used to bucket
 * matches by day. `en-CA` renders ISO-style YYYY-MM-DD, which also sorts
 * lexicographically.
 */
export function brDayKey(ms: number): string {
  return new Date(ms).toLocaleDateString('en-CA', { timeZone: BR_TZ })
}
