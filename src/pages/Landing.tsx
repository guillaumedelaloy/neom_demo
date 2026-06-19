import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Compass,
  Cpu,
  Filter,
  FolderKanban,
  Landmark,
  LayoutDashboard,
  LineChart,
  MessageSquareText,
  Package,
  Plus,
  ScanSearch,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChatChart, createMarkdownComponents, splitChartSegments } from '../intelligence/answerMarkdown'
import { useCeoIntelligence } from '../intelligence/CeoIntelligenceContext'
import type { AgentId } from '../intelligence/types'

const compactMdComponents = createMarkdownComponents('compact')

/** Served from `public/neom-logo.png` (same asset as the shell sidebar). */
const NEOM_LOGO_SRC = '/neom-logo.png'

/* ── nav data (mirrors Sidebar) ── */

type NavEntry = {
  to: string
  label: string
  description: string
  icon: typeof LayoutDashboard
}

const dashboardEntry: NavEntry = {
  to: '/dashboard',
  label: 'Strategy Realization Cockpit',
  description: 'Executive summary, value delivery, growth & risk posture',
  icon: LayoutDashboard,
}

const focusAreas: NavEntry[] = [
  {
    to: '/exploration',
    label: 'Development Pipeline',
    description: 'Investment, land readiness, masterplans, FDI & project pipeline',
    icon: Compass,
  },
  {
    to: '/portfolio',
    label: 'Giga-Project Execution',
    description: 'Portfolio KPIs, project register, CAPEX & schedule variance',
    icon: FolderKanban,
  },
]

const foundationAreas: NavEntry[] = [
  { to: '/enablers', label: 'Enablers', description: 'Permitting, utilities, power, water & critical dependencies', icon: Building2 },
  { to: '/financials', label: 'Financials', description: 'QBR Q2 2026 — investment, cash flow, sector snapshots & CAPEX', icon: Landmark },
  { to: '/technology', label: 'Technology', description: 'Cognitive city platform, digital twin & innovation pipeline', icon: Cpu },
  { to: '/people', label: 'People', description: 'Talent pipeline, succession, L&D and capability gaps', icon: Users },
  { to: '/safety-esg', label: 'Sustainability & ESG', description: 'Renewable energy, environmental & governance metrics', icon: ShieldCheck },
  { to: '/risks', label: 'Risks', description: 'Enterprise risk register, funding gap & leverage trajectory', icon: AlertTriangle },
]

const EXAMPLE_QUESTIONS = [
  'Summarize Q2 2026 EBITDA actual vs budget from the financial workbook.',
  'What is the schedule overview across all sectors?',
  'What is the status of OXAGON Port Phase 1 in the project data?',
  'What does the hospitality sector schedule show for key milestones?',
  'What would happen to 2030 EBITDA if Urban Development flagship Phase 1 slips by six months?',
  'Search strategy documents for the main funding gap narrative.',
  'What are the top three enterprise risks by impact this period?',
]

const REASONING_STATUS_LINES = [
  'Checking how schedule slips could move through the plan…',
  'Estimating EBITDA and cash effects from the latest snapshot…',
  'Scoring risks against the current register…',
  'Testing where the plan might be wrong…',
  'Prioritizing next steps for 30, 60, and 90 days…',
] as const

/* ── agent helpers (mirrors CeoChatDrawer) ── */

function agentLabel(id: string): string {
  const map: Record<string, string> = {
    orchestrator: 'Orchestrator',
    clarification_agent: 'Clarification agent',
    data_extraction: 'Orchestrator',
    value_lens: 'Value lens agent',
    delivery_engine: 'Delivery engine agent',
    risk_radar: 'Risk radar agent',
    gap_finder: 'Gap finder agent',
    action_desk: 'Action desk agent',
  }
  return map[id] ?? id
}

