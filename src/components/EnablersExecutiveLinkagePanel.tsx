import { Fragment, type ReactNode } from 'react'
import { Check, Minus } from 'lucide-react'

const STRATEGIC_VALUE_ROWS = [
  {
    label: 'Development',
    strategic:
      'Access to prime development land and accelerate permit approval.',
    value:
      "Accelerates land readiness and masterplan definition, strengthening NEOM's long-term growth projects.",
  },
  {
    label: 'Utilities',
    strategic:
      'High Intensity Electricity Tariff and materials pricing; Treated water requirements.',
    value:
      'Supports long-term competitiveness through stable energy and input pricing; de-risks critical path timelines linked to treated water supply and pipeline readiness.',
  },
  {
    label: 'Regulatory',
    strategic:
      'Approval of National Development Strategy; Pre-recruitment accreditation requirements exemption.',
    value:
      'Enables long-term commitment from ministries and regulators to support growth projects; unlocks faster onboarding of specialized global talent essential for strategic projects.',
  },
] as const

const RISK_ESCALATION_ROWS = [
  {
    group: 'Permitting',
    type: 'Land permits',
    keyRisk: 'Permits not approved for Digital Infrastructure & AI',
    escalation: 'PIF Board',
    decision: 'Accelerate permit approval.',
  },
  {
    group: 'Permitting',
    type: 'Desalination Plant 1',
    keyRisk: 'Ownership transfer not completed',
    escalation: 'PIF Board',
    decision: 'Accelerate the execution of higher committee resolution.',
  },
  {
    group: 'Regulatory',
    type: 'Argos',
    keyRisk: 'Cash incentive not secured',
    escalation: 'PIF Board',
    decision: 'Expedite the incentive decision from NIC.',
  },
  {
    group: 'Regulatory',
    type: 'Circular Materials Plant',
    keyRisk: 'Scrap ban for Special Economic Zone & Investment Platform not fully implemented',
    escalation: 'PIF Board',
    decision: 'Expedite the scrap ban decision.',
  },
  {
    group: 'Utilities',
    type: 'TROJENA, Urban Development Phases 2–3',
    keyRisk: 'Insufficient treated-water volume and infrastructure readiness',
    escalation: 'PIF Board',
    decision: 'Secure treated water and infrastructure requirement.',
  },
  {
    group: 'Utilities',
    type: 'Materials',
    keyRisk: 'High materials pricing from ENOWA',
    escalation: 'Mitigate Impact',
    decision: 'Negotiation with ENOWA Alternative Sourcing.',
  },
] as const

type BuStatus = 'on_track' | 'at_risk'

function BuStatusIcon({ status }: { status: BuStatus }) {
  if (status === 'on_track') {
    return (
      <span
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-ma-teal text-white shadow-sm"
        title="On track"
        aria-label="On track"
      >
        <Check className="size-3 stroke-[2.5]" aria-hidden />
      </span>
    )
  }
  return (
    <span
      className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-ma-amber-warn bg-ma-amber-warn/15 text-ma-amber-warn"
      title="At risk / pending"
      aria-label="At risk or pending"
    >
      <Minus className="size-3 stroke-[2.5]" aria-hidden />
    </span>
  )
}

function BuCell({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-1.5">{children}</div>
}

function BuItem({ label, status }: { label: string; status: BuStatus }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-ma-line/80 bg-ma-surface/50 px-1.5 py-0.5 text-[10px] text-ma-ink/90 dark:bg-ma-charcoal/40">
      <BuStatusIcon status={status} />
      <span>{label}</span>
    </span>
  )
}

const BU_PROGRESS = [
  {
    category: 'Securing Land Permits',
    q1: [
      { label: 'ENOWA Solar Field (E&W)', status: 'on_track' as const },
      { label: 'Desalination Plant 1 (Tech)', status: 'at_risk' as const },
    ],
    q2: [{ label: 'Green Hydrogen Plant (E&W)', status: 'on_track' as const }],
  },
  {
    category: 'Water & Water Pipeline Allocation',
    q1: [
      { label: 'Leyja Eco-Resort (Tour)', status: 'at_risk' as const },
      { label: 'ENOWA Solar Field & Desalination 1 (E&W)', status: 'on_track' as const },
    ],
    q2: [
      { label: 'TROJENA & SINDALAH (Tour)', status: 'on_track' as const },
      { label: 'Green Hydrogen Plant', status: 'at_risk' as const },
    ],
  },
  {
    category: 'Securing Power',
    q1: [
      { label: 'OXAGON Port Ph1 (Ind)', status: 'at_risk' as const },
      { label: 'Circular Materials Plant (Ind)', status: 'at_risk' as const },
    ],
    q2: [{ label: 'Green Hydrogen Plant (E&W)', status: 'at_risk' as const }],
  },
  {
    category: 'Gas Allocation',
    q1: [
      { label: 'OXAGON Port Ph1 (Ind)', status: 'on_track' as const },
      { label: 'Circular Materials Plant (Ind)', status: 'on_track' as const },
    ],
    q2: null,
  },
  {
    category: 'Securing Materials',
    q1: [{ label: 'Desalination Plant 1', status: 'at_risk' as const }],
    q2: [
      { label: 'Urban Development flagship — Phase 1', status: 'at_risk' as const },
      { label: 'Urban Development flagship — Phases 2–3', status: 'at_risk' as const },
    ],
  },
] as const

