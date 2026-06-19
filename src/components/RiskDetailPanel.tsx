import { useEffect } from 'react'
import { ChevronLeft, ChevronRight, Minus, TrendingUp, X } from 'lucide-react'
import type { ConsolidatedRiskDetail, ConsolidatedRiskEntry } from '../data/types'

const RATING_STEPS = ['Low', 'Medium', 'Significant', 'High', 'Critical'] as const

/** Map numeric score to active step on the 5-level bar (Excom-style). */
function activeRatingStep(score: number): number {
  if (score >= 38) return 4
  if (score >= 33) return 3
  if (score >= 28) return 2
  if (score >= 22) return 1
  return 0
}

function MovementLine({ m }: { m: ConsolidatedRiskEntry['movement'] }) {
  if (m === 'increasing')
    return (
      <span className="inline-flex items-center gap-1 text-ma-risk">
        <TrendingUp className="size-3.5" />
        <span className="text-[10px] font-medium">Increasing</span>
      </span>
    )
  if (m === 'decreasing')
    return (
      <span className="inline-flex items-center gap-1 text-ma-teal">
        <TrendingUp className="size-3.5 rotate-180" />
        <span className="text-[10px] font-medium">Decreasing</span>
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 text-ma-muted">
      <Minus className="size-3.5" />
      <span className="text-[10px]">Stable</span>
    </span>
  )
}

function InterdependencyPlot({
  quadrant,
  markerId,
}: {
  quadrant: NonNullable<ConsolidatedRiskDetail['interdependencyQuadrant']>
  markerId: number
}) {
  const pos: Record<typeof quadrant, string> = {
    tl: 'left-[22%] top-[22%] -translate-x-1/2 -translate-y-1/2',
    tr: 'left-[78%] top-[22%] -translate-x-1/2 -translate-y-1/2',
    bl: 'left-[22%] top-[78%] -translate-x-1/2 -translate-y-1/2',
    br: 'left-[78%] top-[78%] -translate-x-1/2 -translate-y-1/2',
  }
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[220px] rounded-md border border-ma-line bg-ma-surface/30 p-1">
      <div className="absolute inset-3 rounded-sm border border-ma-line/60 bg-ma-bg/50">
        <div className="absolute left-1/2 top-2 bottom-2 w-px -translate-x-1/2 bg-ma-line/70" aria-hidden />
        <div className="absolute left-2 right-2 top-1/2 h-px -translate-y-1/2 bg-ma-line/70" aria-hidden />
        <span className="absolute left-1 top-1 max-w-[45%] text-[7px] font-semibold uppercase leading-tight text-ma-muted">
          Highly influenced
        </span>
        <span className="absolute right-1 top-1 max-w-[45%] text-right text-[7px] font-semibold uppercase leading-tight text-ma-muted">
          Systemic risks
        </span>
        <span className="absolute bottom-1 left-1 max-w-[45%] text-[7px] font-semibold uppercase leading-tight text-ma-muted">
          Autonomous
        </span>
        <span className="absolute bottom-1 right-1 max-w-[45%] text-right text-[7px] font-semibold uppercase leading-tight text-ma-muted">
          Key influencer
        </span>
        <span
          className={`absolute flex size-8 items-center justify-center rounded-full border-2 border-ma-accent bg-ma-accent/90 text-[11px] font-bold text-ma-ink shadow-sm ${pos[quadrant]}`}
        >
          {markerId}
        </span>
      </div>
    </div>
  )
}

type RiskDetailPanelProps = {
  risk: ConsolidatedRiskEntry
  detail: ConsolidatedRiskDetail | undefined
  open: boolean
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  hasPrev: boolean
  hasNext: boolean
}

