import type { CeoDataSnapshot, CeoIntent, ReasoningScratchpad } from '../types'

export function runRiskRadar(
  snap: CeoDataSnapshot,
  intent: CeoIntent,
  delivery: ReasoningScratchpad['delivery'],
): ReasoningScratchpad['risk'] {
  const top = snap.topRisks[0]
  const projHigh = snap.projectDetail?.risks?.find((r) => r.severity === 'high')

  let headlineProbabilityPct = top ? Math.min(95, top.probability * 14 + 18) : 42
  let riskDriver = top?.name ?? 'Portfolio execution concentration'

  if (snap.project && projHigh) {
    headlineProbabilityPct = Math.max(headlineProbabilityPct, 58)
    riskDriver = `${projHigh.text} (project register) reinforced by portfolio risk “${top?.name ?? 'materials / funding'}”.`
  }

  if (intent === 'commodity') {
    headlineProbabilityPct = Math.max(headlineProbabilityPct, 55)
    riskDriver = `Energy tariff and materials price volatility on Special Economic Zone & Investment Platform book; ${riskDriver}`
  }

  if (intent === 'delay') {
    headlineProbabilityPct = Math.max(headlineProbabilityPct, 50 + delivery.slipQuarters * 6)
    riskDriver = `Schedule slip (+${delivery.propagatedDelayWeeks}w propagated) increases probability of covenant-style funding tension; ${riskDriver}`
  }

  return {
    headlineProbabilityPct: Math.min(92, Math.round(headlineProbabilityPct)),
    riskDriver,
  }
}
