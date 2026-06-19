import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useDomainNarrative } from '../data'
import { DomainExecutiveSpine } from '../components/DomainExecutiveSpine'

/* ── SAFETY data from slides ────────────────────────────────── */

const LTI_TREND = [
  { year: '2018', lti: 20, fat: 0, sr: 3 },
  { year: '2019', lti: 26, fat: 0, sr: 0 },
  { year: '2020', lti: 16, fat: 2.82, sr: 3 },
  { year: '2021', lti: 18, fat: 1, sr: 1 },
  { year: '2022', lti: 14, fat: 0, sr: 3.97 },
  { year: '2023', lti: 11, fat: 1, sr: 2.5 },
  { year: '2024', lti: 4, fat: 1, sr: 1.66 },
  { year: '2025 YTD', lti: 2, fat: 1, sr: 1.27 },
]

const FATALITY_BENCH = [
  { year: '2020', "Masdar City": 1, Lusail: 1, "Expo City Dubai": 0, Diriyah: 3, Qiddiya: 0, "Red Sea Global": 0, NEOM: 0 },
  { year: '2021', "Masdar City": 0, Lusail: 0, "Expo City Dubai": 1, Diriyah: 0, Qiddiya: 0, "Red Sea Global": 0, NEOM: 0 },
  { year: '2022', "Masdar City": 5, Lusail: 0, "Expo City Dubai": 0, Diriyah: 3, Qiddiya: 0, "Red Sea Global": 0, NEOM: 0 },
  { year: '2023', "Masdar City": 3, Lusail: 1, "Expo City Dubai": 1, Diriyah: 2, Qiddiya: 0, "Red Sea Global": 0, NEOM: 0 },
  { year: '2024', "Masdar City": 8, Lusail: 0, "Expo City Dubai": 0, Diriyah: 3, Qiddiya: 1, "Red Sea Global": 0, NEOM: 0 },
]

const INCIDENT_FREQ = [
  { year: '2020', NEOM: 100, Lusail: 100, Diriyah: 100, "Red Sea Global": 100, "Masdar City": 100, "Expo City Dubai": 100, Qiddiya: 100 },
  { year: '2021', NEOM: 112, Lusail: 120, Diriyah: 95, "Red Sea Global": 105, "Masdar City": 90, "Expo City Dubai": 115, Qiddiya: 130 },
  { year: '2022', NEOM: 87, Lusail: 95, Diriyah: 90, "Red Sea Global": 95, "Masdar City": 85, "Expo City Dubai": 105, Qiddiya: 140 },
  { year: '2023', NEOM: 68, Lusail: 85, Diriyah: 85, "Red Sea Global": 88, "Masdar City": 82, "Expo City Dubai": 100, Qiddiya: 100 },
  { year: '2024', NEOM: 25, Lusail: 80, Diriyah: 95, "Red Sea Global": 90, "Masdar City": 80, "Expo City Dubai": 100, Qiddiya: 105 },
]

const PHASES = [
  { id: 1, label: 'Phase 1', complete: true, desc: 'Shifted NEOM operations from reactive to proactive safety management' },
  { id: 2, label: 'Phase 2', complete: false, desc: 'Develop a risk-based approach to predict and manage risks ahead (incl. culture and systems changes)' },
  { id: 3, label: 'Phase 3', complete: false, desc: 'Build the foundation of Best Tech and AI solutions — video analysis, connected equipment, predictive analytics' },
]

const HSS_PILLARS = [
  'Process Safety', 'Contractor Safety', 'Occupational Safety',
  'Emergency Response', 'Security', 'Medical',
]

/* ── ESG data from slides ───────────────────────────────────── */

const WASTE_TO_VALUE = [
  { bu: 'Urban Development & Smart Communities', current: 750, target2040: 3000, strategy: 'Construction debris recycling, CO₂ capture, recycled aggregates for GFA delivery' },
  { bu: 'Special Economic Zone & Investment Platform', current: 750, target2040: 1000, strategy: 'Industrial byproduct reuse, recycled steel, cement/road materials at OXAGON' },
  { bu: 'Luxury Tourism & Hospitality', current: 56, target2040: 75, strategy: 'Resort construction waste reuse, greywater recycling across TROJENA & SINDALAH' },
]

const WATER_DEMAND = [
  { label: 'Current', value: 40 },
  { label: '2040 prev. strategy', value: 86 },
  { label: '2040 revised strategy', value: 165 },
]

const GHG_TRAJECTORY = [
  { label: 'Current', value: 9 },
  { label: '2040 prev. strategy', value: 18 },
  { label: '2040 revised strategy', value: 15 },
]

const RE_STATS = [
  { label: 'Grid → RE', mwh: '74M MWh', savings: 'SAR 9.8Bn' },
  { label: 'Diesel → RE', mwh: '2.4M MWh', savings: 'SAR 0.5Bn' },
]

