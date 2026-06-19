import type { Project } from '../data/types'

export function weightForProject(p: Project): number {
  if (p.ebitdaSarB != null && p.ebitdaSarB > 0) return p.ebitdaSarB
  if (p.capexSarB != null && p.capexSarB > 0) return p.capexSarB
  return 1
}

export function weightedProgressKpi(projects: Project[]): number {
  let num = 0
  let den = 0
  for (const p of projects) {
    const w = weightForProject(p)
    num += p.progressKpi * w
    den += w
  }
  return den > 0 ? num / den : 0
}

export function capitalDeployed(projects: Project[]): {
  pct: number
  spent: number
  budget: number
} {
  let spent = 0
  let budget = 0
  for (const p of projects) {
    if (p.budgetUsdM != null && p.actualSpendUsdM != null) {
      budget += p.budgetUsdM
      spent += p.actualSpendUsdM
    }
  }
  const pct = budget > 0 ? (spent / budget) * 100 : 0
  return { pct, spent, budget }
}

export function projectStatusCounts(projects: Project[]): Record<string, number> {
  const map: Record<string, number> = {
    on_track: 0,
    potential_delay: 0,
    delayed: 0,
    not_started: 0,
  }
  for (const p of projects) {
    map[p.status] = (map[p.status] ?? 0) + 1
  }
  return map
}
