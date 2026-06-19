import { ChevronDown } from 'lucide-react'
import type { DomainBusinessKpi } from '../data/types'
import type { SpineDomainRoKey } from '../data/domainRiskOpportunityBullets'
import { RagDot } from './RagDot'
import {
  EbitdaWaterfallChart,
  QbrMutedLabel,
  VarianceBadge,
  WaterfallBridge,
} from './QbrWaterfallUi'
import { q1EbitdaBridge, q1EbitdaWaterfall } from '../data/qbrFinancials'
import { spineKpiBlockAccent, spineKpiBlockBody, spineKpiBlockSurface } from './spineKpiUi'

function kpiRagDot(status: DomainBusinessKpi['status']) {
  if (status === 'on_track') return 'green' as const
  if (status === 'at_risk') return 'amber' as const
  return 'gray' as const
}

function kpiStressBarWidth(status: DomainBusinessKpi['status']) {
  if (status === 'on_track') return 'w-[88%]'
  if (status === 'neutral') return 'w-[58%]'
  return 'w-[36%]'
}

function kpiStressBarColor(status: DomainBusinessKpi['status']) {
  if (status === 'on_track') return 'bg-ma-teal/80'
  if (status === 'neutral') return 'bg-ma-accent/70'
  return 'bg-ma-amber-warn/85'
}

function showEbitdaBridgeWaterfallInSpine(
  spineDomainKey: SpineDomainRoKey,
  kpiLabel: string,
): boolean {
  return spineDomainKey === 'strategy-status' && /ebitda bridge/i.test(kpiLabel)
}

/** Priority KPI on Technology spine — TechOps EBITDA vs 2026 plan (drives narrative risk). */
function isTechOpsEbitdaHeroKpi(spineDomainKey: SpineDomainRoKey, kpiLabel: string): boolean {
  return (
    spineDomainKey === 'technology' &&
    /2026\s+EBITDA\s+realized\s+from\s+TechOps/i.test(kpiLabel)
  )
}

/** Parse values like "SAR 0.4Bn" or "SAR 2.5Bn" (Bn = billions SAR). */
function parseSarBn(text: string): number | null {
  const m = text.replace(/\u00a0/g, ' ').match(/SAR\s*([\d.]+)\s*Bn/i)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) ? n : null
}

