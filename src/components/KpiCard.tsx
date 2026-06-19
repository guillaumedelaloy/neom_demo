import type { ReactNode } from 'react'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'

type Trend = 'up' | 'down' | 'flat'

type KpiCardProps = {
  label: string
  value: ReactNode
  subtitle?: ReactNode
  trend?: Trend
  deltaLabel?: string
  valueClassName?: string
  footer?: ReactNode
  className?: string
}

function TrendIcon({ trend }: { trend: Trend }) {
  if (trend === 'up')
    return <TrendingUp className="size-4 text-ma-teal" aria-hidden />
  if (trend === 'down')
    return <TrendingDown className="size-4 text-ma-risk" aria-hidden />
  return <Minus className="size-4 text-ma-amber-warn" aria-hidden />
}

const cardBase =
  'rounded-sm border border-ma-line bg-ma-elevated px-5 py-4 shadow-[0_1px_0_rgba(15,18,16,0.04)] transition-colors hover:border-ma-accent/40 dark:shadow-[0_1px_0_rgba(0,0,0,0.25)]'

export function KpiCard({
  label,
  value,
  subtitle,
  trend,
  deltaLabel,
  valueClassName = 'text-ma-accent',
  footer,
  className = '',
}: KpiCardProps) {
  return (
    <div className={`${cardBase} ${className}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ma-muted">{label}</p>
      <div className="mt-2 flex flex-wrap items-end gap-3">
        <div
          className={`text-3xl font-semibold tabular-nums tracking-tight leading-none ${valueClassName}`}
        >
          {value}
        </div>
        {trend != null && deltaLabel != null && (
          <div className="mb-1 flex items-center gap-1 text-sm text-ma-muted">
            <TrendIcon trend={trend} />
            <span className="tabular-nums font-medium">{deltaLabel}</span>
          </div>
        )}
      </div>
      {subtitle != null && (
        <p className="mt-2 text-[13px] leading-snug text-ma-muted">{subtitle}</p>
      )}
      {footer != null && <div className="mt-3">{footer}</div>}
    </div>
  )
}
