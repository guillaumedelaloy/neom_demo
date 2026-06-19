import type { ReactNode } from 'react'
import {
  AlertTriangle,
  BarChart3,
  ChevronDown,
  Compass,
  DollarSign,
  Factory,
  Landmark,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useDomainNarrative } from '../data/hooks'
import { getDomainRiskOpportunityBullets } from '../data/domainRiskOpportunityBullets'
import { RagDot } from '../components/RagDot'
import {
  EbitdaWaterfallChart,
  QbrMutedLabel,
  VarianceBadge,
  WaterfallBridge,
} from '../components/QbrWaterfallUi'
import {
  aluminiumBu,
  aluminiumCapex,
  bmnmBu,
  bmnmCapex,
  cashFlowBridge,
  cashFlowGroupTotals,
  cashFlowWaterfall,
  consolidatedCapex,
  fyOutlook,
  groupFY,
  groupQ1,
  phosphateBu,
  phosphateCapex,
  q1EbitdaBridge,
  q1EbitdaWaterfall,
  type BuKpi,
  type CapexRow,
  type CfBar,
  type Kpi,
} from '../data/qbrFinancials'

/* ── shared styles ── */

const card =
  'rounded-lg border border-ma-line bg-ma-elevated shadow-[0_2px_8px_rgba(15,18,16,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.25)]'

const innerCard =
  'rounded-md border border-ma-line bg-ma-elevated px-5 py-5 shadow-[0_1px_0_rgba(15,18,16,0.04)] dark:shadow-[0_1px_0_rgba(0,0,0,0.25)]'

const sectionAccent: Record<string, string> = {
  objectives: 'border-t-[3px] border-t-ma-accent/55',
  performance: 'border-t-[3px] border-t-ma-teal/50',
  risk: 'border-t-[3px] border-t-ma-risk/50',
  opportunity: 'border-t-[3px] border-t-ma-accent/60',
}

const SPINE_AI_DISCLAIMER = 'AI generated and tentative'

const spineFocusRing =
  'outline-none transition-colors duration-200 ease-out focus-visible:ring-2 focus-visible:ring-ma-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ma-elevated motion-reduce:transition-none dark:focus-visible:ring-offset-ma-elevated'

const spineBtnSecondary =
  `${spineFocusRing} inline-flex min-h-11 items-center justify-center gap-1 rounded-md border border-ma-line bg-ma-surface/50 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-ma-muted hover:border-ma-teal/45 hover:text-ma-ink active:bg-ma-surface/80 motion-reduce:active:scale-100 dark:bg-ma-charcoal/40 dark:active:bg-ma-charcoal/60 sm:min-h-10 sm:px-2.5 sm:py-2`

/* ── layout components ── */

function SectionShell({
  slug,
  icon,
  title,
  badge,
  children,
  defaultOpen = false,
}: {
  slug: string
  icon: ReactNode
  title: string
  badge?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
}) {
  return (
    <details
      className={`group/sec ${card} ${sectionAccent[slug] ?? ''} overflow-hidden open:[&_.sec-chevron]:rotate-180`}
      open={defaultOpen || undefined}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 transition-colors hover:bg-ma-surface/40 dark:hover:bg-ma-charcoal/30 [&::-webkit-details-marker]:hidden">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-ma-line bg-ma-surface/80 text-ma-accent dark:bg-ma-charcoal/80">
          {icon}
        </span>
        <h2 className="min-w-0 flex-1 text-[13px] font-semibold uppercase tracking-[0.12em] text-ma-graphite">
          {title}
        </h2>
        {badge}
        <ChevronDown className="sec-chevron size-4 shrink-0 text-ma-muted transition-transform duration-200" aria-hidden />
      </summary>
      <div className="border-t border-ma-line/70 px-5 pb-5 pt-4">{children}</div>
    </details>
  )
}

