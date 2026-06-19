import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Compass,
  Cpu,
  DollarSign,
  FolderKanban,
  Unplug,
} from 'lucide-react'
import {
  mseEnablers,
  mseExploration,
  mseGrowthProjects,
  mseTechnologyValue,
  mseValueDelivery,
  type UndefinedBlock,
} from '../data/mseExecutiveSummary'
import { spineKpiBlockAccent, spineKpiBlockBody, spineKpiBlockSurface } from './spineKpiUi'

function SpineKpiContentPanel({ children }: { children: ReactNode }) {
  return (
    <li className={spineKpiBlockSurface}>
      <div className={spineKpiBlockAccent} aria-hidden />
      <div className={spineKpiBlockBody}>{children}</div>
    </li>
  )
}

function SectionLink({ to, label }: { to: string; label: string }) {
  return (
    <div className="flex justify-end pt-1">
      <Link
        to={to}
        className="group inline-flex items-center gap-1 rounded-sm px-2 py-1 text-[12px] font-semibold text-ma-teal transition-colors hover:bg-ma-teal/8 hover:text-ma-teal dark:hover:bg-ma-teal/12"
      >
        {label}
        <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </div>
  )
}

function Label({ children }: { children: ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-wide text-ma-muted">{children}</p>
}

function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase()
  let cls = 'border-ma-teal/40 bg-ma-teal/10 text-ma-teal'
  if (s.includes('delay') || s.includes('potential'))
    cls = 'border-ma-amber-warn/40 bg-ma-amber-warn/10 text-ma-amber-warn'
  if (s.includes('ahead')) cls = 'border-ma-teal/50 bg-ma-teal/12 text-ma-teal'
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {status}
    </span>
  )
}

function EnablerDot({ status }: { status: string }) {
  const s = status.toLowerCase()
  let color = 'bg-ma-risk'
  if (s.includes('non-competitive')) color = 'bg-ma-amber-warn'
  if (s.includes('not secured')) color = 'bg-ma-amber-warn'
  return <span className={`inline-block size-2 shrink-0 rounded-full ${color}`} aria-hidden />
}

