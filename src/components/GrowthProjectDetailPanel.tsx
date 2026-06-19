import { useEffect } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { GrowthProjectDetail, GrowthDeliveryChainNode, Project } from '../data/types'
import { formatNumber, formatUsdM } from '../lib/format'
import { RagDot } from './RagDot'
import { StatusBadge } from './StatusBadge'

function statusChip(p: Project) {
  if (p.status === 'on_track') return { label: 'On track', rag: 'green' as const }
  if (p.progressKpi > 1.05) return { label: 'Delayed', rag: 'red' as const }
  return { label: 'Potential delay', rag: 'amber' as const }
}

function severityClass(s: 'high' | 'medium' | 'low') {
  if (s === 'high') return 'bg-ma-risk/15 text-ma-risk border-ma-risk/30'
  if (s === 'medium') return 'bg-ma-amber-warn/15 text-ma-amber-warn border-ma-amber-warn/35'
  return 'bg-ma-teal/10 text-ma-teal border-ma-teal/25'
}

function chainStateClass(s: GrowthDeliveryChainNode['state']) {
  if (s === 'complete') return 'border-ma-teal/50 bg-ma-teal/10'
  if (s === 'current') return 'border-ma-accent bg-ma-accent/10'
  return 'border-ma-line bg-ma-surface/60'
}

type GrowthProjectDetailPanelProps = {
  project: Project
  detail: GrowthProjectDetail | undefined
  open: boolean
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  hasPrev: boolean
  hasNext: boolean
  /** Opens global CEO intelligence with this project preloaded */
  onAskDeeper?: () => void
}

