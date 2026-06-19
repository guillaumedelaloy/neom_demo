import { useEffect, useMemo, useState } from 'react'
import { Check, X } from 'lucide-react'

import type {
  InitiativeContributingInitiative,
  InitiativePipelineThemeRow,
  InitiativeRoadmapGateCell,
  InitiativeRoadmapGateStatus,
  InitiativeThemePipelineSlide,
  InitiativeTopContributor,
} from '../data/types'

function MnCell({ v }: { v: number | null }) {
  if (v == null) return <span className="text-ma-muted/55">—</span>
  return <span className="tabular-nums">{v.toLocaleString('en-US')}</span>
}

const thBase =
  'border-b border-ma-line px-2 py-2 text-center text-[9px] font-semibold uppercase tracking-wide text-ma-graphite'

const tdBase = 'border-b border-ma-line/70 px-2 py-2 align-middle text-[11px] leading-snug text-ma-ink'

const colAl = 'bg-ma-graphite/[0.06] dark:bg-white/[0.04]'
const colPh = 'bg-ma-charcoal/[0.08] dark:bg-white/[0.06]'
const colBm = 'bg-ma-accent/[0.12] dark:bg-ma-accent/[0.08]'
const colTot = 'bg-ma-surface/50 font-medium dark:bg-ma-charcoal/30'

function buildInitiativeIndex(slide: InitiativeThemePipelineSlide) {
  const m = new Map<string, { initiative: InitiativeContributingInitiative; domain: string }>()
  for (const theme of slide.themes) {
    for (const row of theme.rows) {
      for (const init of row.contributingInitiatives ?? []) {
        m.set(init.id, { initiative: init, domain: row.domain })
      }
    }
  }
  return m
}

const BU_ASIDE_ORDER = ['Luxury Tourism & Hospitality', 'Special Economic Zone & Investment Platform', 'Urban Development & Smart Communities', 'NEOM HQ'] as const
const BU_ASIDE_ORDER_SET = new Set<string>(BU_ASIDE_ORDER)

function buildAsideFromThemes(themes: InitiativeThemePipelineSlide['themes']): InitiativeTopContributor[] {
  const byBu = new Map<string, { id: string; label: string; sarMn: number }[]>()
  for (const theme of themes) {
    for (const row of theme.rows) {
      for (const init of row.contributingInitiatives ?? []) {
        const list = byBu.get(init.bu) ?? []
        list.push({ id: init.id, label: init.label, sarMn: init.sarMn })
        byBu.set(init.bu, list)
      }
    }
  }
  const blocks: InitiativeTopContributor[] = []
  for (const bu of BU_ASIDE_ORDER) {
    const raw = byBu.get(bu)
    if (!raw?.length) continue
    const items = [...raw].sort((a, b) => b.sarMn - a.sarMn)
    blocks.push({ bu, items })
  }
  for (const [bu, raw] of byBu) {
    if (BU_ASIDE_ORDER_SET.has(bu)) continue
    if (raw.length) blocks.push({ bu, items: [...raw].sort((a, b) => b.sarMn - a.sarMn) })
  }
  return blocks
}