function agentAvatar(agent: AgentId) {
  switch (agent) {
    case 'orchestrator': return { Icon: Brain, shell: 'border-ma-accent/45 bg-ma-accent/15 text-ma-accent' }
    case 'clarification_agent': return { Icon: Filter, shell: 'border-ma-graphite/35 bg-ma-surface text-ma-muted' }
    case 'data_extraction': return { Icon: Brain, shell: 'border-ma-accent/45 bg-ma-accent/15 text-ma-accent' }
    case 'value_lens': return { Icon: LineChart, shell: 'border-ma-teal/40 bg-ma-teal/12 text-ma-teal' }
    case 'delivery_engine': return { Icon: Package, shell: 'border-ma-graphite/35 bg-ma-surface text-ma-ink' }
    case 'risk_radar': return { Icon: Target, shell: 'border-ma-amber-warn/45 bg-ma-amber-warn/12 text-ma-amber-warn' }
    case 'gap_finder': return { Icon: ScanSearch, shell: 'border-ma-risk/35 bg-ma-risk/10 text-ma-risk' }
    case 'action_desk': return { Icon: ClipboardCheck, shell: 'border-ma-teal/35 bg-ma-teal/8 text-ma-teal' }
    default: return { Icon: Brain, shell: 'border-ma-accent/45 bg-ma-accent/15 text-ma-accent' }
  }
}

function formatTime(ts: number) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(ts))
}

/* ── sub-components ── */

function NavCard({ entry }: { entry: NavEntry }) {
  const Icon = entry.icon
  return (
    <Link
      to={entry.to}
      className="group flex items-start gap-3 rounded-lg border border-ma-line/80 bg-ma-elevated px-4 py-3.5 shadow-sm transition-all duration-200 hover:border-ma-accent/40 hover:shadow-md hover:-translate-y-px dark:bg-ma-elevated"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-ma-line bg-ma-surface/80 text-ma-accent transition-colors group-hover:border-ma-accent/40 group-hover:bg-ma-accent/8 dark:bg-ma-charcoal/80">
        <Icon className="size-[17px] stroke-[1.75]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-[13px] font-semibold leading-snug text-ma-ink group-hover:text-ma-accent transition-colors">
            {entry.label}
          </p>
          <ArrowRight className="size-3 shrink-0 text-ma-muted opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0.5" aria-hidden />
        </div>
        <p className="mt-0.5 text-[11px] leading-relaxed text-ma-muted">
          {entry.description}
        </p>
      </div>
    </Link>
  )
}

function ReasoningStatusFooter({ active }: { active: boolean }) {
  const [lineIndex, setLineIndex] = useState(0)
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => {
      setLineIndex((i) => (i + 1) % REASONING_STATUS_LINES.length)
    }, 2400)
    return () => window.clearInterval(id)
  }, [active])
  if (!active) return null
  const line = REASONING_STATUS_LINES[lineIndex] ?? REASONING_STATUS_LINES[0]
  return (
    <div className="mt-2 border-t border-ma-line/80 pt-2 pl-1">
      <p className="text-[10px] leading-snug text-ma-muted transition-opacity duration-300">{line}</p>
      <p className="mt-2 flex items-center gap-1 text-[9px] font-medium uppercase tracking-wide text-ma-accent-muted">
        <span className="ceo-intel-typing-dot inline-block size-1 rounded-full bg-ma-accent/80" />
        <span className="ceo-intel-typing-dot inline-block size-1 rounded-full bg-ma-accent/80" />
        <span className="ceo-intel-typing-dot inline-block size-1 rounded-full bg-ma-accent/80" />
        <span className="ml-1.5 normal-case tracking-normal text-ma-muted">Still working…</span>
      </p>
    </div>
  )
}

function StreamedAnswer({ text, charts }: { text: string; charts: Record<string, import('../intelligence/types').ChartSpec> }) {
  return (
    <div className="space-y-2 text-[12px] leading-relaxed text-ma-ink">
      {splitChartSegments(text).map((seg, i) =>
        seg.type === 'chart' && charts[seg.id]
          ? <ChatChart key={seg.id} spec={charts[seg.id]} />
          : <ReactMarkdown key={i} remarkPlugins={[remarkGfm]} components={compactMdComponents}>{seg.type === 'text' ? seg.content : ''}</ReactMarkdown>,
      )}
    </div>
  )
}

