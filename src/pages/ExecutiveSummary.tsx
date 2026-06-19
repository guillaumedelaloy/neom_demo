import { useMemo } from 'react'
import {
  useDomainNarrative,
  useEnablersData,
  useExplorationData,
  usePortfolioData,
  useStrategicKpisData,
} from '../data'
import { DomainExecutiveSpine } from '../components/DomainExecutiveSpine'
import { buildStrategyStatusKpiRows } from '../lib/domainKpiRows'
import {
  mseEnablers,
  mseExploration,
  mseGrowthProjects,
  mseTechnologyValue,
  mseValueDelivery,
} from '../data/mseExecutiveSummary'

export function ExecutiveSummary() {
  const narrative = useDomainNarrative('strategy-status')
  const portfolioNarrative = useDomainNarrative('portfolio')
  const explorationNarrative = useDomainNarrative('exploration')
  const explorationData = useExplorationData()
  const projects = usePortfolioData()
  const enablers = useEnablersData()
  const strategic = useStrategicKpisData()
  const spineKpis = useMemo(
    () =>
      buildStrategyStatusKpiRows(
        narrative,
        projects,
        enablers,
        strategic,
        portfolioNarrative,
        explorationNarrative,
        explorationData,
      ),
    [
      narrative,
      projects,
      enablers,
      strategic,
      portfolioNarrative,
      explorationNarrative,
      explorationData,
    ],
  )

  const vd = mseValueDelivery
  const gp = mseGrowthProjects
  const ex = mseExploration
  const tv = mseTechnologyValue
  const en = mseEnablers

  const kpi = gp.portfolioKpi
  const kpiMin = kpi.stretch
  const kpiMax = kpi.threshold
  const kpiRange = kpiMax - kpiMin
  const kpiPct = Math.min(100, Math.max(0, ((kpi.value - kpiMin) / kpiRange) * 100))
  const kpiTargetPct = ((kpi.target - kpiMin) / kpiRange) * 100

  const techPct =
    tv.techopsEbitda2026.targetSarBn > 0
      ? (tv.techopsEbitda2026.realizedSarBn / tv.techopsEbitda2026.targetSarBn) * 100
      : 0

  return (
    <div className="space-y-10 pb-8">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ma-muted">
          Monthly Strategy Execution (MSE) · CEO view
        </p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-ma-ink md:text-[24px]">
          Strategy realization cockpit
        </h1>
        <p className="mt-2 max-w-[52rem] text-[13px] leading-relaxed text-ma-muted">
          All figures follow the MSE where provided. Gaps are labeled — nothing is inferred.
        </p>
      </header>

      <DomainExecutiveSpine
        narrative={narrative}
        spineDomainKey="strategy-status"
        kpiRows={spineKpis}
        strategyBusinessKpisBundle={{
          vd,
          gp,
          ex,
          tv,
          en,
          kpiPct,
          kpiTargetPct,
          techPct,
        }}
      />
    </div>
  )
}
