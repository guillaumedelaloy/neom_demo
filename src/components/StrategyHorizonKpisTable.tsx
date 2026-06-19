import type { StrategyHorizonKpiCell, StrategyHorizonKpiRow } from '../data/types'

function strategyHorizonCellClass(tone: StrategyHorizonKpiCell['tone']) {
  if (tone === 'historical')
    return 'border border-ma-line/80 bg-ma-surface/75 dark:bg-ma-charcoal/45'
  if (tone === 'forecast')
    return 'border border-ma-line/60 bg-ma-surface/45 dark:bg-ma-charcoal/30'
  return 'border border-ma-accent/45 bg-ma-elevated shadow-[inset_0_1px_0_rgba(184,149,106,0.08)]'
}

export function StrategyHorizonKpisTable({ rows }: { rows: StrategyHorizonKpiRow[] }) {
  const headerCells = rows[0]?.cells ?? []
  if (headerCells.length === 0) return null

  return (
    <div className="mt-2 overflow-x-auto rounded-md border border-ma-line/80">
      <table className="w-full min-w-[640px] border-collapse text-left text-[12px]">
        <thead>
          <tr className="border-b border-ma-line bg-ma-surface/40 dark:bg-ma-charcoal/30">
            <th className="sticky left-0 z-[1] min-w-[10rem] border-r border-ma-line/70 bg-ma-elevated px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-ma-muted">
              Strategy KPI
            </th>
            {headerCells.map((c, i) => (
              <th key={i} className="px-2 py-2 text-center font-normal">
                <div className="inline-flex flex-col items-center gap-0.5">
                  <span className="border-b border-ma-line/90 pb-0.5 text-[9px] font-semibold uppercase tracking-wide text-ma-muted">
                    {c.periodLabel}
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums text-ma-ink">{c.yearLabel}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-ma-line/60 last:border-b-0">
              <td className="sticky left-0 z-[1] border-r border-ma-line/70 bg-ma-elevated px-3 py-2.5 text-[12px] font-medium text-ma-ink">
                {row.label}
              </td>
              {row.cells.map((c, i) => (
                <td key={i} className="p-1.5 align-middle">
                  <div
                    className={`flex min-h-[2.5rem] items-center justify-center rounded-sm px-2 py-2 text-center font-mono text-[13px] font-semibold tabular-nums text-ma-ink ${strategyHorizonCellClass(c.tone)}`}
                  >
                    {c.value}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