/* ── page ── */

export function Landing() {
  const {
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
    newChat,
  } = useCeoIntelligence()
  const logRef = useRef<HTMLDivElement>(null)
  const readoutRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [stepsOpen, setStepsOpen] = useState(false)
  const [confirmingNewChat, setConfirmingNewChat] = useState(false)
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const canNewChat = !isRunning && messages.length > 0

  const handleNewChat = useCallback(() => {
    if (!confirmingNewChat) {
      setConfirmingNewChat(true)
      confirmTimerRef.current = setTimeout(() => setConfirmingNewChat(false), 3000)
      return
    }
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
    setConfirmingNewChat(false)
    newChat()
  }, [confirmingNewChat, newChat])

  useEffect(() => () => {
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
  }, [])

  const hasActivity = messages.length > 0 || isRunning || !!clarification
  const hasEverSubmitted = messages.length > 0 || isRunning || !!clarification

  const prevRunning = useRef(false)
  useEffect(() => {
    if (isRunning && !prevRunning.current) setStepsOpen(true)
    if (!isRunning && prevRunning.current) setStepsOpen(false)
    prevRunning.current = isRunning
  }, [isRunning])

  useEffect(() => {
    readoutRef.current?.scrollTo({ top: readoutRef.current.scrollHeight, behavior: 'smooth' })
  }, [streamedAnswer, messages])

  function handleSubmit(text?: string) {
    const q = (text ?? draft).trim()
    if (!q || isRunning) return
    submitQuestion(q)
  }

  useEffect(() => {
    const el = logRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [activityLog])

  return (
    <div className="flex min-h-[100dvh] gap-0">
      {/* ── LEFT: Navigation ── */}
      <div className="flex flex-1 flex-col overflow-y-auto px-8 py-8 lg:px-10">
        <div className="mb-8">
          <img
            src={NEOM_LOGO_SRC}
            alt="NEOM"
            className="mb-5 h-16 w-auto object-contain object-left"
            width={159}
            height={201}
            decoding="async"
          />
          <h1 className="text-[22px] font-semibold tracking-tight text-ma-ink md:text-[26px]">
            Strategy Cockpit
          </h1>
          <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-ma-muted">
            Navigate directly to any domain, or ask the intelligence layer a question.
          </p>
        </div>

        {/* Dashboard card (hero) */}
        <Link
          to={dashboardEntry.to}
          className="group mb-6 flex items-center gap-4 rounded-xl border border-ma-line bg-ma-elevated px-5 py-4 shadow-sm transition-all duration-200 hover:border-ma-teal/45 hover:shadow-md dark:border-white/[0.12] dark:bg-white/[0.03] dark:hover:border-ma-teal/50"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-ma-teal/35 bg-ma-teal/10 text-ma-teal dark:border-white/15 dark:bg-white/[0.06] dark:text-white">
            <LayoutDashboard className="size-5 stroke-[1.75]" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-ma-ink group-hover:text-ma-teal transition-colors dark:group-hover:text-white">
              {dashboardEntry.label}
            </p>
            <p className="mt-0.5 text-[12px] text-ma-muted">{dashboardEntry.description}</p>
          </div>
          <ArrowRight className="size-4 shrink-0 text-ma-muted opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-1" aria-hidden />
        </Link>

        {/* Focus areas */}
        <div className="mb-5">
          <p className="mb-2.5 px-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ma-accent">
            Focus Areas
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {focusAreas.map((e) => (
              <NavCard key={e.to} entry={e} />
            ))}
          </div>
        </div>

        {/* Foundation areas */}
        <div>
          <p className="mb-2.5 px-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ma-muted">
            Foundation Areas
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {foundationAreas.map((e) => (
              <NavCard key={e.to} entry={e} />
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Inline Chat ── */}
      <div className="sticky top-0 flex h-[100dvh] w-[36%] min-w-[380px] flex-col overflow-hidden border-l border-ma-line bg-ma-surface/20 dark:bg-ma-charcoal/15">
        {/* Progress shimmer */}
        {isRunning && (
          <div className="flex h-0.5 w-full shrink-0 overflow-hidden bg-ma-line" aria-hidden>
            <div className="ceo-intel-shimmer-bar h-full w-2/5 bg-gradient-to-r from-transparent via-ma-accent/55 to-transparent" />
          </div>
        )}

        {/* Header */}
        <div className="shrink-0 border-b border-ma-line/70 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-full border border-ma-accent/40 bg-ma-accent/12 text-ma-accent shadow-sm transition-shadow duration-300 ${isRunning ? 'ceo-intel-icon-pulse' : ''}`}>
              <Brain className="size-5 stroke-[1.75]" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-ma-ink">CEO Intelligence</p>
              <p className="text-[11px] text-ma-muted">Multi-agent reasoning system</p>
            </div>
            {canNewChat ? (
              <button
                type="button"
                className={`ceo-intel-fade-in flex shrink-0 items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-[11px] font-semibold transition duration-150 active:scale-95 ${confirmingNewChat
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
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-ma-muted">
            Ask any question about the strategy execution.
          </p>
        </div>


        {/* Scrollable body: examples OR activity+readout */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {!hasActivity ? (
            /* ── Idle: show example questions ── */
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ma-muted">
                <MessageSquareText className="size-3.5" aria-hidden />
                Example questions
              </p>
              <div className="grid gap-2">
                {EXAMPLE_QUESTIONS.map((q, i) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleSubmit(q)}
                    className="ceo-intel-pill-in group flex items-start gap-2 rounded-lg border border-ma-line/70 bg-ma-surface/30 px-3 py-2.5 text-left transition-all duration-200 hover:border-ma-accent/40 hover:bg-ma-accent/[0.04] hover:shadow-sm dark:bg-ma-charcoal/30"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <Sparkles className="mt-0.5 size-3.5 shrink-0 text-ma-accent/60 transition-colors group-hover:text-ma-accent" aria-hidden />
                    <span className="text-[12px] leading-snug text-ma-ink/85 transition-colors group-hover:text-ma-ink">
                      {q}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ── Active: collapsible analysis steps + hero answer ── */
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">

              {/* Analysis steps (collapsible, auto-opens while running) */}
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
                        className="max-h-[200px] overflow-y-auto border-t border-ma-line/50 px-4 py-2 text-[10px] leading-relaxed text-ma-ink"
                      >
                        {activityLog.map((line, idx) => {
                          const av = agentAvatar(line.agent)
                          const Icon = av.Icon
                          return (
                            <div
                              key={line.id}
                              className={`group mb-2 flex gap-2 border-l-2 border-ma-accent/35 pl-2 last:mb-1 ${idx === activityLog.length - 1 ? 'ceo-intel-activity-row-in' : ''}`}
                            >
                              <span
                                className={`flex size-7 shrink-0 items-center justify-center rounded-full border shadow-[0_1px_0_rgba(15,18,16,0.06)] ${av.shell}`}
                                aria-hidden
                              >
                                <Icon className="size-3 stroke-[1.75]" />
                              </span>
                              <div className="min-w-0 flex-1 font-mono">
                                <p className="text-[9px] text-ma-muted">
                                  {formatTime(line.ts)}{' '}
                                  <span className="font-semibold text-ma-teal">{agentLabel(line.agent)}</span>
                                </p>
                                <p className="mt-0.5 text-[10px] leading-relaxed text-ma-ink">{line.message}</p>
                              </div>
                            </div>
                          )
                        })}
                        {isRunning ? (
                          <ReasoningStatusFooter key={reasoningSession} active />
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Suggested questions (only before first submission) */}
              {messages.length === 0 && !isRunning && !streamedAnswer ? (
                <div className="shrink-0 border-b border-ma-line px-4 py-3">
                  <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ma-muted">
                    <Sparkles className="size-3" aria-hidden />
                    Suggested questions
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {EXAMPLE_QUESTIONS.slice(0, 4).map((q, i) => (
                      <button
                        key={q}
                        type="button"
                        disabled={isRunning}
                        onClick={() => handleSubmit(q)}
                        className="ceo-intel-pill-in rounded-sm border border-ma-line/70 bg-ma-surface/30 px-2.5 py-1.5 text-left text-[11px] leading-snug text-ma-ink/80 transition-colors hover:border-ma-accent/40 hover:bg-ma-accent/[0.04] hover:text-ma-ink disabled:opacity-50"
                        style={{ animationDelay: `${i * 60}ms` }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Conversation thread (takes all remaining space) */}
              <div ref={readoutRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-[12px] leading-snug">
                {messages.length === 0 && !isRunning && !clarification ? (
                  <p className="text-[12px] text-ma-muted italic">Your answer will appear here.</p>
                ) : (
                  <div className="space-y-3">
                    {messages.map((m, idx) => (
                      m.role === 'user' ? (
                        <div key={m.id} className="flex justify-end">
                          <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-ma-teal/10 border border-ma-teal/20 px-3 py-2">
                            <p className="text-[12px] leading-relaxed text-ma-ink">{m.text}</p>
                          </div>
                        </div>
                      ) : (
                        <div key={m.id} className="flex items-start gap-2">
                          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-ma-accent/30 bg-ma-accent/10 text-ma-accent">
                            <Brain className="size-2.5" aria-hidden />
                          </span>
                          <div className={`min-w-0 flex-1 ${idx === messages.length - 1 ? 'ceo-intel-answer-in' : ''}`}>
                            <StreamedAnswer text={m.streamedAnswer} charts={charts} />
                          </div>
                        </div>
                      )
                    ))}

                    {streamedAnswer && !messages.some(m => m.role === 'assistant' && m.streamedAnswer === streamedAnswer) ? (
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-ma-accent/30 bg-ma-accent/10 text-ma-accent">
                          <Brain className="size-2.5" aria-hidden />
                        </span>
                        <div className="ceo-intel-answer-in min-w-0 flex-1">
                          <StreamedAnswer text={streamedAnswer} charts={charts} />
                        </div>
                      </div>
                    ) : null}

                    {clarification ? (
                      <div className="ceo-intel-fade-in flex items-start gap-2">
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-ma-accent/30 bg-ma-accent/10 text-ma-accent">
                          <Brain className="size-2.5" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1 rounded-sm border border-ma-teal/25 bg-ma-teal/[0.06] px-3 py-2">
                          <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-ma-teal/70">Clarifying question</p>
                          <p className="text-[12px] leading-relaxed text-ma-ink">{clarification}</p>
                        </div>
                      </div>
                    ) : null}

                    {error ? (
                      <div className="ceo-intel-fade-in rounded-sm border border-ma-amber-warn/30 bg-ma-amber-warn/[0.06] px-3 py-2.5">
                        <p className="text-[12px] font-medium text-ma-amber-warn">{error}</p>
                        <p className="mt-1 text-[11px] text-ma-muted">Try rephrasing your question, or check that the backend is reachable.</p>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="shrink-0 border-t border-ma-line/70 bg-ma-surface/80 px-5 py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSubmit()
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              disabled={isRunning}
              placeholder={clarification ? 'Reply to the clarifying question…' : messages.length > 0 ? 'Ask a follow-up…' : 'Ask a question...'}
              className="h-10 flex-1 rounded-lg border border-ma-line bg-ma-elevated px-3.5 text-[13px] text-ma-ink placeholder:text-ma-muted/60 focus:border-ma-accent/50 focus:outline-none focus:ring-1 focus:ring-ma-accent/30 disabled:opacity-50 dark:bg-ma-charcoal/40"
            />
            <button
              type="submit"
              disabled={!draft.trim() || isRunning}
              className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-ma-accent/40 bg-ma-accent/10 text-ma-accent transition-all hover:bg-ma-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="size-4 stroke-[1.75]" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
