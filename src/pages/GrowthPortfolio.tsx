import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Compass,
  Gauge,
  PanelRight,
  Sparkles,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import type { Project } from '../data/types'
import {
  getGrowthProjectDetailStatic,
  useDomainNarrative,
  useGrowthProjectDetail,
  usePortfolioData,
} from '../data'
import { GrowthProjectDetailPanel } from '../components/GrowthProjectDetailPanel'
import { RagDot } from '../components/RagDot'
import { buildPortfolioKpiRows } from '../lib/domainKpiRows'
import { formatNumber } from '../lib/format'
import { projectStatusCounts, weightedProgressKpi } from '../lib/portfolioMath'
import { useCeoIntelligence } from '../intelligence/CeoIntelligenceContext'
import { reportPortfolioBuFilterForChat } from '../intelligence/portfolioBuReporter'
import { getDomainRiskOpportunityBullets } from '../data/domainRiskOpportunityBullets'

/* ── constants ── */

const BUS = [
  'All',
  'Clean Energy & Green Industry',
  'Digital Infrastructure & AI',
  'Luxury Tourism & Hospitality',
  'Urban Development & Smart Communities',
  'Special Economic Zone & Investment Platform',
] as const
const STATUSES = ['All', 'On Track', 'At Risk', 'Delayed'] as const

const BU_COLOR: Record<string, string> = {
  'Clean Energy & Green Industry': '#48cae4',
  'Digital Infrastructure & AI': '#7c6fd6',
  'Luxury Tourism & Hospitality': '#2ec4b6',
  'Urban Development & Smart Communities': '#e8a598',
  'Special Economic Zone & Investment Platform': '#adb5bd',
}

const card =
  'rounded-lg border border-ma-line bg-ma-elevated shadow-[0_2px_8px_rgba(15,18,16,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.25)]'

const sectionAccent: Record<string, string> = {
  objectives: 'border-t-[3px] border-t-ma-accent/55',
  kpis: 'border-t-[3px] border-t-ma-teal/50',
  risk: 'border-t-[3px] border-t-ma-risk/50',
  opportunity: 'border-t-[3px] border-t-ma-accent/60',
}

/* ── helper functions ── */

function progressColor(v: number) {
  if (v <= 1.0) return 'text-ma-teal'
  if (v <= 1.05) return 'text-ma-accent'
  if (v <= 1.1) return 'text-ma-amber-warn'
  return 'text-ma-risk'
}

function ganttRow(p: Project, index: number) {
  const base = (index * 3) % 18
  const dur = p.stage.includes('Construction') ? 14 : p.stage.includes('BFS') ? 10 : 8
  return { id: p.id, name: p.name, bu: p.bu, start: base, duration: dur, fill: BU_COLOR[p.bu] ?? '#888888' }
}

const TOTAL_Q = 28

type SortKey = 'status' | 'name' | 'stage' | 'progressKpi' | 'cpi' | 'spi' | 'capex' | 'milestone' | 'blocker'

/* ── shared UI components ── */

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
    <details className={`group/sec ${card} ${sectionAccent[slug] ?? ''} overflow-hidden open:[&_.sec-chevron]:rotate-180`} open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 transition-colors hover:bg-ma-surface/40 dark:hover:bg-ma-charcoal/30 [&::-webkit-details-marker]:hidden">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-ma-line bg-ma-surface/80 text-ma-accent dark:bg-ma-charcoal/80">
          {icon}
        </span>
        <h2 className="min-w-0 flex-1 text-[13px] font-semibold uppercase tracking-[0.12em] text-ma-graphite">{title}</h2>
        {badge}
        <ChevronDown className="sec-chevron size-4 shrink-0 text-ma-muted transition-transform duration-200" aria-hidden />
      </summary>
      <div className="border-t border-ma-line/70 px-5 pb-5 pt-4">{children}</div>
    </details>
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

/* ── page ── */

