import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useDomainNarrative, useTechnologyData } from '../data'
import { DomainExecutiveSpine } from '../components/DomainExecutiveSpine'
import type { TechnologyProgramStatusWorkstream } from '../data/types'
import { InitiativeThemePipelinePanel } from '../components/InitiativeThemePipelinePanel'
import { ProgramStatusTable } from '../components/ProgramStatusTable'
import { buildTechnologyKpiRows } from '../lib/domainKpiRows'
import { RagDot } from '../components/RagDot'

function rollupKpiStatus(workstreams: TechnologyProgramStatusWorkstream[]) {
  const c = { on_track: 0, at_risk: 0, delayed: 0 }
  for (const w of workstreams) {
    for (const r of w.rows) {
      c[r.status]++
    }
  }
  return { ...c, total: c.on_track + c.at_risk + c.delayed }
}

export function Technology() {
  const t = useTechnologyData()
  const narrative = useDomainNarrative('technology')
  const spineKpis = useMemo(() => buildTechnologyKpiRows(narrative, t), [narrative, t])

  const businessKpiExtension = useMemo(() => {
    const kpiMix = rollupKpiStatus(t.programStatusWorkstreams)
    const funnelMax = Math.max(1, ...t.initiativePipeline.map((s) => s.count))
    const funnelDen = Math.max(1, t.initiativePipeline.length - 1)
    const buData = t.buBreakdown.map((b) => ({
      bu: b.bu,
      new2026: b.sar2026Mn,
      recurring2025: b.recurring2025Mn,
      total: b.sar2026Mn + b.recurring2025Mn,
    }))

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-ma-graphite">
            Operating detail
          </h2>
          <p className="mt-1 max-w-[44rem] text-[11px] leading-snug text-ma-muted">
            Program table, funnel, and BU split — full TechOps operating picture.
          </p>
        </div>

        <section className="flex flex-col gap-4 rounded-sm border border-ma-line bg-ma-surface/40 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between dark:bg-ma-surface/20">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ma-muted">
              KPI mix in program table
            </p>
            <p className="mt-1 text-[12px] text-ma-muted">
              {kpiMix.total} KPI rows · same thresholds as the status legend below.
            </p>
          </div>
          <div className="flex flex-wrap gap-6 sm:justify-end">
            <span className="inline-flex items-center gap-2 tabular-nums">
              <RagDot color="green" />
              <span className="text-lg font-semibold text-ma-ink">{kpiMix.on_track}</span>
              <span className="text-[11px] text-ma-muted">on-track</span>
            </span>
            <span className="inline-flex items-center gap-2 tabular-nums">
              <RagDot color="amber" />
              <span className="text-lg font-semibold text-ma-ink">{kpiMix.at_risk}</span>
              <span className="text-[11px] text-ma-muted">at-risk</span>
            </span>
            <span className="inline-flex items-center gap-2 tabular-nums">
              <RagDot color="red" />
              <span className="text-lg font-semibold text-ma-ink">{kpiMix.delayed}</span>
              <span className="text-[11px] text-ma-muted">delayed</span>
            </span>
          </div>
        </section>

        <section className="space-y-4">
          <ProgramStatusTable
            asOf={t.programStatusAsOf}
            workstreams={t.programStatusWorkstreams}
            heading={`Workstream KPIs · ${t.programStatusAsOf}`}
          />
          <InitiativeThemePipelinePanel slide={t.initiativeThemePipelineSlide} />
        </section>

        <section>
          <h2 className="mb-1 text-[13px] font-semibold uppercase tracking-[0.12em] text-ma-graphite">
            Depth · pipeline & BU allocation
          </h2>
          <p className="mb-4 max-w-[48rem] text-[12px] leading-snug text-ma-muted">
            Funnel shows initiative maturity and SAR mix; chart shows where pipeline vs recurring value
            concentrates by BU. These layers are not duplicated in the program table above.
          </p>
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="min-w-0">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ma-muted">
                Initiative funnel
              </h3>
              <div className="space-y-2 rounded-sm border border-ma-line bg-ma-elevated p-4">
                {t.initiativePipeline.map((stage, i) => {
                  const w = 40 + (stage.count / funnelMax) * 60
                  const intensity = 0.25 + (i / funnelDen) * 0.75
                  return (
                    <div key={stage.level} className="flex flex-col items-center gap-1">
                      <div
                        className="flex h-11 items-center justify-between rounded-sm border border-ma-line px-3 text-sm transition hover:border-ma-accent/40"
                        style={{
                          width: `${w}%`,
                          background: `color-mix(in srgb, var(--ma-accent) ${intensity * 40}%, transparent)`,
                        }}
                      >
                        <span className="font-medium text-ma-ink">{stage.level}</span>
                        <span className="font-medium tabular-nums text-ma-accent">
                          {stage.count} · SAR {stage.sarMn}M
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="min-w-0">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ma-muted">
                BU value breakdown
              </h3>
              <div className="h-72 rounded-sm border border-ma-line bg-ma-elevated p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={buData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--ma-line)" vertical={false} />
                    <XAxis dataKey="bu" tick={{ fill: 'var(--ma-muted)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--ma-muted)', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--ma-elevated)',
                        border: '1px solid var(--ma-line)',
                      }}
                    />
                    <Bar dataKey="new2026" stackId="a" fill="#b8956a" name="2026 pipeline" />
                    <Bar dataKey="recurring2025" stackId="a" fill="#3d8580" name="2025 recurring" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>
      </div>
    )
  }, [t])

  return (
    <div className="space-y-8">
      <header className="max-w-[52rem]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ma-muted">
          Focus · Unlock value
        </p>
        <h1 className="text-[22px] font-semibold tracking-tight text-ma-ink">Technology</h1>
        <p className="mt-1 text-[13px] leading-snug text-ma-muted">
          Value, management operating system, talent, and platforms — plus deployment funnel and BU
          value split.
        </p>
      </header>

      <DomainExecutiveSpine
        narrative={narrative}
        spineDomainKey="technology"
        kpiRows={spineKpis}
        businessKpiExtension={businessKpiExtension}
      />
    </div>
  )
}