function TechOpsEbitdaPlanChart({ actual, target }: { actual: number; target: number }) {
  const max = Math.max(actual, target, 1e-6)
  const realizedPct = (actual / max) * 100
  const planPct = (target / max) * 100
  const gap = Math.max(0, target - actual)
  const pctOfPlan = target > 0 ? Math.round((actual / target) * 100) : 0

  return (
    <div
      className="mt-4 rounded-md border border-ma-line/70 bg-ma-surface/40 px-3 py-3 dark:bg-ma-charcoal/35"
      role="img"
      aria-label={`Realized ${actual} billion SAR of ${target} billion SAR plan, ${pctOfPlan} percent of plan`}
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ma-muted">
          Actual vs 2026 plan (SAR Bn)
        </p>
        <p className="text-[10px] tabular-nums text-ma-amber-warn">
          <span className="font-semibold">{pctOfPlan}%</span>
          <span className="text-ma-muted"> of plan · </span>
          <span className="font-medium">SAR {gap.toFixed(1)}Bn gap</span>
        </p>
      </div>
      <div className="mt-3 space-y-2.5">
        <div>
          <div className="mb-1 flex justify-between text-[10px] font-medium text-ma-ink">
            <span>Realized (YTD)</span>
            <span className="font-mono tabular-nums text-ma-accent">SAR {actual}Bn</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-ma-line/55 ring-1 ring-inset ring-ma-line/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-ma-amber-warn to-ma-amber-warn/75 shadow-sm transition-[width] duration-500 ease-out motion-reduce:transition-none"
              style={{ width: `${realizedPct}%` }}
            />
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-[10px] font-medium text-ma-muted">
            <span>2026 full-year plan</span>
            <span className="font-mono tabular-nums text-ma-ink/80">SAR {target}Bn</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-ma-line/55 ring-1 ring-inset ring-ma-line/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-ma-accent/70 via-ma-accent/50 to-ma-teal/35"
              style={{ width: `${planPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export type SpineMetricKpiRowProps = {
  row: DomainBusinessKpi
  /** Shown in the numbered circle (1-based). */
  displayIndex: number
  spineDomainKey: SpineDomainRoKey
}

const heroKpiSurface =
  'relative overflow-hidden rounded-lg border-2 border-ma-accent/45 bg-gradient-to-br from-ma-accent/[0.12] via-ma-elevated to-ma-surface/25 px-4 py-4 shadow-[0_6px_28px_rgba(184,149,106,0.14)] ring-1 ring-ma-accent/20 transition-[box-shadow,border-color] duration-200 ease-out hover:border-ma-accent/60 hover:shadow-[0_8px_32px_rgba(184,149,106,0.18)] motion-reduce:transition-none dark:from-ma-accent/[0.08] dark:via-ma-elevated dark:to-ma-charcoal/30 dark:ring-ma-accent/15'

const heroKpiAccent =
  'pointer-events-none absolute inset-y-0 left-0 z-0 w-1.5 bg-gradient-to-b from-ma-accent via-ma-amber-warn/80 to-ma-teal/40 opacity-95'

export function SpineMetricKpiRow({ row, displayIndex, spineDomainKey }: SpineMetricKpiRowProps) {
  const showWaterfall = showEbitdaBridgeWaterfallInSpine(spineDomainKey, row.label)
  const heroEbitda = isTechOpsEbitdaHeroKpi(spineDomainKey, row.label)
  const actualBn = heroEbitda ? parseSarBn(row.value) : null
  const targetBn = heroEbitda ? parseSarBn(row.target) : null
  const showEbitdaChart = heroEbitda && actualBn != null && targetBn != null
  const useHeroShell = heroEbitda

  return (
    <li className={useHeroShell ? heroKpiSurface : spineKpiBlockSurface}>
      <div className={useHeroShell ? heroKpiAccent : spineKpiBlockAccent} aria-hidden />
      <div
        className={`${spineKpiBlockBody} flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 ${useHeroShell ? 'pl-3 sm:pl-4' : ''}`}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex items-start gap-2.5 sm:items-center">
            <span
              className={`flex shrink-0 items-center justify-center rounded-full border border-ma-accent/40 bg-ma-elevated font-bold tabular-nums text-ma-accent shadow-sm ${
                useHeroShell ? 'h-9 w-9 text-[11px]' : 'h-7 w-7 text-[10px]'
              }`}
            >
              {displayIndex}
            </span>
            <div className="min-w-0">
              {useHeroShell ? (
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-ma-accent">
                  Priority KPI
                </p>
              ) : null}
              <span
                className={`min-w-0 leading-snug text-ma-ink ${
                  useHeroShell ? 'text-[15px] font-semibold tracking-tight' : 'text-[13px] font-medium'
                }`}
              >
                {row.label}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-9 sm:pl-0">
          <div className={useHeroShell ? 'min-w-[6rem]' : 'min-w-[5.5rem]'}>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-ma-muted">Value</p>
            <p
              className={`font-mono font-semibold tabular-nums text-ma-accent ${
                useHeroShell ? 'text-[18px] leading-none' : 'text-[14px]'
              }`}
            >
              {row.value}
            </p>
            {!showEbitdaChart ? (
              <div
                className={`mt-1 h-1 w-full overflow-hidden rounded-full bg-ma-line/60 ${useHeroShell ? 'max-w-[10rem]' : 'max-w-[7rem]'}`}
              >
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none ${kpiStressBarWidth(row.status)} ${kpiStressBarColor(row.status)}`}
                />
              </div>
            ) : null}
          </div>
          <div className={`min-w-[6rem] max-w-[14rem] ${useHeroShell ? 'sm:max-w-[16rem]' : ''}`}>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-ma-muted">Target</p>
            <p className={`leading-snug text-ma-muted ${useHeroShell ? 'text-[13px] font-medium text-ma-ink/75' : 'text-[12px]'}`}>
              {row.target}
            </p>
          </div>
          <div
            className={`flex items-center gap-1.5 rounded-full border bg-ma-elevated/80 px-2 py-1 ${
              useHeroShell ? 'border-ma-amber-warn/45 py-1.5 shadow-sm' : 'border-ma-line/80'
            }`}
          >
            <RagDot color={kpiRagDot(row.status)} size={useHeroShell ? 10 : 9} />
            <span className={`font-medium capitalize text-ma-muted ${useHeroShell ? 'text-[12px]' : 'text-[11px]'}`}>
              {row.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>
      {showEbitdaChart ? <TechOpsEbitdaPlanChart actual={actualBn} target={targetBn} /> : null}
      {showWaterfall ? (
        <div className="relative mt-4 border-t border-ma-line/60 pt-4 pl-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <QbrMutedLabel>Q2 2026 EBITDA waterfall ($M)</QbrMutedLabel>
            <VarianceBadge v="-8%" />
          </div>
          <EbitdaWaterfallChart bars={q1EbitdaWaterfall} />
          <details className="group/bridge mt-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-[11px] font-semibold text-ma-muted [&::-webkit-details-marker]:hidden">
              <ChevronDown
                className="size-3.5 transition-transform duration-200 group-open/bridge:rotate-180"
                aria-hidden
              />
              View detailed breakdown
            </summary>
            <div className="mt-3">
              <WaterfallBridge items={q1EbitdaBridge} unit="$M" />
            </div>
          </details>
        </div>
      ) : null}
    </li>
  )
}
