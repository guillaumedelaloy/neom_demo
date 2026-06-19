import { useMemo } from 'react'
import { useDomainNarrative, usePeopleData } from '../data'
import { DomainExecutiveSpine } from '../components/DomainExecutiveSpine'
import type { PeopleInitiativeStatus, PeoplePillarNarrative } from '../data/types'
import { ProgressBar } from '../components/ProgressBar'
import { RagDot } from '../components/RagDot'

function statusToRag(s: PeopleInitiativeStatus) {
  if (s === 'on_track') return 'green' as const
  if (s === 'at_risk') return 'amber' as const
  return 'red' as const
}

function statusLabel(s: PeopleInitiativeStatus) {
  if (s === 'on_track') return 'On-track'
  if (s === 'at_risk') return 'Risk of delay'
  return 'Delayed'
}

function formatDue(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

function BulletBlock({
  title,
  items,
  tone,
}: {
  title: string
  items: string[]
  tone: 'default' | 'risk' | 'mitigation'
}) {
  const titleCls =
    tone === 'risk'
      ? 'text-ma-risk'
      : tone === 'mitigation'
        ? 'text-ma-teal'
        : 'text-ma-muted'
  return (
    <div>
      <p className={`text-[10px] font-semibold uppercase tracking-wide ${titleCls}`}>{title}</p>
      <ul className="mt-1.5 list-disc space-y-1.5 pl-4 text-[12px] leading-snug text-ma-ink">
        {items.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    </div>
  )
}

function PillarCard({ pillar }: { pillar: PeoplePillarNarrative }) {
  return (
    <article className="flex min-w-0 flex-col gap-4 rounded-sm border border-ma-line bg-ma-elevated p-4 shadow-[0_1px_0_rgba(15,18,16,0.04)] dark:shadow-[0_1px_0_rgba(0,0,0,0.25)]">
      <header className="border-b border-ma-line pb-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ma-accent">
          {pillar.headline}
        </p>
        <h3 className="mt-0.5 text-base font-semibold text-ma-ink">{pillar.label}</h3>
      </header>
      <BulletBlock title="Latest progress" items={pillar.progress} tone="default" />
      <BulletBlock title="Key risks and challenges" items={pillar.risks} tone="risk" />
      <BulletBlock title="Mitigations and support required" items={pillar.mitigations} tone="mitigation" />
    </article>
  )
}

const EMPTY_KPIS: never[] = []

const KEY_OUTCOMES: {
  initiative: string
  outcomes: string[]
  progress: string[]
}[] = [
  {
    initiative: '#1 Talent Acquisition',
    outcomes: ['50 specialized roles hired (target 228 by \'26)'],
    progress: [
      '10% of Specialized roles filled in Technology (14/139)',
      '37% of Specialized roles filled in Development (22/60)',
      '48% of Specialized roles filled in Projects (14/29)',
    ],
  },
  {
    initiative: '#6 Succession-ready bench of 100–200 future leaders',
    outcomes: ['Succession bench strength of N-1 & N-2 for Critical Roles (target 60% by \'26)'],
    progress: ['50% for N-1', '67% for N-2', '61% total'],
  },
  {
    initiative: '#7 NEOM Academy — LDP',
    outcomes: [
      '% of Successors attending targeted programs (target 90% by \'26)',
      'Applied learning rate (70% by \'26)',
    ],
    progress: [
      '0% (program commencing by end of April)',
      '0% (commencing 3rd week of April)',
    ],
  },
  {
    initiative: '#7 NEOM Academy',
    outcomes: ['Quality of CDP aligned to the 70-20-10 model based on Leadership Program Track (≥90% end of 2026)'],
    progress: ['0% (CDP launched April 14)'],
  },
  {
    initiative: '#8 Integrated Performance Management',
    outcomes: [
      'Complete the 2026 Goal Setting',
      'Role-out continuous conversations',
      'Complete the formal check-ins',
      'Finalize the 2027 Goal Setting',
      'Finalize \'26 Appraisal and Calibration',
      'Measure effectiveness through OHI',
    ],
    progress: [
      'By 30 April 2026',
      'By 2 June 2026',
      '31 July 2026',
      'By 31 October 2026',
      'By 31 December 2026',
      'TBC',
    ],
  },
  {
    initiative: '#11 Future Leaders Program design',
    outcomes: ['# of students awarded scholarship (target 100 end of 2026)'],
    progress: ['30 from KFUPM (program commencing timeline to be confirmed)'],
  },
  {
    initiative: '#12 Talent Management Redesign',
    outcomes: ['% of Top Talent (Acceleration and Progression) in Succession (100% by \'26)'],
    progress: ['To be further confirmed'],
  },
]

export function People() {
  const p = usePeopleData()
  const narrative = useDomainNarrative('people')

  const peopleOperatingDetail = useMemo(() => {
    return (
      <div className="space-y-4">
        {/* Key outcomes table */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ma-accent">
            Progress against key outcomes
          </p>
          <p className="mt-0.5 max-w-[40rem] text-[11px] leading-snug text-ma-muted">
            Priority initiative KPIs and current progress — from the People Strategy review.
          </p>
        </div>
        <div className="overflow-x-auto rounded-md border border-ma-line/60">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-ma-line bg-ma-surface/30 text-left text-[9px] font-semibold uppercase tracking-wide text-ma-muted dark:bg-ma-charcoal/30">
                <th className="w-[22%] px-3 py-2.5 font-semibold">Initiative</th>
                <th className="w-[38%] px-3 py-2.5 font-semibold">Key outcomes</th>
                <th className="px-3 py-2.5 font-semibold">Progress</th>
              </tr>
            </thead>
            <tbody>
              {KEY_OUTCOMES.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-ma-line/40 align-top last:border-b-0 even:bg-ma-surface/15"
                >
                  <td className="px-3 py-2.5 font-semibold text-ma-ink">{row.initiative}</td>
                  <td className="px-3 py-2.5">
                    <ul className="list-disc space-y-1 pl-3.5 text-ma-muted">
                      {row.outcomes.map((o, j) => <li key={j}>{o}</li>)}
                    </ul>
                  </td>
                  <td className="px-3 py-2.5">
                    <ul className="list-disc space-y-1 pl-3.5 text-ma-ink">
                      {row.progress.map((pr, j) => <li key={j}>{pr}</li>)}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ma-accent">Operating detail</p>
          <p className="mt-0.5 max-w-[40rem] text-[11px] leading-snug text-ma-muted">
            Hiring progress, pillar cards, priority initiatives, and pipeline metrics.
          </p>
        </div>

        <section>
        <h2 className="mb-1 text-[13px] font-semibold uppercase tracking-[0.12em] text-ma-graphite">
          Key progress, challenges, and support by pillar
        </h2>
        <p className="mb-4 max-w-[44rem] text-[12px] leading-snug text-ma-muted">
          Mirrors the leadership narrative: what has advanced, what is at risk, and what support
          is required — per attract, develop, and build pipeline pillars.
        </p>
        <div className="grid gap-4 lg:grid-cols-3">
          {p.pillarNarratives.map((pillar) => (
            <PillarCard key={pillar.id} pillar={pillar} />
          ))}
        </div>
        </section>

        <section>
        <h2 className="mb-1 text-[13px] font-semibold uppercase tracking-[0.12em] text-ma-graphite">
          Key immediate next steps on priority initiatives
        </h2>
        <p className="mb-4 text-[12px] text-ma-muted">
          Owners and target dates from program tracking.
        </p>
        <div className="overflow-x-auto rounded-sm border border-ma-line bg-ma-elevated">
          <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-ma-line bg-ma-surface text-[10px] font-semibold uppercase tracking-wide text-ma-muted">
                <th className="px-3 py-2.5">Initiative</th>
                <th className="px-3 py-2.5">Key action</th>
                <th className="w-[9rem] px-3 py-2.5">Deadline</th>
              </tr>
            </thead>
            <tbody>
              {p.nextSteps.map((row) => (
                <tr
                  key={row.action}
                  className="border-b border-ma-line last:border-b-0 odd:bg-ma-bg/50 hover:bg-ma-surface/60"
                >
                  <td className="px-3 py-2.5 text-[12px] font-medium text-ma-muted">{row.initiative ?? row.owner}</td>
                  <td className="px-3 py-2.5 font-medium text-ma-ink">{row.action}</td>
                  <td className="px-3 py-2.5 font-mono tabular-nums text-ma-accent">{formatDue(row.due)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </section>

        <section>
        <h2 className="mb-1 text-[13px] font-semibold uppercase tracking-[0.12em] text-ma-graphite">
          Priority initiative delivery
        </h2>
        <p className="mb-4 max-w-[44rem] text-[12px] leading-snug text-ma-muted">
          Deep-dive subset from the program office view: initiative owner, actual vs planned
          completion (milestone-based average), and challenge / mitigant pairs.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {p.priorityInitiatives.map((init) => (
            <article
              key={init.number}
              className="flex min-w-0 flex-col gap-3 rounded-sm border border-ma-line bg-ma-elevated p-4 transition hover:border-ma-accent/35"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-ma-line pb-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ma-muted">
                    Initiative #{init.number}
                  </p>
                  <h3 className="mt-0.5 text-[15px] font-semibold leading-snug text-ma-ink">
                    {init.name}
                  </h3>
                  <p className="mt-1 text-[11px] text-ma-muted">
                    Owner · <span className="text-ma-ink">{init.owner}</span>
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 shrink-0">
                  <RagDot color={statusToRag(init.status)} />
                  <span className="text-[11px] font-medium text-ma-muted">{statusLabel(init.status)}</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase text-ma-muted">Actual</p>
                  <p className="font-mono text-xl text-ma-accent">{init.actualPct}%</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-ma-muted">Planned</p>
                  <p className="font-mono text-xl text-ma-muted">{init.plannedPct}%</p>
                </div>
              </div>
              <div className="space-y-1">
                <ProgressBar value={init.actualPct} max={100} />
                <p className="text-[10px] leading-snug text-ma-muted">
                  Planned completion marker at {init.plannedPct}% (see footnote).
                </p>
              </div>
              {init.footnote ? (
                <p className="text-[10px] leading-snug text-ma-muted">{init.footnote}</p>
              ) : null}
              <div className="grid gap-3 border-t border-ma-line pt-3 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase text-ma-risk">Key challenges</p>
                  <ul className="mt-1 list-disc space-y-1 pl-3.5 text-[11px] leading-snug text-ma-ink">
                    {init.challenges.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-ma-teal">Mitigants</p>
                  <ul className="mt-1 list-disc space-y-1 pl-3.5 text-[11px] leading-snug text-ma-ink">
                    {init.mitigants.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>
        </section>
      </div>
    )
  }, [p])

  return (
    <div className="space-y-8">
      <header className="max-w-[48rem]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ma-muted">
          Foundation · People
        </p>
        <h1 className="text-[22px] font-semibold tracking-tight text-ma-ink">People</h1>
        <p className="mt-1 text-[13px] leading-snug text-ma-muted">
          People strategy progress, risks, and mitigations across strategic pillars — aligned to
          leadership review materials ({p.programAsOf}). Initiative delivery view for priority
          programs with owners and milestone-based completion %.
        </p>
      </header>

      <DomainExecutiveSpine
        narrative={narrative}
        spineDomainKey="people"
        kpiRows={EMPTY_KPIS}
        businessKpiExtension={peopleOperatingDetail}
      />
    </div>
  )
}
