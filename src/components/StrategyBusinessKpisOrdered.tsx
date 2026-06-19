import type { DomainBusinessKpi, DomainExecutiveNarrative } from '../data/types'
import type { SpineDomainRoKey } from '../data/domainRiskOpportunityBullets'
import {
  mseEnablers,
  mseExploration,
  mseGrowthProjects,
  mseTechnologyValue,
  mseValueDelivery,
} from '../data/mseExecutiveSummary'
import { spineKpiBlockAccent, spineKpiBlockBody, spineKpiBlockSurface } from './spineKpiUi'
import { StrategyHorizonKpisTable } from './StrategyHorizonKpisTable'
import { SpineMetricKpiRow } from './SpineMetricKpiRow'
import {
  MseEnablersPanel,
  MseExplorationPanel,
  MseGrowthProjectsPanel,
  MseTechnologyValuePanel,
  MseValueDeliveryPanel,
} from './MseExecutiveSpinePanels'

export type StrategyBusinessKpisOrderedBundle = {
  vd: typeof mseValueDelivery
  gp: typeof mseGrowthProjects
  ex: typeof mseExploration
  tv: typeof mseTechnologyValue
  en: typeof mseEnablers
  kpiPct: number
  kpiTargetPct: number
  techPct: number
}

export function StrategyBusinessKpisOrdered({
  narrative,
  kpisFull,
  spineDomainKey,
  mse,
}: {
  narrative: DomainExecutiveNarrative
  kpisFull: DomainBusinessKpi[]
  spineDomainKey: SpineDomainRoKey
  mse: StrategyBusinessKpisOrderedBundle
}) {
  const ebitdaRow = kpisFull.find((r) => /ebitda bridge/i.test(r.label))
  const horizon = narrative.strategyHorizonKpis
  const hasHorizon = horizon && horizon.length > 0

  return (
    <ul className="m-0 grid list-none gap-2.5 p-0">
      {hasHorizon ? (
        <li className={spineKpiBlockSurface}>
          <div className={spineKpiBlockAccent} aria-hidden />
          <div className={spineKpiBlockBody}>
            <div className="mb-3 flex items-start gap-2.5 sm:items-center">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ma-accent/35 bg-ma-elevated text-[10px] font-bold tabular-nums text-ma-accent">
                1
              </span>
              <p className="text-[13px] font-medium leading-snug text-ma-ink">Strategy trajectory (SAR b)</p>
            </div>
            <StrategyHorizonKpisTable rows={horizon} />
          </div>
        </li>
      ) : null}

      <MseValueDeliveryPanel vd={mse.vd} displayIndex={2} />

      {ebitdaRow ? (
        <SpineMetricKpiRow row={ebitdaRow} displayIndex={3} spineDomainKey={spineDomainKey} />
      ) : null}

      <MseGrowthProjectsPanel
        gp={mse.gp}
        kpiPct={mse.kpiPct}
        kpiTargetPct={mse.kpiTargetPct}
        displayIndex={4}
      />
      <MseExplorationPanel ex={mse.ex} displayIndex={5} />
      <MseTechnologyValuePanel tv={mse.tv} techPct={mse.techPct} displayIndex={6} />
      <MseEnablersPanel en={mse.en} displayIndex={7} />
    </ul>
  )
}
