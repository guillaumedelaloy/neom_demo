import { useStrategicKpisData } from '../data'
import { KpiCard } from './KpiCard'
import { ProgressBar } from './ProgressBar'

const shell =
  'rounded-sm border border-ma-line bg-ma-elevated px-5 py-4 shadow-[0_1px_0_rgba(15,18,16,0.04)] dark:shadow-[0_1px_0_rgba(0,0,0,0.25)]'

function Source({ children }: { children: string }) {
  return <p className="mt-2 text-[10px] leading-snug text-ma-muted">{children}</p>
}

export function StrategicKpisSection() {
  const k = useStrategicKpisData()
  const ebitdaPct = (k.ebitdaBridge.actualSarBn / k.ebitdaBridge.targetSarBn) * 100

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-ma-graphite">
          Strategic KPIs
        </h2>
        <p className="mt-1 text-[12px] leading-snug text-ma-muted">
          EBITDA, capital, safety, ESG, and partner metrics for the monthly operating review.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        <div className={shell}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ma-muted">
            EBITDA bridge
          </p>
          <p className="mt-2 text-xs text-ma-muted">Actual → target (SAR Bn)</p>
          <div className="mt-2 flex flex-wrap gap-4 tabular-nums">
            <div>
              <p className="text-[10px] uppercase text-ma-muted">Actual</p>
              <p className="text-xl font-semibold text-ma-teal">{k.ebitdaBridge.actualSarBn}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-ma-muted">Target</p>
              <p className="text-xl font-semibold text-ma-ink">{k.ebitdaBridge.targetSarBn}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-ma-muted">Gap</p>
              <p className="text-xl font-semibold text-ma-amber-warn">{k.ebitdaBridge.gapSarBn}</p>
            </div>
          </div>
          <div className="mt-3">
            <ProgressBar value={ebitdaPct} max={100} />
          </div>
          <Source>{k.ebitdaBridge.note}</Source>
        </div>

        <KpiCard
          label="CAPEX commitment rate"
          value={`${k.capexCommitmentRatePct.toFixed(1)}%`}
          subtitle="Share of approved envelope contractually committed"
          footer={
            <p className="text-[10px] leading-snug text-ma-muted">{k.capexNote}</p>
          }
        />

        <KpiCard
          label="Weighted avg. project IRR"
          value={`${k.weightedAvgIrrPct.toFixed(1)}%`}
          subtitle={`vs ${k.hurdleIrrPct}% hurdle · portfolio view`}
          valueClassName={
            k.weightedAvgIrrPct >= k.hurdleIrrPct ? 'text-ma-teal' : 'text-ma-amber-warn'
          }
          footer={<p className="text-[10px] leading-snug text-ma-muted">{k.irrNote}</p>}
        />

        <div className={shell}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ma-muted">
            Safety (HSE)
          </p>
          <div className="mt-2 grid grid-cols-3 gap-3 tabular-nums">
            <div>
              <p className="text-[10px] text-ma-muted">LTIFR</p>
              <p className="text-lg font-semibold text-ma-ink">{k.safety.ltifr}</p>
            </div>
            <div>
              <p className="text-[10px] text-ma-muted">TRIFR</p>
              <p className="text-lg font-semibold text-ma-ink">{k.safety.trifr}</p>
            </div>
            <div>
              <p className="text-[10px] text-ma-muted">Fatalities YTD</p>
              <p className="text-lg font-semibold text-ma-teal">{k.safety.fatalitiesYtd}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-ma-muted">
            Safe site man-hours ·{' '}
            <span className="font-semibold tabular-nums text-ma-ink">
              {k.safety.safeManHoursMn}M
            </span>
          </p>
          <Source>{k.safety.note}</Source>
        </div>

        <div className={shell}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ma-muted">
            ESG & sustainability
          </p>
          <ul className="mt-2 space-y-1.5 text-[13px] text-ma-ink">
            <li className="flex justify-between gap-2">
              <span className="text-ma-muted">Carbon intensity</span>
              <span className="tabular-nums font-semibold">
                {k.esg.carbonIntensityKgPerT} kg/t
              </span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-ma-muted">Water recycling</span>
              <span className="tabular-nums font-semibold">{k.esg.waterRecyclingPct}%</span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-ma-muted">Saudization (ops)</span>
              <span className="tabular-nums font-semibold">{k.esg.saudizationOperationalPct}%</span>
            </li>
          </ul>
          <Source>{k.esg.note}</Source>
        </div>

        <KpiCard
          label="Partner performance score"
          value={`${k.partnerPerformanceScore.toFixed(1)}`}
          subtitle={`of ${k.partnerScoreMax} · composite (delivery, quality, responsiveness)`}
          footer={<p className="text-[10px] leading-snug text-ma-muted">{k.partnerNote}</p>}
        />

        <div className={shell}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ma-muted">
            Regulatory & gov. approvals
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2 tabular-nums text-sm">
            <div>
              <p className="text-[10px] text-ma-muted">Pending</p>
              <p className="text-lg font-semibold text-ma-ink">{k.regulatoryPipeline.pendingApprovals}</p>
            </div>
            <div>
              <p className="text-[10px] text-ma-muted">Avg. days</p>
              <p className="text-lg font-semibold text-ma-ink">
                {k.regulatoryPipeline.avgProcessingDays}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-ma-muted">Escalated</p>
              <p className="text-lg font-semibold text-ma-amber-warn">
                {k.regulatoryPipeline.escalated}
              </p>
            </div>
          </div>
          <Source>{k.regulatoryPipeline.note}</Source>
        </div>

        <KpiCard
          label="Existing operations"
          value={`SAR ${k.existingOperations.revenueSarBn} bn`}
          subtitle={`EBITDA margin · ${k.existingOperations.marginPct.toFixed(1)}%`}
          footer={
            <p className="text-[10px] leading-snug text-ma-muted">{k.existingOperations.note}</p>
          }
        />

        <div className={`${shell} sm:col-span-2 xl:col-span-2`}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ma-muted">
            Build-out by sector pillar
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[280px] text-left text-sm">
              <thead>
                <tr className="border-b border-ma-line text-[10px] uppercase tracking-wide text-ma-muted">
                  <th className="py-2 pr-3 font-semibold">Pillar</th>
                  <th className="py-2 pr-3 font-semibold">Delivered</th>
                  <th className="py-2 font-semibold">Priority</th>
                </tr>
              </thead>
              <tbody>
                {k.marketShare.map((row) => (
                  <tr key={row.product} className="border-b border-ma-line/80 last:border-0">
                    <td className="py-2 pr-3 font-medium text-ma-ink">{row.product}</td>
                    <td className="py-2 pr-3 tabular-nums text-ma-accent">{row.sharePct}%</td>
                    <td className="py-2 tabular-nums text-ma-muted">#{row.rank}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Source>{k.marketShareNote}</Source>
        </div>

        <KpiCard
          label="Saudization rate"
          value={`${k.saudizationRatePct.toFixed(1)}%`}
          subtitle="Group · compliance & government relations"
          footer={
            <p className="text-[10px] leading-snug text-ma-muted">{k.saudizationNote}</p>
          }
        />

        <div className={shell}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ma-muted">
            Digital & AI adoption
          </p>
          <div className="mt-2 flex flex-wrap gap-6 tabular-nums">
            <div>
              <p className="text-[10px] text-ma-muted">AI use cases live</p>
              <p className="text-2xl font-semibold text-ma-accent">{k.digitalAi.aiUseCasesDeployed}</p>
            </div>
            <div>
              <p className="text-[10px] text-ma-muted">Ops automation</p>
              <p className="text-2xl font-semibold text-ma-teal">
                {k.digitalAi.opsAutomationRatePct}%
              </p>
            </div>
          </div>
          <Source>{k.digitalAi.note}</Source>
        </div>
      </div>
    </section>
  )
}
