import type { CeoContext, CeoScope } from './types'

export function buildContextBanner(p: {
  scope: CeoScope
  bu?: string
  projectName?: string
  projectId?: string
  kpiLabel?: string
  page?: string
  reportingPeriod?: string
}): string {
  if (p.scope === 'project' && p.bu && p.projectName) {
    const phos = p.projectId === 'phos3-ph2-phos4'
    return phos
      ? `Context: ${p.bu} BU → ${p.projectName} (Urban Development flagship)`
      : `Context: ${p.bu} BU → ${p.projectName}`
  }
  if (p.scope === 'kpi' && p.kpiLabel) return `Context: ${p.kpiLabel}`

  if (p.page) {
    const portfolio = p.scope === 'bu' && p.bu ? `${p.bu} BU` : 'Global portfolio'
    const period = p.reportingPeriod ? `, ${p.reportingPeriod}` : ''
    return `Asking about: ${p.page}, ${portfolio}${period}`
  }

  if (p.scope === 'bu' && p.bu) return `Context: ${p.bu} BU`
  return 'Context: Global portfolio'
}

export function mergeCeoContext(base: CeoContext, patch: Partial<CeoContext>): CeoContext {
  const scope = patch.scope ?? base.scope
  const bu = patch.bu ?? base.bu
  const projectId = patch.projectId ?? base.projectId
  const projectName = patch.projectName ?? base.projectName
  const kpiLabel = patch.kpiLabel ?? base.kpiLabel
  const page = patch.page ?? base.page
  const reportingPeriod = patch.reportingPeriod ?? base.reportingPeriod
  const pageEntities = patch.pageEntities ?? base.pageEntities
  const suggestedQuestions = patch.suggestedQuestions ?? base.suggestedQuestions
  const contextBanner =
    patch.contextBanner ??
    buildContextBanner({
      scope,
      bu,
      projectName,
      projectId,
      kpiLabel,
      page,
      reportingPeriod,
    })
  return {
    scope,
    bu,
    projectId,
    projectName,
    kpiLabel,
    page,
    reportingPeriod,
    pageEntities,
    suggestedQuestions,
    contextBanner,
  }
}
