import type { ConsolidatedRiskDetail } from './types'
import raw from './consolidatedRiskDetails.json'

const byId = raw as Record<string, ConsolidatedRiskDetail>

export function getConsolidatedRiskDetail(id: number): ConsolidatedRiskDetail | undefined {
  return byId[String(id)]
}
