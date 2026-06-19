import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { CeoIntelligenceContext } from './CeoIntelligenceContext'
import { buildContextBanner, mergeCeoContext } from './contextBanner'
import { CeoChatDrawer } from './CeoChatDrawer'
import { getPortfolioBuFilterForChat } from './portfolioBuReporter'
import { useBackendChat } from './useBackendChat'
import type { CeoContext } from './types'
import type { ChatMessage } from './CeoIntelligenceContext'

function uid() {
  return `m-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const REPORTING_PERIOD = 'June 2026'

type PageContextEntry = Omit<CeoContext, 'contextBanner'>

const PAGE_CONTEXT_MAP: Record<string, PageContextEntry> = {
  '/dashboard': {
    scope: 'global',
    page: 'Strategy Realization Dashboard',
    reportingPeriod: REPORTING_PERIOD,
    pageEntities: ['Portfolio KPI', 'Delivery health', 'Risk posture', 'Value delivery'],
    suggestedQuestions: [
      'Across all initiatives, where are we most behind?',
      'What should the CEO focus on this month?',
      'What is the total capex planned on strategy initiatives this year?',
      'Summarize key risks to the 2030 EBITDA target',
    ],
  },
  '/strategy-status': {
    scope: 'global',
    page: 'Strategy Status',
    reportingPeriod: REPORTING_PERIOD,
    pageEntities: ['Horizon KPIs', 'EBITDA bridge', 'Growth trajectory', 'Capital commitment'],
    suggestedQuestions: [
      'Are we on track against the strategy horizon targets?',
      'What explains the Q2 2026 EBITDA variance vs budget?',
      'Which flagship giga-projects are pulling the trajectory down?',
      'What is the biggest risk to the 2030 plan right now?',
    ],
  },
  '/portfolio': {
    scope: 'global',
    page: 'Growth Project Execution',
    reportingPeriod: REPORTING_PERIOD,
    pageEntities: ['Project register', 'CAPEX variance', 'Schedule health', 'Milestone delivery'],
    suggestedQuestions: [
      'Which flagship project has the largest schedule slip?',
      'What happens to 2030 EBITDA if Urban Development flagship Phase 1 is delayed by six months?',
      'Give a schedule overview across all sectors.',
    ],
  },
  '/enablers': {
    scope: 'global',
    page: 'Enablers',
    reportingPeriod: REPORTING_PERIOD,
    pageEntities: ['Materials supply', 'Water allocation', 'Power readiness', 'Permitting'],
    suggestedQuestions: [
      'What is most delayed among enablers?',
      'Explain why materials supply is flagged red',
      'Compare water risk across projects',
      'Draft an escalation note on critical enabler gaps',
    ],
  },
  '/exploration': {
    scope: 'global',
    page: 'Development Pipeline',
    reportingPeriod: REPORTING_PERIOD,
    pageEntities: ['Land permits', 'Mobilization', 'Delivery milestones', 'Hospitality pipeline'],
    suggestedQuestions: [
      'Summarize development pipeline KPIs vs plan from dashboard and workbook evidence.',
      'Which land permits are behind the mobilization plan?',
      'What does the hospitality sector schedule show for upcoming milestones?',
      'What is the investment-to-delivery conversion outlook this quarter?',
    ],
  },
  '/technology': {
    scope: 'global',
    page: 'Technology',
    reportingPeriod: REPORTING_PERIOD,
    pageEntities: ['TechOps EBITDA', 'MOS deployment', 'Innovation pipeline', 'Partnerships'],
    suggestedQuestions: [
      'Is TechOps on track for the 2026 EBITDA target?',
      'Which technology initiatives are in execution vs pipeline?',
      'What is the MOS deployment status?',
      'How are technology partnerships tracking?',
    ],
  },
  '/people': {
    scope: 'global',
    page: 'People',
    reportingPeriod: REPORTING_PERIOD,
    pageEntities: ['Talent pipeline', 'Specialized hiring', 'Succession readiness', 'Capability gaps'],
    suggestedQuestions: [
      'What are the critical capability gaps right now?',
    ],
  },
  '/financials': {
    scope: 'global',
    page: 'Financials',
    reportingPeriod: REPORTING_PERIOD,
    pageEntities: ['QBR EBITDA', 'Cash flow', 'BU snapshots', 'CAPEX execution'],
    suggestedQuestions: [
      'What drove the Q2 2026 EBITDA variance vs budget?',
      'Chart forecasted total EBIT 2025–2040 from the financial workbook.',
      'Is CAPEX execution on track for FY26?',
      'Summarize the funding gap trajectory from the latest figures.',
    ],
  },
  '/risks': {
    scope: 'global',
    page: 'Risks',
    reportingPeriod: REPORTING_PERIOD,
    pageEntities: ['Enterprise risk register', 'Funding gap', 'Leverage trajectory'],
    suggestedQuestions: [
      'What are the top 3 enterprise risks by impact?',
      'Is the funding gap widening or narrowing?',
      'Which risks have increased since last month?',
      'What mitigations are overdue?',
    ],
  },
  '/risk': {
    scope: 'global',
    page: 'Funding Plan',
    reportingPeriod: REPORTING_PERIOD,
    pageEntities: ['Funding gap trajectory', 'Covenant headroom', 'Debt profile'],
    suggestedQuestions: [
      'What is the current funding gap vs plan?',
      'Are we at risk of covenant breach?',
      'What levers remain to close the funding gap?',
      'How sensitive is the gap to energy tariff and materials price moves?',
    ],
  },
  '/safety-esg': {
    scope: 'global',
    page: 'Safety & ESG',
    reportingPeriod: REPORTING_PERIOD,
    pageEntities: ['Safety performance', 'Environmental metrics', 'Governance KPIs'],
    suggestedQuestions: [
      'What is the current TRIR trend?',
      'Are there any safety incidents requiring escalation?',
      'Summarize governance KPI status this period',
    ],
  },
}

function buildPageContext(entry: PageContextEntry): CeoContext {
  return {
    ...entry,
    contextBanner: buildContextBanner({
      scope: entry.scope,
      bu: entry.bu,
      projectName: entry.projectName,
      projectId: entry.projectId,
      kpiLabel: entry.kpiLabel,
      page: entry.page,
      reportingPeriod: entry.reportingPeriod,
    }),
  }
}

function defaultGlobalContext(): CeoContext {
  return buildPageContext({
    scope: 'global',
    reportingPeriod: REPORTING_PERIOD,
    suggestedQuestions: [
      'Across all initiatives, where are we most behind?',
      'What would happen to 2030 EBITDA if Urban Development flagship Phase 1 is delayed by 6 months?',
      'What is the total capex planned on strategy initiatives this year?',
    ],
  })
}

function contextForRoute(pathname: string): CeoContext {
  const entry = PAGE_CONTEXT_MAP[pathname]
  if (pathname === '/portfolio') {
    const bu = getPortfolioBuFilterForChat()
    const base = entry ?? PAGE_CONTEXT_MAP['/portfolio']!
    if (bu) {
      return buildPageContext({ ...base, scope: 'bu', bu })
    }
    return buildPageContext(base)
  }
  if (entry) return buildPageContext(entry)
  return defaultGlobalContext()
}

export function CeoIntelligenceProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [context, setContext] = useState<CeoContext>(() => defaultGlobalContext())
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [contextAware, setContextAware] = useState(true)
  const [reasoningSession, setReasoningSession] = useState(0)
  const [draft, setDraft] = useState('')
  const { submit, reset: resetBackend, streamedAnswer, charts, activityLog, isRunning, activeAgentId, error, clarification, backendRuntime } = useBackendChat()

  const openChat = useCallback(
    (patch?: Partial<CeoContext>) => {
      const routeBase = contextForRoute(location.pathname)
      const next = patch && Object.keys(patch).length > 0 ? mergeCeoContext(routeBase, patch) : routeBase
      setContext(next)
      setIsOpen(true)
    },
    [location.pathname],
  )

  const closeChat = useCallback(() => {
    setIsOpen(false)
    setMessages([])
    resetBackend()
  }, [resetBackend])

  const newChat = useCallback(() => {
    resetBackend()
    setMessages([])
    setDraft('')
    setReasoningSession(0)
    const fresh = contextForRoute(location.pathname)
    setContext(fresh)
  }, [location.pathname, resetBackend])

  const submitQuestion = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? draft).trim()
    if (!text || isRunning) return

    // Capture clarification before submit() clears it, then commit it to the thread
    const pendingClarification = clarification
    const history = messages.map(m =>
      m.role === 'user'
        ? { role: 'user' as const, content: m.text }
        : { role: 'assistant' as const, content: m.streamedAnswer }
    )
    const historyWithClarification = pendingClarification
      ? [...history, { role: 'assistant' as const, content: pendingClarification }]
      : history

    setDraft('')
    setReasoningSession(s => s + 1)
    setMessages(m => [
      ...m,
      ...(pendingClarification ? [{ id: uid(), role: 'assistant' as const, streamedAnswer: pendingClarification }] : []),
      { id: uid(), role: 'user', text },
    ])
    const { scope, bu, projectId, projectName, kpiLabel, page, reportingPeriod, pageEntities } = context
    const ctxPayload = contextAware
      ? { scope, bu, projectId, projectName, kpiLabel, page, reportingPeriod, pageEntities }
      : undefined
    const answer = await submit([...historyWithClarification, { role: 'user', content: text }], ctxPayload)
    if (answer) {
      setMessages(m => [...m, { id: uid(), role: 'assistant', streamedAnswer: answer }])
    }
  }, [clarification, draft, isRunning, messages, submit, context, contextAware])

  // On the landing page the inline chat panel handles display — suppress the drawer
  const isLanding = location.pathname === '/'

  const value = useMemo(
    () => ({
      openChat,
      closeChat,
      newChat,
      setContext,
      context,
      contextAware,
      setContextAware,
      isOpen,
      messages,
      charts,
      activityLog,
      isRunning,
      reasoningSession,
      streamedAnswer,
      error,
      clarification,
      draft,
      setDraft,
      submitQuestion,
      backendRuntime,
    }),
    [openChat, closeChat, newChat, context, contextAware, setContextAware, isOpen, messages, charts, activityLog, isRunning, reasoningSession, streamedAnswer, error, clarification, draft, submitQuestion, backendRuntime],
  )

  return (
    <CeoIntelligenceContext.Provider value={value}>
      {children}
      {!isLanding && (
        <CeoChatDrawer
          open={isOpen}
          onClose={closeChat}
          onNewChat={newChat}
          context={context}
          contextAware={contextAware}
          onContextAwareChange={setContextAware}
          messages={messages}
          charts={charts}
          activityLog={activityLog}
          isRunning={isRunning}
          activeAgentId={activeAgentId}
          streamedAnswer={streamedAnswer}
          error={error}
          clarification={clarification}
          backendRuntime={backendRuntime}
          draft={draft}
          onDraftChange={setDraft}
          onSubmit={submitQuestion}
        />
      )}
    </CeoIntelligenceContext.Provider>
  )
}
