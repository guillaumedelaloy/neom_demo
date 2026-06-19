import { WEEKS_PROPAGATED_PER_SLIP_Q } from '../pocAssumptions'
import type { CeoDataSnapshot, ReasoningScratchpad } from '../types'

export function runDeliveryEngine(
  snap: CeoDataSnapshot,
  slipQuarters: number,
): ReasoningScratchpad['delivery'] {
  const slipQ = Math.max(1, Math.min(4, slipQuarters))
  const p = snap.project
  const critical =
    p?.topBlocker ??
    snap.projectDetail?.bottlenecks?.[0]?.bottleneck ??
    'Studies-to-FID gate sequencing'
  const weeks = Math.round(slipQ * WEEKS_PROPAGATED_PER_SLIP_Q)
  return {
    slipQuarters: slipQ,
    propagatedDelayWeeks: weeks,
    criticalPath: critical,
    narrative: `${slipQ}-quarter slip on the governing commercial/execution gate propagates ~${weeks}w through dependent packages because “${critical}” sits on the critical path (POC propagation rule).`,
  }
}