function ThemeRowCells({
  row,
  onInitiativeClick,
}: {
  row: InitiativePipelineThemeRow
  onInitiativeClick: (id: string) => void
}) {
  const inits = row.contributingInitiatives
  const initSarSum = inits?.reduce((s, x) => s + x.sarMn, 0) ?? 0
  return (
    <>
      <td className={`${tdBase} text-left`}>
        <div className="text-[11px] font-medium text-ma-ink">{row.domain}</div>
        {inits?.length ? (
          <details className="group mt-1.5 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-1 text-[10px] font-medium text-ma-accent hover:text-ma-ink">
              <span className="tabular-nums">
                {inits.length} initiative{inits.length > 1 ? 's' : ''} · {initSarSum.toLocaleString('en-US')} SAR Mn
              </span>
              <span className="text-ma-muted group-open:hidden">· Show</span>
              <span className="hidden text-ma-muted group-open:inline">· Hide</span>
            </summary>
            <div className="mt-1.5 flex flex-wrap gap-1 border-l-2 border-ma-accent/25 pl-2 pt-0.5">
              {inits.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => onInitiativeClick(it.id)}
                  className="group inline-flex max-w-full items-baseline gap-1 rounded border border-ma-accent/40 bg-ma-accent/[0.07] px-1.5 py-0.5 text-left transition-colors hover:border-ma-accent/70 hover:bg-ma-accent/12"
                >
                  <span className="min-w-0 truncate text-[10px] leading-snug text-ma-ink/95 underline decoration-ma-accent/30 decoration-dotted underline-offset-2 group-hover:decoration-ma-accent">
                    {it.label}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] font-semibold tabular-nums text-ma-accent">
                    {it.sarMn.toLocaleString('en-US')}
                  </span>
                </button>
              ))}
            </div>
          </details>
        ) : null}
      </td>
      <td className={`${tdBase} text-center tabular-nums ${colAl}`}>
        <MnCell v={row.aluminium} />
      </td>
      <td className={`${tdBase} text-center tabular-nums ${colPh}`}>
        <MnCell v={row.phosphates} />
      </td>
      <td className={`${tdBase} text-center tabular-nums ${colBm}`}>
        <MnCell v={row.bmnm} />
      </td>
      <td className={`${tdBase} text-center tabular-nums ${colTot}`}>
        <MnCell v={row.total} />
      </td>
    </>
  )
}

type InitiativeThemePipelinePanelProps = {
  slide: InitiativeThemePipelineSlide
}

const thRoad =
  'border-b border-ma-line px-1.5 py-1.5 text-center text-[8px] font-semibold uppercase leading-tight tracking-wide text-ma-graphite'

const tdRoad = 'border-b border-ma-line/70 px-1.5 py-2 align-middle text-[10px] leading-snug text-ma-ink'

