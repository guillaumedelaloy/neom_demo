import type {
  DomainBusinessKpi,
  DomainExecutiveNarrative,
  DomainKpiRag,
  EnablersData,
  ExplorationData,
  PeopleData,
  Project,
  RiskData,
  StrategicKpisData,
  TechnologyData,
} from '../data/types'
import { groupQ1 } from '../data/qbrFinancials'
import { capitalDeployed, projectStatusCounts, weightedProgressKpi } from './portfolioMath'

function cloneRow(base: DomainBusinessKpi, patch: Partial<DomainBusinessKpi>): DomainBusinessKpi {
  return { ...base, ...patch }
}

export function buildStrategyStatusKpiRows(
  narrative: DomainExecutiveNarrative,
  projects: Project[],
  _enablers: EnablersData,
  strategic: StrategicKpisData,
  portfolioNarrative: DomainExecutiveNarrative,
  explorationNarrative: DomainExecutiveNarrative,
  explorationData: ExplorationData,
): DomainBusinessKpi[] {
  const b = narrative.businessKpis
  const w = weightedProgressKpi(projects)
  const wRag: DomainKpiRag = w <= 1.05 ? 'on_track' : w <= 1.1 ? 'neutral' : 'at_risk'

  const ebitdaQ1 = groupQ1.find((k) => k.label === 'EBITDA')
  const ebRag: DomainKpiRag = (() => {
    const v = ebitdaQ1?.variance ?? ''
    if (v.startsWith('-')) return 'at_risk'
    if (v.startsWith('+')) return 'on_track'
    return 'neutral'
  })()

  const capexRate = strategic.capexCommitmentRatePct
  const capRag: DomainKpiRag =
    capexRate >= 95 ? 'on_track' : capexRate >= 75 ? 'neutral' : 'at_risk'

  const irr = strategic.weightedAvgIrrPct
  const hurdle = strategic.hurdleIrrPct
  const irrRag: DomainKpiRag =
    irr >= hurdle ? 'on_track' : irr >= hurdle - 1 ? 'neutral' : 'at_risk'

  const margin = strategic.existingOperations.marginPct
  const marginRag: DomainKpiRag =
    margin >= 46 ? 'on_track' : margin >= 38 ? 'neutral' : 'at_risk'

  const portfolioRows = buildPortfolioKpiRows(portfolioNarrative, projects)
  const explorationRows = buildExplorationKpiRows(explorationNarrative, explorationData)
  const growthRow = portfolioRows[1]
    ? cloneRow(portfolioRows[1]!, {
        label: `Growth projects · ${portfolioRows[1]!.label}`,
      })
    : null
  const explorationRow = explorationRows[0]
    ? cloneRow(explorationRows[0]!, {
        label: `Development · ${explorationRows[0]!.label}`,
      })
    : null

  const core: DomainBusinessKpi[] = [
    cloneRow(b[0]!, { value: w.toFixed(2), status: wRag }),
    cloneRow(b[1]!, {
      value: ebitdaQ1 ? `$${ebitdaQ1.actual}M actual` : '—',
      target: ebitdaQ1
        ? `$${ebitdaQ1.budget}M budget · ${ebitdaQ1.variance} (${ebitdaQ1.unit})`
        : b[1]!.target,
      status: ebRag,
    }),
    cloneRow(b[2]!, {
      value: `${strategic.capexCommitmentRatePct.toFixed(1)}%`,
      status: capRag,
    }),
    cloneRow(b[3]!, {
      value: `${strategic.weightedAvgIrrPct.toFixed(1)}%`,
      status: irrRag,
    }),
    cloneRow(b[4]!, {
      value: `${strategic.existingOperations.marginPct.toFixed(1)}%`,
      status: marginRag,
    }),
  ]

  if (growthRow && explorationRow) return [...core, growthRow, explorationRow]
  return core
}

export function buildExplorationKpiRows(
  narrative: DomainExecutiveNarrative,
  ex: ExplorationData,
): DomainBusinessKpi[] {
  const b = narrative.businessKpis

  // KPI 1 — Land parcel readiness (pass-through from narrative)
  // KPI 2 — Mobilization: derive construction summary
  const drillPcts = ex.drillingProgress.map((d) =>
    d.plannedMeters > 0 ? (d.actualMeters / d.plannedMeters) * 100 : 0,
  )
  const avgDrill =
    drillPcts.length > 0 ? drillPcts.reduce((a, x) => a + x, 0) / drillPcts.length : 0
  const drillRag: DomainKpiRag =
    avgDrill >= 95 ? 'on_track' : avgDrill >= 78 ? 'neutral' : 'at_risk'

  const drillBits = ex.drillingProgress
    .map((d) => {
      const pct = d.plannedMeters > 0 ? Math.round((d.actualMeters / d.plannedMeters) * 100) : 0
      const short = d.program.replace(/\s+Resort$/i, '').replace(/\s+Copper$/i, '').trim()
      const aK = Math.round(d.actualMeters / 1000)
      const pK = Math.round(d.plannedMeters / 1000)
      return `${short} ${pct}% (${aK}k/${pK}k m²)`
    })
    .join('; ')
  const drillSummary =
    drillBits.length > 118 ? `${drillBits.slice(0, 115).trimEnd()}…` : drillBits

  // KPI 3 — Development investment (pass-through from narrative)
  // KPI 4 — Capacity by sector: derive from data
  const g = ex.hospitalityKeysTarget
  const c = ex.copperTarget
  const resourceVal = `Luxury Tourism & Hospitality: ${g.ytdActual}k keys; Clean Energy & Green Industry: ${c.ytdActual} MW`
  const resourceRag: DomainKpiRag =
    g.ytdActual >= g.min && c.ytdActual >= c.min
      ? 'on_track'
      : 'at_risk'

  // KPI 5 — Pipeline replenishment (pass-through from narrative)

  return [
    cloneRow(b[0]!, {}),
    cloneRow(b[1]!, {
      value: drillSummary || `${avgDrill.toFixed(0)}% of plan (avg.)`,
      status: drillRag,
    }),
    cloneRow(b[2]!, {}),
    cloneRow(b[3]!, { value: resourceVal, status: resourceRag }),
    cloneRow(b[4]!, {}),
  ]
}