export function GrowthPortfolio() {
  const projects = usePortfolioData()
  const [searchParams, setSearchParams] = useSearchParams()
  const { openChat } = useCeoIntelligence()
  const urlHandledRef = useRef<string | null>(null)
  const narrative = useDomainNarrative('portfolio')
  const spineKpis = useMemo(() => buildPortfolioKpiRows(narrative, projects), [narrative, projects])
  const roPack = getDomainRiskOpportunityBullets('portfolio')

  const [bu, setBu] = useState<(typeof BUS)[number]>('All')
  const [st, setSt] = useState<(typeof STATUSES)[number]>('All')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (bu !== 'All' && p.bu !== bu) return false
      if (st === 'On Track') return p.status === 'on_track'
      if (st === 'At Risk') return p.status === 'potential_delay' && p.progressKpi <= 1.05
      if (st === 'Delayed') return p.status === 'potential_delay' && p.progressKpi > 1.05
      return true
    })
  }, [projects, bu, st])

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    const arr = [...filtered]
    arr.sort((a, b) => {
      const cmp = (x: string | number, y: string | number) => (x < y ? -1 * dir : x > y ? 1 * dir : 0)
      switch (sortKey) {
        case 'status': return cmp(a.status, b.status)
        case 'name': return cmp(a.name, b.name)
        case 'stage': return cmp(a.stage, b.stage)
        case 'progressKpi': return cmp(a.progressKpi, b.progressKpi)
        case 'cpi': return cmp(a.cpi ?? -1, b.cpi ?? -1)
        case 'spi': return cmp(a.spi ?? -1, b.spi ?? -1)
        case 'capex': return cmp(a.capexSarB ?? -1, b.capexSarB ?? -1)
        case 'milestone': return cmp(a.nextMilestoneDate, b.nextMilestoneDate)
        case 'blocker': return cmp(a.topBlocker, b.topBlocker)
        default: return 0
      }
    })
    return arr
  }, [filtered, sortKey, sortDir])

  const ganttData = useMemo(() => sorted.map((p, i) => ganttRow(p, i)), [sorted])

  const selectedProject = useMemo(
    () => (selectedId ? sorted.find((p) => p.id === selectedId) ?? null : null),
    [selectedId, sorted],
  )
  const selectedIndex = selectedProject ? sorted.findIndex((p) => p.id === selectedProject.id) : -1

  const detail = useGrowthProjectDetail(panelOpen && selectedId ? selectedId : null)

  useEffect(() => {
    if (selectedId && !sorted.some((p) => p.id === selectedId)) {
      setSelectedId(null)
      setPanelOpen(false)
    }
  }, [selectedId, sorted])

  useEffect(() => { reportPortfolioBuFilterForChat(bu) }, [bu])

  useEffect(() => {
    const pid = searchParams.get('project')
    if (!pid) { urlHandledRef.current = null; return }
    const sig = `${pid}:${searchParams.get('chat') ?? ''}`
    if (urlHandledRef.current === sig) return
    const p = projects.find((x) => x.id === pid)
    if (!p) return
    urlHandledRef.current = sig
    const wantChat = searchParams.get('chat') === '1'
    if (wantChat) {
      openChat({ scope: 'project', bu: p.bu, projectId: p.id, projectName: p.name })
      setPanelOpen(false)
      setSelectedId(null)
    } else {
      setSelectedId(pid)
      setPanelOpen(true)
    }
    setSearchParams((prev) => { const n = new URLSearchParams(prev); n.delete('project'); n.delete('chat'); return n }, { replace: true })
  }, [searchParams, projects, openChat, setSearchParams])

  const openProject = useCallback((id: string) => { setSelectedId(id); setPanelOpen(true) }, [])
  const goPrev = useCallback(() => { if (selectedIndex <= 0) return; setSelectedId(sorted[selectedIndex - 1]!.id) }, [selectedIndex, sorted])
  const goNext = useCallback(() => { if (selectedIndex < 0 || selectedIndex >= sorted.length - 1) return; setSelectedId(sorted[selectedIndex + 1]!.id) }, [selectedIndex, sorted])

  const counts = useMemo(() => projectStatusCounts(projects), [projects])
  const wKpi = useMemo(() => weightedProgressKpi(projects), [projects])

  const atRiskKpis = spineKpis.filter((k) => k.status === 'at_risk').length
  const onTrackKpis = spineKpis.filter((k) => k.status === 'on_track').length

  function toggleSort(key: SortKey) {
    setSortKey((k) => {
      if (k === key) { setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); return k }
      setSortDir('asc')
      return key
    })
  }

  const th = (key: SortKey, label: string) => (
    <th className="px-3 py-2 text-left">
      <button type="button" className="flex items-center gap-1 uppercase tracking-wide text-ma-graphite transition hover:text-ma-teal" onClick={() => toggleSort(key)}>
        {label}
        {sortKey === key && <span className="font-mono text-[10px]">{sortDir}</span>}
      </button>
    </th>
  )

  return (
    <div className="space-y-8 pb-8">
      {/* ── Header ── */}
      <header className="max-w-[48rem]">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ma-accent">Delivery · Growth</p>
          <span className="hidden text-ma-line sm:inline" aria-hidden>·</span>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ma-muted">Focus area</p>
        </div>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-ma-ink">Growth Project Execution</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ma-muted">
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

          {/* Execution horizon (Gantt) */}
          <div className="mt-6 border-t border-ma-line/60 pt-5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ma-graphite">
              Execution horizon
            </p>
            <p className="mb-3 text-[10px] text-ma-muted">
              2025–2031 by quarter · bar length reflects stage-based planning window · color by BU · click a bar to open project drawer
            </p>
            <div className="overflow-x-auto rounded-md border border-ma-line bg-ma-bg/40 p-4">
              <div className="min-w-[720px] space-y-2">
                <div className="mb-2 flex justify-between text-[10px] uppercase tracking-wide text-ma-muted">
                  <span>2025 Q1</span>
                  <span>2028</span>
                  <span>2031 Q4</span>
                </div>
                {ganttData.map((g) => {
                  const leftPct = (g.start / TOTAL_Q) * 100
                  const widthPct = (g.duration / TOTAL_Q) * 100
                  const active = selectedId === g.id && panelOpen
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => openProject(g.id)}
                      className="grid w-full grid-cols-[minmax(0,200px)_1fr] items-center gap-3 rounded-sm px-1 py-0.5 text-left text-xs transition hover:bg-ma-accent/5"
                    >
                      <span className="truncate font-medium text-ma-ink/85">{g.name}</span>
                      <div className={`relative h-2.5 rounded-full bg-ma-surface ${active ? 'ring-2 ring-ma-accent ring-offset-2 ring-offset-ma-elevated' : ''}`}>
                        <div
                          className="absolute top-0 h-2.5 rounded-full transition-opacity"
                          style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 1.5)}%`, background: g.fill, opacity: active ? 1 : 0.92 }}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
            <ul className="mt-3 flex flex-wrap gap-4 text-[11px] text-ma-muted">
              {Object.entries(BU_COLOR).map(([k, v]) => (
                <li key={k} className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm" style={{ background: v }} />
                  {k}
                </li>
              ))}
            </ul>
          </div>
      </SectionShell>

      {/* ── 2. Business KPIs + Project Register + Gantt ── */}
      <SectionShell
        slug="kpis"
        icon={<Gauge className="size-[17px] stroke-[1.75]" />}
        title="Business KPIs & project execution"
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
        <div className="space-y-6">
          {/* KPI summary cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-md border border-ma-line bg-ma-bg/40 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ma-muted">Portfolio progress KPI</p>
              <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-ma-accent">{wKpi.toFixed(2)}</p>
              <p className="mt-1 text-[11px] text-ma-muted">Weighted delivery health across growth projects</p>
            </div>
            <div className="rounded-md border border-ma-line bg-ma-bg/40 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ma-muted">Status mix</p>
              <div className="mt-2 flex flex-wrap gap-4 text-[12px]">
                <span className="inline-flex items-center gap-1.5">
                  <RagDot color="green" size={8} />
                  <span className="tabular-nums font-semibold text-ma-ink">{counts.on_track}</span>
                  <span className="text-ma-muted">on track</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <RagDot color="amber" size={8} />
                  <span className="tabular-nums font-semibold text-ma-ink">{counts.potential_delay}</span>
                  <span className="text-ma-muted">potential delay</span>
                </span>
              </div>
            </div>
            <div className="rounded-md border border-ma-line bg-ma-bg/40 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ma-muted">Projects in view</p>
              <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-ma-ink">
                {sorted.length}<span className="text-lg font-normal text-ma-muted"> / {projects.length}</span>
              </p>
              <p className="mt-1 text-[11px] text-ma-muted">Use filters below to narrow scope</p>
            </div>
          </div>

          {/* CAPEX deployed */}
          <div className="rounded-md border border-ma-line/80 bg-ma-surface/20 px-4 py-4 dark:bg-ma-charcoal/25">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[12px] font-semibold text-ma-ink">CAPEX deployed vs. approved annual plan</p>
                <p className="mt-1 text-[11px] text-ma-muted">Tracking capital deployment against approved project profiles</p>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-ma-line/80 bg-ma-elevated/80 px-2.5 py-1">
                <RagDot color="gray" size={9} />
                <span className="text-[11px] font-medium text-ma-muted">Neutral</span>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wide text-ma-muted">Deployed</p>
                <p className="font-mono text-2xl font-bold tabular-nums text-ma-accent">SAR 1.72Bn</p>
                <p className="mt-0.5 text-[11px] text-ma-muted">31.1% of annual approved plan</p>
              </div>
              <div className="flex flex-col justify-center">
                <div className="flex items-center justify-between text-[10px] text-ma-muted">
                  <span>Deployed</span>
                  <span className="font-mono font-semibold text-ma-ink">31%</span>
                </div>
                <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-ma-line/40">
                  <div className="h-full w-[31%] rounded-full bg-ma-accent/80" />
                </div>
                <div className="mt-1.5 flex justify-between text-[9px] text-ma-muted">
                  <span>0</span>
                  <span>SAR 5.53Bn (100%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cost & Schedule variance side by side */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Cost variance */}
            <div className="rounded-md border border-ma-line/80 bg-ma-surface/20 px-4 py-4 dark:bg-ma-charcoal/25">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[12px] font-semibold text-ma-ink">IMP cost variance</p>
                <div className="flex items-center gap-1.5 rounded-full border border-ma-amber-warn/30 bg-ma-amber-warn/10 px-2.5 py-1">
                  <RagDot color="amber" size={9} />
                  <span className="text-[11px] font-medium text-ma-amber-warn">At risk</span>
                </div>
              </div>
              <p className="mt-1 text-[11px] text-ma-muted">Actual vs. planned cost for projects in execution</p>
              <div className="mt-3">
                <p className="font-mono text-xl font-bold text-ma-amber-warn">Stable but rising</p>
                <p className="mt-1 text-[11px] text-ma-muted">Geopolitical disruption driving freight +60%, material escalation</p>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-ma-muted">Urban Development flagship Phase 1 CPI</span>
                  <span className="font-mono font-semibold text-ma-teal">1.09</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-ma-line/40">
                  <div className="h-full w-[92%] rounded-full bg-ma-teal/70" />
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-ma-muted">Portfolio average</span>
                  <span className="font-mono font-semibold text-ma-amber-warn">Rising</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-ma-line/40">
                  <div className="h-full w-[55%] rounded-full bg-ma-amber-warn/70" />
                </div>
              </div>
              <p className="mt-3 text-[10px] text-ma-muted">Target: zero variance</p>
            </div>

            {/* Schedule variance */}
            <div className="rounded-md border border-ma-line/80 bg-ma-surface/20 px-4 py-4 dark:bg-ma-charcoal/25">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[12px] font-semibold text-ma-ink">IMP schedule variance</p>
                <div className="flex items-center gap-1.5 rounded-full border border-ma-amber-warn/30 bg-ma-amber-warn/10 px-2.5 py-1">
                  <RagDot color="amber" size={9} />
                  <span className="text-[11px] font-medium text-ma-amber-warn">At risk</span>
                </div>
              </div>
              <p className="mt-1 text-[11px] text-ma-muted">Actual vs. planned schedule for projects in execution</p>
              <div className="mt-3">
                <p className="font-mono text-xl font-bold text-ma-risk">Rapidly increasing</p>
                <p className="mt-1 text-[11px] text-ma-muted">Force Majeure +2–3 months on Urban Development flagship Phase 1; logistics disruption across portfolio</p>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-ma-muted">Urban Development flagship Phase 1 SPI</span>
                  <span className="font-mono font-semibold text-ma-amber-warn">0.89</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-ma-line/40">
                  <div className="h-full w-[45%] rounded-full bg-ma-amber-warn/70" />
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-ma-muted">7 / 16 projects at risk</span>
                  <span className="font-mono font-semibold text-ma-risk">44%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-ma-line/40">
                  <div className="h-full w-[44%] rounded-full bg-ma-risk/70" />
                </div>
              </div>
              <p className="mt-3 text-[10px] text-ma-muted">Target: zero variance</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 border-t border-ma-line/60 pt-4">
            <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wide text-ma-muted">
              Business unit
              <select
                value={bu}
                onChange={(e) => setBu(e.target.value as (typeof BUS)[number])}
                className="h-9 min-w-[200px] rounded-md border border-ma-line bg-ma-elevated px-2 text-[13px] font-medium text-ma-ink outline-none transition focus:border-ma-accent/50"
              >
                {BUS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wide text-ma-muted">
              Status
              <select
                value={st}
                onChange={(e) => setSt(e.target.value as (typeof STATUSES)[number])}
                className="h-9 min-w-[200px] rounded-md border border-ma-line bg-ma-elevated px-2 text-[13px] font-medium text-ma-ink outline-none transition focus:border-ma-accent/50"
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>

          {/* Project register table */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ma-graphite">
              Growth project register
            </p>
            <div className="overflow-x-auto rounded-md border border-ma-line bg-ma-elevated">
              <table className="min-w-[1040px] w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-ma-line bg-ma-surface text-[11px] font-semibold uppercase tracking-[0.12em] text-ma-graphite">
                    <th className="w-10 px-2 py-2 text-center" aria-label="Deep dive" />
                    {th('status', 'Status')}
                    {th('name', 'Project')}
                    {th('stage', 'Stage')}
                    {th('progressKpi', 'Progress KPI')}
                    {th('cpi', 'CPI')}
                    {th('spi', 'SPI')}
                    {th('capex', 'CAPEX (SAR b)')}
                    {th('milestone', 'Next Milestone')}
                    {th('blocker', 'Top Blocker')}
                    <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-ma-muted">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((p, i) => {
                    const selected = selectedId === p.id && panelOpen
                    const hasDeep = getGrowthProjectDetailStatic(p.id)?.hasDeepDive
                    return (
                      <tr
                        key={p.id}
                        tabIndex={0}
                        role="button"
                        onClick={() => openProject(p.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProject(p.id) } }}
                        className={`cursor-pointer border-b border-ma-line transition-colors hover:bg-ma-accent/5 ${i % 2 === 0 ? 'bg-ma-elevated' : 'bg-ma-bg'} ${selected ? 'bg-ma-accent/10 ring-1 ring-inset ring-ma-accent/40' : ''}`}
                      >
                        <td className="px-2 py-2 text-center align-middle">
                          {hasDeep ? (
                            <span title="MSE deep-dive content available" className="inline-flex text-ma-accent">
                              <PanelRight className="size-4" strokeWidth={1.75} />
                            </span>
                          ) : (
                            <span className="inline-block size-4" aria-hidden />
                          )}
                        </td>
                        <td className="px-3 py-2 align-top"><div className="pt-1"><RagDot color={p.status === 'on_track' ? 'green' : 'amber'} className="mx-auto" /></div></td>
                        <td className="px-3 py-2 align-top"><p className="font-semibold text-ma-ink">{p.name}</p><p className="text-xs text-ma-muted">{p.bu}</p></td>
                        <td className="px-3 py-2 align-top text-xs text-ma-muted">{p.stage}</td>
                        <td className={`px-3 py-2 align-top text-base font-semibold tabular-nums ${progressColor(p.progressKpi)}`}>{p.progressKpi.toFixed(2)}</td>
                        <td className="px-3 py-2 align-top tabular-nums text-ma-ink/85">{p.cpi != null ? formatNumber(p.cpi, 2) : '—'}</td>
                        <td className="px-3 py-2 align-top tabular-nums text-ma-ink/85">{p.spi != null ? formatNumber(p.spi, 2) : '—'}</td>
                        <td className="px-3 py-2 align-top tabular-nums text-ma-ink/85">{p.capexSarB != null ? formatNumber(p.capexSarB, 2) : '—'}</td>
                        <td className="max-w-[200px] px-3 py-2 align-top"><p className="text-ma-ink">{p.nextMilestone}</p><p className="text-xs text-ma-muted">{p.nextMilestoneDate}</p></td>
                        <td className="max-w-[200px] px-3 py-2 align-top"><p className="truncate text-ma-ink/85" title={p.topBlocker}>{p.topBlocker}</p></td>
                        <td className="px-2 py-2 align-middle text-right text-ma-muted">
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-medium">View <ChevronRight className="size-3.5 shrink-0" strokeWidth={2} /></span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

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
          AI generated and tentative
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
          AI generated and tentative
        </p>
      </SectionShell>

      {/* ── Project detail drawer ── */}
      {selectedProject ? (
        <GrowthProjectDetailPanel
          project={selectedProject}
          detail={detail}
          open={panelOpen}
          onClose={() => { setPanelOpen(false); setSelectedId(null) }}
          onPrev={goPrev}
          onNext={goNext}
          hasPrev={selectedIndex > 0}
          hasNext={selectedIndex >= 0 && selectedIndex < sorted.length - 1}
          onAskDeeper={() => {
            const p = selectedProject
            openChat({ scope: 'project', bu: p.bu, projectId: p.id, projectName: p.name })
            setPanelOpen(false)
            setSelectedId(null)
          }}
        />
      ) : null}
    </div>
  )
}