export function GrowthProjectDetailPanel({
  project: p,
  detail,
  open,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  onAskDeeper,
}: GrowthProjectDetailPanelProps) {
  const chip = statusChip(p)
  const outcome = detail?.strategicOutcome ?? {
    capexSarB: p.capexSarB,
    production: p.productionTarget,
    ebitdaSarB: p.ebitdaSarB,
    firstProductionFocus: p.nextMilestone,
    fullProductionTarget: undefined,
  }

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[60] bg-ma-charcoal/45 backdrop-blur-[1px] transition-opacity dark:bg-black/55"
        aria-label="Close project details"
        onClick={onClose}
      />
      <aside
        className="fixed z-[70] flex max-h-[100dvh] w-full flex-col border-ma-line bg-ma-elevated shadow-[0_0_0_1px_rgba(15,18,16,0.06)] max-md:inset-0 md:right-0 md:top-0 md:h-full md:max-w-[min(560px,100vw-24px)] md:border-l"
        role="dialog"
        aria-modal="true"
        aria-labelledby="growth-project-detail-title"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-ma-line px-4 py-3">
          <div className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              className="rounded-sm p-2 text-ma-muted transition hover:bg-ma-surface hover:text-ma-ink disabled:opacity-30"
              onClick={onPrev}
              disabled={!hasPrev}
              aria-label="Previous project"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              className="rounded-sm p-2 text-ma-muted transition hover:bg-ma-surface hover:text-ma-ink disabled:opacity-30"
              onClick={onNext}
              disabled={!hasNext}
              aria-label="Next project"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
          <button
            type="button"
            className="rounded-sm p-2 text-ma-muted transition hover:bg-ma-surface hover:text-ma-ink"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <header className="border-b border-ma-line pb-4">
            <div className="flex flex-wrap items-center gap-2">
              {detail?.hasDeepDive ? (
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-ma-accent/40 bg-ma-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ma-accent-muted"
                  title="Deep-dive content available"
                >
                  Deep dive
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ma-line bg-ma-surface/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ma-muted">
                <RagDot color={chip.rag} size={8} />
                {chip.label}
              </span>
              {detail?.reportingMonth ? (
                <span className="text-[10px] font-medium uppercase tracking-wide text-ma-muted">
                  Reporting · {detail.reportingMonth}
                </span>
              ) : null}
            </div>
            <h2
              id="growth-project-detail-title"
              className="mt-2 text-lg font-semibold leading-snug tracking-tight text-ma-ink"
            >
              {p.name}
            </h2>
            <p className="mt-1 text-[12px] text-ma-muted">
              {p.bu} · <span className="text-ma-ink">{p.stage}</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge variant="neutral" className="text-[10px]">
                {`Next: ${p.nextMilestone}`}
              </StatusBadge>
              <StatusBadge variant="neutral" className="font-mono text-[10px]">
                {p.nextMilestoneDate}
              </StatusBadge>
            </div>
            {onAskDeeper ? (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={onAskDeeper}
                  className="w-full rounded-sm border border-ma-accent/45 bg-ma-accent/10 px-3 py-2 text-center text-[12px] font-semibold text-ma-ink transition hover:border-ma-accent/70 hover:bg-ma-accent/15"
                >
                  Ask about this project
                </button>
              </div>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="rounded-sm border border-ma-line bg-ma-surface/50 px-3 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-ma-muted">
                  Progress KPI
                </p>
                <p className="font-mono text-lg text-ma-accent">{p.progressKpi.toFixed(2)}</p>
              </div>
              <div className="rounded-sm border border-ma-line bg-ma-surface/50 px-3 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-ma-muted">CPI</p>
                <p className="font-mono text-lg text-ma-ink/90">
                  {p.cpi != null ? formatNumber(p.cpi, 2) : '—'}
                </p>
              </div>
              <div className="rounded-sm border border-ma-line bg-ma-surface/50 px-3 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-ma-muted">SPI</p>
                <p className="font-mono text-lg text-ma-ink/90">
                  {p.spi != null ? formatNumber(p.spi, 2) : '—'}
                </p>
              </div>
              <div className="rounded-sm border border-ma-line bg-ma-surface/50 px-3 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-ma-muted">
                  CAPEX
                </p>
                <p className="font-mono text-lg text-ma-ink/90">
                  {p.capexSarB != null ? `${formatNumber(p.capexSarB, 1)}b SAR` : '—'}
                </p>
              </div>
            </div>
            {detail?.footnote ? (
              <p className="mt-3 border-t border-ma-line pt-3 text-[10px] leading-snug text-ma-muted">
                {detail.footnote}
              </p>
            ) : null}
          </header>

          <section className="mt-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ma-graphite">
              Strategic outcome snapshot
            </h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div className="rounded-sm border border-ma-line bg-ma-bg/80 px-3 py-2.5">
                <p className="text-[9px] font-semibold uppercase text-ma-muted">CAPEX</p>
                <p className="mt-0.5 font-mono text-sm text-ma-accent">
                  {outcome.capexSarB != null ? `${formatNumber(outcome.capexSarB, 1)}b SAR` : '—'}
                </p>
              </div>
              <div className="rounded-sm border border-ma-line bg-ma-bg/80 px-3 py-2.5">
                <p className="text-[9px] font-semibold uppercase text-ma-muted">Production</p>
                <p className="mt-0.5 text-sm font-medium text-ma-ink">{outcome.production}</p>
              </div>
              <div className="rounded-sm border border-ma-line bg-ma-bg/80 px-3 py-2.5 sm:col-span-2">
                <p className="text-[9px] font-semibold uppercase text-ma-muted">
                  First production / delivery focus
                </p>
                <p className="mt-0.5 text-[12px] leading-snug text-ma-ink">
                  {outcome.firstProductionFocus ?? '—'}
                </p>
                {outcome.fullProductionTarget ? (
                  <p className="mt-1 text-[11px] leading-snug text-ma-muted">
                    Full production: {outcome.fullProductionTarget}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          {detail?.deliveryChain?.length ? (
            <section className="mt-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ma-graphite">
                2026 outlook · project delivery chain
              </h3>
              <p className="mt-1 text-[11px] leading-snug text-ma-muted">
                Enablers → studies → execution → activity.
              </p>
              <div className="mt-3 overflow-x-auto pb-1">
                <div className="flex min-w-max gap-2">
                  {detail.deliveryChain.map((n, i) => (
                    <div
                      key={`${n.label}-${i}`}
                      className={`w-[140px] shrink-0 rounded-sm border px-2.5 py-2 ${chainStateClass(n.state)}`}
                    >
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-ma-muted">
                        {n.lane}
                      </p>
                      <p className="mt-1 text-[11px] font-medium leading-snug text-ma-ink">{n.label}</p>
                      <p className="mt-1 font-mono text-[10px] text-ma-accent">{n.period}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {detail?.bottlenecks?.length ? (
            <section className="mt-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ma-graphite">
                Bottlenecks & support required
              </h3>
              <div className="mt-2 overflow-x-auto rounded-sm border border-ma-line">
                <table className="w-full min-w-[480px] border-collapse text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-ma-line bg-ma-surface text-[9px] font-semibold uppercase tracking-wide text-ma-muted">
                      <th className="px-2 py-2">Dimension</th>
                      <th className="px-2 py-2">Bottleneck</th>
                      <th className="px-2 py-2">Unlock / support</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.bottlenecks.map((b) => (
                      <tr key={b.dimension + b.bottleneck} className="border-b border-ma-line last:border-0">
                        <td className="px-2 py-2 font-semibold text-ma-ink">{b.dimension}</td>
                        <td className="px-2 py-2 text-ma-ink/90">{b.bottleneck}</td>
                        <td className="px-2 py-2 text-ma-muted">{b.unlockRequired}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <section className="mt-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ma-graphite">
                Progress & project overview
              </h3>
              {p.budgetUsdM != null || p.actualSpendUsdM != null || p.eacUsdM != null ? (
                <div className="mt-2 grid gap-2 rounded-sm border border-ma-line bg-ma-bg/50 p-3 sm:grid-cols-3">
                  <div>
                    <p className="text-[9px] font-semibold uppercase text-ma-muted">Budget</p>
                    <p className="font-mono text-sm text-ma-ink">{formatUsdM(p.budgetUsdM)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase text-ma-muted">Cumulative actual</p>
                    <p className="font-mono text-sm text-ma-ink">{formatUsdM(p.actualSpendUsdM)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase text-ma-muted">EAC</p>
                    <p className="font-mono text-sm text-ma-ink">{formatUsdM(p.eacUsdM)}</p>
                  </div>
                </div>
              ) : null}
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[9px] font-semibold uppercase text-ma-muted">Plan vs actual %</p>
                  <p className="mt-1 font-mono text-sm text-ma-ink">
                    {formatNumber(p.plannedProgress, 1)}% plan ·{' '}
                    <span className="text-ma-accent">{formatNumber(p.actualProgress, 1)}%</span> actual
                  </p>
                </div>
              </div>
              {detail?.overview?.updateBullets?.length ? (
                <div className="mt-3">
                  <p className="text-[9px] font-semibold uppercase text-ma-muted">Project update</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] leading-snug text-ma-ink">
                    {detail.overview.updateBullets.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {detail?.overview?.upcomingActivities?.length ? (
                <div className="mt-3">
                  <p className="text-[9px] font-semibold uppercase text-ma-muted">Upcoming activities</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] leading-snug text-ma-ink">
                    {detail.overview.upcomingActivities.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {detail?.overview?.completedMilestones?.length ? (
                <div className="mt-3">
                  <p className="text-[9px] font-semibold uppercase text-ma-teal">Completed milestones</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] leading-snug text-ma-ink">
                    {detail.overview.completedMilestones.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {detail?.overview?.upcomingMilestones?.length ? (
                <div className="mt-3">
                  <p className="text-[9px] font-semibold uppercase text-ma-accent">Upcoming milestones</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] leading-snug text-ma-ink">
                    {detail.overview.upcomingMilestones.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>

          <section className="mt-5 border-t border-ma-line pt-4 pb-6">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ma-graphite">
              Main risks & blockers
            </h3>
            <ul className="mt-2 space-y-2">
              {(detail?.risks && detail.risks.length > 0
                ? detail.risks
                : [{ text: p.topBlocker, severity: 'medium' as const }]
              ).map(
                (r, i) => (
                  <li
                    key={i}
                    className={`flex gap-2 rounded-sm border px-2.5 py-2 text-[11px] leading-snug ${severityClass(r.severity)}`}
                  >
                    <span className="shrink-0 font-semibold uppercase">{r.severity}</span>
                    <span>{r.text}</span>
                  </li>
                ),
              )}
            </ul>
          </section>
        </div>
      </aside>
    </>
  )
}
