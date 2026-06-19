import type { ReasoningScratchpad } from '../types'

/** Always injects a cross-agent challenge (forced disagreement). */
export function runGapFinder(
  value: ReasoningScratchpad['value'],
  delivery: ReasoningScratchpad['delivery'],
): ReasoningScratchpad['gap'] {
  const missing = [
    'Working capital phasing vs. mechanical completion (not in fixture cash model).',
    'Pass-through of construction materials settlement terms to realized cost curve.',
    'Parallel procurement long-lead items if FID splits across quarters.',
  ]

  const challengesValueLens = value.usesDeliverySlip
    ? `Cross-check: the SAR ${value.ebitdaImpactSarM}M EBITDA hit assumes most of the pain lands in FY26, but a ${delivery.slipQuarters}Q slip on “${delivery.criticalPath.slice(0, 72)}${delivery.criticalPath.length > 72 ? '…' : ''}” pushes more cash effect into FY27 — trim in-year recognition by ~18% unless working capital releases sooner.`
    : `Cross-check: the SAR ${value.ebitdaImpactSarM}M sector move assumes steady demand mix; unchanged schedule still leaves occupancy and megawatt allocation as swing factors.`

  return {
    challengesValueLens,
    missingAssumptions: missing,
  }
}
