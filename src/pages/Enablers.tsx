import { AlertTriangle } from 'lucide-react'
import { useDomainNarrative, useEnablersData } from '../data'
import { DomainExecutiveSpine } from '../components/DomainExecutiveSpine'
import { EnablersExecutiveLinkagePanel } from '../components/EnablersExecutiveLinkagePanel'
import type { EnablerCellStatus, EnablerMatrixRow } from '../data/types'
import { KpiCard } from '../components/KpiCard'

const COLS: { key: keyof EnablerMatrixRow; label: string }[] = [
  { key: 'water', label: 'Water' },
  { key: 'power', label: 'Power' },
  { key: 'gas', label: 'Gas' },
  { key: 'sulfur', label: 'Materials' },
  { key: 'rail', label: 'Rail' },
  { key: 'port', label: 'Port' },
  { key: 'road', label: 'Road' },
  { key: 'miningLicense', label: 'Build Permit' },
  { key: 'explorationLicense', label: 'Land Permit' },
  { key: 'fuel', label: 'Fuel' },
  { key: 'funding', label: 'Funding' },
]

function Cell({ v }: { v: EnablerCellStatus }) {
  if (v === 'na')
    return <span className="text-ma-muted/50">—</span>
  if (v === 'deployed')
    return <span className="inline-block size-3 rounded-sm bg-ma-teal" title="Deployed" />
  if (v === 'secured')
    return (
      <span
        className="inline-block size-3 rounded-sm border-2 border-ma-teal bg-transparent"
        title="Secured"
      />
    )
  if (v === 'committed')
    return <span className="inline-block size-3 rounded-sm bg-ma-teal-muted" title="Committed" />
  if (v === 'submitted')
    return <span className="inline-block size-3 rounded-sm bg-ma-amber-warn" title="Submitted" />
  if (v === 'at_risk')
    return <span className="inline-block size-3 rounded-sm bg-ma-risk" title="At risk" />
  if (v === 'delayed')
    return (
      <span
        className="relative inline-flex size-3 items-center justify-center rounded-sm bg-ma-risk"
        title="Delayed"
      >
        <AlertTriangle className="size-2.5 text-white" strokeWidth={2.5} />
      </span>
    )
  if (v === 'not_started')
    return (
      <span
        className="inline-block size-3 rounded-sm border-2 border-ma-muted bg-transparent"
        title="Not started"
      />
    )
  return null
}

export function Enablers() {
  const { summary, matrix, sulfurStatus: materialsStatus } = useEnablersData()
  const narrative = useDomainNarrative('enablers')

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ma-muted">
          Foundation · Enablers
        </p>
        <h1 className="text-[22px] font-semibold tracking-tight text-ma-ink">Enablers</h1>
        <p className="mt-1 text-[13px] leading-snug text-ma-muted">
          Water, power, licenses, and funding readiness across the growth portfolio
        </p>
      </header>

      <DomainExecutiveSpine
        narrative={narrative}
        spineDomainKey="enablers"
        kpiRows={[]}
        businessKpiExtension={
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Total Enablers" value={summary.total} subtitle="Tracked dependencies" />
              <KpiCard label="On Track" value={summary.onTrack} subtitle="Clear path" valueClassName="text-ma-teal" />
              <KpiCard label="At Risk" value={summary.atRisk} subtitle="Needs intervention" valueClassName="text-ma-amber-warn" />
              <KpiCard label="Delayed" value={summary.delayed} subtitle="Behind plan" valueClassName="text-ma-risk" />
            </div>

            {/* Dependency matrix */}
            <div className="overflow-x-auto rounded-sm border border-ma-line bg-ma-elevated">
              <table className="min-w-[900px] w-full border-collapse text-center text-xs">
                <thead>
                  <tr className="border-b border-ma-line bg-ma-surface text-[10px] font-semibold uppercase tracking-[0.12em] text-ma-graphite">
                    <th className="sticky left-0 z-10 bg-ma-surface px-3 py-2 text-left">Project</th>
                    {COLS.map((c) => (
                      <th key={c.key} className="px-1 py-2 font-medium">{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row, i) => (
                    <tr key={row.project} className={i % 2 === 0 ? 'bg-ma-elevated' : 'bg-ma-bg'}>
                      <td className="sticky left-0 z-10 border-r border-ma-line bg-inherit px-3 py-2 text-left text-sm font-medium text-ma-ink">
                        {row.project}
                      </td>
                      {COLS.map((c) => (
                        <td key={String(c.key)} className="px-1 py-2">
                          <div className="flex justify-center">
                            <Cell v={row[c.key] as EnablerCellStatus} />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="rounded-sm border border-ma-line bg-ma-surface/40 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ma-accent">Legend</p>
              <ul className="mt-2 flex flex-wrap gap-3 text-[10px] text-ma-ink/85">
                <li className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm bg-ma-teal" /> Deployed</li>
                <li className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm border-2 border-ma-teal" /> Secured</li>
                <li className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm bg-ma-teal-muted" /> Committed</li>
                <li className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm bg-ma-amber-warn" /> Submitted</li>
                <li className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm bg-ma-risk" /> At risk / delayed</li>
                <li className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm border-2 border-ma-muted" /> Not started</li>
                <li className="flex items-center gap-1.5"><span className="text-ma-muted">—</span> N/A</li>
              </ul>
            </div>

            {/* Materials Supply Strategic Status */}
            <div className="rounded-sm border border-ma-line bg-ma-elevated p-4">
              <h3 className="text-[13px] font-semibold tracking-tight text-ma-ink">Materials Supply Strategic Status</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-ma-muted">Current agreement</p>
                  <p className="mt-1 text-[12px] text-ma-ink/85">{materialsStatus.currentAgreement}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-ma-muted">Proposed by ENOWA</p>
                  <p className="mt-1 text-[12px] text-ma-ink/85">{materialsStatus.proposedByAramco}</p>
                </div>
                <div className="md:col-span-2 rounded-sm border border-ma-risk/35 bg-ma-risk/10 p-2.5">
                  <p className="text-[10px] uppercase tracking-wide text-ma-risk">IRR impact</p>
                  <p className="mt-1 text-[12px] font-medium text-ma-risk">{materialsStatus.impactOnIrr}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-[10px] uppercase tracking-wide text-ma-muted">Alternative sourcing</p>
                  <p className="mt-1 text-[12px] text-ma-ink/85">{materialsStatus.alternativeSourcing}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-[10px] uppercase tracking-wide text-ma-muted">Escalation</p>
                  <p className="mt-1 text-[12px] text-ma-ink">{materialsStatus.escalationStatus}</p>
                </div>
              </div>
            </div>

            <EnablersExecutiveLinkagePanel />
          </div>
        }
      />
    </div>
  )
}
