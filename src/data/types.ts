export type ProjectStatus = 'on_track' | 'potential_delay'

export type Project = {
  id: string
  name: string
  bu: string
  stage: string
  progressKpi: number
  plannedProgress: number
  actualProgress: number
  cpi: number | null
  spi: number | null
  status: ProjectStatus
  budgetUsdM: number | null
  actualSpendUsdM: number | null
  eacUsdM: number | null
  ebitdaSarB: number | null
  capexSarB: number | null
  productionTarget: string
  nextMilestone: string
  nextMilestoneDate: string
  topBlocker: string
  safeManHours: number | null
  ltiFreeDays: number | null
}

export type GrowthDeliveryChainState = 'complete' | 'current' | 'planned'

export type GrowthDeliveryChainNode = {
  lane: string
  label: string
  period: string
  state: GrowthDeliveryChainState
}

export type GrowthProjectBottleneck = {
  dimension: string
  bottleneck: string
  unlockRequired: string
}

export type GrowthProjectRisk = {
  text: string
  severity: 'high' | 'medium' | 'low'
}

export type GrowthStrategicOutcome = {
  capexSarB: number | null
  production: string
  ebitdaSarB: number | null
  firstProductionFocus?: string
  fullProductionTarget?: string
}

export type GrowthProjectOverview = {
  updateBullets?: string[]
  upcomingActivities?: string[]
  completedMilestones?: string[]
  upcomingMilestones?: string[]
}

export type GrowthProjectDetail = {
  hasDeepDive: boolean
  reportingMonth?: string
  /** MSE-style footnote on milestone % methodology */
  footnote?: string
  strategicOutcome?: GrowthStrategicOutcome
  deliveryChain?: GrowthDeliveryChainNode[]
  bottlenecks?: GrowthProjectBottleneck[]
  overview?: GrowthProjectOverview
  risks?: GrowthProjectRisk[]
}

export type EnablerCellStatus =
  | 'deployed'
  | 'secured'
  | 'committed'
  | 'submitted'
  | 'at_risk'
  | 'delayed'
  | 'not_started'
  | 'na'

export type EnablerMatrixRow = {
  project: string
  water: EnablerCellStatus
  power: EnablerCellStatus
  gas: EnablerCellStatus
  sulfur: EnablerCellStatus
  rail: EnablerCellStatus
  port: EnablerCellStatus
  road: EnablerCellStatus
  miningLicense: EnablerCellStatus
  explorationLicense: EnablerCellStatus
  fuel: EnablerCellStatus
  funding: EnablerCellStatus
}

export type EnablersData = {
  summary: {
    total: number
    onTrack: number
    atRisk: number
    delayed: number
    notStarted: number
  }
  matrix: EnablerMatrixRow[]
  sulfurStatus: {
    currentAgreement: string
    proposedByAramco: string
    impactOnIrr: string
    alternativeSourcing: string
    escalationStatus: string
  }
}

export type ExplorationData = {
  hospitalityKeysTarget: { min: number; max: number; unit: string; ytdActual: number }
  copperTarget: { min: number; max: number; unit: string; ytdActual: number }
  hospitalitySites: {
    name: string
    targetMoz: number
    expectedDate: string
    cluster: string
  }[]
  copperPrograms: {
    name: string
    targetKt: number | null
    totalMeters: number
    status: string
  }[]
  drillingProgress: {
    program: string
    plannedMeters: number
    actualMeters: number
  }[]
}

export type TechnologyProgramStatusRag = 'on_track' | 'at_risk' | 'delayed'

export type TechnologyProgramStatusRow = {
  kpi: string
  uom: string
  actual: string
  target: string
  status: TechnologyProgramStatusRag
}

export type TechnologyProgramStatusWorkstream = {
  name: string
  rows: TechnologyProgramStatusRow[]
  notes?: string[]
}

/** Named initiative tied to a domain row — chips in the pipeline + detail on click. */
export type InitiativeContributingInitiative = {
  id: string
  label: string
  sarMn: number
  bu: string
  /** Short hook shown at top of the detail panel. */
  headline?: string
  /** Longer context: value angle, tech, timing, etc. */
  narrative?: string
  /** Scannable bullets (value, tech, exploration impact, …). */
  highlights?: string[]
}

/** Initiative pipeline SAR (Mn) by theme / domain — slide under workstream KPIs (Technology). */
export type InitiativePipelineThemeRow = {
  domain: string
  aluminium: number | null
  phosphates: number | null
  bmnm: number | null
  total: number | null
  /** Top initiatives for this domain (drives chips + aggregated right rail). */
  contributingInitiatives?: InitiativeContributingInitiative[]
}

export type InitiativePipelineTheme = {
  title: string
  rows: InitiativePipelineThemeRow[]
}

