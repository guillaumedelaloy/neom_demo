import { useCallback, useMemo, useState } from 'react'
import { TrendingUp, Minus } from 'lucide-react'
import type { ConsolidatedRiskEntry } from '../data/types'
import { getConsolidatedRiskDetail } from '../data/consolidatedRiskDetails'
import { RiskDetailPanel } from './RiskDetailPanel'

const GRID = 5
const IMPACT_TICKS = ['Insignif.', 'Minor', 'Moderate', 'Major', 'Catastrophic']
const PROB_TICKS = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost certain']

function cellColor(col: number, row: number): string {
  const score = col + row
  if (score >= 9) return 'bg-[#8b2020]/75'
  if (score >= 7) return 'bg-[#c96830]/55'
  if (score >= 5) return 'bg-[#d4a94c]/40'
  return 'bg-[#5a9a5a]/30'
}

type Props = { risks: ConsolidatedRiskEntry[] }

export function ConsolidatedRiskHeatmap({ risks }: Props) {
  const [panelRisk, setPanelRisk] = useState<ConsolidatedRiskEntry | null>(null)

  const ordered = useMemo(() => [...risks].sort((a, b) => a.id - b.id), [risks])
  const panelIndex = panelRisk ? ordered.findIndex((r) => r.id === panelRisk.id) : -1

  const openPanel = useCallback((r: ConsolidatedRiskEntry) => {
    setPanelRisk(r)
  }, [])

  const closePanel = useCallback(() => setPanelRisk(null), [])

  const goPrev = useCallback(() => {
    if (panelIndex <= 0) return
    setPanelRisk(ordered[panelIndex - 1]!)
  }, [ordered, panelIndex])

  const goNext = useCallback(() => {
    if (panelIndex < 0 || panelIndex >= ordered.length - 1) return
    setPanelRisk(ordered[panelIndex + 1]!)
  }, [ordered, panelIndex])

  const byCellKey = useMemo(() => {
    const m = new Map<string, ConsolidatedRiskEntry[]>()
    for (const r of risks) {
      const k = `${r.gridCol}-${r.gridRow}`
      const arr = m.get(k) ?? []
      arr.push(r)
      m.set(k, arr)
    }
    return m
  }, [risks])

  const strategic = useMemo(() => risks.filter((r) => r.tier === 'Strategic').sort((a, b) => a.id - b.id), [risks])
  const increasing = useMemo(() => risks.filter((r) => r.movement === 'increasing'), [risks])

  return (
    <div className="space-y-5">
      {/* Header — compact stat bar */}
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ma-accent">
          Consolidated Risk Map
        </p>
        <span className="text-[10px] text-ma-muted">
          <span className="tabular-nums font-medium text-ma-ink">{risks.length}</span> risks
          {' · '}
          <span className="tabular-nums font-medium text-ma-risk">{increasing.length}</span> increasing
        </span>
        {/* Inline legend — stroke weight encoding */}
        <span className="ml-auto flex items-center gap-3 text-[9px] text-ma-muted">
          <span className="inline-flex items-center gap-1">
            <span className="size-3.5 rounded-full border-[2.5px] border-white/90 bg-white/10" /> High
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-3.5 rounded-full border border-white/60 bg-white/10" /> Significant
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-3.5 rounded-full border-[2px] border-dashed border-ma-risk/80 bg-white/10" /> Increasing
          </span>
        </span>
      </div>

      {/* Heatmap */}
      <div className="relative min-w-0">
        <div className="flex">
            {/* Y-axis ticks */}
            <div className="flex w-16 shrink-0 flex-col-reverse justify-around pr-1.5 pt-0 pb-0">
              {PROB_TICKS.map((label, i) => (
                <span key={label} className="text-right text-[9px] leading-none text-ma-muted">
                  <span className="tabular-nums font-medium text-ma-ink/70">{i + 1}</span>{' '}
                  <span className="hidden sm:inline">{label}</span>
                </span>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              {/* Y-axis title */}
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-ma-muted/70">
                  ← Probability
                </span>
              </div>
              {/* Grid */}
              <div
                className="grid gap-px overflow-hidden rounded-md border border-ma-line/50 bg-ma-line/30"
                style={{ gridTemplateColumns: `repeat(${GRID}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: GRID * GRID }).map((_, idx) => {
                  const col = (idx % GRID) + 1
                  const row = GRID - Math.floor(idx / GRID)
                  const key = `${col}-${row}`
                  const entries = byCellKey.get(key) ?? []
                  return (
                    <div
                      key={key}
                      className={`relative flex min-h-[52px] items-center justify-center p-1 ${cellColor(col, row)}`}
                    >
                      <div className="flex flex-wrap items-center justify-center gap-1">
                        {entries.map((e) => (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => openPanel(e)}
                            className={`relative flex size-7 items-center justify-center rounded-full text-[10px] font-bold text-white transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ma-accent focus-visible:ring-offset-1 ${
                              panelRisk?.id === e.id
                                ? 'z-10 scale-[1.3] shadow-lg bg-ma-accent text-ma-ink border-2 border-ma-accent'
                                : e.movement === 'increasing'
                                  ? e.ratingClass === 'H'
                                    ? 'border-[2.5px] border-dashed border-ma-risk/90 bg-white/15 shadow-sm hover:scale-110'
                                    : 'border-[1.5px] border-dashed border-ma-risk/80 bg-white/10 shadow-sm hover:scale-110'
                                  : e.ratingClass === 'H'
                                    ? 'border-[2.5px] border-white/90 bg-white/15 shadow-sm hover:scale-110'
                                    : 'border border-white/60 bg-white/10 shadow-sm hover:scale-110'
                            }`}
                            aria-label={`Risk ${e.id}: ${e.name} — rated ${e.ratingLabel}, ${e.movement}`}
                          >
                            {e.id}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* X-axis ticks */}
              <div className="mt-1 grid" style={{ gridTemplateColumns: `repeat(${GRID}, minmax(0, 1fr))` }}>
                {IMPACT_TICKS.map((label, i) => (
                  <span key={label} className="text-center text-[9px] leading-tight text-ma-muted">
                    <span className="tabular-nums font-medium text-ma-ink/70">{i + 1}</span>
                    <span className="hidden sm:inline"> {label}</span>
                  </span>
                ))}
              </div>
              <p className="mt-0.5 text-center text-[9px] font-semibold uppercase tracking-widest text-ma-muted/70">
                Potential Impact →
              </p>
            </div>
          </div>
      </div>

      {/* Strategic risks register */}
      {strategic.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ma-muted">
            Strategic risks — {strategic.length} enterprise-level
          </p>
          <div className="overflow-x-auto rounded-md border border-ma-line/60">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-ma-line bg-ma-surface/30 text-left text-[9px] font-semibold uppercase tracking-wide text-ma-muted dark:bg-ma-charcoal/30">
                  <th className="px-2.5 py-2 font-semibold">#</th>
                  <th className="px-2.5 py-2 font-semibold">Risk</th>
                  <th className="px-2.5 py-2 font-semibold">Rating</th>
                  <th className="px-2.5 py-2 font-semibold">Movement</th>
                </tr>
              </thead>
              <tbody>
                {strategic.map((r) => (
                  <tr
                    key={r.id}
                    tabIndex={0}
                    role="button"
                    onClick={() => openPanel(r)}
                    onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openPanel(r) } }}
                    className={`cursor-pointer border-b border-ma-line/40 transition-colors last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ma-accent ${
                      panelRisk?.id === r.id ? 'bg-ma-accent/8' : 'hover:bg-ma-surface/40'
                    }`}
                    aria-label={`Risk ${r.id}: ${r.name} — rated ${r.ratingLabel}, ${r.movement}`}
                  >
                    <td className="px-2.5 py-2.5 align-middle">
                      <span className={`inline-flex size-5 items-center justify-center rounded-full text-[9px] font-bold ${
                        r.ratingClass === 'H'
                          ? 'border-[2.5px] border-ma-ink bg-ma-ink/10 text-ma-ink'
                          : 'border border-ma-muted bg-ma-surface text-ma-ink'
                      }`}>
                        {r.id}
                      </span>
                    </td>
                    <td className="px-2.5 py-2.5 align-middle font-medium text-ma-ink">{r.name}</td>
                    <td className="px-2.5 py-2.5 align-middle whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${
                        r.ratingClass === 'H' ? 'border-ma-risk/40 bg-ma-risk/15 text-ma-risk' : 'border-ma-amber-warn/40 bg-ma-amber-warn/15 text-ma-amber-warn'
                      }`}>
                        {r.ratingLabel}
                      </span>
                    </td>
                    <td className="px-2.5 py-2.5 align-middle">
                      {r.movement === 'increasing' ? (
                        <span className="inline-flex items-center gap-1 text-ma-risk">
                          <TrendingUp className="size-3.5" /> <span className="text-[10px] font-medium">Increasing</span>
                        </span>
                      ) : r.movement === 'decreasing' ? (
                        <span className="inline-flex items-center gap-1 text-ma-teal">
                          <TrendingUp className="size-3.5 rotate-180" /> <span className="text-[10px] font-medium">Decreasing</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-ma-muted">
                          <Minus className="size-3.5" /> <span className="text-[10px]">Stable</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Key risk movement — open by default, this is the highest-value content */}
      {increasing.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ma-muted">
            Key risk movement — {increasing.length} risks with upward movement
          </p>
          <div className="overflow-x-auto rounded-md border border-ma-line/60">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-ma-line bg-ma-surface/30 text-left text-[9px] font-semibold uppercase tracking-wide text-ma-muted dark:bg-ma-charcoal/30">
                  <th className="px-2.5 py-2 font-semibold">#</th>
                  <th className="px-2.5 py-2 font-semibold">Risk</th>
                  <th className="px-2.5 py-2 font-semibold">Q1 26</th>
                  <th className="px-2.5 py-2 font-semibold">Rationale</th>
                </tr>
              </thead>
              <tbody>
                {increasing.map((r) => (
                  <tr
                    key={r.id}
                    tabIndex={0}
                    role="button"
                    onClick={() => openPanel(r)}
                    onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openPanel(r) } }}
                    className={`cursor-pointer border-b border-ma-line/40 transition-colors last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ma-accent ${
                      panelRisk?.id === r.id ? 'bg-ma-accent/8' : 'hover:bg-ma-surface/40'
                    }`}
                    aria-label={`Risk ${r.id}: ${r.name} — rated ${r.ratingLabel}, increasing`}
                  >
                    <td className="px-2.5 py-2.5 align-top">
                      <span className={`inline-flex size-5 items-center justify-center rounded-full text-[9px] font-bold ${
                        r.ratingClass === 'H'
                          ? 'border-[2.5px] border-ma-ink bg-ma-ink/10 text-ma-ink'
                          : 'border border-ma-muted bg-ma-surface text-ma-ink'
                      }`}>
                        {r.id}
                      </span>
                    </td>
                    <td className="px-2.5 py-2.5 align-top font-medium text-ma-ink">{r.name}</td>
                    <td className="px-2.5 py-2.5 align-top whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${
                        r.ratingClass === 'H' ? 'border-ma-risk/40 bg-ma-risk/15 text-ma-risk' : 'border-ma-amber-warn/40 bg-ma-amber-warn/15 text-ma-amber-warn'
                      }`}>
                        {r.ratingLabel} <TrendingUp className="size-2.5" />
                      </span>
                    </td>
                    <td className="px-2.5 py-2.5 align-top leading-snug text-ma-muted">
                      {r.movementRationale ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[9px] text-ma-muted/60">
            Based on the ERM Risk Matrix · Approved by respective Risk Owners
          </p>
        </div>
      )}

      {panelRisk ? (
        <RiskDetailPanel
          risk={panelRisk}
          detail={getConsolidatedRiskDetail(panelRisk.id)}
          open
          onClose={closePanel}
          onPrev={goPrev}
          onNext={goNext}
          hasPrev={panelIndex > 0}
          hasNext={panelIndex >= 0 && panelIndex < ordered.length - 1}
        />
      ) : null}
    </div>
  )
}