export function buildPortfolioKpiRows(
  narrative: DomainExecutiveNarrative,
  projects: Project[],
): DomainBusinessKpi[] {
  const b = narrative.businessKpis
  const w = weightedProgressKpi(projects)
  const wRag: DomainKpiRag = w <= 1.05 ? 'on_track' : w <= 1.1 ? 'neutral' : 'at_risk'
  const counts = projectStatusCounts(projects)
  const on = counts.on_track ?? 0
  const pd = counts.potential_delay ?? 0
  const delayed = counts.delayed ?? 0
  const mixRag: DomainKpiRag = delayed > 0 || pd > 0 ? 'at_risk' : 'on_track'

  const cap = capitalDeployed(projects)
  const capexBase = b[2]!.value
  const capexVal =
    cap.budget > 0
      ? capexBase.replace(/\d+\.\d+(?=%)/, cap.pct.toFixed(1))
      : capexBase
  const capexRag: DomainKpiRag =
    cap.budget <= 0 ? 'neutral' : cap.pct < 28 || cap.pct > 115 ? 'at_risk' : 'neutral'

  return [
    cloneRow(b[0]!, { value: w.toFixed(2), status: wRag }),
    cloneRow(b[1]!, {
      value: `${on} on track; ${pd} at risk; ${delayed} delayed`,
      status: mixRag,
    }),
    cloneRow(b[2]!, { value: capexVal, status: capexRag }),
    cloneRow(b[3]!, {}),
    cloneRow(b[4]!, {}),
  ]
}

function techPct(actual: number, target: number): DomainKpiRag {
  if (target <= 0) return 'neutral'
  const r = actual / target
  if (r >= 0.98) return 'on_track'
  if (r >= 0.75) return 'neutral'
  return 'at_risk'
}

export function buildTechnologyKpiRows(
  narrative: DomainExecutiveNarrative,
  t: TechnologyData,
): DomainBusinessKpi[] {
  const b = narrative.businessKpis
  const ebitdaRag = techPct(t.ebitdaRealized2026SarBn, t.ebitdaTarget2026SarBn)

  return [
    cloneRow(b[0]!, {
      value: `SAR ${t.ebitdaRealized2026SarBn}Bn`,
      status: ebitdaRag,
    }),
  ]
}

export function buildPeopleKpiRows(narrative: DomainExecutiveNarrative, _people: PeopleData): DomainBusinessKpi[] {
  return narrative.businessKpis.slice(0, 5)
}

function kriLowerBetter(current: number, threshold: number): DomainKpiRag {
  if (current < threshold) return 'on_track'
  if (current <= threshold * 1.02) return 'neutral'
  return 'at_risk'
}

function kriHigherBetter(current: number, threshold: number): DomainKpiRag {
  if (current > threshold) return 'on_track'
  if (current >= threshold * 0.98) return 'neutral'
  return 'at_risk'
}

export function buildRiskKpiRows(narrative: DomainExecutiveNarrative, risk: RiskData): DomainBusinessKpi[] {
  const b = narrative.businessKpis
  const k = risk.financialKris
  const lev = k.netLeverage
  const cf = k.cashFlowDeviation
  const liq = k.liquidityRatio
  const ic = k.interestCoverage
  return [
    cloneRow(b[0]!, {
      value: `${lev.current.toFixed(1)}x`,
      status: kriLowerBetter(lev.current, lev.threshold),
    }),
    cloneRow(b[1]!, {
      value: `${cf.current.toFixed(2)}%`,
      status: kriLowerBetter(cf.current, cf.threshold),
    }),
    cloneRow(b[2]!, {
      value: `${liq.current.toFixed(2)}x`,
      status:
        liq.trend === 'decreasing' && liq.current <= liq.threshold * 1.04
          ? 'neutral'
          : kriHigherBetter(liq.current, liq.threshold),
    }),
    cloneRow(b[3]!, {
      value: `${ic.current.toFixed(2)}x`,
      status: kriHigherBetter(ic.current, ic.threshold),
    }),
    cloneRow(b[4]!, {}),
  ]
}
