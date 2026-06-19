import { useMemo } from 'react'
import { useDomainNarrative, useRiskData } from '../data'
import { DomainExecutiveSpine } from '../components/DomainExecutiveSpine'
import { ConsolidatedRiskHeatmap } from '../components/ConsolidatedRiskHeatmap'

const EMPTY_KPIS: never[] = []

export function RiskFinance() {
  const risk = useRiskData()
  const narrative = useDomainNarrative('risk')

  const heatmapExtension = useMemo(
    () => <ConsolidatedRiskHeatmap risks={risk.consolidatedRiskMap} />,
    [risk.consolidatedRiskMap],
  )

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ma-muted">
          Foundation · Funding & risk
        </p>
        <h1 className="text-[22px] font-semibold tracking-tight text-ma-ink">Risks</h1>
        <p className="mt-1 text-[13px] leading-snug text-ma-muted">
          Enterprise risk register, key risk movements, and financial stress indicators.
        </p>
      </header>

      <DomainExecutiveSpine
        narrative={narrative}
        spineDomainKey="risk"
        kpiRows={EMPTY_KPIS}
        businessKpiExtension={heatmapExtension}
        hideRiskSection
      />
    </div>
  )
}
