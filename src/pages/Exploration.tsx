import { useMemo, useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useDomainNarrative, useExplorationData } from '../data'
import { GaugeChart } from '../components/GaugeChart'
import { RagDot } from '../components/RagDot'
import { buildExplorationKpiRows } from '../lib/domainKpiRows'
import { getDomainRiskOpportunityBullets } from '../data/domainRiskOpportunityBullets'
import {
  AlertTriangle,
  ChevronDown,
  Compass,
  Gauge,
  Gem,
  Sparkles,
} from 'lucide-react'

/* ── shared styles ── */

const card =
  'rounded-lg border border-ma-line bg-ma-elevated shadow-[0_2px_8px_rgba(15,18,16,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.25)]'

const sectionAccent: Record<string, string> = {
  objectives: 'border-t-[3px] border-t-ma-accent/55',
  kpis: 'border-t-[3px] border-t-ma-teal/50',
  risk: 'border-t-[3px] border-t-ma-risk/50',
  opportunity: 'border-t-[3px] border-t-ma-accent/60',
}

const SPINE_AI_DISCLAIMER = 'AI generated and tentative'

/* ── helper components ── */

function SectionShell({
  slug,
  icon,
  title,
  badge,
  children,
  defaultOpen = false,
}: {
  slug: string
  icon: React.ReactNode
  title: string
  badge?: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  return (
    <details
      className={`group/sec ${card} ${sectionAccent[slug] ?? ''} overflow-hidden open:[&_.sec-chevron]:rotate-180`}
      open={defaultOpen}
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

function KpiRow({
  label,
  value,
  target,
  status,
  children,
}: {
  label: string
  value: string
  target: string
  status: 'on_track' | 'at_risk' | 'neutral'
  children?: React.ReactNode
}) {
  const ragColor = status === 'on_track' ? 'green' : status === 'at_risk' ? 'amber' : 'gray'
  const barW = status === 'on_track' ? 'w-[88%]' : status === 'at_risk' ? 'w-[36%]' : 'w-[58%]'
  const barC = status === 'on_track' ? 'bg-ma-teal/80' : status === 'at_risk' ? 'bg-ma-amber-warn/85' : 'bg-ma-accent/70'
  return (
    <div className="rounded-md border border-ma-line/80 bg-ma-surface/25 px-4 py-3 dark:bg-ma-charcoal/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-snug text-ma-ink">{label}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-ma-muted">Current</p>
              <p className="font-mono text-[15px] font-bold tabular-nums text-ma-accent">{value}</p>
            </div>
            <div className="max-w-[16rem]">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-ma-muted">Target</p>
              <p className="text-[12px] leading-snug text-ma-muted">{target}</p>
            </div>
          </div>
          <div className="mt-2 h-1 w-full max-w-[10rem] overflow-hidden rounded-full bg-ma-line/60">
            <div className={`h-full rounded-full ${barW} ${barC}`} />
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-ma-line/80 bg-ma-elevated/80 px-2.5 py-1">
          <RagDot color={ragColor as 'green' | 'amber' | 'gray'} size={9} />
          <span className="text-[11px] font-medium capitalize text-ma-muted">{status.replace('_', ' ')}</span>
        </div>
      </div>
      {children && <div className="mt-3 border-t border-ma-line/60 pt-3">{children}</div>}
    </div>
  )
}

function RiskBulletList({ items, variant }: { items: { highlight: string; detail: string }[]; variant: 'risk' | 'opportunity' }) {
  const bar = variant === 'risk' ? 'border-ma-risk/40' : 'border-ma-accent/45'
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i}>
          <details className="group/ro rounded-md border border-ma-line/80 bg-ma-surface/25 open:border-ma-line open:bg-ma-surface/40 dark:bg-ma-charcoal/25 dark:open:bg-ma-charcoal/40">
            <summary className="flex cursor-pointer list-none items-start gap-2 px-3 py-2.5 text-left [&::-webkit-details-marker]:hidden">
              <ChevronDown className="mt-0.5 size-4 shrink-0 text-ma-muted transition-transform duration-200 group-open/ro:rotate-180" aria-hidden />
              <span className="min-w-0 text-[12px] font-medium leading-snug text-ma-ink/95">{item.highlight}</span>
            </summary>
            <p className={`mx-3 mb-3 ml-9 border-l-2 ${bar} pl-3 text-[12px] leading-relaxed text-ma-ink/88`}>{item.detail}</p>
          </details>
        </li>
      ))}
    </ul>
  )
}