function UndefinedClarification({ block }: { block: UndefinedBlock }) {
  return (
    <details className="group/undef rounded-md border border-dashed border-ma-amber-warn/35 bg-ma-amber-warn/[0.04] dark:bg-ma-amber-warn/[0.06]">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ma-amber-warn sm:px-4 [&::-webkit-details-marker]:hidden">
        <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
        {block.title}
        <ChevronDown className="ml-auto size-3.5 shrink-0 transition-transform duration-200 group-open/undef:rotate-180" aria-hidden />
      </summary>
      <div className="border-t border-ma-amber-warn/20 px-3 pb-3 pt-2.5 sm:px-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ma-muted">Missing</p>
        <ul className="mt-1 list-inside list-disc space-y-0.5 text-[12px] leading-snug text-ma-ink/90">
          {block.missing.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <p className="mt-2 text-[12px] leading-snug text-ma-ink/90">
          <span className="font-semibold text-ma-muted">Why: </span>
          {block.why}
        </p>
        <p className="mt-2 border-t border-ma-amber-warn/20 pt-2 text-[12px] font-medium leading-snug text-ma-ink">
          <span className="text-ma-muted">Question: </span>
          {block.question}
        </p>
      </div>
    </details>
  )
}

function UndefinedValue() {
  return (
    <span className="inline-flex items-center rounded-sm border border-dashed border-ma-amber-warn/35 bg-ma-amber-warn/8 px-2 py-0.5 text-[11px] font-semibold text-ma-amber-warn">
      TBC
    </span>
  )
}

function ProgressBar({ pct, color = 'bg-ma-accent' }: { pct: number; color?: string }) {
  const clamped = Math.min(100, Math.max(0, pct))
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-ma-line/60">
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out ${color}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

function PanelHeading({
  displayIndex,
  title,
  icon,
}: {
  displayIndex: number
  title: string
  icon: ReactNode
}) {
  return (
    <div className="mb-3 flex items-start gap-2.5 sm:items-center">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ma-accent/35 bg-ma-elevated text-[10px] font-bold tabular-nums text-ma-accent">
        {displayIndex}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="shrink-0 text-ma-accent [&_svg]:size-3.5">{icon}</span>
        <h3 className="text-[13px] font-medium leading-snug text-ma-ink">{title}</h3>
      </div>
    </div>
  )
}

export function MseValueDeliveryPanel({
  vd,
  displayIndex,
}: {
  vd: typeof mseValueDelivery
  displayIndex: number
}) {
  return (
    <SpineKpiContentPanel>
      <PanelHeading
        displayIndex={displayIndex}
        title="Value delivery"
        icon={<DollarSign className="stroke-[1.75]" aria-hidden />}
      />
        <div className="space-y-4">
          <div>
            <Label>Portfolio status</Label>
            <div className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2">
              {(
                [
                  'Realized EBITDA',
                  'Committed EBITDA (funded initiatives)',
                  'EBITDA at risk',
                  'EBITDA gap vs 2030 target',
                ] as const
              ).map((label) => (
                <div key={label} className="flex items-center justify-between gap-2 border-b border-ma-line/50 py-2">
                  <span className="text-[12px] text-ma-ink">{label}</span>
                  <UndefinedValue />
                </div>
              ))}
            </div>
          </div>
          <UndefinedClarification block={vd.undefinedBlock} />
        </div>
    </SpineKpiContentPanel>
  )
}

export function MseGrowthProjectsPanel({
  gp,
  kpiPct,
  kpiTargetPct,
  displayIndex,
}: {
  gp: typeof mseGrowthProjects
  kpiPct: number
  kpiTargetPct: number
  displayIndex: number
}) {
  const kpi = gp.portfolioKpi
  return (
    <SpineKpiContentPanel>
      <PanelHeading
        displayIndex={displayIndex}
        title="Growth projects"
        icon={<FolderKanban className="stroke-[1.75]" aria-hidden />}
      />
        <div className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:gap-6">
            <div className="shrink-0">
              <Label>Portfolio KPI</Label>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-ma-accent sm:text-3xl">
                {kpi.value.toFixed(2)}
              </p>
              <dl className="mt-2 flex flex-wrap gap-3 text-[11px]">
                <div>
                  <dt className="text-ma-muted">Target</dt>
                  <dd className="font-mono font-semibold text-ma-ink">{kpi.target.toFixed(2)}</dd>
                </div>
                <div>
                  <dt className="text-ma-muted">Threshold</dt>
                  <dd className="font-mono font-semibold text-ma-ink">{kpi.threshold.toFixed(2)}</dd>
                </div>
                <div>
                  <dt className="text-ma-muted">Stretch</dt>
                  <dd className="font-mono font-semibold text-ma-ink">{kpi.stretch.toFixed(2)}</dd>
                </div>
              </dl>
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
              <div className="relative h-3 w-full rounded-full bg-ma-line/50">
                <div
                  className="absolute inset-y-0 rounded-full bg-gradient-to-r from-ma-teal/80 to-ma-teal/50"
                  style={{ width: `${kpiPct}%` }}
                />
                <div
                  className="absolute top-1/2 h-5 w-px -translate-y-1/2 bg-ma-ink/40"
                  style={{ left: `${kpiTargetPct}%` }}
                  title={`Target ${kpi.target.toFixed(2)}`}
                />
              </div>
              <div className="flex justify-between text-[9px] font-semibold uppercase text-ma-muted">
                <span>Stretch {kpi.stretch}</span>
                <span>Threshold {kpi.threshold}</span>
              </div>
            </div>
          </div>

          <div>
            <Label>Project status (MSE examples)</Label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {gp.projectExamples.map((p) => (
                <div
                  key={p.name}
                  className="rounded-md border border-ma-line/80 bg-ma-surface/30 px-3 py-2.5 dark:bg-ma-charcoal/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12px] font-semibold text-ma-ink sm:text-[13px]">{p.name}</p>
                    <StatusPill status={p.status} />
                  </div>
                  {p.kind === 'progress' ? (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-ma-muted">Actual vs planned</span>
                        <span className="font-mono font-semibold text-ma-ink">
                          {p.actualProgressPct}% <span className="text-ma-muted">/ {p.plannedProgressPct}%</span>
                        </span>
                      </div>
                      <ProgressBar
                        pct={p.plannedProgressPct > 0 ? (p.actualProgressPct / p.plannedProgressPct) * 100 : 0}
                        color="bg-ma-amber-warn/80"
                      />
                    </div>
                  ) : (
                    <p className="mt-2 text-[12px] text-ma-muted">
                      KPI <span className="font-mono font-semibold text-ma-ink">{p.kpi.toFixed(2)}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>FID pipeline (partial view)</Label>
            <ul className="mt-2 space-y-1.5">
              {gp.fidPipelinePartialView.map((line) => {
                const [project, ...rest] = line.split(': ')
                return (
                  <li key={line} className="flex items-start gap-2 text-[12px] leading-snug">
                    <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-ma-accent/70" aria-hidden />
                    <span>
                      <span className="font-medium text-ma-ink">{project}: </span>
                      <span className="text-ma-muted">{rest.join(': ')}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
          <SectionLink to="/portfolio" label="Growth Project Execution" />
          <UndefinedClarification block={gp.undefinedBlock} />
        </div>
    </SpineKpiContentPanel>
  )
}

export function MseExplorationPanel({
  ex,
  displayIndex,
}: {
  ex: typeof mseExploration
  displayIndex: number
}) {
  return (
    <SpineKpiContentPanel>
      <PanelHeading
        displayIndex={displayIndex}
        title="Development"
        icon={<Compass className="stroke-[1.75]" aria-hidden />}
      />
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-ma-line/70 bg-ma-surface/30 px-3 py-2.5 dark:bg-ma-charcoal/30 sm:px-4 sm:py-3">
              <Label>Land parcels</Label>
              <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-ma-accent sm:text-xl">
                {ex.pipelineOverview.explorationLicensesKm2.toLocaleString()} km²
              </p>
            </div>
            <div className="rounded-md border border-ma-line/70 bg-ma-surface/30 px-3 py-2.5 dark:bg-ma-charcoal/30 sm:px-4 sm:py-3">
              <Label>Identified targets</Label>
              <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-ma-accent sm:text-xl">
                {ex.pipelineOverview.identifiedTargets.toLocaleString()}
              </p>
            </div>
          </div>
          <div>
            <Label>Key assets</Label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {ex.keyAssets.map((a) => (
                <div
                  key={a.name}
                  className="rounded-md border border-ma-line/80 bg-ma-surface/30 px-3 py-2.5 dark:bg-ma-charcoal/30 sm:px-3.5 sm:py-3"
                >
                  <p className="text-[12px] font-semibold text-ma-ink sm:text-[13px]">{a.name}</p>
                  <p className="mt-1.5 text-[12px] text-ma-muted">
                    Capacity: <span className="font-medium text-ma-ink">{a.resources}</span>
                  </p>
                  {(a.capexSarBn != null || a.ebitdaSarBn != null) && (
                    <div className="mt-2 flex flex-wrap gap-3 text-[11px]">
                      {a.capexSarBn != null && (
                        <div>
                          <span className="text-ma-muted">CAPEX </span>
                          <span className="font-mono font-semibold text-ma-ink">{a.capexSarBn}B SAR</span>
                        </div>
                      )}
                      {a.ebitdaSarBn != null && (
                        <div>
                          <span className="text-ma-muted">EBITDA </span>
                          <span className="font-mono font-semibold text-ma-accent">{a.ebitdaSarBn}B SAR</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div>
            <Label>Key issues</Label>
            <ul className="mt-2 space-y-1.5">
              {ex.keyIssues.map((issue) => (
                <li key={issue} className="flex items-start gap-2 text-[12px] leading-snug text-ma-ink/90">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ma-risk/70" aria-hidden />
                  {issue}
                </li>
              ))}
            </ul>
          </div>
          <SectionLink to="/exploration" label="Development Pipeline" />
          <UndefinedClarification block={ex.undefinedBlock} />
        </div>
    </SpineKpiContentPanel>
  )
}

export function MseTechnologyValuePanel({
  tv,
  techPct,
  displayIndex,
}: {
  tv: typeof mseTechnologyValue
  techPct: number
  displayIndex: number
}) {
  return (
    <SpineKpiContentPanel>
      <PanelHeading
        displayIndex={displayIndex}
        title="Technology value"
        icon={<Cpu className="stroke-[1.75]" aria-hidden />}
      />
        <div className="space-y-4">
          <div>
            <Label>TechOps EBITDA (2026)</Label>
            <div className="mt-3 flex flex-wrap items-end gap-5">
              <div>
                <p className="text-[11px] text-ma-muted">Realized</p>
                <p className="font-mono text-xl font-semibold text-ma-accent sm:text-2xl">
                  {tv.techopsEbitda2026.realizedSarBn}
                  <span className="ml-1 text-[13px] font-medium text-ma-muted sm:text-[14px]">B SAR</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] text-ma-muted">Target</p>
                <p className="font-mono text-xl font-semibold text-ma-ink sm:text-2xl">
                  {tv.techopsEbitda2026.targetSarBn}
                  <span className="ml-1 text-[13px] font-medium text-ma-muted sm:text-[14px]">B SAR</span>
                </p>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <ProgressBar pct={techPct} color="bg-ma-accent" />
              <p className="text-right text-[10px] font-semibold tabular-nums text-ma-muted">
                {techPct.toFixed(0)}% realized
              </p>
            </div>
          </div>
          <div>
            <Label>Execution</Label>
            <div className="mt-2 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <ProgressBar pct={tv.execution.initiativesInExecutionPct} color="bg-ma-teal/80" />
              </div>
              <p className="shrink-0 font-mono text-[13px] font-semibold text-ma-ink">
                {tv.execution.initiativesInExecutionPct}%
                <span className="text-ma-muted"> / {tv.execution.targetPct}%</span>
              </p>
            </div>
            <p className="mt-1 text-[11px] text-ma-muted">Initiatives in execution</p>
          </div>
          <SectionLink to="/technology" label="Technology" />
          <UndefinedClarification block={tv.undefinedBlock} />
        </div>
    </SpineKpiContentPanel>
  )
}

export function MseEnablersPanel({
  en,
  displayIndex,
}: {
  en: typeof mseEnablers
  displayIndex: number
}) {
  return (
    <SpineKpiContentPanel>
      <PanelHeading
        displayIndex={displayIndex}
        title="Enablers"
        icon={<Unplug className="stroke-[1.75]" aria-hidden />}
      />
        <div className="space-y-4">
          <div>
            <Label>Critical enablers</Label>
            <ul className="mt-3 space-y-0">
              {en.criticalStatus.map((row) => (
                <li
                  key={row.enabler}
                  className="flex items-center justify-between gap-2 border-b border-ma-line/50 py-2.5 last:border-0"
                >
                  <span className="text-[12px] font-medium text-ma-ink">{row.enabler}</span>
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-ma-amber-warn">
                    <EnablerDot status={row.status} />
                    {row.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Label>Impacted areas</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {en.impactedAreas.map((row) => (
                <span
                  key={row.area}
                  className="rounded-full border border-ma-line bg-ma-surface/60 px-2.5 py-1 text-[11px] text-ma-ink dark:bg-ma-charcoal/40"
                >
                  <span className="font-semibold">{row.area}</span>
                  <span className="text-ma-muted"> · {row.items}</span>
                </span>
              ))}
            </div>
          </div>
          <SectionLink to="/enablers" label="Enablers" />
        </div>
    </SpineKpiContentPanel>
  )
}
