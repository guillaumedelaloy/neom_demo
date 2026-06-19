import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Brain,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Filter,
  LineChart,
  Package,
  Plus,
  ScanSearch,
  Target,
  X,
} from 'lucide-react'
import type { AgentId, AgentLogEvent, ChartSpec, CeoContext } from './types'
import type { ChatMessage } from './CeoIntelligenceContext'
import { AnswerMarkdownBody } from './answerMarkdown'

const BROAD_SUGGESTIONS = [
  'Summarize Q2 2026 EBITDA actual vs budget from the financial workbook.',
  'What is the schedule overview across all sectors?',
  'What are the top three enterprise risks by impact this period?',
  'Across flagship giga-projects, where is delivery most behind plan?',
]

const REASONING_STATUS_LINES = [
  'Checking how schedule slips could move through the plan…',
  'Estimating EBITDA and cash effects from the latest snapshot…',
  'Scoring risks against the current register…',
  'Testing where the plan might be wrong…',
  'Prioritizing next steps for 30, 60, and 90 days…',
] as const

function ReasoningStatusFooter({ active }: { active: boolean }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => {
      setI((x) => (x + 1) % REASONING_STATUS_LINES.length)
    }, 2400)
    return () => window.clearInterval(id)
  }, [active])
  const line = REASONING_STATUS_LINES[i] ?? REASONING_STATUS_LINES[0]
  if (!active) return null
  return (
    <div className="mt-2 border-t border-ma-line/80 pt-2 pl-1">
      <p className="text-[11px] leading-snug text-ma-muted transition-opacity duration-300">{line}</p>
      <p className="mt-2 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-ma-accent-muted">
        <span className="ceo-intel-typing-dot inline-block size-1 rounded-full bg-ma-accent/80" />
        <span className="ceo-intel-typing-dot inline-block size-1 rounded-full bg-ma-accent/80" />
        <span className="ceo-intel-typing-dot inline-block size-1 rounded-full bg-ma-accent/80" />
        <span className="ml-1.5 normal-case tracking-normal text-ma-muted">Still working…</span>
      </p>
    </div>
  )
}

function agentAvatar(agent: AgentId): { Icon: typeof Brain; shell: string } {
  switch (agent) {
    case 'orchestrator':
      return { Icon: Brain, shell: 'border-ma-accent/45 bg-ma-accent/15 text-ma-accent' }
    case 'clarification_agent':
      return { Icon: Filter, shell: 'border-ma-graphite/35 bg-ma-surface text-ma-muted' }
    case 'data_extraction':
      return { Icon: Brain, shell: 'border-ma-accent/45 bg-ma-accent/15 text-ma-accent' }
    case 'value_lens':
      return { Icon: LineChart, shell: 'border-ma-teal/40 bg-ma-teal/12 text-ma-teal' }
    case 'delivery_engine':
      return { Icon: Package, shell: 'border-ma-graphite/35 bg-ma-surface text-ma-ink' }
    case 'risk_radar':
      return { Icon: Target, shell: 'border-ma-amber-warn/45 bg-ma-amber-warn/12 text-ma-amber-warn' }
    case 'gap_finder':
      return { Icon: ScanSearch, shell: 'border-ma-risk/35 bg-ma-risk/10 text-ma-risk' }
    case 'action_desk':
      return { Icon: ClipboardCheck, shell: 'border-ma-teal/35 bg-ma-teal/8 text-ma-teal' }
    default:
      return { Icon: Brain, shell: 'border-ma-accent/45 bg-ma-accent/15 text-ma-accent' }
  }
}

function AgentActivityAvatar({ agent }: { agent: AgentId }) {
  const { Icon, shell } = agentAvatar(agent)
  return (
    <span
      className={`flex size-7 shrink-0 items-center justify-center rounded-full border shadow-[0_1px_0_rgba(15,18,16,0.06)] ${shell}`}
      aria-hidden
    >
      <Icon className="size-3 stroke-[1.75]" />
    </span>
  )
}