const PEER_COLORS: Record<string, string> = {
  NEOM: 'var(--ma-teal, #2a7d6e)',
  "Masdar City": 'var(--ma-accent, #00b4a6)',
  Lusail: '#888',
  "Expo City Dubai": '#aaa',
  Diriyah: '#6b8e6b',
  Qiddiya: '#7799bb',
  "Red Sea Global": '#c4a856',
}

const PEER_KEYS = ["Masdar City", "Lusail", "Expo City Dubai", "Diriyah", "Qiddiya", "Red Sea Global", "NEOM"] as const

const TOOLTIP_STYLE = {
  fontSize: 11,
  borderRadius: 6,
  border: '1px solid var(--ma-line)',
  background: 'var(--ma-elevated)',
}

/* ── shared components ──────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ma-accent">
      {children}
    </p>
  )
}

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-ma-line bg-ma-elevated p-4 shadow-sm sm:p-5 ${className ?? ''}`}>
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ma-muted">{title}</h3>
      {children}
    </div>
  )
}

/* ── business KPI extension ─────────────────────────────────── */

function SafetyEsgDashboard() {
  return (
    <div className="space-y-6">
      {/* ═══ SAFETY ═══ */}
      <SectionLabel>Safety</SectionLabel>

      {/* Transformation phases */}
      <Card title="Safety transformation — three-phase shift to proactive zero-harm">
        <div className="grid gap-3 sm:grid-cols-3">
          {PHASES.map((p) => (
            <div
              key={p.id}
              className={`rounded-md border px-3 py-2.5 ${p.complete ? 'border-ma-teal/40 bg-ma-teal/8' : 'border-ma-line/80 bg-ma-surface/40'}`}
            >
              <div className="flex items-center gap-2">
                <span className={`inline-flex size-5 items-center justify-center rounded-full text-[9px] font-bold ${p.complete ? 'bg-ma-teal text-white' : 'border border-ma-muted/50 bg-ma-surface text-ma-muted'}`}>
                  {p.complete ? '✓' : p.id}
                </span>
                <span className="text-[11px] font-semibold text-ma-ink">{p.label}</span>
                {p.complete && <span className="ml-auto text-[9px] font-bold uppercase tracking-wide text-ma-teal">Complete</span>}
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-ma-muted">{p.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-ma-line/60 pt-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ma-muted">HSS House pillars</p>
          <div className="flex flex-wrap gap-1.5">
            {HSS_PILLARS.map((h) => (
              <span key={h} className="rounded-full border border-ma-line bg-ma-surface/60 px-2 py-0.5 text-[10px] font-medium text-ma-ink">{h}</span>
            ))}
          </div>
        </div>
      </Card>

      {/* LTI trend */}
      <Card title="LTI, fatality rate & severity rate — 2018 to 2025 YTD">
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={LTI_TREND} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ma-line, #e0dcd5)" />
              <XAxis dataKey="year" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} domain={[0, 10]} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar yAxisId="left" dataKey="lti" name="LTI" fill="var(--ma-accent, #00b4a6)" radius={[3, 3, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="fat" name="FAT" stroke="var(--ma-risk, #c4493c)" strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="sr" name="SR" stroke="var(--ma-teal, #2a7d6e)" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-[10px] text-ma-muted">LTI count (bars, left axis) · Fatality rate &amp; Severity Rate (lines, right axis). Contractors included per GRI.</p>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Fatality benchmark */}
        <Card title="Fatality benchmark — peer comparison (2020–2024)">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={FATALITY_BENCH} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ma-line, #e0dcd5)" />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {PEER_KEYS.map((k) => (
                  <Bar key={k} dataKey={k} fill={PEER_COLORS[k]} radius={[2, 2, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[10px] text-ma-muted">NEOM: 0 fatalities across entire 2020–2024 benchmark window. Data source: GRI sustainability reports.</p>
        </Card>

        {/* Incident frequency benchmark */}
        <Card title="Incident frequency — indexed to 2020 baseline (100%)">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={INCIDENT_FREQ} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ma-line, #e0dcd5)" />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => `${v ?? ''}%`} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {Object.entries(PEER_COLORS).map(([key, color]) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={color}
                    strokeWidth={key === "NEOM" ? 3 : 1.5}
                    dot={key === "NEOM" ? { r: 4 } : { r: 2 }}
                    strokeDasharray={key === "NEOM" ? undefined : '4 2'}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[10px] text-ma-muted">NEOM at ~25% of 2020 baseline — ahead of Expo City Dubai, Qiddiya, Diriyah, and Red Sea Global.</p>
        </Card>
      </div>

      {/* ═══ ESG / SUSTAINABILITY ═══ */}
      <div className="mt-2">
        <SectionLabel>ESG &amp; Sustainability</SectionLabel>
      </div>

      {/* Renewable energy */}
      <Card title="Renewable energy — SAR 10.3Bn annual cost savings by 2040">
        <div className="grid gap-4 sm:grid-cols-2">
          {RE_STATS.map((r) => (
            <div key={r.label} className="rounded-md border border-ma-line/80 bg-ma-surface/40 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ma-muted">{r.label}</p>
              <p className="mt-1 text-[18px] font-bold tracking-tight text-ma-ink">{r.savings}</p>
              <p className="text-[11px] text-ma-muted">{r.mwh} displaced by 2040</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-ma-muted">
          Utility-scale solar PV + storage and hybrid C&amp;I solutions for remote development sites. Mobile fleet electrification offers further reductions. Assumptions based on 2024 energy costs, 60% replacement.
        </p>
      </Card>

      {/* Waste to value */}
      <Card title="Waste-to-value — ~SAR 1.5Bn current → SAR 4Bn+ by 2040">
        <div className="overflow-x-auto rounded-md border border-ma-line/60">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-ma-line bg-ma-surface/30 text-left text-[9px] font-semibold uppercase tracking-wide text-ma-muted dark:bg-ma-charcoal/30">
                <th className="px-3 py-2 font-semibold">BU</th>
                <th className="px-3 py-2 font-semibold text-right">Current (SAR m)</th>
                <th className="px-3 py-2 font-semibold text-right">2040 target (SAR m)</th>
                <th className="px-3 py-2 font-semibold">Strategy</th>
              </tr>
            </thead>
            <tbody>
              {WASTE_TO_VALUE.map((w) => (
                <tr key={w.bu} className="border-b border-ma-line/40 last:border-b-0">
                  <td className="px-3 py-2.5 font-medium text-ma-ink">{w.bu}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{w.current.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-ma-teal">{w.target2040.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-ma-muted">{w.strategy}</td>
                </tr>
              ))}
              <tr className="border-t border-ma-line bg-ma-surface/20">
                <td className="px-3 py-2.5 font-semibold text-ma-ink">Total</td>
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{WASTE_TO_VALUE.reduce((s, w) => s + w.current, 0).toLocaleString()}</td>
                <td className="px-3 py-2.5 text-right font-bold tabular-nums text-ma-teal">{WASTE_TO_VALUE.reduce((s, w) => s + w.target2040, 0).toLocaleString()}</td>
                <td className="px-3 py-2.5" />
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Water demand */}
        <Card title="Water demand — 4× growth to 165 Mn m³/year by 2040">
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={WATER_DEMAND} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ma-line, #e0dcd5)" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => `${v ?? ''} Mn m³`} />
                <Bar dataKey="value" name="Mn m³/year" radius={[4, 4, 0, 0]}>
                  {WATER_DEMAND.map((_, i) => (
                    <Cell key={i} fill={i === 2 ? 'var(--ma-risk, #c4493c)' : i === 1 ? 'var(--ma-amber-warn, #c4963c)' : 'var(--ma-teal, #2a7d6e)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[10px] text-ma-muted">
            KSA water demand projected to grow &gt;50% by 2030. Critical input for Urban Development & Smart Communities and Luxury Tourism & Hospitality operations.
          </p>
        </Card>

        {/* GHG trajectory */}
        <Card title="GHG emissions trajectory — net zero 2050 goal remains">
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={GHG_TRAJECTORY} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ma-line, #e0dcd5)" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => `${v ?? ''} Mt CO₂e`} />
                <Bar dataKey="value" name="Mt CO₂e" radius={[4, 4, 0, 0]}>
                  {GHG_TRAJECTORY.map((_, i) => (
                    <Cell key={i} fill={i === 1 ? 'var(--ma-amber-warn, #c4963c)' : i === 2 ? 'var(--ma-accent, #00b4a6)' : 'var(--ma-teal, #2a7d6e)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[10px] text-ma-muted">
            Revised strategy +22% vs. previous but 2040 milestone achievable with RE scale-up. Luxury Tourism & Hospitality growth is lower-GHG-intensive.
          </p>
        </Card>
      </div>

    </div>
  )
}

/* ── page ────────────────────────────────────────────────────── */

const EMPTY_KPIS: never[] = []

export function SafetyEsg() {
  const narrative = useDomainNarrative('safety-esg')
  const extension = useMemo(() => <SafetyEsgDashboard />, [])

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ma-muted">
          Foundation · Safety &amp; sustainability
        </p>
        <h1 className="text-[22px] font-semibold tracking-tight text-ma-ink">Safety &amp; ESG</h1>
        <p className="mt-1 text-[13px] leading-snug text-ma-muted">
          Safety transformation, incident benchmarking, renewable energy, waste-to-value, water &amp; GHG stewardship.
        </p>
      </header>

      <DomainExecutiveSpine
        narrative={narrative}
        spineDomainKey="safety-esg"
        kpiRows={EMPTY_KPIS}
        businessKpiExtension={extension}
      />
    </div>
  )
}
