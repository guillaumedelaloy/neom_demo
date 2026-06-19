import type { GrowthProjectDetail, Project } from '../data/types'

export type BackendMessage = { role: 'user' | 'assistant'; content: string }

export type CeoScope = 'global' | 'bu' | 'project' | 'kpi'

export type CeoContext = {
  scope: CeoScope
  bu?: string
  projectId?: string
  projectName?: string
  kpiLabel?: string
  /** Human-readable page name, e.g. "Enablers", "Financials". */
  page?: string
  /** e.g. "June 2026" — hardcoded for POC. */
  reportingPeriod?: string
  /** Key metrics / entities visible on this page (static per route for POC). */
  pageEntities?: string[]
  /** Page-scoped quick actions shown in the drawer when no messages yet. */
  suggestedQuestions?: string[]
  /** Single line for chat chrome, e.g. "Asking about: Enablers, Global portfolio, June 2026" */
  contextBanner: string
}

export type AgentId =
  | 'orchestrator'
  | 'clarification_agent'
  | 'data_extraction'
  | 'value_lens'
  | 'delivery_engine'
  | 'risk_radar'
  | 'gap_finder'
  | 'action_desk'

export type AgentLogEvent = {
  id: string
  ts: number
  agent: AgentId
  message: string
}

export type Confidence = 'green' | 'amber' | 'red'

export type AgentBreakdownEntry = {
  agent: AgentId
  title: string
  bullets: string[]
}

export type CeoAnswer = {
  directAnswer: string
  agentBreakdown: AgentBreakdownEntry[]
  orchestratorSynthesis: string
  recommendation: string
  confidence: Confidence
  /** Shown inside synthesis — forced cross-agent tension */
  disagreementNote: string
}

export type CeoIntent =
  | 'delay'
  | 'portfolio_risk'
  | 'commodity'
  | 'realism'
  | 'action'
  | 'worry_month'
  | 'generic'

export type CeoDataSnapshot = {
  projects: Project[]
  project: Project | null
  projectDetail: GrowthProjectDetail | null
  /** BU from UI filter / route context (may differ from `project.bu` when global chat). */
  contextBu?: string
  weightedProgressKpi: number
  onTrack: number
  atRisk: number
  /** Top portfolio risks from risk.json (subset) */
  topRisks: { name: string; probability: number; impact: number; category: string }[]
}

export type ChartSpec = {
  id: string
  type: 'bar' | 'line' | 'pie'
  title: string
  data: Array<Record<string, string | number>>
  xKey: string
  yKeys: string[]
  xLabel?: string
  yLabel?: string
}

export type ReasoningScratchpad = {
  intent: CeoIntent
  delivery: {
    slipQuarters: number
    propagatedDelayWeeks: number
    criticalPath: string
    narrative: string
  }
  value: {
    ebitdaImpactSarM: number
    causality: string
    usesDeliverySlip: boolean
  }
  risk: {
    headlineProbabilityPct: number
    riskDriver: string
  }
  gap: {
    challengesValueLens: string
    missingAssumptions: string[]
  }
  action: {
    items: string[]
  }
}
