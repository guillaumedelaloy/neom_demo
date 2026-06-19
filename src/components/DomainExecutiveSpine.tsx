import type { ReactNode } from 'react'
import { useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { AlertTriangle, ChevronDown, Compass, Gauge, Sparkles } from 'lucide-react'
import type { DomainBusinessKpi, DomainExecutiveNarrative } from '../data/types'
import {
  getDomainRiskOpportunityBullets,
  type RiskOpportunityBullet,
  type SpineDomainRoKey,
} from '../data/domainRiskOpportunityBullets'
import { RagDot } from './RagDot'
import { deriveOpportunityFromKpis, deriveRiskFromKpis } from '../lib/domainDerivations'
import { spineKpiBlockAccent, spineKpiBlockBody, spineKpiBlockSurface } from './spineKpiUi'
import { SpineMetricKpiRow } from './SpineMetricKpiRow'
import { StrategyBusinessKpisOrdered, type StrategyBusinessKpisOrderedBundle } from './StrategyBusinessKpisOrdered'
import { StrategyHorizonKpisTable } from './StrategyHorizonKpisTable'

function kpiRagDot(status: DomainBusinessKpi['status']) {
  if (status === 'on_track') return 'green' as const
  if (status === 'at_risk') return 'amber' as const
  return 'gray' as const
}

function severityStyles(sev: 'high' | 'medium' | 'low') {
  if (sev === 'high')
    return {
      wrap: 'bg-[color-mix(in_srgb,var(--ma-risk)_12%,var(--ma-elevated))]',
      pill: 'border-ma-risk/35 bg-ma-risk/15 text-ma-risk',
      bar: 'from-ma-risk/50 to-transparent',
    }
  if (sev === 'medium')
    return {
      wrap: 'bg-[color-mix(in_srgb,var(--ma-amber-warn)_10%,var(--ma-elevated))]',
      pill: 'border-ma-amber-warn/40 bg-ma-amber-warn/15 text-ma-amber-warn',
      bar: 'from-ma-amber-warn/45 to-transparent',
    }
  return {
    wrap: 'bg-[color-mix(in_srgb,var(--ma-teal)_8%,var(--ma-elevated))]',
    pill: 'border-ma-teal/35 bg-ma-teal/12 text-ma-teal',
    bar: 'from-ma-teal/40 to-transparent',
  }
}

const sectionTitle =
  'text-[12px] font-semibold uppercase tracking-[0.14em] text-ma-graphite'

const spineFocusRing =
  'outline-none transition-colors duration-200 ease-out focus-visible:ring-2 focus-visible:ring-ma-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ma-elevated motion-reduce:transition-none dark:focus-visible:ring-offset-ma-elevated'

const spineBtnSecondary =
  `${spineFocusRing} inline-flex min-h-11 items-center justify-center gap-1 rounded-md border border-ma-line bg-ma-surface/50 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-ma-muted hover:border-ma-teal/45 hover:text-ma-ink active:bg-ma-surface/80 motion-reduce:active:scale-100 dark:bg-ma-charcoal/40 dark:active:bg-ma-charcoal/60 sm:min-h-10 sm:px-2.5 sm:py-2`

const spineAiDisclaimer =
  'relative mt-4 rounded-sm border border-ma-line/80 bg-ma-surface/40 px-2.5 py-2 text-[10px] leading-snug text-ma-muted dark:bg-ma-charcoal/50'

const SPINE_AI_DISCLAIMER_COPY = 'AI generated and tentative'

function SpineRoBulletList({
  items,
  variant,
}: {
  items: RiskOpportunityBullet[]
  variant: 'risk' | 'opportunity'
}) {
  const bar = variant === 'risk' ? 'border-ma-risk/40' : 'border-ma-accent/45'
  return (
    <ul className="relative space-y-2">
      {items.map((item, i) => (
        <li key={i}>
          <details className="group/ro rounded-md border border-ma-line/80 bg-ma-surface/25 open:border-ma-line open:bg-ma-surface/40 dark:bg-ma-charcoal/25 dark:open:bg-ma-charcoal/40">
            <summary className="flex cursor-pointer list-none items-start gap-2 px-3 py-2.5 text-left [&::-webkit-details-marker]:hidden">
              <ChevronDown
                className="mt-0.5 size-4 shrink-0 text-ma-muted transition-transform duration-200 ease-out group-open/ro:rotate-180 motion-reduce:transition-none"
                aria-hidden
              />
              <span className="min-w-0 text-[12px] font-medium leading-snug text-ma-ink/95">
                {item.highlight}
              </span>
            </summary>
            <p
              className={`mx-3 mb-3 ml-9 border-l-2 ${bar} pl-3 text-[12px] leading-relaxed text-ma-ink/88`}
            >
              {item.detail}
            </p>
          </details>
        </li>
      ))}
    </ul>
  )
}

type SpineDetailsSectionProps = {
  detailsRef: React.RefObject<HTMLDetailsElement | null>
  sectionSlug: 'objectives' | 'kpis' | 'risk' | 'opportunity'
  /** Initial open state (DOM only; details stay native-toggle after mount). */
  defaultOpen: boolean
  /** When this changes (e.g. route), reset `<details>` to `defaultOpen` so sections stay collapsed across pages. */
  resetOpenKey: string
  title: string
  icon: ReactNode
  accentClass: string
  summaryMeta?: ReactNode
  children: ReactNode
}

function SpineDetailsSection({
  detailsRef,
  sectionSlug,
  defaultOpen,
  resetOpenKey,
  title,
  icon,
  accentClass,
  summaryMeta,
  children,
}: SpineDetailsSectionProps) {
  const headingId = `spine-heading-${sectionSlug}`

  useLayoutEffect(() => {
    const el = detailsRef.current
    if (el) el.open = defaultOpen
  }, [defaultOpen, resetOpenKey])

  return (
    <details
      ref={detailsRef}
      aria-labelledby={headingId}
      className={`group/d relative overflow-hidden rounded-lg border border-ma-line bg-ma-elevated shadow-[0_2px_8px_rgba(15,18,16,0.06)] ring-1 ring-ma-line/40 open:ring-ma-accent/20 dark:shadow-[0_2px_12px_rgba(0,0,0,0.35)] dark:ring-white/[0.06] dark:open:ring-ma-accent/15 ${accentClass} open:[&_.spine-summary-preview]:hidden open:[&_.spine-chevron]:rotate-180 motion-reduce:open:[&_.spine-chevron]:rotate-0`}
    >
      <summary className="relative cursor-pointer list-none rounded-lg outline-none transition-colors duration-200 ease-out hover:bg-ma-surface/50 focus-visible:bg-ma-surface/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ma-accent/45 motion-reduce:transition-none dark:hover:bg-ma-charcoal/35 dark:focus-visible:bg-ma-charcoal/35 [&::-webkit-details-marker]:hidden">
        <span className="sr-only">Show or hide: {title}. Enter or Space to toggle.</span>
        <div className="relative px-4 pb-3 pt-3.5 sm:px-5 sm:pb-3.5 sm:pt-4">
          <div className="flex flex-wrap items-start gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-ma-line bg-ma-surface/80 text-ma-accent shadow-sm transition-colors duration-200 ease-out group-hover/d:border-ma-accent/40 motion-reduce:transition-none dark:bg-ma-charcoal/80"
              aria-hidden
            >
              {icon}
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={headingId} className={sectionTitle}>
                {title}
              </h2>
              {summaryMeta ? (
                <div className="spine-summary-preview mt-2 border-t border-ma-line/60 pt-2">
                  {summaryMeta}
                </div>
              ) : null}
            </div>
            <span
              className="spine-chevron ml-auto flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-md border border-ma-line/80 bg-ma-surface/50 px-2 py-1 text-ma-muted transition-transform duration-200 ease-out motion-reduce:transition-none dark:bg-ma-charcoal/60 sm:min-h-9 sm:min-w-9"
              aria-hidden
            >
              <ChevronDown className="size-4 sm:size-3.5" />
            </span>
          </div>
        </div>
      </summary>
      <div className="border-t border-ma-line/70 px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">{children}</div>
    </details>
  )
}

type DomainExecutiveSpineProps = {
  narrative: DomainExecutiveNarrative
  /** Domain tab key — selects Risk / Opportunity bullet library for the spine. */
  spineDomainKey: SpineDomainRoKey
  /** When supplied (≥5 rows), replaces narrative KPI rows for display and derivation. */
  kpiRows?: DomainBusinessKpi[]
  /** Strategy-status only: fixed-order Business KPIs body (trajectory → MSE → EBITDA). */
  strategyBusinessKpisBundle?: StrategyBusinessKpisOrderedBundle
  /** Rendered inside Business KPIs (below the KPI body), for any domain — e.g. operating tables. */
  businessKpiExtension?: ReactNode
  /** Hide the Risk spine section entirely (e.g. when the domain IS risk). */
  hideRiskSection?: boolean
}

export function DomainExecutiveSpine({
  narrative,
  spineDomainKey,
  kpiRows,
  strategyBusinessKpisBundle,
  businessKpiExtension,
  hideRiskSection,
}: DomainExecutiveSpineProps) {
  const { pathname } = useLocation()
  const spineSectionResetKey = useMemo(() => `${pathname}::${spineDomainKey}`, [pathname, spineDomainKey])

  const kpisFull =
    kpiRows != null ? kpiRows : narrative.businessKpis.slice(0, 5)
  const useStrategyOrderedKpis =
    spineDomainKey === 'strategy-status' && strategyBusinessKpisBundle != null
  const kpisList = kpisFull
  const risk = narrative.riskOverride ?? deriveRiskFromKpis(kpisFull)
  const opp = narrative.opportunityOverride ?? deriveOpportunityFromKpis(kpisFull)
  const sev = severityStyles(risk.severity)
  const roPack = getDomainRiskOpportunityBullets(spineDomainKey)

  const detailsObj = useRef<HTMLDetailsElement>(null)
  const detailsKpi = useRef<HTMLDetailsElement>(null)
  const detailsRisk = useRef<HTMLDetailsElement>(null)
  const detailsOpp = useRef<HTMLDetailsElement>(null)

  const setAllDetails = useCallback((open: boolean) => {
    for (const r of [detailsObj, detailsKpi, detailsRisk, detailsOpp]) {
      if (r.current) r.current.open = open
    }
  }, [])

  const riskPreviewSource = roPack.risks[0]?.highlight ?? risk.title

  const introShort =
    narrative.strategicObjectivesIntro.length > 120
      ? `${narrative.strategicObjectivesIntro.slice(0, 118).trimEnd()}…`
      : narrative.strategicObjectivesIntro

  const oppPreviewSource = roPack.opportunities[0]?.highlight ?? opp.headline

  return (
    <div className="relative">
      <div className="mb-3 flex flex-col gap-2 sm:pl-7 sm:pr-0">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ma-muted">
            Executive spine
          </p>
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
            <button type="button" onClick={() => setAllDetails(true)} className={spineBtnSecondary}>
              Expand all
            </button>
            <button type="button" onClick={() => setAllDetails(false)} className={spineBtnSecondary}>
              Collapse all
            </button>
          </div>
        </div>
      </div>

      <div
        className="pointer-events-none absolute bottom-0 left-[18px] top-[3.25rem] hidden w-px bg-gradient-to-b from-ma-accent/50 via-ma-teal/35 to-ma-accent/25 sm:block"
        aria-hidden
      />
      <div className="space-y-4 sm:pl-7">
            <SpineDetailsSection
              key={`spine-obj-${spineSectionResetKey}`}
              detailsRef={detailsObj}
              sectionSlug="objectives"
              defaultOpen={false}
              resetOpenKey={spineSectionResetKey}
              title="Strategic objectives"
              icon={<Compass className="size-[18px] stroke-[1.75]" aria-hidden />}
              accentClass="border-t-[3px] border-t-ma-accent/55"
              summaryMeta={
                <p className="line-clamp-2 text-[12px] leading-snug text-ma-muted">{introShort}</p>
              }
            >
              <p className="max-w-prose text-[13px] leading-relaxed text-ma-ink/90">
                {narrative.strategicObjectivesIntro}
              </p>
              <ol className="relative mt-5 space-y-0 pl-0">
                {narrative.milestones.map((m, i) => (
                  <li key={m.title} className="relative flex gap-3 pb-6 last:pb-0 sm:gap-4">
                    <div className="relative flex shrink-0 flex-col items-center pt-0.5">
                      <span className="relative z-[1] flex h-8 w-8 items-center justify-center rounded-full border-2 border-ma-accent/50 bg-ma-elevated text-[11px] font-bold tabular-nums text-ma-accent shadow-sm">
                        {i + 1}
                      </span>
                      {i < narrative.milestones.length - 1 ? (
                        <span
                          className="absolute left-1/2 top-8 h-[calc(100%-0.25rem)] w-px -translate-x-1/2 bg-gradient-to-b from-ma-accent/45 to-ma-line"
                          aria-hidden
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1 rounded-md border border-ma-line/90 bg-ma-surface/35 px-3 py-2.5 dark:bg-ma-charcoal/40">
                      <p className="text-[13px] font-semibold leading-snug text-ma-ink">{m.title}</p>
                      <p className="mt-1.5 max-w-prose text-[12px] leading-relaxed text-ma-muted">{m.whereWeStand}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </SpineDetailsSection>

            <SpineDetailsSection
              key={`spine-kpi-${spineSectionResetKey}`}
              detailsRef={detailsKpi}
              sectionSlug="kpis"
              defaultOpen={false}
              resetOpenKey={spineSectionResetKey}
              title="Business KPIs"
              icon={<Gauge className="size-[18px] stroke-[1.75]" aria-hidden />}
              accentClass="border-t-[3px] border-t-ma-teal/50"
              summaryMeta={
                <div className="flex flex-wrap gap-1">
                  {kpisFull.map((row) => (
                    <span
                      key={row.label}
                      className="inline-flex items-center gap-0.5 rounded border border-ma-line/80 bg-ma-elevated/90 px-1.5 py-0.5"
                      title={row.label}
                      aria-label={`${row.label}: ${row.status.replace('_', ' ')}`}
                    >
                      <RagDot color={kpiRagDot(row.status)} size={7} />
                    </span>
                  ))}
                </div>
              }
            >
              {useStrategyOrderedKpis && strategyBusinessKpisBundle ? (
                <>
                  <StrategyBusinessKpisOrdered
                    narrative={narrative}
                    kpisFull={kpisFull}
                    spineDomainKey={spineDomainKey}
                    mse={strategyBusinessKpisBundle}
                  />
                  {businessKpiExtension ? (
                    <div className="mt-2.5 border-t border-ma-line/60 pt-2.5">{businessKpiExtension}</div>
                  ) : null}
                </>
              ) : (
                <>
                  {kpisList.length > 0 && (
                    <ul className="grid gap-2.5">
                      {kpisList.map((row, i) => (
                        <SpineMetricKpiRow
                          key={row.label}
                          row={row}
                          displayIndex={i + 1}
                          spineDomainKey={spineDomainKey}
                        />
                      ))}
                    </ul>
                  )}
                  {businessKpiExtension ? (
                    <div className={kpisList.length > 0 ? 'mt-2.5 border-t border-ma-line/60 pt-2.5' : ''}>{businessKpiExtension}</div>
                  ) : null}
                  {narrative.strategyHorizonKpis && narrative.strategyHorizonKpis.length > 0 ? (
                    <div className="mt-2.5 border-t border-ma-line/60 pt-2.5">
                      <ul className="m-0 grid list-none gap-2.5 p-0">
                        <li className={spineKpiBlockSurface}>
                          <div className={spineKpiBlockAccent} aria-hidden />
                          <div className={spineKpiBlockBody}>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-ma-muted">
                              Strategy trajectory (SAR b)
                            </p>
                            <StrategyHorizonKpisTable rows={narrative.strategyHorizonKpis} />
                          </div>
                        </li>
                      </ul>
                    </div>
                  ) : null}
                </>
              )}
            </SpineDetailsSection>

            {!hideRiskSection && (
              <SpineDetailsSection
                key={`spine-risk-${spineSectionResetKey}`}
                detailsRef={detailsRisk}
                sectionSlug="risk"
                defaultOpen={false}
                resetOpenKey={spineSectionResetKey}
                title="Risk"
                icon={<AlertTriangle className="size-[18px] stroke-[1.75]" aria-hidden />}
                accentClass={`border-t-[3px] border-t-ma-risk/50 ${sev.wrap}`}
                summaryMeta={
                  <p className="line-clamp-2 text-[12px] font-medium text-ma-ink/90">
                    {riskPreviewSource}
                  </p>
                }
              >
                <div
                  className={`pointer-events-none absolute bottom-0 right-0 h-28 w-36 rounded-tl-[4rem] bg-gradient-to-tl ${sev.bar} opacity-95`}
                  aria-hidden
                />
                <div className="relative flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${sev.pill}`}
                  >
                    {risk.severity}
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-wide text-ma-muted">
                    {roPack.risks.length} themes
                  </span>
                </div>
                <SpineRoBulletList items={roPack.risks} variant="risk" />
                <p className={spineAiDisclaimer}>{SPINE_AI_DISCLAIMER_COPY}</p>
              </SpineDetailsSection>
            )}

            <SpineDetailsSection
              key={`spine-opp-${spineSectionResetKey}`}
              detailsRef={detailsOpp}
              sectionSlug="opportunity"
              defaultOpen={false}
              resetOpenKey={spineSectionResetKey}
              title="Opportunity"
              icon={<Sparkles className="size-[18px] stroke-[1.75]" aria-hidden />}
              accentClass="border-t-[3px] border-t-ma-accent/60 bg-[color-mix(in_srgb,var(--ma-accent)_7%,var(--ma-elevated))] dark:bg-[color-mix(in_srgb,var(--ma-accent)_9%,var(--ma-elevated))]"
              summaryMeta={
                <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-ma-accent">
                  {oppPreviewSource}
                </p>
              }
            >
              <div
                className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--ma-teal)_18%,transparent),transparent_70%)]"
                aria-hidden
              />
              <p className="relative mb-3 text-[11px] font-semibold uppercase tracking-wide text-ma-muted">
                {roPack.opportunities.length} themes
              </p>
              <SpineRoBulletList items={roPack.opportunities} variant="opportunity" />
              <p className={spineAiDisclaimer}>{SPINE_AI_DISCLAIMER_COPY}</p>
            </SpineDetailsSection>
      </div>
    </div>
  )
}