function InitiativeDetailModal({
  initiative,
  domain,
  onClose,
}: {
  initiative: InitiativeContributingInitiative
  domain: string
  onClose: () => void
}) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-ma-charcoal/45 backdrop-blur-[1px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-[1] flex max-h-[min(90dvh,640px)] w-full max-w-lg flex-col rounded-t-sm border border-ma-line bg-ma-elevated shadow-lg sm:rounded-sm">
        <div className="flex items-start justify-between gap-3 border-b border-ma-line px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ma-accent">{initiative.bu}</p>
            <h4 className="mt-1 text-[13px] font-semibold leading-snug tracking-tight text-ma-ink">{initiative.label}</h4>
            <p className="mt-1 text-[10px] text-ma-muted">{domain}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1 text-ma-muted hover:bg-ma-surface/80 hover:text-ma-ink"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <p className="font-mono text-[20px] font-semibold tabular-nums text-ma-accent">
            {initiative.sarMn.toLocaleString('en-US')} <span className="text-[11px] font-semibold text-ma-muted">SAR Mn</span>
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wide text-ma-graphite">Potential value contribution (2026 pipeline view)</p>
          {initiative.headline ? (
            <p className="mt-3 text-[12px] font-medium leading-snug text-ma-ink">{initiative.headline}</p>
          ) : null}
          {initiative.highlights?.length ? (
            <ul className="mt-3 list-disc space-y-1.5 pl-4 text-[11px] leading-relaxed text-ma-ink/90">
              {initiative.highlights.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          ) : null}
          {initiative.narrative ? (
            <p className="mt-3 border-t border-ma-line/60 pt-3 text-[11px] leading-relaxed text-ma-muted">{initiative.narrative}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function RoadmapStatusIcon({ status }: { status: InitiativeRoadmapGateStatus }) {
  if (status === 'completed') {
    return (
      <span
        className="flex size-[1.125rem] shrink-0 items-center justify-center rounded-full bg-ma-charcoal text-white shadow-sm"
        title="Completed"
      >
        <Check className="size-2.5" strokeWidth={3} aria-hidden />
      </span>
    )
  }
  if (status === 'in_progress') {
    return (
      <span
        className="flex size-[1.125rem] shrink-0 items-center justify-center rounded-full border-2 border-ma-charcoal/70 bg-white text-ma-charcoal dark:border-ma-line dark:bg-ma-surface dark:text-ma-accent"
        title="In progress"
      >
        <Check className="size-2" strokeWidth={2.5} aria-hidden />
      </span>
    )
  }
  return (
    <span
      className="inline-block size-[1.125rem] shrink-0 rounded-full bg-ma-line/90 ring-1 ring-ma-line dark:bg-white/10 dark:ring-white/10"
      title="To be started"
    />
  )
}

function RoadmapGateCellView({ cell }: { cell: InitiativeRoadmapGateCell }) {
  return (
    <div className="flex min-w-[2.75rem] flex-col items-center gap-0.5">
      <RoadmapStatusIcon status={cell.status} />
      {cell.caption ? (
        <span className="max-w-[4.5rem] text-center text-[9px] tabular-nums text-ma-muted">{cell.caption}</span>
      ) : null}
    </div>
  )
}

type MainTab = 'pipeline' | 'roadmap'

export function InitiativeThemePipelinePanel({ slide }: InitiativeThemePipelinePanelProps) {
  const [selectedInitiativeId, setSelectedInitiativeId] = useState<string | null>(null)
  const [mainTab, setMainTab] = useState<MainTab>('pipeline')

  const initiativeIndex = useMemo(() => buildInitiativeIndex(slide), [slide])
  const asideBlocks = useMemo(() => {
    const fromRows = buildAsideFromThemes(slide.themes)
    return fromRows.length > 0 ? fromRows : slide.topContributors
  }, [slide])

  const linkedInitiativeCount = useMemo(
    () => slide.themes.flatMap((t) => t.rows).reduce((n, r) => n + (r.contributingInitiatives?.length ?? 0), 0),
    [slide],
  )

  const domainRowCount = useMemo(() => slide.themes.reduce((n, t) => n + t.rows.length, 0), [slide])

  const pipeline2026Total = useMemo(
    () => slide.totals.find((t) => t.label === '2026 Pipeline'),
    [slide.totals],
  )

  const selectedCtx = selectedInitiativeId ? initiativeIndex.get(selectedInitiativeId) : undefined

  const rm = slide.domainDeliveryRoadmap

  const themeChunks: { theme: string; rows: (typeof rm.rows)[number][] }[] = []
  for (const row of rm.rows) {
    const last = themeChunks[themeChunks.length - 1]
    if (last && last.theme === row.theme) last.rows.push(row)
    else themeChunks.push({ theme: row.theme, rows: [row] })
  }

  const initiativeIndexPanel =
    asideBlocks.length === 0 ? (
      <p className="text-[11px] text-ma-muted">No linked initiatives in this view.</p>
    ) : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {asideBlocks.map((block) => (
          <div key={block.bu}>
            <p className="border-b border-ma-accent/25 pb-1 text-[10px] font-bold uppercase tracking-wide text-ma-ink">
              {block.bu}
            </p>
            <ul className="mt-2 space-y-1.5">
              {block.items.map((item) => {
                const canOpen = item.id != null && initiativeIndex.has(item.id)
                return (
                  <li key={item.id ?? `${block.bu}-${item.label}`} className="text-[11px] leading-snug text-ma-ink/90">
                    {canOpen ? (
                      <button
                        type="button"
                        onClick={() => setSelectedInitiativeId(item.id!)}
                        className="flex w-full gap-2 rounded-sm px-0.5 py-0.5 text-left hover:bg-ma-surface/60"
                      >
                        <span className="min-w-0 flex-1 underline decoration-ma-accent/35 decoration-dotted underline-offset-2 hover:decoration-ma-accent">
                          {item.label}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] font-semibold tabular-nums text-ma-accent">
                          {item.sarMn.toLocaleString('en-US')}
                        </span>
                      </button>
                    ) : (
                      <span className="flex gap-2 px-0.5">
                        <span className="min-w-0 flex-1">{item.label}</span>
                        <span className="shrink-0 font-mono text-[10px] font-semibold tabular-nums text-ma-accent">
                          {item.sarMn.toLocaleString('en-US')}
                        </span>
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    )

  return (
    <div className="relative mt-4 overflow-hidden rounded-sm border border-ma-line bg-ma-elevated shadow-[0_1px_0_rgba(15,18,16,0.04)] dark:shadow-[0_1px_0_rgba(0,0,0,0.25)]">
      {selectedCtx ? (
        <InitiativeDetailModal
          initiative={selectedCtx.initiative}
          domain={selectedCtx.domain}
          onClose={() => setSelectedInitiativeId(null)}
        />
      ) : null}

      {/* Compact shell: title + glance metrics + footnote (progressive disclosure) */}
      <div className="border-b border-ma-line bg-gradient-to-r from-ma-accent/[0.06] to-transparent px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
          <div className="min-w-0 flex-1">
            <h3 className="text-[13px] font-semibold leading-snug tracking-tight text-ma-ink">{slide.headline}</h3>
            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-ma-muted" title={slide.subline}>
              {slide.subline}
            </p>
            <details className="mt-1.5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="inline cursor-pointer text-[10px] font-medium text-ma-accent hover:underline">
                Full data note
              </summary>
              <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-ma-muted">{slide.subline}</p>
            </details>
          </div>
          <div
            className="flex shrink-0 gap-2 sm:gap-3"
            role="presentation"
            aria-label="At-a-glance counts for this block"
          >
            <div className="rounded-sm border border-ma-line/80 bg-ma-surface/40 px-2.5 py-1.5 text-center dark:bg-ma-charcoal/25">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-ma-graphite">Domains</p>
              <p className="font-mono text-[15px] font-semibold tabular-nums text-ma-ink">{domainRowCount}</p>
            </div>
            <div className="rounded-sm border border-ma-line/80 bg-ma-surface/40 px-2.5 py-1.5 text-center dark:bg-ma-charcoal/25">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-ma-graphite">Linked initiatives</p>
              <p className="font-mono text-[15px] font-semibold tabular-nums text-ma-ink">{linkedInitiativeCount}</p>
            </div>
            {pipeline2026Total ? (
              <div className="rounded-sm border border-ma-accent/30 bg-ma-accent/[0.08] px-2.5 py-1.5 text-center">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-ma-graphite">2026 pipeline</p>
                <p className="font-mono text-[15px] font-semibold tabular-nums text-ma-accent">
                  {pipeline2026Total.total.toLocaleString('en-US')}
                </p>
                <p className="text-[8px] text-ma-muted">SAR Mn</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Primary navigation: segmented control — shared chrome, identical hit targets */}
      <div
        className="border-b border-ma-line bg-ma-surface/35 px-2 py-2.5 sm:px-3 dark:bg-ma-charcoal/25"
        role="tablist"
        aria-label="Initiative block sections"
      >
        <div className="flex w-full max-w-2xl rounded-md border border-ma-line/80 bg-ma-bg/70 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:border-ma-line/50 dark:bg-ma-charcoal/50 sm:inline-flex sm:w-auto">
          <button
            type="button"
            role="tab"
            aria-selected={mainTab === 'pipeline'}
            onClick={() => setMainTab('pipeline')}
            className={`relative flex min-h-[2.75rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-sm px-3 py-2 text-center transition-[color,background-color,box-shadow,border-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ma-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-ma-bg sm:min-w-[11rem] sm:flex-none sm:px-5 ${
              mainTab === 'pipeline'
                ? 'border border-ma-line/70 bg-ma-elevated text-ma-ink shadow-sm dark:border-ma-line/40 dark:bg-ma-charcoal/55'
                : 'border border-transparent text-ma-muted hover:bg-ma-surface/50 hover:text-ma-ink dark:hover:bg-ma-charcoal/35'
            }`}
          >
            <span className="text-[11px] font-semibold leading-tight tracking-tight">Pipeline & value</span>
            <span
              className={`text-[10px] font-normal tabular-nums leading-none ${
                mainTab === 'pipeline' ? 'text-ma-ink/60' : 'text-ma-muted'
              }`}
            >
              {domainRowCount} domains
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mainTab === 'roadmap'}
            onClick={() => setMainTab('roadmap')}
            className={`relative flex min-h-[2.75rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-sm px-3 py-2 text-center transition-[color,background-color,box-shadow,border-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ma-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-ma-bg sm:min-w-[11rem] sm:flex-none sm:px-5 ${
              mainTab === 'roadmap'
                ? 'border border-ma-line/70 bg-ma-elevated text-ma-ink shadow-sm dark:border-ma-line/40 dark:bg-ma-charcoal/55'
                : 'border border-transparent text-ma-muted hover:bg-ma-surface/50 hover:text-ma-ink dark:hover:bg-ma-charcoal/35'
            }`}
          >
            <span className="text-[11px] font-semibold leading-tight tracking-tight">Delivery gates</span>
            <span
              className={`text-[10px] font-normal tabular-nums leading-none ${
                mainTab === 'roadmap' ? 'text-ma-ink/60' : 'text-ma-muted'
              }`}
            >
              Prepare → Implement
            </span>
          </button>
        </div>
      </div>

      {mainTab === 'pipeline' ? (
        <div role="tabpanel">
          <div className="min-w-0 overflow-x-auto px-2 pb-1 pt-2 sm:px-3">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr>
                  <th className={`${thBase} w-[10rem] text-left`}>Theme</th>
                  <th className={`${thBase} min-w-[11rem] text-left`}>Domain</th>
                  <th className={`${thBase} w-[5.25rem] ${colAl}`}>2026 Ind</th>
                  <th className={`${thBase} w-[5.25rem] ${colPh}`}>2026 Urban</th>
                  <th className={`${thBase} w-[5.25rem] ${colBm}`}>2026 Tour</th>
                  <th className={`${thBase} w-[5.25rem] ${colTot}`}>2026 Tot</th>
                </tr>
              </thead>
              <tbody>
                {slide.themes.map((theme) =>
                  theme.rows.map((row, i) => (
                    <tr key={`${theme.title}-${row.domain}`} className="hover:bg-ma-surface/40">
                      {i === 0 ? (
                        <th
                          rowSpan={theme.rows.length}
                          scope="rowgroup"
                          className={`${tdBase} border-r border-ma-line bg-ma-surface/45 align-top text-[10px] font-semibold leading-snug text-ma-ink dark:bg-ma-charcoal/35`}
                        >
                          {theme.title}
                        </th>
                      ) : null}
                      <ThemeRowCells row={row} onInitiativeClick={setSelectedInitiativeId} />
                    </tr>
                  )),
                )}
                {slide.totals.map((t) => (
                  <tr key={t.label} className="bg-ma-surface/55 font-semibold dark:bg-ma-charcoal/40">
                    <td
                      colSpan={2}
                      className={`${tdBase} border-t-2 border-ma-line text-[11px] uppercase tracking-wide text-ma-graphite`}
                    >
                      {t.label}
                    </td>
                    <td className={`${tdBase} border-t-2 border-ma-line text-center tabular-nums ${colAl}`}>
                      {t.aluminium.toLocaleString('en-US')}
                    </td>
                    <td className={`${tdBase} border-t-2 border-ma-line text-center tabular-nums ${colPh}`}>
                      {t.phosphates.toLocaleString('en-US')}
                    </td>
                    <td className={`${tdBase} border-t-2 border-ma-line text-center tabular-nums ${colBm}`}>
                      {t.bmnm.toLocaleString('en-US')}
                    </td>
                    <td className={`${tdBase} border-t-2 border-ma-line text-center tabular-nums ${colTot}`}>
                      {t.total.toLocaleString('en-US')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <details className="group/index mx-2 mb-2 mt-1 overflow-hidden rounded-sm border border-ma-line/90 bg-ma-surface/25 open:border-ma-accent/35 open:bg-ma-surface/40 sm:mx-3 dark:bg-ma-charcoal/20 dark:open:bg-ma-charcoal/30">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-left [&::-webkit-details-marker]:hidden">
              <span>
                <span className="text-[11px] font-semibold text-ma-ink">Initiative index</span>
                <span className="mt-0.5 block text-[10px] text-ma-muted">
                  Same items as under each domain — grouped by BU when you need the full list.
                </span>
              </span>
              <span className="shrink-0 rounded border border-ma-line/80 bg-ma-elevated px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-ma-accent">
                {linkedInitiativeCount}
              </span>
            </summary>
            <div className="border-t border-ma-line/70 px-3 py-3">{initiativeIndexPanel}</div>
          </details>
        </div>
      ) : (
        <div className="px-2 pb-3 pt-2 sm:px-3" role="tabpanel">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h4 className="text-[12px] font-semibold tracking-tight text-ma-ink">{rm.sectionTitle}</h4>
              {rm.sectionSubline ? (
                <p className="mt-0.5 max-w-[52rem] text-[10px] leading-relaxed text-ma-muted">{rm.sectionSubline}</p>
              ) : null}
            </div>
            <details className="shrink-0 rounded-sm border border-ma-line/80 bg-ma-surface/30 dark:bg-ma-charcoal/25">
              <summary className="cursor-pointer px-2.5 py-1.5 text-[10px] font-semibold text-ma-ink [&::-webkit-details-marker]:hidden">
                Gate legend
              </summary>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 border-t border-ma-line/60 px-2.5 py-2 text-[10px] text-ma-muted">
                {rm.legend.map((item) => (
                  <span key={item.status} className="inline-flex items-center gap-1.5">
                    <RoadmapStatusIcon status={item.status} />
                    <span className="text-ma-ink/80">{item.label}</span>
                  </span>
                ))}
              </div>
            </details>
          </div>

          <div className="overflow-x-auto rounded-sm border border-ma-line/80 bg-ma-elevated">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr>
                  <th rowSpan={2} className={`${thRoad} w-[9.5rem] border-r border-ma-line text-left align-bottom`}>
                    Theme
                  </th>
                  <th rowSpan={2} className={`${thRoad} min-w-[11rem] border-r border-ma-line text-left align-bottom`}>
                    Domain
                  </th>
                  <th colSpan={2} className={`${thRoad} border-r border-ma-line bg-ma-accent/[0.08] dark:bg-ma-accent/[0.06]`}>
                    {rm.preparePhaseTitle}
                  </th>
                  <th colSpan={4} className={`${thRoad} border-r border-ma-line bg-ma-accent/[0.08] dark:bg-ma-accent/[0.06]`}>
                    {rm.designPhaseTitle}
                  </th>
                  <th colSpan={2} className={`${thRoad} bg-ma-accent/[0.08] dark:bg-ma-accent/[0.06]`}>
                    {rm.implementPhaseTitle}
                  </th>
                </tr>
                <tr>
                  <th className={`${thRoad} border-r border-ma-line/60`}>{rm.prepareSubheaders[0]}</th>
                  <th className={`${thRoad} border-r border-ma-line`}>{rm.prepareSubheaders[1]}</th>
                  {rm.designSubheaders.map((h, i) => (
                    <th
                      key={h}
                      className={`${thRoad} ${i < rm.designSubheaders.length - 1 ? 'border-r border-ma-line/60' : 'border-r border-ma-line'}`}
                    >
                      {h}
                    </th>
                  ))}
                  <th className={`${thRoad} border-r border-ma-line/60`}>{rm.implementSubheaders[0]}</th>
                  <th className={thRoad}>{rm.implementSubheaders[1]}</th>
                </tr>
              </thead>
              <tbody>
                {themeChunks.flatMap((chunk) =>
                  chunk.rows.map((row, j) => (
                    <tr
                      key={row.domain}
                      className="bg-ma-accent/[0.03] hover:bg-ma-accent/[0.06] dark:bg-ma-accent/[0.02] dark:hover:bg-ma-accent/[0.05]"
                    >
                      {j === 0 ? (
                        <th
                          rowSpan={chunk.rows.length}
                          scope="rowgroup"
                          className={`${tdRoad} border-r border-ma-line bg-ma-surface/40 align-top text-[9px] font-semibold leading-snug text-ma-ink dark:bg-ma-charcoal/30`}
                        >
                          {chunk.theme}
                        </th>
                      ) : null}
                      <td className={`${tdRoad} border-r border-ma-line font-medium`}>{row.domain}</td>
                      <td className={`${tdRoad} border-r border-ma-line/60`}>
                        <RoadmapGateCellView cell={row.prepare[0]} />
                      </td>
                      <td className={`${tdRoad} border-r border-ma-line`}>
                        <RoadmapGateCellView cell={row.prepare[1]} />
                      </td>
                      {row.design.map((cell, k) => (
                        <td
                          key={k}
                          className={`${tdRoad} ${k < row.design.length - 1 ? 'border-r border-ma-line/60' : 'border-r border-ma-line'}`}
                        >
                          <RoadmapGateCellView cell={cell} />
                        </td>
                      ))}
                      <td colSpan={2} className={`${tdRoad} text-center text-[10px] font-medium text-ma-ink`}>
                        {row.implementLabel}
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
