import type { DomainBusinessKpi, DomainOpportunityOverride, DomainRiskOverride } from '../data/types'

/**
 * Mock “tool / algorithm” outputs for PoC. Replace with API-backed scoring later.
 * Risk: prioritises at_risk KPIs by stressScore (fallback heuristic if missing).
 */

function stress(k: DomainBusinessKpi): number {
  if (typeof k.stressScore === 'number') return k.stressScore
  if (k.status === 'at_risk') return 60
  if (k.status === 'neutral') return 40
  return 25
}

export function deriveRiskFromKpis(kpis: DomainBusinessKpi[]): DomainRiskOverride {
  const list = kpis.length > 0 ? kpis : []
  if (list.length === 0) {
    return {
      title: 'No KPI signals loaded',
      impact: 'Add KPI rows to see modeled portfolio pressure.',
      severity: 'low',
    }
  }
  const atRisk = list.filter((k) => k.status === 'at_risk')
  const pool = atRisk.length ? atRisk : list
  let worst = pool[0]!
  for (const k of pool) {
    if (stress(k) > stress(worst)) worst = k
  }
  const sev = stress(worst) >= 58 ? 'high' : stress(worst) >= 45 ? 'medium' : 'low'
  return {
    title: `Primary pressure: ${worst.label}`,
    impact: `Largest gap vs plan among the displayed KPIs (${worst.value} vs ${worst.target}). If it stays open, it drags on schedule and how much capital the market trusts.`,
    severity: sev,
  }
}

export function deriveOpportunityFromKpis(kpis: DomainBusinessKpi[]): DomainOpportunityOverride {
  const list = kpis.length > 0 ? kpis : []
  if (list.length === 0) {
    return {
      headline: 'Execution headroom not yet modeled',
      bullets: ['Load KPI rows to see opportunity signals.'],
    }
  }
  const good = list.filter((k) => k.status === 'on_track')
  const pool = good.length ? good : list
  let best = pool[0]!
  for (const k of pool) {
    if (stress(k) < stress(best)) best = k
  }
  const headroom = Math.max(0, 100 - stress(best))
  return {
    headline: `Up to ~${headroom}% execution headroom on “${best.label}”`,
    bullets: [
      `Shifting focus toward “${best.label}” could steady related KPIs in the same quarter.`,
      `Clearing the weakest at‑risk KPI early could lower modeled portfolio stress by about ${Math.min(40, headroom + 15)} points in this view.`,
    ],
  }
}