/** Dark header band — aligns with executive tables / dark theme (no light beige band). */
const headerBand = 'bg-ma-charcoal text-white ring-1 ring-inset ring-white/[0.08]'

const headerBar = `${headerBand} px-2.5 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em]`

const columnHeaderBar = `${headerBand} border-b border-ma-line/50 px-2 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em]`

export function EnablersExecutiveLinkagePanel() {
  return (
    <div className="mt-2 space-y-4 border-t border-ma-line/70 pt-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ma-muted">
        Strategic linkage & execution
      </p>

      {/* Top row: Strategic ↔ Value */}
      <div className="overflow-hidden rounded-lg border border-ma-line bg-ma-elevated shadow-sm ring-1 ring-ma-line/40">
        <div className="grid border-b border-ma-line sm:grid-cols-2">
          <div className={headerBar}>Strategic</div>
          <div className={`${headerBar} border-t border-ma-line/30 sm:border-l sm:border-t-0`}>
            Value unlocking opportunities
          </div>
        </div>
        <div className="divide-y divide-ma-line/70">
          {STRATEGIC_VALUE_ROWS.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-1 gap-0 lg:grid-cols-[7.5rem_1fr_auto_1fr] lg:items-stretch"
            >
              <div className="flex items-stretch border-b border-ma-line/50 bg-ma-surface/30 px-3 py-2.5 lg:border-b-0 lg:border-r lg:border-ma-line/40">
                <span className="flex w-full items-center justify-center text-center text-[10px] font-semibold uppercase tracking-wide text-ma-ink/90">
                  {row.label}
                </span>
              </div>
              <div className="relative border-b border-ma-line/50 bg-ma-surface/30 px-3 py-2.5 lg:border-b-0 lg:border-r lg:border-ma-line/40">
                <p className="text-[11px] leading-relaxed text-ma-ink/90">{row.strategic}</p>
              </div>
              <div
                className="hidden items-stretch justify-center bg-ma-surface/20 py-2 lg:flex"
                aria-hidden
              >
                <div className="w-px self-stretch border-l border-dashed border-ma-accent/50" />
              </div>
              <div className="border-t border-dashed border-ma-accent/30 bg-ma-bg/80 px-3 py-2.5 lg:border-t-0">
                <p className="text-[11px] leading-relaxed text-ma-ink/88">{row.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom row: Risks | BU Progress */}
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-3">
        {/* Risks & Escalations */}
        <div className="overflow-hidden rounded-lg border border-ma-line bg-ma-elevated shadow-sm ring-1 ring-ma-line/40">
          <div className={headerBar}>Risks &amp; escalations</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-[10px]">
              <thead>
                <tr className={`border-b border-ma-line ${headerBand}`}>
                  <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-wide">Group</th>
                  <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-wide">Type</th>
                  <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-wide">Key risks</th>
                  <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-wide">Escalation</th>
                  <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-wide">Decision required</th>
                </tr>
              </thead>
              <tbody>
                {RISK_ESCALATION_ROWS.map((r, i) => (
                  <tr
                    key={`${r.group}-${r.type}`}
                    className={i % 2 === 0 ? 'bg-ma-elevated' : 'bg-ma-bg/60'}
                  >
                    <td className="border-b border-ma-line/50 px-2 py-1.5 font-medium text-ma-ink">
                      {r.group}
                    </td>
                    <td className="border-b border-ma-line/50 px-2 py-1.5 text-ma-ink/85">{r.type}</td>
                    <td className="border-b border-ma-line/50 px-2 py-1.5 leading-snug text-ma-ink/90">
                      {r.keyRisk}
                    </td>
                    <td className="border-b border-ma-line/50 px-2 py-1.5 text-ma-muted">{r.escalation}</td>
                    <td className="border-b border-ma-line/50 px-2 py-1.5 leading-snug text-ma-ink/90">
                      {r.decision}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* BU Progress Status */}
        <div className="overflow-hidden rounded-lg border border-ma-line bg-ma-elevated shadow-sm ring-1 ring-ma-line/40">
          <div className={headerBar}>BU progress status</div>
          <div className="grid grid-cols-[minmax(0,1.15fr)_1fr_1fr] gap-px bg-ma-line/60">
            <div className={`${columnHeaderBar} text-center`} aria-hidden />
            <div className={`${columnHeaderBar} text-center`}>Q2 2026</div>
            <div className={`${columnHeaderBar} text-center`}>Q2 2026</div>
            {BU_PROGRESS.map((row) => (
              <Fragment key={row.category}>
                <div className="flex items-center bg-ma-accent/15 px-2 py-2 text-[10px] font-semibold leading-snug text-ma-ink">
                  {row.category}
                </div>
                <div className="bg-ma-elevated px-2 py-2">
                  {row.q1 ? (
                    <BuCell>
                      {row.q1.map((item) => (
                        <BuItem key={item.label} label={item.label} status={item.status} />
                      ))}
                    </BuCell>
                  ) : (
                    <span className="text-[10px] text-ma-muted">—</span>
                  )}
                </div>
                <div className="bg-ma-elevated px-2 py-2">
                  {row.q2 ? (
                    <BuCell>
                      {row.q2.map((item) => (
                        <BuItem key={item.label} label={item.label} status={item.status} />
                      ))}
                    </BuCell>
                  ) : (
                    <span className="text-[10px] font-medium text-ma-muted">N/A</span>
                  )}
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
