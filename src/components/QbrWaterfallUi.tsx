import type { ReactNode } from 'react'
import { useState } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import type { WaterfallBar, WaterfallItem } from '../data/qbrFinancials'

/** Uppercase muted label used across QBR financial blocks. */
export function QbrMutedLabel({ children }: { children: ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-wide text-ma-muted">{children}</p>
}

export function VarianceBadge({ v }: { v: string }) {
  const neg = v.startsWith('-')
  const neutral = v === '0%' || v === '0' || v === '—'
  if (neutral)
    return (
      <span className="inline-flex items-center rounded-full border border-ma-line bg-ma-surface/50 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-ma-muted">
        {v}
      </span>
    )
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
        neg
          ? 'border-ma-risk/30 bg-ma-risk/8 text-ma-risk'
          : 'border-ma-teal/30 bg-ma-teal/8 text-ma-teal'
      }`}
    >
      {neg ? <ArrowDownRight className="size-3 shrink-0" aria-hidden /> : <ArrowUpRight className="size-3 shrink-0" aria-hidden />}
      {v}
    </span>
  )
}

export function WaterfallBridge({ items, unit }: { items: WaterfallItem[]; unit: string }) {
  return (
    <div className="space-y-0">
      {items.map((item, i) => {
        const isTotal = i === 0 || i === items.length - 1
        return (
          <div key={item.label}>
            <div
              className={`flex items-center justify-between gap-4 border-b border-ma-line/50 px-1 py-2.5 ${
                isTotal ? 'bg-ma-surface/30 dark:bg-ma-charcoal/20' : ''
              }`}
            >
              <span className={`text-[12px] ${isTotal ? 'font-semibold text-ma-ink' : 'text-ma-ink/90'}`}>
                {item.label}
              </span>
              <span className={`font-mono text-[13px] tabular-nums ${isTotal ? 'font-bold text-ma-accent' : 'font-semibold text-ma-ink'}`}>
                {item.value} <span className="text-[10px] font-normal text-ma-muted">{unit}</span>
              </span>
            </div>
            {item.detail && (
              <div className="border-b border-ma-line/30 bg-ma-surface/15 py-1.5 pl-6 pr-1 dark:bg-ma-charcoal/10">
                {item.detail.map((d) => (
                  <p key={d} className="py-0.5 text-[11px] text-ma-muted">
                    {d}
                  </p>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const BAR_COLORS: Record<string, string> = {
  total: '#8B6914',
  subtotal: '#3B6B4A',
  positive: '#2A8C6A',
  negative: '#C03030',
  reference: '#9E9E9E',
}

type ComputedBar = WaterfallBar & { y0: number; y1: number; idx: number }

export function EbitdaWaterfallChart({ bars }: { bars: WaterfallBar[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const computed: ComputedBar[] = []
  let running = 0
  bars.forEach((bar, idx) => {
    if (bar.kind === 'total' || bar.kind === 'subtotal' || bar.kind === 'reference') {
      computed.push({ ...bar, y0: 0, y1: bar.value, idx })
      if (bar.kind !== 'reference') running = bar.value
    } else {
      const start = running
      running += bar.value
      computed.push({ ...bar, y0: Math.min(start, running), y1: Math.max(start, running), idx })
    }
  })

  const maxVal = Math.max(...computed.map((c) => c.y1)) * 1.15
  const count = computed.length
  const W = 920
  const H = 310
  const padL = 16
  const padR = 16
  const padT = 48
  const padB = 48
  const chartW = W - padL - padR
  const chartH = H - padT - padB
  const barW = Math.min(56, (chartW / count) * 0.58)
  const step = chartW / count
  function barX(i: number) {
    return padL + step * i + (step - barW) / 2
  }
  function scaleY(v: number) {
    return padT + chartH - (v / maxVal) * chartH
  }

  const budgetIdx = computed.findIndex((b) => b.kind === 'total')
  const forecastIdx = computed.length - 1 - [...computed].reverse().findIndex((b) => b.kind === 'total')

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="EBITDA waterfall chart">
        <line x1={padL} x2={W - padR} y1={scaleY(0)} y2={scaleY(0)} stroke="var(--ma-line)" strokeWidth={0.5} />

        {budgetIdx >= 0 && forecastIdx >= 0 && (() => {
          const bx = barX(budgetIdx) + barW / 2
          const fx = barX(forecastIdx) + barW / 2
          const bracketY = padT - 28
          const tickH = 6
          return (
            <g>
              <line x1={bx} x2={bx} y1={bracketY + tickH} y2={bracketY} stroke="var(--ma-ink)" strokeWidth={0.75} />
              <line x1={bx} x2={fx} y1={bracketY} y2={bracketY} stroke="var(--ma-ink)" strokeWidth={0.75} />
              <line x1={fx} x2={fx} y1={bracketY} y2={bracketY + tickH} stroke="var(--ma-ink)" strokeWidth={0.75} />
              <g transform={`translate(${(bx + fx) / 2}, ${bracketY})`}>
                <ellipse cx={0} cy={0} rx={18} ry={10} fill="#C03030" />
                <text x={0} y={3.5} textAnchor="middle" fill="white" fontSize={9} fontWeight={700}>
                  -8%
                </text>
              </g>
            </g>
          )
        })()}

        {computed.map((bar, i) => {
          const x = barX(i)
          const yTop = scaleY(bar.y1)
          const yBot = scaleY(bar.y0)
          const barH = Math.max(yBot - yTop, 2)
          const isPos = bar.value >= 0
          const isHovered = hoveredIdx === i

          let fill: string
          if (bar.kind === 'reference') fill = BAR_COLORS.reference
          else if (bar.kind === 'subtotal') fill = BAR_COLORS.subtotal
          else if (bar.kind === 'total') fill = BAR_COLORS.total
          else fill = isPos ? BAR_COLORS.positive : BAR_COLORS.negative

          const nextBar = computed[i + 1]
          const showConn = nextBar && nextBar.kind === 'delta'

          let connY: number
          if (bar.kind === 'total' || bar.kind === 'subtotal') connY = scaleY(bar.y1)
          else connY = isPos ? scaleY(bar.y1) : scaleY(bar.y0)

          const valAbove = bar.kind !== 'delta' || isPos
          const valY = valAbove ? yTop - 7 : yBot + 13

          const separatorBefore = bar.kind === 'reference'

          return (
            <g key={i}>
              {separatorBefore && (
                <line
                  x1={x - (step - barW) / 2 - 1}
                  x2={x - (step - barW) / 2 - 1}
                  y1={padT}
                  y2={scaleY(0)}
                  stroke="var(--ma-line)"
                  strokeWidth={0.5}
                  strokeDasharray="3 3"
                />
              )}

              {showConn && (
                <line
                  x1={x + barW}
                  x2={barX(i + 1)}
                  y1={connY}
                  y2={connY}
                  stroke="var(--ma-line)"
                  strokeWidth={0.7}
                  strokeDasharray="2 2"
                />
              )}

              <rect
                x={x}
                y={yTop}
                width={barW}
                height={barH}
                fill={fill}
                opacity={isHovered ? 1 : 0.9}
                className="cursor-default transition-opacity duration-100"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />

              <text
                x={x + barW / 2}
                y={valY}
                textAnchor="middle"
                className="fill-[color:var(--ma-ink)]"
                fontSize={10.5}
                fontWeight={600}
                fontFamily="ui-monospace,monospace"
              >
                {bar.kind === 'delta'
                  ? `${bar.value > 0 ? '+' : ''}${bar.value.toLocaleString()}`
                  : bar.value.toLocaleString()}
              </text>

              <text
                x={x + barW / 2}
                y={scaleY(0) + 16}
                textAnchor="middle"
                className="fill-[color:var(--ma-muted)]"
                fontSize={9}
                fontWeight={500}
              >
                {bar.lines.map((line, li) => (
                  <tspan key={li} x={x + barW / 2} dy={li === 0 ? 0 : 12}>
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          )
        })}
      </svg>

      {hoveredIdx != null && computed[hoveredIdx]?.detail && (
        <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-md border border-ma-line bg-ma-elevated/95 px-3 py-2 shadow-lg backdrop-blur-sm">
          <p className="text-[11px] font-semibold text-ma-ink">{computed[hoveredIdx].label}</p>
          <div className="mt-1 space-y-0.5">
            {computed[hoveredIdx].detail!.map((d) => (
              <p key={d} className="text-[10px] text-ma-muted">
                {d}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