export function RiskDetailPanel({
  risk,
  detail,
  open,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: RiskDetailPanelProps) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  const step = activeRatingStep(risk.score)

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[60] bg-ma-charcoal/45 backdrop-blur-[1px] transition-opacity dark:bg-black/55"
        aria-label="Close risk details"
        onClick={onClose}
      />
      <aside
        className="fixed z-[70] flex max-h-[100dvh] w-full flex-col border-ma-line bg-ma-elevated shadow-[0_0_0_1px_rgba(15,18,16,0.06)] max-md:inset-0 md:right-0 md:top-0 md:h-full md:max-w-[min(560px,100vw-24px)] md:border-l"
        role="dialog"
        aria-modal="true"
        aria-labelledby="risk-detail-title"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-ma-line px-4 py-3">
          <div className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              className="rounded-sm p-2 text-ma-muted transition hover:bg-ma-surface hover:text-ma-ink disabled:opacity-30"
              onClick={onPrev}
              disabled={!hasPrev}
              aria-label="Previous risk"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              className="rounded-sm p-2 text-ma-muted transition hover:bg-ma-surface hover:text-ma-ink disabled:opacity-30"
              onClick={onNext}
              disabled={!hasNext}
              aria-label="Next risk"
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
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ma-muted">
              Consolidated risk · {risk.tier}
            </p>
            <h2 id="risk-detail-title" className="mt-1 text-lg font-semibold leading-snug tracking-tight text-ma-ink">
              {risk.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                  risk.ratingClass === 'H'
                    ? 'border-ma-risk/40 bg-ma-risk/15 text-ma-risk'
                    : 'border-ma-amber-warn/40 bg-ma-amber-warn/15 text-ma-amber-warn'
                }`}
              >
                {risk.ratingLabel}
              </span>
              <MovementLine m={risk.movement} />
            </div>
          </header>

          <section className="mt-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ma-graphite">
              Risk rating
            </h3>
            <div className="mt-2 flex rounded-md border border-ma-line bg-ma-surface/40 p-1">
              {RATING_STEPS.map((label, i) => (
                <div
                  key={label}
                  className={`flex min-h-10 flex-1 items-center justify-center rounded-sm px-1 text-center text-[9px] font-semibold uppercase leading-tight ${
                    i === step
                      ? 'bg-ma-risk text-white shadow-sm'
                      : 'text-ma-muted/70'
                  }`}
                >
                  {label}
                  {i === step ? (
                    <span className="mt-0.5 block text-[8px] font-bold tabular-nums opacity-95">{risk.ratingLabel}</span>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          {(detail?.riskOwner || detail?.influencedBy || detail?.influences) && (
            <section className="mt-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ma-graphite">
                Ownership &amp; interdependencies
              </h3>
              <div className="mt-2 grid gap-3 sm:grid-cols-2 sm:gap-4">
                <div className="space-y-2 rounded-md border border-ma-line/80 bg-ma-surface/30 px-3 py-2.5">
                  {detail.riskOwner ? (
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-ma-muted">Risk owner</p>
                      <p className="mt-0.5 text-[12px] leading-snug text-ma-ink">{detail.riskOwner}</p>
                    </div>
                  ) : null}
                  {detail.influencedBy ? (
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-ma-muted">Influenced by</p>
                      <p className="mt-0.5 text-[12px] leading-snug text-ma-ink/90">{detail.influencedBy}</p>
                    </div>
                  ) : null}
                  {detail.influences ? (
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-ma-muted">Influences</p>
                      <p className="mt-0.5 text-[12px] leading-snug text-ma-ink/90">{detail.influences}</p>
                    </div>
                  ) : null}
                </div>
                {detail.interdependencyQuadrant ? (
                  <div className="rounded-md border border-ma-line/80 bg-ma-surface/30 px-2 py-2">
                    <p className="mb-1 text-center text-[9px] font-semibold uppercase tracking-wide text-ma-muted">
                      Interdependency
                    </p>
                    <InterdependencyPlot quadrant={detail.interdependencyQuadrant} markerId={risk.id} />
                  </div>
                ) : null}
              </div>
            </section>
          )}

          {detail?.highlightBullets?.length ? (
            <section className="mt-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ma-graphite">
                Highlights
              </h3>
              <ul className="mt-2 list-disc space-y-2 pl-4 text-[12px] leading-relaxed text-ma-ink/90">
                {detail.highlightBullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </section>
          ) : risk.movementRationale ? (
            <section className="mt-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ma-graphite">
                Movement rationale
              </h3>
              <p className="mt-2 text-[12px] leading-relaxed text-ma-ink/90">{risk.movementRationale}</p>
            </section>
          ) : null}

          {detail?.portfolioStageRows?.length ? (
            <section className="mt-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ma-graphite">
                {risk.id === 1 ? 'Development portfolio stage' : 'Key indicators'}
              </h3>
              <div className="mt-2 overflow-x-auto rounded-md border border-ma-line">
                <table className="w-full border-collapse text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-ma-line bg-[color-mix(in_srgb,var(--ma-accent)_22%,var(--ma-graphite))] text-white">
                      <th className="px-2.5 py-2 font-semibold uppercase tracking-wide">Stage</th>
                      <th className="px-2.5 py-2 font-semibold uppercase tracking-wide">Current</th>
                      <th className="px-2.5 py-2 font-semibold uppercase tracking-wide">Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.portfolioStageRows.map((row) => (
                      <tr key={row.label} className="border-b border-ma-line/60 last:border-0">
                        <td className="px-2.5 py-2 font-medium text-ma-ink">{row.label}</td>
                        <td className="px-2.5 py-2 tabular-nums text-ma-ink/90">{row.current}</td>
                        <td className="px-2.5 py-2 tabular-nums text-ma-muted">{row.target}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {(detail?.probabilityNarrative ||
            detail?.impactNarrative ||
            detail?.financialExposureMn) && (
            <section className="mt-5 border-t border-ma-line pt-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ma-graphite">
                Individual risk exposure
                {risk.ratingClass === 'H' ? (
                  <span className="ml-1 align-super text-[9px] font-bold text-ma-risk" title="Footnote below">
                    ¹
                  </span>
                ) : null}
              </h3>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {detail.probabilityNarrative ? (
                  <div className="rounded-sm border border-ma-line bg-ma-bg/80 px-3 py-2">
                    <p className="text-[9px] font-semibold uppercase text-ma-muted">Probability</p>
                    <p className="mt-0.5 text-[12px] font-medium text-ma-ink">{detail.probabilityNarrative}</p>
                    {detail.probabilityPct ? (
                      <p className="mt-0.5 text-[11px] text-ma-muted">Average {detail.probabilityPct}</p>
                    ) : null}
                  </div>
                ) : null}
                {detail.impactNarrative ? (
                  <div className="rounded-sm border border-ma-line bg-ma-bg/80 px-3 py-2">
                    <p className="text-[9px] font-semibold uppercase text-ma-muted">Impact</p>
                    <p className="mt-0.5 text-[12px] font-medium text-ma-ink">{detail.impactNarrative}</p>
                    {detail.impactPct ? (
                      <p className="mt-0.5 text-[11px] text-ma-muted">Average {detail.impactPct}</p>
                    ) : null}
                  </div>
                ) : null}
                {detail.financialExposureMn ? (
                  <div className="rounded-sm border border-ma-line bg-ma-bg/80 px-3 py-2 sm:col-span-2">
                    <p className="text-[9px] font-semibold uppercase text-ma-muted">Fin. exposure / ind. exposure</p>
                    <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-ma-accent">
                      {detail.financialExposureMn} <span className="text-[12px] font-medium text-ma-muted">Mn SAR</span>
                    </p>
                  </div>
                ) : null}
              </div>
              {detail.exposureFootnote ? (
                <p className="mt-2 text-[9px] leading-snug text-ma-muted">¹ {detail.exposureFootnote}</p>
              ) : null}
            </section>
          )}
        </div>
      </aside>
    </>
  )
}
