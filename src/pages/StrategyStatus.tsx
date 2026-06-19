import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from 'recharts'
import {
  useDomainNarrative,
  useEnablersData,
  useExplorationData,
  usePortfolioData,
  useStrategicKpisData,
} from '../data'
import { DomainExecutiveSpine } from '../components/DomainExecutiveSpine'
import {
  mseEnablers,
  mseExploration,
  mseGrowthProjects,
  mseTechnologyValue,
  mseValueDelivery,
} from '../data/mseExecutiveSummary'
import { KpiCard } from '../components/KpiCard'
import { ProgressBar } from '../components/ProgressBar'
import { StrategicKpisSection } from '../components/StrategicKpisSection'
import { buildStrategyStatusKpiRows } from '../lib/domainKpiRows'
import { capitalDeployed, projectStatusCounts, weightedProgressKpi } from '../lib/portfolioMath'
import { formatUsdM } from '../lib/format'

const cardShell =
  'rounded-sm border border-ma-line bg-ma-elevated px-5 py-4 shadow-[0_1px_0_rgba(15,18,16,0.04)] transition-colors hover:border-ma-accent/35 dark:shadow-[0_1px_0_rgba(0,0,0,0.25)]'

const tip = {
  borderRadius: 2,
  background: 'var(--ma-elevated)',
  border: '1px solid var(--ma-line)',
  color: 'var(--ma-ink)',
}

function portfolioProgressColor(v: number) {
  if (v <= 1.05) return 'text-ma-accent'
  if (v <= 1.1) return 'text-ma-amber-warn'
  return 'text-ma-risk'
}