function MilestoneTimeline({
  milestones,
}: {
  milestones: { title: string; whereWeStand: string }[]
}) {
  function statusFromText(text: string) {
    const lower = text.toLowerCase()
    if (lower.startsWith('on track')) return 'on_track' as const
    if (lower.startsWith('at risk')) return 'at_risk' as const
    if (lower.startsWith('watch')) return 'amber' as const
    return 'neutral' as const
  }

  function ragColor(s: ReturnType<typeof statusFromText>) {
    if (s === 'on_track') return 'green' as const
    if (s === 'at_risk') return 'red' as const
    if (s === 'amber') return 'amber' as const
    return 'gray' as const
  }

  return (
    <ol className="relative space-y-0 pl-0">
      {milestones.map((m, i) => {
        const status = statusFromText(m.whereWeStand)
        return (
          <li key={m.title} className="relative flex gap-3 pb-6 last:pb-0 sm:gap-4">
            <div className="relative flex shrink-0 flex-col items-center pt-0.5">
              <span className="relative z-[1] flex h-8 w-8 items-center justify-center rounded-full border-2 border-ma-accent/50 bg-ma-elevated text-[11px] font-bold tabular-nums text-ma-accent shadow-sm">
                {i + 1}
              </span>
              {i < milestones.length - 1 && (
                <span
                  className="absolute left-1/2 top-8 h-[calc(100%-0.25rem)] w-px -translate-x-1/2 bg-gradient-to-b from-ma-accent/45 to-ma-line"
                  aria-hidden
                />
              )}
            </div>
            <div className="min-w-0 flex-1 rounded-md border border-ma-line/90 bg-ma-surface/35 px-3 py-2.5 dark:bg-ma-charcoal/40">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] font-semibold leading-snug text-ma-ink">{m.title}</p>
                <RagDot color={ragColor(status)} size={9} />
              </div>
              <p className="mt-1.5 max-w-prose text-[12px] leading-relaxed text-ma-muted">
                {m.whereWeStand}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function RiskBulletList({
  items,
  variant,
}: {
  items: { highlight: string; detail: string }[]
  variant: 'risk' | 'opportunity'
}) {
  const bar = variant === 'risk' ? 'border-ma-risk/40' : 'border-ma-accent/45'
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i}>
          <details className="group/ro rounded-md border border-ma-line/80 bg-ma-surface/25 open:border-ma-line open:bg-ma-surface/40 dark:bg-ma-charcoal/25 dark:open:bg-ma-charcoal/40">
            <summary className="flex cursor-pointer list-none items-start gap-2 px-3 py-2.5 text-left [&::-webkit-details-marker]:hidden">
              <ChevronDown
                className="mt-0.5 size-4 shrink-0 text-ma-muted transition-transform duration-200 ease-out group-open/ro:rotate-180"
                aria-hidden
              />
              <span className="min-w-0 text-[12px] font-medium leading-snug text-ma-ink/95">
                {item.highlight}
              </span>
            </summary>
            <p className={`mx-3 mb-3 ml-9 border-l-2 ${bar} pl-3 text-[12px] leading-relaxed text-ma-ink/88`}>
              {item.detail}
            </p>
          </details>
        </li>
      ))}
    </ul>
  )
}

/* ── financial primitives ── */

function SubSectionHeading({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2.5 pt-2">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-ma-line bg-ma-surface/70 text-ma-accent dark:bg-ma-charcoal/60">
        {icon}
      </span>
      <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ma-graphite">{title}</h3>
    </div>
  )
}

function KpiStrip({ items }: { items: Kpi[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((k) => (
        <div key={k.label} className={innerCard}>
          <QbrMutedLabel>{k.label}</QbrMutedLabel>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-ma-accent">
            {k.actual}
            <span className="ml-1 text-[13px] font-medium text-ma-muted">{k.unit}</span>
          </p>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-ma-muted">
              Budget <span className="font-mono font-semibold text-ma-ink">{k.budget}</span>
            </span>
            <VarianceBadge v={k.variance} />
          </div>
        </div>
      ))}
    </div>
  )
}

