const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatBRL(amount: number): string {
  if (!Number.isFinite(amount)) return BRL.format(0)
  return BRL.format(amount)
}

export const PRIZE_SHARES = {
  first: 0.7,
  second: 0.2,
  third: 0.1,
} as const

export function splitPrize(total: number): { first: number; second: number; third: number } {
  return {
    first: total * PRIZE_SHARES.first,
    second: total * PRIZE_SHARES.second,
    third: total * PRIZE_SHARES.third,
  }
}