export function StrategyStatus() {
  const projects = usePortfolioData()
  const enablers = useEnablersData()
  const narrative = useDomainNarrative('strategy-status')
  const portfolioNarrative = useDomainNarrative('portfolio')
  const explorationNarrative = useDomainNarrative('exploration')
  const explorationData = useExplorationData()
  const strategic = useStrategicKpisData()
  const spineKpis = useMemo(
    () =>
      buildStrategyStatusKpiRows(
        narrative,
        projects,
        enablers,
        strategic,
        portfolioNarrative,
        explorationNarrative,
        explorationData,
      ),
    [narrative, projects, enablers, strategic, portfolioNarrative, explorationNarrative, explorationData],
  )

  const vd = mseValueDelivery
  const gp = mseGrowthProjects
  const ex = mseExploration
  const tv = mseTechnologyValue
  const en = mseEnablers
  const kpi = gp.portfolioKpi
  const kpiMin = kpi.stretch
  const kpiMax = kpi.threshold
  const kpiRange = kpiMax - kpiMin
  const kpiPct = Math.min(100, Math.max(0, ((kpi.value - kpiMin) / kpiRange) * 100))
  const kpiTargetPct = ((kpi.target - kpiMin) / kpiRange) * 100
  const techPct =
    tv.techopsEbitda2026.targetSarBn > 0
      ? (tv.techopsEbitda2026.realizedSarBn / tv.techopsEbitda2026.targetSarBn) * 100
      : 0

  const wKpi = weightedProgressKpi(projects)
  const wColor = portfolioProgressColor(wKpi)

  const counts = projectStatusCounts(projects)
  const donutData = [
    { name: 'On Track', value: counts.on_track, color: 'var(--ma-teal)' },
    {
      name: 'At Risk',
      value: counts.potential_delay,
      color: 'var(--ma-amber-warn)',
    },
    { name: 'Delayed', value: counts.delayed ?? 0, color: 'var(--ma-risk)' },
    { name: 'Not Started', value: counts.not_started ?? 0, color: 'var(--ma-accent-muted)' },
  ].filter((d) => d.value > 0)

  const { summary } = enablers
  const enablerBarData = [
    {
      name: 'readiness',
      onTrack: summary.onTrack,
      atRisk: summary.atRisk,
      delayed: summary.delayed,
      notStarted: summary.notStarted,
    },
  ]

  const cap = capitalDeployed(projects)

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ma-muted">
          Focus · Portfolio & enablers
        </p>
        <h1 className="text-[22px] font-semibold tracking-tight text-ma-ink">Strategy Status</h1>
        <p className="mt-1 max-w-[48rem] text-[13px] leading-snug text-ma-muted">
          Quantified view of portfolio progress, delivery health, enabler readiness, capital
          deployment, and extended strategic KPIs. Use this page for reviews; the strategy realization
          cockpit stays at attention and decisions only.
        </p>
      </header>

      <DomainExecutiveSpine
        narrative={narrative}
        spineDomainKey="strategy-status"
        kpiRows={spineKpis}
        strategyBusinessKpisBundle={{
          vd,
          gp,
          ex,
          tv,
          en,
          kpiPct,
          kpiTargetPct,
          techPct,
        }}
      />

      <div className="border-t border-ma-line pt-6">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-ma-graphite">
          Operating detail
        </h2>
        <p className="mt-1 max-w-[40rem] text-[11px] leading-snug text-ma-muted">
          Charts and extended strategic KPIs — same signals as the spine, with full drill-down.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-ma-graphite">
          Core delivery metrics
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Portfolio Progress"
            value={<span className={wColor}>{wKpi.toFixed(2)}</span>}
            subtitle="Weighted by EBITDA contribution (capex where EBITDA unavailable)"
          />

          <div className={cardShell}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ma-muted">
              Project Status
            </p>
            <div className="relative mt-2 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={68}
                    paddingAngle={2}
                  >
                    {donutData.map((e) => (
                      <Cell key={e.name} fill={e.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tip} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-2">
                <p className="text-2xl font-semibold tabular-nums text-ma-accent">{projects.length}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ma-muted">
                  Projects
                </p>
              </div>
            </div>
            <ul className="mt-1 flex flex-wrap justify-center gap-3 text-[11px] text-ma-muted">
              {donutData.map((d) => (
                <li key={d.name} className="flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: d.color }}
                    aria-hidden
                  />
                  {d.name}:{' '}
                  <span className="tabular-nums font-medium text-ma-ink">{d.value}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={cardShell}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ma-muted">
              Enabler Readiness
            </p>
            <p className="mt-2 text-[13px] text-ma-muted">
              <span className="font-semibold tabular-nums text-ma-accent">{summary.onTrack}</span> of{' '}
              <span className="tabular-nums font-semibold text-ma-ink">{summary.total}</span> on
              track
            </p>
            <div className="mt-4 h-10">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={enablerBarData} stackOffset="expand">
                  <XAxis type="number" hide domain={[0, 1]} />
                  <YAxis type="category" dataKey="name" hide />
                  <Tooltip contentStyle={tip} />
                  <Bar dataKey="onTrack" stackId="a" fill="var(--ma-teal)" />
                  <Bar dataKey="atRisk" stackId="a" fill="var(--ma-amber-warn)" />
                  <Bar dataKey="delayed" stackId="a" fill="var(--ma-risk)" />
                  <Bar dataKey="notStarted" stackId="a" fill="var(--ma-accent-muted)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <KpiCard
            label="Capital Deployed"
            value={
              <span className="text-ma-accent">
                {cap.budget > 0 ? `${cap.pct.toFixed(1)}%` : '—'}
              </span>
            }
            subtitle={
              cap.budget > 0 ? (
                <span>
                  {formatUsdM(cap.spent)} of {formatUsdM(cap.budget)} budgeted (tracked projects)
                </span>
              ) : (
                'Insufficient budget lines with spend'
              )
            }
            footer={cap.budget > 0 ? <ProgressBar value={cap.pct} max={100} /> : null}
          />
        </div>
      </section>

      <StrategicKpisSection />
    </div>
  )
}
