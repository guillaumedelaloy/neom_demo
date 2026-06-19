import {
  ALUMINUM_PRICE_DROP_EBITDA_SAR_M,
  EBITDA_CURTAILMENT_PER_SLIP_Q,
  PHOSPHATE_FEEDSTOCK_STRESS_SAR_M,
} from '../pocAssumptions'
import type { CeoDataSnapshot, CeoIntent, ReasoningScratchpad } from '../types'

/** Top at-risk projects — aggregate annualized EBITDA (SAR M) for portfolio-level delay shocks. */
function portfolioAtRiskEbitdaSarM(snap: CeoDataSnapshot): number {
  const slice = [...snap.projects]
    .filter((p) => p.status === 'potential_delay')
    .sort((a, b) => b.progressKpi - a.progressKpi)
    .slice(0, 4)
  const bn = slice.reduce((s, p) => s + (p.ebitdaSarB ?? 0), 0)
  return bn * 1000
}

function parseSlipQuartersFromQuestion(q: string): number {
  const m = q.match(/\b(\d)\s*-?\s*quarter\b/i) ?? q.match(/\b(\d)\s*q\b/i)
  if (m) return Math.min(4, Math.max(1, parseInt(m[1]!, 10)))
  if (/\bone\s+quarter\b|\b1q\b|\ba\s+quarter\b/i.test(q)) return 1
  return 1
}

export function runValueLens(
  snap: CeoDataSnapshot,
  intent: CeoIntent,
  delivery: ReasoningScratchpad['delivery'],
  question: string,
): ReasoningScratchpad['value'] {
  const q = question.toLowerCase()
  const aluminum =
    intent === 'commodity' &&
    (/\bindustry|ports|oxagon|tariff\b/i.test(q) ||
      snap.contextBu === 'Special Economic Zone & Investment Platform' ||
      snap.project?.bu === 'Special Economic Zone & Investment Platform')

  if (aluminum) {
    return {
      ebitdaImpactSarM: ALUMINUM_PRICE_DROP_EBITDA_SAR_M,
      causality: `Sector pass-through: modeled energy tariff increase maps to SAR ${ALUMINUM_PRICE_DROP_EBITDA_SAR_M}M EBITDA headwind on near-term Special Economic Zone & Investment Platform cost exposure (POC static sensitivity, 1-quarter horizon).`,
      usesDeliverySlip: false,
    }
  }

  const phosphateCommodity =
    intent === 'commodity' &&
    (/\burban|construction|materials|the line\b/i.test(q) ||
      snap.contextBu === 'Urban Development & Smart Communities' ||
      snap.project?.bu === 'Urban Development & Smart Communities')

  if (phosphateCommodity) {
    return {
      ebitdaImpactSarM: PHOSPHATE_FEEDSTOCK_STRESS_SAR_M,
      causality: `Construction materials cost stress (steel / cement pricing vs. business case) maps to SAR ${PHOSPHATE_FEEDSTOCK_STRESS_SAR_M}M EBITDA pressure on modeled Urban Development & Smart Communities margin before mix offsets (POC static).`,
      usesDeliverySlip: false,
    }
  }

  const slipFromQuestion = intent === 'delay' ? parseSlipQuartersFromQuestion(question) : delivery.slipQuarters
  const effectiveSlip = Math.max(delivery.slipQuarters, slipFromQuestion)

  const ebitdaB = snap.project?.ebitdaSarB ?? null
  let annualSarM = ebitdaB != null ? ebitdaB * 1000 : 0
  if (annualSarM <= 0 && (intent === 'delay' || intent === 'generic' || intent === 'worry_month')) {
    annualSarM = portfolioAtRiskEbitdaSarM(snap)
  }

  if (annualSarM <= 0) {
    return {
      ebitdaImpactSarM: 0,
      causality:
        'No EBITDA line in fixtures for this slice; deferring quantified EBITDA until project economics are pinned — schedule impact still flows from Delivery Engine.',
      usesDeliverySlip: true,
    }
  }

  const sarM = Math.round(annualSarM * EBITDA_CURTAILMENT_PER_SLIP_Q * effectiveSlip)
  const scopeNote =
    snap.project == null
      ? `portfolio at-risk EBITDA pool SAR ${annualSarM.toFixed(0)}M (top delayed projects)`
      : `SAR ${annualSarM.toFixed(0)}M modeled annual EBITDA for ${snap.project.name}`
  return {
    ebitdaImpactSarM: sarM,
    causality: `Delivery Engine’s ${effectiveSlip}Q slip delays revenue ramp; Value Lens applies ${(EBITDA_CURTAILMENT_PER_SLIP_Q * 100).toFixed(2)}% of ${scopeNote} per slipped quarter → SAR ${sarM}M (deterministic POC formula).`,
    usesDeliverySlip: true,
  }
}
