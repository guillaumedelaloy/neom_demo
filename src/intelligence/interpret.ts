import type { CeoContext, CeoIntent } from './types'

const PHOS_CLUSTER =
  /phos3-ph2-phos4|urban\s+development\s+flagship.*phase[s]?\s*[23–-]|phases?\s*2|phases?\s*3|module[s]?\s*2|module[s]?\s*3/i

const PHOS_PHASE1 =
  /phos3-ph1|urban\s+development\s+flagship.*phase\s*1|flagship\s+phase\s*1/i

export function resolveProjectIdFromQuestion(question: string, ctx: CeoContext): string | undefined {
  const q = question.toLowerCase()
  if (ctx.projectId) return ctx.projectId
  if (PHOS_PHASE1.test(q)) return 'phos3-ph1'
  if (PHOS_CLUSTER.test(q)) return 'phos3-ph2-phos4'
  return undefined
}

export function detectIntent(question: string, ctx: CeoContext): CeoIntent {
  const q = question.toLowerCase()

  if (
    /\b(this month|this quarter|worry|worried|watch)\b/.test(q) ||
    (q.includes('worry') && q.includes('month'))
  ) {
    return 'worry_month'
  }
  if (/\b(delay|slip|slipped|quarter|schedule|timeline|late)\b/.test(q)) return 'delay'
  if (/\b(ebitda|margin|price|tariff|sector|investment|fdi)\b/.test(q)) return 'commodity'
  if (/\b(where.*risk|most at risk|riskiest|probability)\b/.test(q) || q.includes('at risk'))
    return 'portfolio_risk'
  if (/\b(realistic|realism|assumption|believe|achievable)\b/.test(q)) return 'realism'
  if (/\b(what should|recommend|do\?|action|priorit)\b/.test(q)) return 'action'

  if (ctx.scope === 'project') return 'delay'
  if (ctx.scope === 'bu' && ctx.bu === 'Special Economic Zone & Investment Platform') return 'commodity'
  return 'generic'
}