function agentLabel(id: string): string {
  const map: Record<string, string> = {
    orchestrator:        'Orchestrator',
    clarification_agent: 'Clarification agent',
    data_extraction:     'Orchestrator',
    value_lens:          'Value lens agent',
    delivery_engine:     'Delivery engine agent',
    risk_radar:          'Risk radar agent',
    gap_finder:          'Gap finder agent',
    action_desk:         'Action desk agent',
  }
  return map[id] ?? id
}

function formatTime(ts: number) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(ts))
}

type CeoChatDrawerProps = {
  open: boolean
  onClose: () => void
  onNewChat: () => void
  context: CeoContext
  messages: ChatMessage[]
  charts: Record<string, ChartSpec>
  activityLog: AgentLogEvent[]
  isRunning: boolean
  activeAgentId: AgentId | null
  streamedAnswer: string
  error: string | null
  clarification: string | null
  draft: string
  onDraftChange: (v: string) => void
  onSubmit: (overrideText?: string) => void
  contextAware: boolean
  onContextAwareChange: (v: boolean) => void
}

export function CeoChatDrawer({
  open,
  onClose,
  onNewChat,
  context,
  messages,
  charts,
  activityLog,
  isRunning,
  streamedAnswer,
  error,
  clarification,
  draft,
  onDraftChange,
  onSubmit,
  contextAware,
  onContextAwareChange,
}: CeoChatDrawerProps) {
  const renderAnswer = (text: string, streaming: boolean) => (
    <AnswerMarkdownBody text={text} charts={charts} size="normal" streaming={streaming} />
  )

  const logRef = useRef<HTMLDivElement>(null)
  const readoutRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [stepsOpen, setStepsOpen] = useState(false)
  const [confirmingNewChat, setConfirmingNewChat] = useState(false)
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasPageContext = !!(context.page || context.pageEntities?.length)
  const hasEverSubmitted = messages.length > 0 || isRunning

  // Auto-open analysis steps while a query is running, auto-close when done
  const prevRunning = useRef(false)
  useEffect(() => {
    if (isRunning && !prevRunning.current) setStepsOpen(true)
    if (!isRunning && prevRunning.current) setStepsOpen(false)
    prevRunning.current = isRunning
  }, [isRunning])

  const scopedSuggestions = useMemo(() => {
    if (context.suggestedQuestions?.length) return context.suggestedQuestions
    if (context.scope === 'project') {
      return [
        'What happens if this is delayed by one quarter?',
        'Is this milestone plan realistic?',
        'What are root causes of delay on this project, and how do we mitigate them?',
      ]
    }
    if (context.scope === 'bu') {
      return [
        'Where are we most at risk in this BU?',
        'What should we prioritize this month?',
        'What is the EBITDA impact of a commodity shock?',
      ]
    }
    return BROAD_SUGGESTIONS
  }, [context.suggestedQuestions, context.scope])

  const suggestions = contextAware ? scopedSuggestions : BROAD_SUGGESTIONS

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => inputRef.current?.focus(), 200)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    const el = logRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [activityLog, open])

  useEffect(() => {
    readoutRef.current?.scrollTo({
      top: readoutRef.current.scrollHeight,
      behavior: isRunning ? 'auto' : 'smooth',
    })
  }, [streamedAnswer, messages, isRunning])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const handleNewChat = useCallback(() => {
    if (!confirmingNewChat) {
      setConfirmingNewChat(true)
      confirmTimerRef.current = setTimeout(() => setConfirmingNewChat(false), 3000)
      return
    }
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
    setConfirmingNewChat(false)
    onNewChat()
  }, [confirmingNewChat, onNewChat])

  // Clean up confirm timer on unmount
  useEffect(() => () => {
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
  }, [])

  if (!open) return null

  const canNewChat = !isRunning && messages.length > 0

  return (
    <>
      <button
        type="button"
        className="ceo-intel-backdrop-in fixed inset-0 z-[75] bg-ma-charcoal/40 backdrop-blur-[1px] transition-opacity duration-200 dark:bg-black/50"
        aria-label="Close strategy Q&A"
        onClick={onClose}
      />
      <aside
        className="ceo-intel-drawer-in fixed z-[80] flex max-h-[100dvh] w-full flex-col border-ma-line bg-ma-elevated shadow-[0_0_0_1px_rgba(15,18,16,0.06)] max-md:inset-0 md:right-0 md:top-0 md:h-full md:max-w-[min(640px,100vw-24px)] md:border-l"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ceo-chat-title"
        aria-busy={isRunning}
      >
        {/* ── Progress shimmer ── */}
        {isRunning ? (
          <div className="flex h-0.5 w-full shrink-0 overflow-hidden bg-ma-line" aria-hidden>
            <div className="ceo-intel-shimmer-bar h-full w-2/5 bg-gradient-to-r from-transparent via-ma-accent/55 to-transparent" />
          </div>
        ) : null}

        {/* ── Header ── */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-ma-line px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-sm border border-ma-accent/35 bg-ma-accent/10 text-ma-accent transition-shadow duration-300 ${isRunning ? 'ceo-intel-icon-pulse' : ''}`}
            >
              <Brain className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p id="ceo-chat-title" className="text-[14px] font-semibold text-ma-ink">
                CEO Intelligence
              </p>
              <p className="truncate text-[12px] text-ma-muted">
                {contextAware ? context.contextBanner : 'Context: Global portfolio'}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {canNewChat ? (
              <button
                type="button"
                className={`ceo-intel-fade-in flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-[11px] font-semibold transition duration-150 active:scale-95 ${
                  confirmingNewChat
                    ? 'border-ma-amber-warn/50 bg-ma-amber-warn/15 text-ma-amber-warn'
                    : 'border-ma-teal/30 bg-ma-teal/10 text-ma-teal hover:border-ma-teal/50 hover:bg-ma-teal/20'
                }`}
                onClick={handleNewChat}
                aria-label={confirmingNewChat ? 'Confirm clear chat' : 'New chat'}
              >
                <Plus className="size-3.5" aria-hidden />
                {confirmingNewChat ? 'Clear chat?' : 'New chat'}
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-sm p-2 text-ma-muted transition duration-150 hover:bg-ma-surface hover:text-ma-ink active:scale-95"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* ── Context strip ── */}
        {hasPageContext ? (
          <div
            className={`shrink-0 border-b transition-colors duration-200 ${
              contextAware
                ? 'border-ma-accent/25 bg-gradient-to-r from-ma-accent/[0.06] to-transparent'
                : 'border-ma-line bg-ma-surface/40'
            }`}
          >
            <div className="flex items-start justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block size-1.5 rounded-full transition-colors duration-200 ${
                      contextAware ? 'bg-ma-accent' : 'bg-ma-muted/40'
                    }`}
                  />
                  <p
                    className={`text-[12px] font-semibold transition-colors duration-200 ${
                      contextAware ? 'text-ma-ink' : 'text-ma-muted'
                    }`}
                  >
                    {context.page ?? 'Current page'}
                    {context.reportingPeriod ? (
                      <span className="ml-1.5 font-normal text-ma-muted">
                        · {context.reportingPeriod}
                      </span>
                    ) : null}
                  </p>
                </div>
                {contextAware && context.pageEntities?.length ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {context.pageEntities.map((e, i) => (
                      <span
                        key={e}
                        className="ceo-intel-pill-in rounded-sm border border-ma-accent/20 bg-ma-accent/[0.07] px-1.5 py-0.5 text-[11px] leading-tight text-ma-ink/80"
                        style={{ animationDelay: `${80 + i * 40}ms` }}
                      >
                        {e}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <label className="flex shrink-0 cursor-pointer select-none items-center gap-1.5 pt-0.5">
                <span className="text-[11px] font-medium text-ma-muted">Focus on this page</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={contextAware}
                  onClick={() => onContextAwareChange(!contextAware)}
                  className={`relative inline-flex h-[20px] w-[36px] shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ma-accent/40 ${
                    contextAware
                      ? 'border-ma-accent/40 bg-ma-accent/25'
                      : 'border-ma-line bg-ma-surface'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block size-[16px] rounded-full shadow-sm transition-transform duration-200 ${
                      contextAware
                        ? 'translate-x-[17px] bg-ma-accent'
                        : 'translate-x-[1px] bg-ma-muted/60'
                    }`}
                  />
                </button>
              </label>
            </div>
          </div>
        ) : null}

        {/* ── Main content area ── */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">

          {/* ── Suggested questions (only before first submission) ── */}
          {messages.length === 0 && !isRunning && !streamedAnswer ? (
            <div className="shrink-0 border-b border-ma-line px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ma-muted">
                {contextAware && hasPageContext ? 'Suggested for this page' : 'Suggested questions'}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {suggestions.map((s, i) => (
                  <button
                    key={s}
                    type="button"
                    disabled={isRunning}
                    className="ceo-intel-pill-in rounded-sm border border-ma-line bg-ma-surface px-2.5 py-1.5 text-left text-[12px] leading-snug text-ma-ink transition duration-150 hover:border-ma-accent/50 hover:shadow-[0_1px_0_rgba(184,149,106,0.12)] active:translate-y-px disabled:opacity-40"
                    style={{ animationDelay: `${i * 60}ms` }}
                    onClick={() => onSubmit(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* ── Analysis steps (collapsible disclosure, auto-opens while running) ── */}
          {hasEverSubmitted ? (
            <div className="shrink-0 border-b border-ma-line">
              <button
                type="button"
                className="flex w-full items-center gap-1.5 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-ma-muted transition-colors hover:bg-ma-surface/50"
                onClick={() => setStepsOpen((v) => !v)}
                aria-expanded={stepsOpen}
              >
                {stepsOpen
                  ? <ChevronDown className="size-3.5 text-ma-muted/70" />
                  : <ChevronRight className="size-3.5 text-ma-muted/70" />
                }
                Analysis steps
                {isRunning ? (
                  <span className="ml-2 flex items-center gap-1">
                    <span className="ceo-intel-typing-dot inline-block size-1 rounded-full bg-ma-accent/80" />
                    <span className="ceo-intel-typing-dot inline-block size-1 rounded-full bg-ma-accent/80" />
                    <span className="ceo-intel-typing-dot inline-block size-1 rounded-full bg-ma-accent/80" />
                  </span>
                ) : activityLog.length > 0 ? (
                  <span className="ml-auto text-[10px] font-normal normal-case tracking-normal text-ma-muted/60">
                    {activityLog.length} {activityLog.length === 1 ? 'step' : 'steps'}
                  </span>
                ) : null}
              </button>
              <div className="ceo-intel-steps-body" data-open={stepsOpen}>
                <div>
                  <div
                    ref={logRef}
                    className="max-h-[240px] overflow-y-auto border-t border-ma-line/50 px-4 py-2 text-[11px] leading-relaxed text-ma-ink"
                  >
                    {activityLog.map((line, idx) => (
                      <div
                        key={line.id}
                        className={`group mb-2 flex gap-2 border-l-2 border-ma-accent/35 pl-2 last:mb-1 ${idx === activityLog.length - 1 ? 'ceo-intel-activity-row-in' : ''}`}
                      >
                        <AgentActivityAvatar agent={line.agent} />
                        <div className="min-w-0 flex-1 font-mono">
                          <p className="text-[10px] text-ma-muted">
                            {formatTime(line.ts)}{' '}
                            <span className="font-semibold text-ma-teal">{agentLabel(line.agent)}</span>
                          </p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-ma-ink">{line.message}</p>
                        </div>
                      </div>
                    ))}
                    {isRunning ? <ReasoningStatusFooter active={isRunning} /> : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* ── Conversation thread (takes all remaining space) ── */}
          <div className="flex min-h-0 flex-1 flex-col">
            <div ref={readoutRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-5">
              {messages.length === 0 && !isRunning && !clarification ? (
                <p className="text-[13px] text-ma-muted italic">Your answer will appear here.</p>
              ) : (
                <div className="space-y-4">
                  {messages.map((m, idx) => (
                    m.role === 'user' ? (
                      <div key={m.id} className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-ma-teal/10 border border-ma-teal/20 px-4 py-2.5">
                          <p className="text-[13px] leading-relaxed text-ma-ink">{m.text}</p>
                        </div>
                      </div>
                    ) : (
                      <div key={m.id} className="flex items-start gap-2.5">
                        <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border border-ma-accent/30 bg-ma-accent/10 text-ma-accent">
                          <Brain className="size-3" aria-hidden />
                        </span>
                        <div className={`min-w-0 flex-1 space-y-2.5 text-[14px] leading-relaxed text-ma-ink ${idx === messages.length - 1 ? 'ceo-intel-answer-in' : ''}`}>
                          {renderAnswer(m.streamedAnswer, false)}
                        </div>
                      </div>
                    )
                  ))}

                  {streamedAnswer && !messages.some(m => m.role === 'assistant' && m.streamedAnswer === streamedAnswer) ? (
                    <div className="flex items-start gap-2.5">
                      <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border border-ma-accent/30 bg-ma-accent/10 text-ma-accent">
                        <Brain className="size-3" aria-hidden />
                      </span>
                      <div className="ceo-intel-answer-in min-w-0 flex-1 space-y-2.5 text-[14px] leading-relaxed text-ma-ink">
                        {renderAnswer(streamedAnswer, isRunning)}
                      </div>
                    </div>
                  ) : null}

                  {clarification ? (
                    <div className="ceo-intel-fade-in flex items-start gap-2.5">
                      <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border border-ma-accent/30 bg-ma-accent/10 text-ma-accent">
                        <Brain className="size-3" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1 rounded-sm border border-ma-teal/25 bg-ma-teal/[0.06] px-3.5 py-2.5">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ma-teal/70">Clarifying question</p>
                        <p className="text-[13px] leading-relaxed text-ma-ink">{clarification}</p>
                      </div>
                    </div>
                  ) : null}

                  {error ? (
                    <div className="ceo-intel-fade-in rounded-sm border border-ma-amber-warn/30 bg-ma-amber-warn/[0.06] px-4 py-3">
                      <p className="text-[13px] font-medium text-ma-amber-warn">{error}</p>
                      <p className="mt-1 text-[12px] text-ma-muted">
                        If the message mentions model or API keys, fix <code className="text-[11px]">LLM_MODEL</code>,{' '}
                        <code className="text-[11px]">GATE_MODEL</code>, and keys in <code className="text-[11px]">.env</code> then restart the API.
                        Otherwise ensure the FastAPI backend is running and the browser can reach it.
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* ── Input area ── */}
            <div className="shrink-0 border-t border-ma-line bg-ma-surface/80 p-3 md:p-4">
              <label className="sr-only" htmlFor="ceo-chat-input">
                Your question
              </label>
              <textarea
                ref={inputRef}
                id="ceo-chat-input"
                rows={2}
                value={draft}
                onChange={(e) => onDraftChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    onSubmit()
                  }
                }}
                disabled={isRunning}
                placeholder={clarification ? 'Reply to the clarifying question…' : messages.length > 0 ? 'Ask a follow-up…' : 'e.g. Where is the portfolio most exposed this quarter?'}
                className="w-full resize-none rounded-sm border border-ma-line bg-ma-elevated px-3 py-2.5 text-[14px] text-ma-ink outline-none transition-shadow duration-150 ring-ma-accent/30 placeholder:text-ma-muted focus:border-ma-accent/40 focus:ring-2 disabled:opacity-50"
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  disabled={isRunning || !draft.trim()}
                  onClick={() => onSubmit()}
                  className="rounded-sm border border-ma-accent/50 bg-ma-accent/15 px-5 py-2.5 text-[13px] font-semibold text-ma-ink shadow-[0_1px_0_rgba(15,18,16,0.04)] transition duration-150 hover:bg-ma-accent/25 hover:shadow-[0_2px_8px_rgba(184,149,106,0.18)] active:translate-y-px active:shadow-none disabled:opacity-40"
                >
                  Ask
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
