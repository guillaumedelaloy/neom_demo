import { Fragment } from 'react'
import type { Rag } from '../lib/commodityRag'
import type { TechnologyProgramStatusRag, TechnologyProgramStatusWorkstream } from '../data/types'
import { RagDot } from './RagDot'

function statusToRag(s: TechnologyProgramStatusRag): Rag {
  if (s === 'on_track') return 'green'
  if (s === 'at_risk') return 'amber'
  return 'red'
}

function statusLabel(s: TechnologyProgramStatusRag) {
  if (s === 'on_track') return 'On-track'
  if (s === 'at_risk') return 'At-risk'
  return 'Delayed'
}

const th =
  'border-b border-ma-line bg-ma-surface px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-ma-muted'

const td = 'border-b border-ma-line px-3 py-2.5 align-top text-[12px] text-ma-ink'

type ProgramStatusTableProps = {
  asOf: string
  workstreams: TechnologyProgramStatusWorkstream[]
  /** Defaults to “Program status · {asOf}”. */
  heading?: string
}

export function ProgramStatusTable({ asOf, workstreams, heading }: ProgramStatusTableProps) {
  const title = heading ?? `Program status · ${asOf}`
  return (
    <div className="overflow-x-auto rounded-sm border border-ma-line bg-ma-elevated shadow-[0_1px_0_rgba(15,18,16,0.04)] dark:shadow-[0_1px_0_rgba(0,0,0,0.25)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ma-line px-4 py-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-ma-graphite">
          {title}
        </h2>
        <div className="flex flex-wrap items-center gap-4 text-[10px] font-semibold uppercase tracking-wide text-ma-muted">
          <span className="flex items-center gap-1.5">
            <RagDot color="green" size={8} /> On-track
          </span>
          <span className="flex items-center gap-1.5">
            <RagDot color="amber" size={8} /> At-risk
          </span>
          <span className="flex items-center gap-1.5">
            <RagDot color="red" size={8} /> Delayed
          </span>
        </div>
      </div>
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr>
            <th className={`${th} w-[11rem]`}>Workstreams</th>
            <th className={th}>KPI</th>
            <th className={`${th} w-[7rem]`}>UOM</th>
            <th className={`${th} w-[6rem]`}>Mar 26&rsquo;</th>
            <th className={`${th} w-[6rem]`}>26&rsquo; target</th>
            <th className={`${th} w-[8rem]`}>Status</th>
          </tr>
        </thead>
        <tbody>
          {workstreams.map((ws) => {
            const noteRows = ws.notes?.length ? 1 : 0
            const rowSpan = ws.rows.length + noteRows
            return (
              <Fragment key={ws.name}>
                {ws.rows.map((row, i) => (
                  <tr key={`${ws.name}-${row.kpi}`} className="hover:bg-ma-surface/60">
                    {i === 0 ? (
                      <th
                        rowSpan={rowSpan}
                        scope="rowgroup"
                        className={`${td} border-r border-ma-line bg-ma-surface/50 font-semibold text-ma-ink`}
                      >
                        {ws.name}
                      </th>
                    ) : null}
                    <td className={td}>{row.kpi}</td>
                    <td className={`${td} text-ma-muted`}>{row.uom}</td>
                    <td className={`${td} font-mono tabular-nums`}>{row.actual}</td>
                    <td className={`${td} font-mono tabular-nums text-ma-muted`}>{row.target}</td>
                    <td className={td}>
                      <span className="inline-flex items-center gap-2">
                        <RagDot color={statusToRag(row.status)} />
                        <span className="text-[11px] font-medium text-ma-muted">
                          {statusLabel(row.status)}
                        </span>
                      </span>
                    </td>
                  </tr>
                ))}
                {ws.notes?.length ? (
                  <tr key={`${ws.name}-notes`} className="bg-ma-surface/30">
                    <td colSpan={5} className={`${td} text-[11px] leading-snug text-ma-muted`}>
                      <ul className="list-disc space-y-1 pl-4">
                        {ws.notes.map((n) => (
                          <li key={n}>{n}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
