import { useDomainNarrative } from '../data'
import { DomainExecutiveSpine } from '../components/DomainExecutiveSpine'

const EMPTY_KPIS: never[] = []

export function StrategyFrom2026Onwards() {
  const narrative = useDomainNarrative('strategy-2026-onwards')
  return (
    <div className="space-y-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ma-muted">
          Foundation · Re-vamped strategy 2026 onwards
        </p>
        <h1 className="text-[22px] font-semibold tracking-tight text-ma-ink">Re-vamped strategy 2026 onwards</h1>
        <p className="mt-1 max-w-[48rem] text-[13px] leading-snug text-ma-muted">
          Sharper delivery priorities, governance cadence, and narrative after the reset. Ask NEOM intelligence to compare
          how sources describe trade-offs and focus areas.
        </p>
      </header>

      <DomainExecutiveSpine
        narrative={narrative}
        spineDomainKey="strategy-2026-onwards"
        kpiRows={EMPTY_KPIS}
      />
    </div>
  )
}
