export function formatUsdM(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—'
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}M`
}

export function formatPercent1(n: number): string {
  return `${n.toFixed(1)}%`
}

export function formatNumber(n: number | null | undefined, digits = 2): string {
  if (n == null || Number.isNaN(n)) return '—'
  return n.toFixed(digits)
}

export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date('2026-02-01T00:00:00Z')
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}
