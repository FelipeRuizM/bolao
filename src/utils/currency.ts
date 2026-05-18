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
