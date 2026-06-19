import { getGrowthProjectDetailStatic } from '../data/hooks'
import { projectStatusCounts, weightedProgressKpi } from '../lib/portfolioMath'
import { createActivityEmitter } from './activity'
import { runActionDesk } from './agents/actionDesk'
import { runDeliveryEngine } from './agents/deliveryEngine'
import { runGapFinder } from './agents/gapFinder'
import { runRiskRadar } from './agents/riskRadar'
import { runValueLens } from './agents/valueLens'
import { detectIntent, resolveProjectIdFromQuestion } from './interpret'
import type { Project } from '../data/types'
import type {
  AgentBreakdownEntry,
  AgentLogEvent,
  CeoAnswer,
  CeoContext,
  CeoDataSnapshot,
  CeoIntent,
  Confidence,
  ReasoningScratchpad,
} from './types'

export type OrchestrateInput = {
  question: string
  context: CeoContext
  snapshot: CeoDataSnapshot
  onLog: (e: AgentLogEvent) => void
  /** Last turn’s direct answer for lightweight follow-up continuity */
  priorDirectAnswer?: string
}

function enrichSnapshot(snap: CeoDataSnapshot, question: string, ctx: CeoContext): CeoDataSnapshot {
  const rid = resolveProjectIdFromQuestion(question, ctx)
  if (!rid) return snap
  const p = snap.projects.find((x) => x.id === rid)
  if (!p) return snap
  const detail = getGrowthProjectDetailStatic(rid) ?? null
  return {
    ...snap,
    project: p,
    projectDetail: detail,
  }
}

function slipQuartersFromIntent(intent: CeoIntent, question: string): number {
  if (
    intent !== 'delay' &&
    intent !== 'realism' &&
    intent !== 'generic' &&
    intent !== 'action' &&
    intent !== 'worry_month'
  )
    return 1
  const q = question.toLowerCase()
  const m = q.match(/\b(\d)\s*-?\s*quarter\b/i) ?? q.match(/\b(\d)\s*q\b/i)
  if (m) return Math.min(4, Math.max(1, parseInt(m[1]!, 10)))
  if (/\b(two|2)\s+quarter\b/i.test(q)) return 2
  if (/\b(three|3)\s+quarter\b/i.test(q)) return 3
  if (/\bone\s+quarter\b|\b1q\b|\ba\s+quarter\b/i.test(q)) return 1
  return 1
}

function confidenceFor(scratch: ReasoningScratchpad, atRisk: number): Confidence {
  if (scratch.value.ebitdaImpactSarM >= 280 || scratch.risk.headlineProbabilityPct >= 78 || atRisk >= 6)
    return 'red'
  if (scratch.value.ebitdaImpactSarM >= 120 || scratch.risk.headlineProbabilityPct >= 62 || atRisk >= 4)
    return 'amber'
  return 'green'
}

function directAnswer(
  intent: CeoIntent,
  ctx: CeoContext,
  snap: CeoDataSnapshot,
  scratch: ReasoningScratchpad,
): string {
  const pn = snap.project?.name ?? 'the portfolio'
  const bu = snap.project?.bu ?? ctx.bu ?? 'Ma’aden'

  if (intent === 'worry_month') {
    return `This month, highest CEO attention is ${snap.atRisk} growth projects behind plan-weight (portfolio KPI ${snap.weightedProgressKpi.toFixed(2)}) plus enterprise risk “${snap.topRisks[0]?.name ?? 'execution'}” at ~${scratch.risk.headlineProbabilityPct}% modeled likelihood — causality: schedule slips on sulfur/power unlocks pull forward cash and covenant scrutiny in the same reporting window.`
  }

  if (intent === 'portfolio_risk') {
    const tr = snap.topRisks[0]
    return `Largest modeled risk concentration is “${tr?.name ?? 'Execution'}” (${tr?.category ?? 'n/a'}) with probability index ${scratch.risk.headlineProbabilityPct}% because delivery KPI ${snap.weightedProgressKpi.toFixed(2)} and ${snap.atRisk} at-risk projects amplify funding/enabler correlation in the POC engine.`
  }

  if (intent === 'commodity') {
    return `Modeled commodity pass-through for your question implies SAR ${scratch.value.ebitdaImpactSarM}M EBITDA movement because ${scratch.value.causality}`
  }

  if (intent === 'realism') {
    return `Plan realism for ${pn} (${bu}) is ${snap.project && snap.project.progressKpi > 1.05 ? 'stretched' : 'credible but conditional'}: milestone KPI ${snap.project?.progressKpi.toFixed(2) ?? snap.weightedProgressKpi.toFixed(2)} vs. plan with ${scratch.delivery.propagatedDelayWeeks}w propagated float if governance slips — causality: ${scratch.delivery.criticalPath.slice(0, 120)}.`
  }

  if (intent === 'action') {
    return `Priority CEO move: execute Action Desk item #1 within 30 days to cut ${scratch.risk.headlineProbabilityPct}% headline risk by unlocking “${scratch.delivery.criticalPath.slice(0, 80)}…” before SAR ${scratch.value.ebitdaImpactSarM}M economic drag compounds.`
  }

  if (snap.project && (intent === 'delay' || intent === 'generic')) {
    return `A ${scratch.delivery.slipQuarters}-quarter slip on ${pn} (${bu}) maps to SAR ${scratch.value.ebitdaImpactSarM}M EBITDA pressure because ${scratch.value.causality}`
  }

  return `Portfolio view (${ctx.contextBanner}): weighted delivery KPI ${snap.weightedProgressKpi.toFixed(2)} across ${snap.projects.length} projects; ${snap.onTrack} on-track vs ${snap.atRisk} at-risk — economic tail from a generic 1Q governance slip is SAR ${scratch.value.ebitdaImpactSarM}M in the POC model because ${scratch.value.causality}`
}

