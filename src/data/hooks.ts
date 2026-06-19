import { useMemo } from 'react'
import domainNarrativesJson from './domainNarratives.json'
import enablersJson from './enablers.json'
import explorationJson from './exploration.json'
import growthProjectDetailsJson from './growthProjectDetails.json'
import peopleJson from './people.json'
import projectsJson from './projects.json'
import riskJson from './risk.json'
import strategicKpisJson from './strategicKpis.json'
import technologyJson from './technology.json'
import type {
  DomainExecutiveNarrative,
  DomainNarrativesFile,
  EnablersData,
  ExplorationData,
  GrowthProjectDetail,
  PeopleData,
  Project,
  RiskData,
  StrategicKpisData,
  TechnologyData,
} from './types'

const domainNarrativesByKey = domainNarrativesJson as DomainNarrativesFile

export function useDomainNarrative(routeKey: keyof DomainNarrativesFile): DomainExecutiveNarrative {
  return useMemo(() => {
    const n = domainNarrativesByKey[routeKey]
    if (!n) throw new Error(`Missing domain narrative: ${String(routeKey)}`)
    return n
  }, [routeKey])
}

export function usePortfolioData(): Project[] {
  return useMemo(() => projectsJson as Project[], [])
}

export function useEnablersData(): EnablersData {
  return useMemo(() => enablersJson as EnablersData, [])
}

export function useExplorationData(): ExplorationData {
  return useMemo(() => explorationJson as ExplorationData, [])
}

export function useTechnologyData(): TechnologyData {
  return useMemo(() => technologyJson as TechnologyData, [])
}

export function usePeopleData(): PeopleData {
  return useMemo(() => peopleJson as PeopleData, [])
}

const growthProjectDetailsById = growthProjectDetailsJson as Record<string, GrowthProjectDetail>

export function useGrowthProjectDetail(id: string | null): GrowthProjectDetail | undefined {
  return useMemo(() => (id ? growthProjectDetailsById[id] : undefined), [id])
}

export function getGrowthProjectDetailStatic(id: string): GrowthProjectDetail | undefined {
  return growthProjectDetailsById[id]
}

export function useRiskData(): RiskData {
  return useMemo(() => riskJson as RiskData, [])
}

export function useStrategicKpisData(): StrategicKpisData {
  return useMemo(() => strategicKpisJson as StrategicKpisData, [])
}