function BuTable({ rows, buName }: { rows: BuKpi[]; buName: string }) {
  return (
    <div className={innerCard}>
      <p className="text-[13px] font-semibold text-ma-ink">{buName}</p>
      <div className="mt-3 overflow-x-auto rounded-md border border-ma-line">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-ma-line bg-ma-surface/50 text-[10px] font-semibold uppercase tracking-wide text-ma-graphite">
              <th className="px-3 py-2">Metric</th>
              <th className="px-3 py-2">Q1 Actual</th>
              <th className="px-3 py-2">Q1 Budget</th>
              <th className="px-3 py-2">Q1 Var</th>
              <th className="px-3 py-2">FY Forecast</th>
              <th className="px-3 py-2">FY Budget</th>
              <th className="px-3 py-2">FY Var</th>
              <th className="px-3 py-2">Unit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.label} className={i % 2 === 0 ? 'bg-ma-elevated' : 'bg-ma-bg/50'}>
                <td className="px-3 py-2.5 font-medium text-ma-ink">{r.label}</td>
                <td className="px-3 py-2.5 font-mono font-semibold tabular-nums text-ma-accent">{r.q1Actual}</td>
                <td className="px-3 py-2.5 font-mono tabular-nums text-ma-ink/80">{r.q1Budget}</td>
                <td className="px-3 py-2.5"><VarianceBadge v={r.q1Var} /></td>
                <td className="px-3 py-2.5 font-mono font-semibold tabular-nums text-ma-accent">{r.fyForecast}</td>
                <td className="px-3 py-2.5 font-mono tabular-nums text-ma-ink/80">{r.fyBudget}</td>
                <td className="px-3 py-2.5"><VarianceBadge v={r.fyVar} /></td>
                <td className="px-3 py-2.5 text-[12px] text-ma-muted">{r.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CapexTable({ rows, buName }: { rows: CapexRow[]; buName: string }) {
  return (
    <div className={innerCard}>
      <p className="text-[13px] font-semibold text-ma-ink">{buName}</p>
      <div className="mt-3 overflow-x-auto rounded-md border border-ma-line">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-ma-line bg-ma-surface/50 text-[10px] font-semibold uppercase tracking-wide text-ma-graphite">
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Q1 Actual</th>
              <th className="px-3 py-2">Q1 Budget</th>
              <th className="px-3 py-2">Q1 Var</th>
              <th className="px-3 py-2">FY Forecast</th>
              <th className="px-3 py-2">FY Budget</th>
              <th className="px-3 py-2">FY Var</th>
              <th className="px-3 py-2">Unit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.label} className={i % 2 === 0 ? 'bg-ma-elevated' : 'bg-ma-bg/50'}>
                <td className="px-3 py-2.5 font-medium text-ma-ink">{r.label}</td>
                <td className="px-3 py-2.5 font-mono tabular-nums text-ma-ink">{r.q1Actual}</td>
                <td className="px-3 py-2.5 font-mono tabular-nums text-ma-ink/70">{r.q1Budget}</td>
                <td className="px-3 py-2.5 text-[12px] tabular-nums text-ma-ink/80">{r.q1Var}</td>
                <td className="px-3 py-2.5 font-mono font-semibold tabular-nums text-ma-accent">{r.fyForecast}</td>
                <td className="px-3 py-2.5 font-mono tabular-nums text-ma-ink/70">{r.fyBudget}</td>
                <td className="px-3 py-2.5 text-[12px] tabular-nums text-ma-ink/80">{r.fyVar}</td>
                <td className="px-3 py-2.5 text-[12px] text-ma-muted">{r.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Cash flow waterfall chart ── */

const CF_COLORS: Record<string, string> = {
  total: '#8B6914',
  subtotal: '#3B6B4A',
  positive: '#2A8C6A',
  negative: '#C03030',
  reference: '#9E9E9E',
}

type CfComputed = CfBar & { y0: number; y1: number; idx: number }

const CF_GROUPS: { key: 'operating' | 'investing' | 'financing'; label: string }[] = [
  { key: 'operating', label: 'Operating Activities' },
  { key: 'investing', label: 'Investing Activities' },
  { key: 'financing', label: 'Financing Activities' },
]

function CashFlowWaterfallChart({ bars }: { bars: CfBar[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const computed: CfComputed[] = []
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

  const maxVal = Math.max(...computed.map((c) => c.y1)) * 1.12
  const count = computed.length
  const W = 1000
  const H = 420
  const padL = 16
  const padR = 16
  const padT = 90
  const padB = 90
  const chartW = W - padL - padR
  const chartH = H - padT - padB
  const step = chartW / count
  const barW = Math.min(62, step * 0.58)
  function barX(i: number) { return padL + step * i + (step - barW) / 2 }
  function scaleY(v: number) { return padT + chartH - (v / maxVal) * chartH }

  const groupRanges = CF_GROUPS.map(({ key, label }) => {
    const indices = computed.map((b, i) => (b.group === key ? i : -1)).filter((i) => i >= 0)
    if (indices.length === 0) return null
    const first = indices[0]!
    const last = indices[indices.length - 1]!
    return { key, label, first, last }
  }).filter(Boolean) as { key: 'operating' | 'investing' | 'financing'; label: string; first: number; last: number }[]

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="Cash flow waterfall chart">
        <line x1={padL} x2={W - padR} y1={scaleY(0)} y2={scaleY(0)} stroke="var(--ma-line)" strokeWidth={0.5} />

        {groupRanges.map((g) => {
          const x1 = barX(g.first)
          const x2 = barX(g.last) + barW
          const bracketY = padT - 10
          const tickH = 5

          const groupBars = computed.filter((b) => b.group === g.key)
          const hasBullets = groupBars.some((b) => b.bullets && b.bullets.length > 0)

          return (
            <g key={g.key}>
              <line x1={x1} x2={x1} y1={bracketY} y2={bracketY + tickH} stroke="var(--ma-ink)" strokeWidth={0.6} opacity={0.4} />
              <line x1={x1} x2={x2} y1={bracketY} y2={bracketY} stroke="var(--ma-ink)" strokeWidth={0.6} opacity={0.4} />
              <line x1={x2} x2={x2} y1={bracketY} y2={bracketY + tickH} stroke="var(--ma-ink)" strokeWidth={0.6} opacity={0.4} />

              {hasBullets && groupBars.map((b) => {
                if (!b.bullets || b.bullets.length === 0) return null
                const bx = barX(b.idx) + barW / 2
                const startY = bracketY - 6 - (b.bullets.length - 1) * 10
                return (
                  <g key={b.idx}>
                    {b.bullets.map((bullet, bi) => (
                      <text
                        key={bi}
                        x={bx}
                        y={startY + bi * 10}
                        textAnchor="middle"
                        className="fill-[color:var(--ma-muted)]"
                        fontSize={7}
                      >
                        • {bullet}
                      </text>
                    ))}
                  </g>
                )
              })}
            </g>
          )
        })}

        {computed.map((bar, i) => {
          const x = barX(i)
          const yTop = scaleY(bar.y1)
          const yBot = scaleY(bar.y0)
          const barH = Math.max(yBot - yTop, 2)
          const isPos = bar.value >= 0
          const isHovered = hoveredIdx === i

          let fill: string
          if (bar.kind === 'reference') fill = CF_COLORS.reference
          else if (bar.kind === 'subtotal') fill = CF_COLORS.subtotal
          else if (bar.kind === 'total') fill = CF_COLORS.total
          else fill = isPos ? CF_COLORS.positive : CF_COLORS.negative

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
                fontSize={10}
                fontWeight={bar.kind === 'subtotal' || bar.kind === 'total' ? 700 : 600}
                fontFamily="ui-monospace,monospace"
              >
                {bar.kind === 'delta'
                  ? `${bar.value > 0 ? '+' : ''}${bar.value.toLocaleString()}`
                  : bar.value.toLocaleString()}
              </text>

              <text
                x={x + barW / 2}
                y={scaleY(0) + 14}
                textAnchor="middle"
                className="fill-[color:var(--ma-muted)]"
                fontSize={8}
                fontWeight={bar.kind === 'subtotal' || bar.kind === 'total' ? 700 : 500}
              >
                {bar.lines.map((line, li) => (
                  <tspan key={li} x={x + barW / 2} dy={li === 0 ? 0 : 11}>
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          )
        })}

        {groupRanges.map((g) => {
          const x1 = barX(g.first)
          const x2 = barX(g.last) + barW
          const cx = (x1 + x2) / 2
          const baseY = scaleY(0) + 52
          const totals = cashFlowGroupTotals[g.key]

          return (
            <g key={g.key}>
              <line x1={x1} x2={x2} y1={baseY} y2={baseY} stroke="var(--ma-ink)" strokeWidth={0.5} opacity={0.3} />
              <text x={cx} y={baseY + 12} textAnchor="middle" className="fill-[color:var(--ma-ink)]" fontSize={9} fontWeight={700}>
                {g.label}
              </text>
              <text x={x1} y={baseY + 25} textAnchor="start" className="fill-[color:var(--ma-muted)]" fontSize={8}>
                Forecast
              </text>
              <text x={x2} y={baseY + 25} textAnchor="end" className="fill-[color:var(--ma-ink)]" fontSize={8.5} fontWeight={600} fontFamily="ui-monospace,monospace">
                {totals.forecast}
              </text>
              <text x={x1} y={baseY + 36} textAnchor="start" className="fill-[color:var(--ma-muted)]" fontSize={8}>
                Budget (Rebase)
              </text>
              <text x={x2} y={baseY + 36} textAnchor="end" className="fill-[color:var(--ma-muted)]" fontSize={8.5} fontFamily="ui-monospace,monospace">
                {totals.budget}
              </text>
            </g>
          )
        })}
      </svg>

      {hoveredIdx != null && computed[hoveredIdx]?.bullets && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-md border border-ma-line bg-ma-elevated/95 px-3 py-2 shadow-lg backdrop-blur-sm">
          <p className="text-[11px] font-semibold text-ma-ink">{computed[hoveredIdx].label}</p>
          <div className="mt-1 space-y-0.5">
            {computed[hoveredIdx].bullets!.map((d) => (
              <p key={d} className="text-[10px] text-ma-muted">• {d}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── page ── */

export function Financials() {
  const ol = fyOutlook
  const narrative = useDomainNarrative('financials')
  const roPack = getDomainRiskOpportunityBullets('financials')
  const location = useLocation()
  const spineSectionsRef = useRef<HTMLDivElement>(null)

  const expandAllSpineSections = useCallback(() => {
    spineSectionsRef.current?.querySelectorAll(':scope > details').forEach((el) => {
      ;(el as HTMLDetailsElement).open = true
    })
  }, [])

  const collapseAllSpineDetails = useCallback(() => {
    spineSectionsRef.current?.querySelectorAll('details').forEach((el) => {
      el.open = false
    })
  }, [])

  useLayoutEffect(() => {
    collapseAllSpineDetails()
  }, [location.pathname, location.key, collapseAllSpineDetails])

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <header className="max-w-[52rem]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ma-muted">
          QBR Q2 2026 · Consolidated
        </p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-ma-ink md:text-[24px]">
          Financials
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ma-muted">
          All figures extracted from the NEOM Quarterly Business Review (Q2 2026, 12 June 2026).
          No values are inferred or estimated. Missing data is labeled explicitly.
        </p>
      </header>

      <div className="mb-3 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ma-muted">
            Executive spine
          </p>
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
            <button type="button" onClick={expandAllSpineSections} className={spineBtnSecondary}>
              Expand all
            </button>
            <button type="button" onClick={collapseAllSpineDetails} className={spineBtnSecondary}>
              Collapse all
            </button>
          </div>
        </div>
      </div>

      <div ref={spineSectionsRef} className="space-y-8">
      {/* ── SECTION 1: STRATEGIC OBJECTIVES ── */}
      <SectionShell
        slug="objectives"
        icon={<Compass className="size-[18px] stroke-[1.75]" aria-hidden />}
        title="Strategic objectives"
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ma-line/80 bg-ma-surface/40 px-2.5 py-1 text-[10px] font-medium text-ma-muted dark:bg-ma-charcoal/40">
            <RagDot color="green" size={7} />
            3 on track
            <span className="mx-0.5 text-ma-line">|</span>
            <RagDot color="amber" size={7} />
            1 watch
            <span className="mx-0.5 text-ma-line">|</span>
            <RagDot color="red" size={7} />
            1 at risk
          </span>
        }
      >
        <div className="space-y-6">
          <p className="max-w-prose text-[13px] leading-relaxed text-ma-ink/90">
            {narrative.strategicObjectivesIntro}
          </p>

          <MilestoneTimeline milestones={narrative.milestones} />
        </div>
      </SectionShell>

      {/* ── SECTION 2: FINANCIAL KPIs ── */}
      <SectionShell
        slug="performance"
        icon={<BarChart3 className="size-[18px] stroke-[1.75]" aria-hidden />}
        title="Financial KPIs"
        badge={
          <span className="inline-flex items-center gap-1 rounded-full border border-ma-teal/30 bg-ma-teal/8 px-2.5 py-1 text-[10px] font-semibold text-ma-teal">
            EBITDA $3,204M Q1 · $15,922M FY
          </span>
        }
      >
        <div className="space-y-8">
          {/* Group financial performance */}
          <div className="space-y-4">
            <SubSectionHeading
              icon={<DollarSign className="size-3.5 stroke-[1.75]" />}
              title="Group financial performance"
            />
            <QbrMutedLabel>Q2 2026 — Actual vs Budget</QbrMutedLabel>
            <KpiStrip items={groupQ1} />
            <QbrMutedLabel>Full Year 2026 — Forecast vs Budget</QbrMutedLabel>
            <KpiStrip items={groupFY} />

            <div className={innerCard}>
              <QbrMutedLabel>BU contribution to EBITDA variance ($871M increase vs budget)</QbrMutedLabel>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {ol.buContribution.map((b) => {
                  const neg = b.impact.startsWith('-')
                  return (
                    <div
                      key={b.bu}
                      className={`rounded-md border px-4 py-3 ${neg ? 'border-ma-risk/25 bg-ma-risk/[0.04]' : 'border-ma-teal/25 bg-ma-teal/[0.04]'}`}
                    >
                      <p className="text-[12px] font-semibold text-ma-ink">{b.bu}</p>
                      <p className={`mt-1 font-mono text-lg font-bold tabular-nums ${neg ? 'text-ma-risk' : 'text-ma-teal'}`}>
                        {b.impact}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* EBITDA bridge */}
          <div className="space-y-3">
            <SubSectionHeading
              icon={<BarChart3 className="size-3.5 stroke-[1.75]" />}
              title="EBITDA bridge (Q1)"
            />
            <div className={innerCard}>
              <div className="mb-3 flex items-center justify-between">
                <QbrMutedLabel>Q2 2026 EBITDA waterfall ($M)</QbrMutedLabel>
                <VarianceBadge v="-8%" />
              </div>
              <EbitdaWaterfallChart bars={q1EbitdaWaterfall} />
              <details className="group/bridge mt-4">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-[11px] font-semibold text-ma-muted [&::-webkit-details-marker]:hidden">
                  <ChevronDown className="size-3.5 transition-transform duration-200 group-open/bridge:rotate-180" aria-hidden />
                  View detailed breakdown
                </summary>
                <div className="mt-3">
                  <WaterfallBridge items={q1EbitdaBridge} unit="$M" />
                </div>
              </details>
            </div>
          </div>

          {/* Cash flow bridge */}
          <div className="space-y-3">
            <SubSectionHeading
              icon={<Wallet className="size-3.5 stroke-[1.75]" />}
              title="Cash flow bridge"
            />
            <div className={innerCard}>
              <QbrMutedLabel>Cashflow — key variations, $M</QbrMutedLabel>
              <div className="mt-3">
                <CashFlowWaterfallChart bars={cashFlowWaterfall} />
              </div>
              <details className="group/cftext mt-4">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-[11px] font-semibold text-ma-muted [&::-webkit-details-marker]:hidden">
                  <ChevronDown className="size-3.5 transition-transform duration-200 group-open/cftext:rotate-180" aria-hidden />
                  View detailed breakdown
                </summary>
                <div className="mt-3">
                  <WaterfallBridge items={cashFlowBridge} unit="$M" />
                </div>
              </details>
            </div>
          </div>

          {/* BU financial snapshot */}
          <div className="space-y-3">
            <SubSectionHeading
              icon={<Factory className="size-3.5 stroke-[1.75]" />}
              title="Business unit financial snapshot"
            />
            <BuTable rows={phosphateBu} buName="Urban Development & Smart Communities" />
            <BuTable rows={aluminiumBu} buName="Special Economic Zone & Investment Platform" />
            <BuTable rows={bmnmBu} buName="Luxury Tourism & Hospitality" />
          </div>

          {/* CAPEX */}
          <div className="space-y-3">
            <SubSectionHeading
              icon={<Landmark className="size-3.5 stroke-[1.75]" />}
              title="CAPEX"
            />
            <CapexTable rows={consolidatedCapex} buName="Consolidated" />
            <CapexTable rows={phosphateCapex} buName="Urban Development & Smart Communities" />
            <CapexTable rows={aluminiumCapex} buName="Special Economic Zone & Investment Platform" />
            <CapexTable rows={bmnmCapex} buName="Luxury Tourism & Hospitality" />
          </div>
        </div>
      </SectionShell>

      {/* ── SECTION 3: RISK ── */}
      <SectionShell
        slug="risk"
        icon={<AlertTriangle className="size-[18px] stroke-[1.75]" aria-hidden />}
        title="Risk"
        badge={
          <span className="inline-flex items-center gap-1 rounded-full border border-ma-risk/30 bg-ma-risk/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ma-risk">
            High
          </span>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-ma-risk/35 bg-ma-risk/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ma-risk">
              High
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-ma-muted">
              {roPack.risks.length} themes
            </span>
          </div>
          <RiskBulletList items={roPack.risks} variant="risk" />
          <p className="mt-4 rounded-sm border border-ma-line/80 bg-ma-surface/40 px-2.5 py-2 text-[10px] leading-snug text-ma-muted dark:bg-ma-charcoal/50">
            {SPINE_AI_DISCLAIMER}
          </p>
        </div>
      </SectionShell>

      {/* ── SECTION 4: OPPORTUNITY ── */}
      <SectionShell
        slug="opportunity"
        icon={<Sparkles className="size-[18px] stroke-[1.75]" aria-hidden />}
        title="Opportunity"
        badge={
          <span className="inline-flex items-center gap-1 rounded-full border border-ma-accent/30 bg-ma-accent/8 px-2.5 py-1 text-[10px] font-semibold text-ma-accent">
            {roPack.opportunities.length} themes
          </span>
        }
      >
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ma-muted">
            {roPack.opportunities.length} themes
          </p>
          <RiskBulletList items={roPack.opportunities} variant="opportunity" />
          <p className="mt-4 rounded-sm border border-ma-line/80 bg-ma-surface/40 px-2.5 py-2 text-[10px] leading-snug text-ma-muted dark:bg-ma-charcoal/50">
            {SPINE_AI_DISCLAIMER}
          </p>
        </div>
      </SectionShell>
      </div>
    </div>
  )
}
