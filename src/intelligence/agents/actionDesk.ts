import type { CeoDataSnapshot, ReasoningScratchpad } from '../types'

export function runActionDesk(snap: CeoDataSnapshot, scratch: ReasoningScratchpad): string[] {
  const items: string[] = []
  const unlock = snap.projectDetail?.bottlenecks?.[0]?.unlockRequired
  if (unlock) {
    items.push(`0–30d: Decision on “${unlock.slice(0, 90)}${unlock.length > 90 ? '…' : ''}” with named executive owner.`)
  }
  items.push(
    `30–60d: Reconcile the SAR ${scratch.value.ebitdaImpactSarM}M EBITDA view with the FY26 vs FY27 timing cross-check; publish one agreed number for the CEO pack.`,
  )
  items.push(
    `60–90d: Risk Radar (${scratch.risk.headlineProbabilityPct}% headline): fund or de-scope parallel packages to protect critical path from +${scratch.delivery.propagatedDelayWeeks}w float burn.`,
  )
  return items.slice(0, 4)
}