function MilestoneTimeline({ milestones }: { milestones: { title: string; whereWeStand: string }[] }) {
  return (
    <ol className="space-y-0 pl-0">
      {milestones.map((m, i) => (
        <li key={m.title} className="relative flex gap-3 pb-5 last:pb-0 sm:gap-4">
          <div className="relative flex shrink-0 flex-col items-center pt-0.5">
            <span className="relative z-[1] flex size-7 items-center justify-center rounded-full border-2 border-ma-accent/50 bg-ma-elevated text-[10px] font-bold tabular-nums text-ma-accent shadow-sm">
              {i + 1}
            </span>
            {i < milestones.length - 1 && (
              <span className="absolute left-1/2 top-7 h-[calc(100%-0.25rem)] w-px -translate-x-1/2 bg-gradient-to-b from-ma-accent/45 to-ma-line" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1 rounded-md border border-ma-line/90 bg-ma-surface/35 px-3 py-2.5 dark:bg-ma-charcoal/40">
            <p className="text-[12px] font-semibold leading-snug text-ma-ink">{m.title}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-ma-muted">{m.whereWeStand}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

/* ── page ── */

export function Exploration() {
  const ex = useExplorationData()
  const narrative = useDomainNarrative('exploration')
  const kpis = useMemo(() => buildExplorationKpiRows(narrative, ex), [narrative, ex])
  const roPack = getDomainRiskOpportunityBullets('exploration')
  const [showAllDeposits, setShowAllDeposits] = useState(false)

  const keysMax = ex.hospitalityKeysTarget.max
  const keysPct = Math.min(100, (ex.hospitalityKeysTarget.ytdActual / keysMax) * 100)

  const deposits = [...ex.hospitalitySites].sort((a, b) => a.cluster.localeCompare(b.cluster) || a.name.localeCompare(b.name))
  const visibleDeposits = showAllDeposits ? deposits : deposits.slice(0, 5)

  const drill = ex.drillingProgress.map((d) => ({
    ...d,
    pct: d.plannedMeters > 0 ? (d.actualMeters / d.plannedMeters) * 100 : 0,
  }))

  const atRiskKpis = kpis.filter((k) => k.status === 'at_risk').length
  const onTrackKpis = kpis.filter((k) => k.status === 'on_track').length

  return (
    <div className="space-y-8 pb-8">
      {/* ── Header ── */}
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ma-muted">
          Focus · Scale and accelerate
        </p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-ma-ink md:text-[24px]">
          Development Pipeline
        </h1>
        <p className="mt-2 max-w-[48rem] text-[13px] leading-relaxed text-ma-muted">
          {narrative.strategicObjectivesIntro}
        </p>
      </header>

      {/* ── 1. Strategic Objectives ── */}
      <SectionShell
        slug="objectives"
        icon={<Compass className="size-[17px] stroke-[1.75]" />}
        title="Strategic objectives"
        badge={
          <span className="rounded-full border border-ma-line/80 bg-ma-surface/40 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-ma-muted">
            {narrative.milestones.length} milestones
          </span>
        }
      >
        <MilestoneTimeline milestones={narrative.milestones} />
      </SectionShell>

      {/* ── 2. Business KPIs (with embedded visuals) ── */}
      <SectionShell
        slug="kpis"
        icon={<Gauge className="size-[17px] stroke-[1.75]" />}
        title="Business KPIs"
        badge={
          <div className="flex gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full border border-ma-line/90 bg-ma-surface/40 px-2 py-0.5 text-[10px] font-medium text-ma-muted">
              <span className="tabular-nums text-ma-ink">{onTrackKpis}</span> on track
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-ma-amber-warn/30 bg-ma-amber-warn/10 px-2 py-0.5 text-[10px] font-medium text-ma-amber-warn">
              <span className="tabular-nums font-semibold">{atRiskKpis}</span> at risk
            </span>
          </div>
        }
      >
        <div className="space-y-4">
          {/* KPI 1 — Territorial license (enriched) */}
          <KpiRow
            label={kpis[0]?.label ?? 'Land parcel readiness'}
            value={kpis[0]?.value ?? '—'}
            target={kpis[0]?.target ?? '—'}
            status={kpis[0]?.status ?? 'neutral'}
          >
            <div className="space-y-4">
              {/* Parcel readiness breakdown */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-md border border-ma-line/80 bg-ma-bg/40 px-4 py-3">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-ma-muted">Approved</p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-ma-teal">32</p>
                  <p className="mt-0.5 text-[10px] text-ma-muted">Development-ready parcels</p>
                </div>
                <div className="rounded-md border border-ma-line/80 bg-ma-bg/40 px-4 py-3">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-ma-muted">Under review</p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-ma-amber-warn">48</p>
                  <p className="mt-0.5 text-[10px] text-ma-muted">Pending masterplan approval</p>
                </div>
                <div className="rounded-md border border-ma-line/80 bg-ma-bg/40 px-4 py-3">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-ma-muted">Land readiness</p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-ma-accent">40%</p>
                  <p className="mt-0.5 text-[10px] text-ma-muted">Of total planned development area</p>
                </div>
              </div>

              {/* Coverage bar */}
              <div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-semibold text-ma-graphite">Land readiness coverage</span>
                  <span className="font-mono font-semibold text-ma-ink">32 of 80 parcels (40%)</span>
                </div>
                <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-ma-line/40">
                  <div className="flex h-full">
                    <div className="h-full w-[40%] rounded-l-full bg-ma-teal/80" />
                    <div className="h-full w-[20%] bg-ma-amber-warn/50" />
                  </div>
                </div>
                <div className="mt-1 flex justify-between text-[9px] text-ma-muted">
                  <div className="flex gap-3">
                    <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-ma-teal/80" /> Approved</span>
                    <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-ma-amber-warn/50" /> In progress</span>
                    <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-ma-line/40" /> Pending</span>
                  </div>
                  <span>80 total</span>
                </div>
              </div>

              {/* Lead time trend */}
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ma-graphite">Average permitting lead time (months)</p>
                <div className="flex items-end gap-3">
                  {[
                    { period: '2023', months: 22, color: 'bg-ma-line/60' },
                    { period: '2024', months: 18, color: 'bg-ma-amber-warn/60' },
                    { period: 'Q2 2026', months: 13, color: 'bg-ma-teal/70' },
                    { period: 'Target', months: 12, color: 'bg-ma-accent/50 border border-dashed border-ma-accent/60' },
                  ].map((d) => (
                    <div key={d.period} className="flex flex-1 flex-col items-center gap-1">
                      <span className="font-mono text-[11px] font-bold text-ma-ink">{d.months}</span>
                      <div className={`w-full rounded-t-sm ${d.color}`} style={{ height: `${(d.months / 24) * 64}px` }} />
                      <span className="text-[9px] text-ma-muted">{d.period}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Digital Infrastructure & AI permit blockers */}
              <div className="rounded-md border border-dashed border-ma-amber-warn/40 bg-ma-amber-warn/[0.04] px-4 py-3">
                <p className="text-[11px] font-semibold text-ma-amber-warn">Digital Infrastructure & AI permit blockers</p>
                <p className="mt-1 text-[11px] leading-relaxed text-ma-ink/80">
                  4 critical Digital Infrastructure & AI permits delayed — Tonomus Cognitive Platform, NEOM Data Center, 5G & IoT Network, Edge Compute Cluster.
                  Not yet through masterplan approval; funding decision not finalized. Government sprint required to unblock.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {['Tonomus Cognitive Platform', 'NEOM Data Center', '5G & IoT Network', 'Edge Compute Cluster'].map((name) => (
                    <span key={name} className="rounded-full border border-ma-amber-warn/30 bg-ma-amber-warn/10 px-2 py-0.5 text-[10px] font-medium text-ma-amber-warn">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </KpiRow>

          {/* KPI 2 — Mobilization with construction GFA chart */}
          <KpiRow
            label={kpis[1]?.label ?? 'Mobilization — construction GFA'}
            value={kpis[1]?.value ?? '—'}
            target={kpis[1]?.target ?? '—'}
            status={kpis[1]?.status ?? 'neutral'}
          >
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ma-graphite">
                Construction progress by programme
              </p>
              <div className="h-56 w-full rounded-md border border-ma-line bg-ma-bg/50 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={drill} layout="vertical" margin={{ left: 110, right: 16 }}>
                    <XAxis type="number" tick={{ fill: '#888', fontSize: 10 }} />
                    <YAxis type="category" dataKey="program" width={100} tick={{ fill: '#AAA', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ background: 'var(--ma-elevated)', border: '1px solid var(--ma-line)', fontSize: 11 }}
                      formatter={(v, name, props) => {
                        const n = typeof v === 'number' ? v : Number(v)
                        const label = name === 'plannedMeters' ? 'Planned' : 'Actual'
                        const entry = props?.payload as { pct?: number } | undefined
                        const pct = entry?.pct
                        const suffix = name === 'actualMeters' && pct != null ? ` (${pct.toFixed(0)}%)` : ''
                        return [`${n.toLocaleString()} m²${suffix}`, label]
                      }}
                    />
                    <Bar dataKey="plannedMeters" fill="#333333" fillOpacity={0.3} stroke="#555" strokeWidth={1} radius={[0, 3, 3, 0]} barSize={12} />
                    <Bar dataKey="actualMeters" fill="#b8956a" radius={[0, 3, 3, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-ma-muted">
                {drill.map((d) => (
                  <span key={d.program}>
                    <span className="font-medium text-ma-ink">{d.program}</span>{' '}
                    <span className="font-mono text-ma-accent">{d.actualMeters.toLocaleString()}</span>/{d.plannedMeters.toLocaleString()}m² ({d.pct.toFixed(0)}%)
                  </span>
                ))}
              </div>
            </div>
          </KpiRow>

          {/* KPI 3 — Development investment (enriched) */}
          <KpiRow
            label={kpis[2]?.label ?? 'Development — committed investment'}
            value={kpis[2]?.value ?? '—'}
            target={kpis[2]?.target ?? '—'}
            status={kpis[2]?.status ?? 'neutral'}
          >
            <div className="space-y-4">
              {/* Three development sub-KPIs */}
              <div className="grid gap-4 sm:grid-cols-3">
                {/* Cost of development */}
                <div className="rounded-md border border-ma-line/80 bg-ma-bg/40 px-4 py-3">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-ma-muted">Cost of development (SAR/m²)</p>
                  <p className="mt-1 font-mono text-xl font-bold tabular-nums text-ma-muted">To be established</p>
                  <p className="mt-1 text-[10px] text-ma-muted">Not currently tracked — recommend adding</p>
                  <div className="mt-2 rounded border border-dashed border-ma-amber-warn/30 bg-ma-amber-warn/[0.04] px-2 py-1.5">
                    <p className="text-[9px] font-medium text-ma-amber-warn">Undefined — needs benchmark definition</p>
                  </div>
                </div>

                {/* Annual development investment */}
                <div className="rounded-md border border-ma-line/80 bg-ma-bg/40 px-4 py-3">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-ma-muted">Annual development spend</p>
                  <p className="mt-1 font-mono text-xl font-bold tabular-nums text-ma-teal">~SAR 1.5Bn</p>
                  <p className="mt-1 text-[10px] text-ma-muted">On track vs. SAR 1.5Bn plan</p>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[9px] text-ma-muted">
                      <span>YTD spend</span>
                      <span className="font-mono font-semibold text-ma-ink">SAR 375M (Q1)</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-ma-line/40">
                      <div className="h-full w-[25%] rounded-full bg-ma-teal/70" />
                    </div>
                    <div className="mt-0.5 flex justify-between text-[8px] text-ma-muted">
                      <span>0</span>
                      <span>SAR 1.5Bn</span>
                    </div>
                  </div>
                </div>

                {/* New investment leads */}
                <div className="rounded-md border border-ma-line/80 bg-ma-bg/40 px-4 py-3">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-ma-muted">New investment leads</p>
                  <p className="mt-1 font-mono text-xl font-bold tabular-nums text-ma-accent">2,170</p>
                  <p className="mt-1 text-[10px] text-ma-muted">Cumulative pipeline leads</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex justify-between text-[9px] text-ma-muted">
                        <span>Early pipeline</span>
                        <span className="font-mono text-ma-ink">69.7%</span>
                      </div>
                      <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-ma-line/40">
                        <div className="h-full w-[70%] rounded-full bg-ma-accent/60" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Development cycle time */}
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ma-graphite">
                  Development cycle time — permit award to delivery
                </p>
                <div className="flex items-end gap-3">
                  {[
                    { stage: 'Permit\napproval', months: 13, color: 'bg-ma-teal/70', label: '13 mo' },
                    { stage: 'Concept\ndesign', months: 8, color: 'bg-ma-accent/60', label: '~8 mo' },
                    { stage: 'Groundworks', months: 12, color: 'bg-ma-amber-warn/60', label: '~12 mo' },
                    { stage: 'Masterplan\nsign-off', months: 18, color: 'bg-ma-line/60', label: '~18 mo' },
                  ].map((d) => (
                    <div key={d.stage} className="flex flex-1 flex-col items-center gap-1">
                      <span className="font-mono text-[10px] font-bold text-ma-ink">{d.label}</span>
                      <div className={`w-full rounded-t-sm ${d.color}`} style={{ height: `${(d.months / 20) * 56}px` }} />
                      <span className="whitespace-pre-line text-center text-[8px] leading-tight text-ma-muted">{d.stage}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-ma-muted">
                  Full cycle time not yet tracked in source documents. Permit lead time improved from 18 → 13 months.
                  Recommend tracking end-to-end cycle as a formal KPI.
                </p>
              </div>

              {/* Investment by sector */}
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ma-graphite">
                  Investment by sector (estimated)
                </p>
                <div className="space-y-2">
                  {[
                    { commodity: 'Luxury Tourism & Hospitality', pct: 52, spend: '~SAR 780M', color: 'bg-[#1ba37e]/80' },
                    { commodity: 'Clean Energy & Green Industry', pct: 22, spend: '~SAR 330M', color: 'bg-[#3a7ca5]/70' },
                    { commodity: 'Digital Infrastructure & AI', pct: 14, spend: '~SAR 210M', color: 'bg-[#7a5cc4]/70' },
                    { commodity: 'Urban Development & Smart Communities', pct: 12, spend: '~SAR 180M', color: 'bg-[#0a8f9c]/70' },
                  ].map((c) => (
                    <div key={c.commodity} className="flex items-center gap-3">
                      <span className="w-24 text-[10px] font-medium text-ma-ink">{c.commodity}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-ma-line/30">
                        <div className={`h-full rounded-full ${c.color}`} style={{ width: `${c.pct}%` }} />
                      </div>
                      <span className="w-20 text-right font-mono text-[10px] font-semibold text-ma-ink">{c.spend}</span>
                      <span className="w-8 text-right font-mono text-[10px] text-ma-muted">{c.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </KpiRow>

          {/* KPI 4 — Capacity by sector with gauges + assets */}
          <KpiRow
            label={kpis[3]?.label ?? 'Capacity by sector'}
            value={kpis[3]?.value ?? '—'}
            target={kpis[3]?.target ?? '—'}
            status={kpis[3]?.status ?? 'neutral'}
          >
            <div className="space-y-4">
              {/* capacity gauges */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-4 rounded-md border border-ma-line/80 bg-ma-bg/40 px-4 py-3">
                  <GaugeChart variant="ring" value={keysPct} min={0} max={100} size={100} strokeWidth={10} label="" formatValue={(v) => `${v.toFixed(0)}%`} />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-ma-muted">Luxury Tourism & Hospitality YTD</p>
                    <p className="font-mono text-2xl font-bold text-ma-accent">{ex.hospitalityKeysTarget.ytdActual}k keys</p>
                    <p className="text-[11px] text-ma-muted">of {ex.hospitalityKeysTarget.min}–{ex.hospitalityKeysTarget.max} {ex.hospitalityKeysTarget.unit} target</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-md border border-ma-line/80 bg-ma-bg/40 px-4 py-3">
                  <GaugeChart variant="ring" value={0} min={0} max={100} size={100} strokeWidth={10} label="" formatValue={() => '0%'} />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-ma-muted">Clean Energy & Green Industry YTD</p>
                    <p className="font-mono text-2xl font-bold text-ma-accent">{ex.copperTarget.ytdActual} MW</p>
                    <p className="text-[11px] text-ma-muted">of {ex.copperTarget.min}–{ex.copperTarget.max} {ex.copperTarget.unit} target</p>
                  </div>
                </div>
              </div>

              {/* tourism asset table */}
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ma-graphite">
                  <Gem className="mr-1.5 inline size-3.5 text-ma-accent" aria-hidden />
                  Luxury Tourism & Hospitality asset register
                </p>
                <div className="overflow-x-auto rounded-md border border-ma-line">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="bg-ma-surface/60 text-[10px] uppercase tracking-wide text-ma-graphite">
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Cluster</th>
                        <th className="px-3 py-2 text-right">Keys (target)</th>
                        <th className="px-3 py-2">Expected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleDeposits.map((d, i) => (
                        <tr key={d.name} className={i % 2 === 0 ? 'bg-ma-elevated' : 'bg-ma-bg/50'}>
                          <td className="px-3 py-2 font-medium text-ma-ink">{d.name}</td>
                          <td className="px-3 py-2 text-ma-ink/80">{d.cluster}</td>
                          <td className="px-3 py-2 text-right font-mono text-ma-accent">{d.targetMoz}</td>
                          <td className="px-3 py-2 text-ma-muted">{d.expectedDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {deposits.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllDeposits((p) => !p)}
                    className="mt-2 text-[11px] font-semibold text-ma-accent hover:underline"
                  >
                    {showAllDeposits ? 'Show less' : `Show all ${deposits.length} assets`}
                  </button>
                )}
              </div>
            </div>
          </KpiRow>

          {/* KPI 5 — Pipeline replenishment */}
          <KpiRow
            label={kpis[4]?.label ?? 'Pipeline replenishment by sector'}
            value={kpis[4]?.value ?? '—'}
            target={kpis[4]?.target ?? '—'}
            status={kpis[4]?.status ?? 'neutral'}
          >
            <div className="rounded-md border border-dashed border-ma-line bg-ma-surface/30 px-4 py-3 dark:bg-ma-charcoal/20">
              <p className="text-[11px] leading-relaxed text-ma-ink/80">
                <span className="font-semibold">Pipeline replenishment</span> measures whether newly committed investment (SAR, GFA m²) keeps pace with
                annual capital deployed across delivered assets — a ratio above 1.0× means the development pipeline is growing, below 1.0× means
                it is shrinking. This KPI is critical for long-term giga-project momentum and should be tracked per sector
                (Luxury Tourism & Hospitality, Clean Energy & Green Industry, Digital Infrastructure & AI) against annual delivery and investment conversion rates.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {[
                  { commodity: 'Luxury Tourism & Hospitality', ratio: '—', note: 'Requires annual delivery data' },
                  { commodity: 'Clean Energy & Green Industry', ratio: '—', note: 'No delivered base yet' },
                  { commodity: 'Digital Infrastructure & AI', ratio: '—', note: 'Pre-delivery stage' },
                ].map((c) => (
                  <div key={c.commodity} className="rounded border border-ma-line/60 bg-ma-bg/30 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-ma-muted">{c.commodity}</p>
                    <p className="mt-1 font-mono text-lg font-bold text-ma-muted">{c.ratio}</p>
                    <p className="mt-0.5 text-[9px] text-ma-muted">{c.note}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[10px] text-ma-amber-warn">
                Action required: define pipeline replenishment formula, data sources, and annual targets per sector to activate this KPI.
              </p>
            </div>
          </KpiRow>
        </div>
      </SectionShell>

      {/* ── 3. Risk ── */}
      <SectionShell
        slug="risk"
        icon={<AlertTriangle className="size-[17px] stroke-[1.75]" />}
        title="Risk"
        badge={
          <span className="inline-flex items-center rounded-full border border-ma-risk/30 bg-ma-risk/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ma-risk">
            {roPack.risks.length} themes
          </span>
        }
      >
        <RiskBulletList items={roPack.risks} variant="risk" />
        <p className="mt-4 rounded-sm border border-ma-line/80 bg-ma-surface/40 px-2.5 py-2 text-[10px] leading-snug text-ma-muted dark:bg-ma-charcoal/50">
          {SPINE_AI_DISCLAIMER}
        </p>
      </SectionShell>

      {/* ── 4. Opportunity ── */}
      <SectionShell
        slug="opportunity"
        icon={<Sparkles className="size-[17px] stroke-[1.75]" />}
        title="Opportunity"
        badge={
          <span className="inline-flex items-center rounded-full border border-ma-accent/40 bg-ma-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ma-accent">
            {roPack.opportunities.length} themes
          </span>
        }
      >
        <RiskBulletList items={roPack.opportunities} variant="opportunity" />
        <p className="mt-4 rounded-sm border border-ma-line/80 bg-ma-surface/40 px-2.5 py-2 text-[10px] leading-snug text-ma-muted dark:bg-ma-charcoal/50">
          {SPINE_AI_DISCLAIMER}
        </p>
      </SectionShell>
    </div>
  )
}