export type InitiativePipelineTotalRow = {
  label: string
  aluminium: number
  phosphates: number
  bmnm: number
  total: number
}

export type InitiativeTopContributorItem = {
  id?: string
  label: string
  sarMn: number
}

export type InitiativeTopContributor = {
  bu: string
  items: InitiativeTopContributorItem[]
}

/** Prepare / design gate status — matches slide legend. */
export type InitiativeRoadmapGateStatus = 'not_started' | 'in_progress' | 'completed'

export type InitiativeRoadmapGateCell = {
  status: InitiativeRoadmapGateStatus
  /** Date or short note next to the icon (e.g. Mar 31). */
  caption?: string
}

export type InitiativeDomainDeliveryRoadmapRow = {
  theme: string
  domain: string
  prepare: [InitiativeRoadmapGateCell, InitiativeRoadmapGateCell]
  design: [
    InitiativeRoadmapGateCell,
    InitiativeRoadmapGateCell,
    InitiativeRoadmapGateCell,
    InitiativeRoadmapGateCell,
  ]
  /** Single line for Implement phase (e.g. Start in June →). */
  implementLabel: string
}

export type InitiativeDomainDeliveryRoadmap = {
  sectionTitle: string
  sectionSubline?: string
  legend: { status: InitiativeRoadmapGateStatus; label: string }[]
  preparePhaseTitle: string
  prepareSubheaders: [string, string]
  designPhaseTitle: string
  designSubheaders: [string, string, string, string]
  implementPhaseTitle: string
  implementSubheaders: [string, string]
  rows: InitiativeDomainDeliveryRoadmapRow[]
}

export type InitiativeThemePipelineSlide = {
  headline: string
  subline: string
  themes: InitiativePipelineTheme[]
  totals: InitiativePipelineTotalRow[]
  topContributors: InitiativeTopContributor[]
  domainDeliveryRoadmap: InitiativeDomainDeliveryRoadmap
}

export type TechnologyData = {
  valueIdentified2030SarBn: number
  initiatives2026DefinedSarBn: number
  initiatives2026TargetSarBn: number
  initiatives2026InExecution: number
  initiatives2026InExecutionTarget: number
  ebitdaRealized2026SarBn: number
  ebitdaTarget2026SarBn: number
  wasteValue2026SarBn: number
  wasteTarget2026SarBn: number
  mosDeployment: number
  mosTarget: number
  talentHired: number
  talentTarget: number
  totalSpecializedRoles: number
  filledRoles: number
  activeRoles: number
  partnershipsFormed: number
  partnershipsTarget: number
  platformsCreated: number
  platformsTarget: number
  initiativePipeline: { level: string; count: number; sarMn: number }[]
  buBreakdown: { bu: string; sar2026Mn: number; recurring2025Mn: number }[]
  programStatusAsOf: string
  programStatusWorkstreams: TechnologyProgramStatusWorkstream[]
  initiativeThemePipelineSlide: InitiativeThemePipelineSlide
}

export type PeopleInitiativeStatus = 'on_track' | 'at_risk' | 'delayed'

export type PeoplePillarNarrative = {
  id: string
  label: string
  headline: string
  progress: string[]
  risks: string[]
  mitigations: string[]
}

export type PeopleNextStep = {
  action: string
  owner: string
  initiative?: string
  due: string
}

export type PeoplePriorityInitiative = {
  number: number
  name: string
  owner: string
  actualPct: number
  plannedPct: number
  status: PeopleInitiativeStatus
  footnote?: string
  challenges: string[]
  mitigants: string[]
}

export type PeopleData = {
  programAsOf: string
  specializedRolesHiring: {
    hired: number
    target: number
    segments: string
  }
  pillarNarratives: PeoplePillarNarrative[]
  nextSteps: PeopleNextStep[]
  priorityInitiatives: PeoplePriorityInitiative[]
  talentAcquisition: { actual: number; planned: number }
  successionBench: { actual: number; planned: number; target: number }
  criticalRoles: {
    total: number
    filled: number
    inProgress: number
    open: number
  }
  hiringPipeline: {
    cvsShared: number
    interviewed: number
    offersExtended: number
    joined: number
    onboarding: number
  }
  initiatives: {
    name: string
    pillar: string
    actual: number
    planned: number
    status: PeopleInitiativeStatus
  }[]
}

export type RiskTrend = 'increasing' | 'stable' | 'decreasing'

export type CommodityPrice = {
  name: string
  current: number
  sixMonthAgo: number
  unit: string
  trend: number[]
} & (
  | { greenBelow: number; redAbove: number }
  | { greenAbove: number; redBelow: number }
)

