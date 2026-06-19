import { useDomainNarrative } from '../data'
import { DomainExecutiveSpine } from '../components/DomainExecutiveSpine'

const EMPTY_KPIS: never[] = []

export function StrategyBefore2025() {
  const narrative = useDomainNarrative('strategy-before-2025')
  return (
    <div className="space-y-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ma-muted">
          Foundation · Strategy before 2025
        </p>
        <h1 className="text-[22px] font-semibold tracking-tight text-ma-ink">Strategy before 2025</h1>
        <p className="mt-1 max-w-[48rem] text-[13px] leading-snug text-ma-muted">
          Archetype, commitments, and proof points from the first strategy era. Use NEOM intelligence to query the indexed
          strategy corpus — no separate schedule or financial workbook layer in this demo.
        </p>
      </header>

      <DomainExecutiveSpine
        narrative={narrative}
        spineDomainKey="strategy-before-2025"
        kpiRows={EMPTY_KPIS}
      />
    </div>
  )
}
