/**
 * CEO Strategy realization cockpit — structured copy and figures taken from the
 * Monthly Strategy Execution (MSE) document. Do not infer or fill gaps here; the UI
 * renders "Undefined / To Be Clarified" where this file marks fields absent.
 */

export type UndefinedBlock = {
  title: 'Undefined / To Be Clarified'
  missing: string[]
  why: string
  question: string
}

export const mseValueDelivery = {
  ebitda2030TargetsVisibleScope: [
    { segment: 'Urban Development & Smart Communities', sarBn: 2.4 },
    { segment: 'Special Economic Zone & Investment Platform', sarBn: 6.88 },
    { segment: 'Luxury Tourism & Hospitality', sarBn: 5 },
  ] as const,
  undefinedBlock: {
    title: 'Undefined / To Be Clarified' as const,
    missing: [
      'Current EBITDA baseline',
      'Aggregation logic',
      'Initiative-level attribution',
    ],
    why: 'Required to assess whether strategy is delivering value',
    question: 'How is EBITDA tracked from initiative → BU → total portfolio?',
  } satisfies UndefinedBlock,
}

export const mseGrowthProjects = {
  portfolioKpi: {
    value: 1.01,
    target: 1.0,
    threshold: 1.05,
    stretch: 0.95,
  },
  projectExamples: [
    {
      kind: 'progress' as const,
      name: 'Urban Development flagship — Phases 2–3',
      plannedProgressPct: 17.1,
      actualProgressPct: 12.4,
      status: 'Potential Delay',
    },
    {
      kind: 'kpi' as const,
      name: 'OXAGON Advanced Manufacturing',
      kpi: 1.03,
      status: 'Potential Delay',
    },
    {
      kind: 'kpi' as const,
      name: 'Circular Materials Plant',
      kpi: 0.99,
      status: 'Ahead of Plan',
    },
    {
      kind: 'kpi' as const,
      name: 'OXAGON Port — Phase 1',
      kpi: 1.01,
      status: 'On Track',
    },
  ] as const,
  fidPipelinePartialView: [
    'Urban Development flagship — Phase 2: Gate 2 approval pending',
    'OXAGON Port — Phase 1: FID planned',
    'OXAGON Advanced Manufacturing: FID delayed',
  ] as const,
  undefinedBlock: {
    title: 'Undefined / To Be Clarified' as const,
    missing: ['EBITDA contribution per project', 'Full FID pipeline (next 12 months)'],
    why: 'Needed to prioritize projects by value',
    question: 'Which projects contribute most to 2030 EBITDA and what are their timelines?',
  } satisfies UndefinedBlock,
}

export const mseExploration = {
  pipelineOverview: {
    explorationLicensesKm2: 46_000,
    identifiedTargets: 2_170,
  },
  keyAssets: [
    {
      name: 'Leyja Eco-Resort',
      resources: '307 keys',
      capexSarBn: 7.6,
      ebitdaSarBn: 1.57,
    },
    {
      name: 'ENOWA Solar Field',
      resources: '460 MW (solar)',
      capexSarBn: null as null,
      ebitdaSarBn: null as null,
    },
  ] as const,
  keyIssues: [
    'Development permit delays across multiple assets',
    'Land-readiness shortfall vs strategic targets',
  ] as const,
  undefinedBlock: {
    title: 'Undefined / To Be Clarified' as const,
    missing: ['Development pipeline progress KPI', 'Probability of pipeline conversion'],
    why: 'No standardized way to track development pipeline performance',
    question: 'How is pipeline success measured across stages (site → permitted → ready-to-build)?',
  } satisfies UndefinedBlock,
}

export const mseTechnologyValue = {
  techopsEbitda2026: {
    targetSarBn: 2.5,
    realizedSarBn: 0.4,
  },
  execution: {
    initiativesInExecutionPct: 70,
    targetPct: 100,
  },
  undefinedBlock: {
    title: 'Undefined / To Be Clarified' as const,
    missing: ['Link between technology initiatives and EBITDA contribution'],
    why: 'Cannot validate value creation from technology investments',
    question: 'Which initiatives contribute to EBITDA and by how much?',
  } satisfies UndefinedBlock,
}

export const mseEnablers = {
  criticalStatus: [
    { enabler: 'Desalinated water supply', status: 'Delayed' },
    { enabler: 'Green hydrogen offtake pricing', status: 'Unresolved' },
    { enabler: 'Power supply', status: 'Non-competitive pricing' },
    { enabler: 'Development permits', status: 'Not secured' },
  ] as const,
  impactedAreas: [
    { area: 'Urban Development & Smart Communities', items: 'Water, power' },
    { area: 'Special Economic Zone & Investment Platform', items: 'Power' },
    { area: 'Development pipeline', items: 'Permitting' },
  ] as const,
}