export type ConsolidatedRiskEntry = {
  id: number
  name: string
  /** "Strategic" or "Principal" */
  tier: 'Strategic' | 'Principal'
  /** E.g. "35 H" — the raw score + rating letter from the slide. */
  ratingLabel: string
  score: number
  /** H = High, S = Significant */
  ratingClass: 'H' | 'S'
  movement: 'increasing' | 'stable' | 'decreasing'
  /** Grid col (1–5, low→high probability). */
  gridCol: number
  /** Grid row (1–5, low→high impact). */
  gridRow: number
  /** Rationale shown on click (from key risk movement slide). */
  movementRationale?: string
}

/** Deep-dive copy for consolidated risk drawer (Excom / ERM pack). */
export type ConsolidatedRiskDetail = {
  riskOwner?: string
  influencedBy?: string
  influences?: string
  /** Marker position on the 2×2 interdependency plot (corner quadrant). */
  interdependencyQuadrant?: 'tl' | 'tr' | 'bl' | 'br'
  highlightBullets?: string[]
  /** Optional stage / metric table (e.g. exploration portfolio mix). */
  portfolioStageRows?: { label: string; current: string; target: string }[]
  probabilityNarrative?: string
  probabilityPct?: string
  impactNarrative?: string
  impactPct?: string
  financialExposureMn?: string
  exposureFootnote?: string
}

export type RiskData = {
  topRisks: {
    name: string
    category: string
    probability: number
    impact: number
    trend: RiskTrend
    owner: string
  }[]
  consolidatedRiskMap: ConsolidatedRiskEntry[]
  financialKris: {
    netLeverage: {
      current: number
      threshold: number
      limit: number
      trend: RiskTrend
    }
    cashFlowDeviation: {
      current: number
      threshold: number
      limit: number
      trend: RiskTrend
    }
    liquidityRatio: {
      current: number
      threshold: number
      limit: number
      trend: RiskTrend
    }
    interestCoverage: {
      current: number
      threshold: number
      limit: number
      trend: RiskTrend
    }
  }
  commodityPrices: CommodityPrice[]
}

export type StrategicKpisData = {
  ebitdaBridge: {
    actualSarBn: number
    targetSarBn: number
    gapSarBn: number
    note: string
  }
  capexCommitmentRatePct: number
  capexNote: string
  weightedAvgIrrPct: number
  hurdleIrrPct: number
  irrNote: string
  safety: {
    ltifr: number
    trifr: number
    fatalitiesYtd: number
    safeManHoursMn: number
    note: string
  }
  esg: {
    carbonIntensityKgPerT: number
    waterRecyclingPct: number
    saudizationOperationalPct: number
    note: string
  }
  partnerPerformanceScore: number
  partnerScoreMax: number
  partnerNote: string
  regulatoryPipeline: {
    pendingApprovals: number
    avgProcessingDays: number
    escalated: number
    note: string
  }
  existingOperations: {
    revenueSarBn: number
    marginPct: number
    note: string
  }
  marketShare: { product: string; sharePct: number; rank: number }[]
  marketShareNote: string
  saudizationRatePct: number
  saudizationNote: string
  digitalAi: {
    aiUseCasesDeployed: number
    opsAutomationRatePct: number
    note: string
  }
}

/** Focus / Foundation pages — four-block executive spine (fixtures + mock derivation). */
export type DomainKpiRag = 'on_track' | 'at_risk' | 'neutral'

export type DomainBusinessKpi = {
  label: string
  value: string
  target: string
  status: DomainKpiRag
  /** 0–100, higher = worse vs target (used by mock risk engine). */
  stressScore?: number
}

export type DomainStrategicMilestone = {
  title: string
  whereWeStand: string
}

export type DomainRiskOverride = {
  title: string
  impact: string
  severity: 'high' | 'medium' | 'low'
}

export type DomainOpportunityOverride = {
  headline: string
  bullets: string[]
  footnote?: string
}

/** Multi-year trajectory row for strategy spine (Actual / Forecast / Target columns). */
export type StrategyHorizonKpiCell = {
  periodLabel: string
  yearLabel: string
  value: string
  tone: 'historical' | 'forecast' | 'target'
}

export type StrategyHorizonKpiRow = {
  label: string
  cells: StrategyHorizonKpiCell[]
}

export type DomainExecutiveNarrative = {
  strategicObjectivesIntro: string
  milestones: DomainStrategicMilestone[]
  /** Fixture expects five rows; optional live merge replaces in UI. */
  businessKpis: DomainBusinessKpi[]
  /** Optional horizon table under Business KPIs (e.g. strategy-status). */
  strategyHorizonKpis?: StrategyHorizonKpiRow[]
  riskOverride?: DomainRiskOverride
  opportunityOverride?: DomainOpportunityOverride
}

export type DomainNarrativesFile = Record<string, DomainExecutiveNarrative>