function synthesisParagraph(scratch: ReasoningScratchpad, snap: CeoDataSnapshot): string {
  return `Combined view: schedule (+${scratch.delivery.propagatedDelayWeeks}w) and EBITDA (SAR ${scratch.value.ebitdaImpactSarM}M) point the same way; risk sits at about ${scratch.risk.headlineProbabilityPct}% on “${scratch.risk.riskDriver.slice(0, 100)}…”. ${scratch.gap.challengesValueLens} Use the SAR ${scratch.value.ebitdaImpactSarM}M figure for discussion, but flag FY27 cash timing unless working capital frees up for ${snap.project?.name ?? 'the cluster'}.`
}

function buildBreakdown(scratch: ReasoningScratchpad): AgentBreakdownEntry[] {
  return [
    {
      agent: 'value_lens',
      title: 'Financial impact',
      bullets: [
        `EBITDA delta (POC): SAR ${scratch.value.ebitdaImpactSarM}M.`,
        scratch.value.causality,
      ],
    },
    {
      agent: 'delivery_engine',
      title: 'Schedule effect',
      bullets: [scratch.delivery.narrative, `Critical path anchor: ${scratch.delivery.criticalPath}.`],
    },
    {
      agent: 'risk_radar',
      title: 'Probability',
      bullets: [
        `Headline probability index: ${scratch.risk.headlineProbabilityPct}%.`,
        scratch.risk.riskDriver,
      ],
    },
    {
      agent: 'gap_finder',
      title: 'Missing assumptions / challenge',
      bullets: [scratch.gap.challengesValueLens, ...scratch.gap.missingAssumptions.slice(0, 2)],
    },
    {
      agent: 'action_desk',
      title: 'Actions (prioritized)',
      bullets: scratch.action.items,
    },
  ]
}

export async function runCeoReasoning(input: OrchestrateInput): Promise<CeoAnswer> {
  const emit = createActivityEmitter(input.onLog)
  const snap0 = enrichSnapshot(input.snapshot, input.question, input.context)
  const emitCtx = input.priorDirectAnswer
    ? ` — follow-up (earlier answer: “${input.priorDirectAnswer.slice(0, 100)}…”)`
    : ''

  await emit('orchestrator', `Reading your question${emitCtx}…`, 120)
  await emit('orchestrator', input.context.contextBanner, 180)

  const intent = detectIntent(input.question, input.context)
  const intentLabel = intent.replace(/_/g, ' ')
  await emit('orchestrator', `Treating this as: ${intentLabel}`, 200)

  const slipQ = slipQuartersFromIntent(intent, input.question)
  await emit('delivery_engine', 'Tracing how schedule slips could spread…', 220)
  const delivery = runDeliveryEngine(snap0, intent === 'commodity' ? 1 : slipQ)

  await emit('value_lens', 'Estimating EBITDA and cash effects…', 240)
  const value = runValueLens(snap0, intent, delivery, input.question)

  const scratchPartial: ReasoningScratchpad = {
    intent,
    delivery,
    value,
    risk: { headlineProbabilityPct: 0, riskDriver: '' },
    gap: { challengesValueLens: '', missingAssumptions: [] },
    action: { items: [] },
  }

  await emit('risk_radar', 'Scoring how likely the downside is…', 260)
  scratchPartial.risk = runRiskRadar(snap0, intent, delivery)

  await emit('gap_finder', 'Stress-testing assumptions…', 260)
  scratchPartial.gap = runGapFinder(scratchPartial.value, scratchPartial.delivery)

  await emit('action_desk', 'Drafting prioritized next steps…', 240)
  scratchPartial.action.items = runActionDesk(snap0, scratchPartial)

  await emit('orchestrator', 'Combining views into one readout…', 280)

  const scratch = scratchPartial
  const direct = directAnswer(intent, input.context, snap0, scratch)
  const conf = confidenceFor(scratch, snap0.atRisk)
  const answer: CeoAnswer = {
    directAnswer: direct,
    agentBreakdown: buildBreakdown(scratch),
    orchestratorSynthesis: synthesisParagraph(scratch, snap0),
    recommendation:
      scratch.action.items[0] ??
      'Book a short decision session on the top bottleneck with the CFO and BU lead.',
    confidence: conf,
    disagreementNote: scratch.gap.challengesValueLens,
  }

  return answer
}

/** Build snapshot for the provider from live hooks data */
export function buildCeoDataSnapshot(params: {
  projects: Project[]
  context: CeoContext
  topRisks: { name: string; probability: number; impact: number; category: string }[]
}): CeoDataSnapshot {
  const counts = projectStatusCounts(params.projects)
  const atRisk = counts.potential_delay ?? 0
  const onTrack = counts.on_track ?? 0
  const project =
    params.context.projectId != null
      ? params.projects.find((p) => p.id === params.context.projectId) ?? null
      : null
  const detail =
    params.context.projectId != null
      ? getGrowthProjectDetailStatic(params.context.projectId) ?? null
      : null

  return {
    projects: params.projects,
    project,
    projectDetail: detail,
    contextBu: params.context.bu,
    weightedProgressKpi: weightedProgressKpi(params.projects),
    onTrack,
    atRisk,
    topRisks: params.topRisks.slice(0, 6),
  }
}
