import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  Brain,
  Compass,
  FolderKanban,
  History,
  LayoutDashboard,
  MessageSquareText,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
} from 'lucide-react'
import { AnswerMarkdownBody } from '../intelligence/answerMarkdown'
import { useCeoIntelligence } from '../intelligence/CeoIntelligenceContext'
import neomLogoUrl from '../assets/neom-logo.png'

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
    description: 'Portfolio KPIs, project register, CAPEX & delivery posture',
    icon: FolderKanban,
  },
]

const foundationAreas: NavEntry[] = [
  {
    to: '/strategy-before-2025',
    label: 'Strategy before 2025',
    description: 'Vision, masterplanning, and early proof points that shaped the programme',
    icon: History,
  },
  {
    to: '/strategy-2026-onwards',
    label: 'Re-vamped strategy 2026 onwards',
    description: 'Sharper priorities, governance cadence, and narrative after the reset',
    icon: RefreshCw,
  },
  {
    to: '/execution-status',
    label: 'Latest status on execution',
    description: 'Portfolio progress, delivery health, capital deployment & strategic KPIs',
    icon: Activity,
  },
]

const EXAMPLE_QUESTIONS = [
  'How is NEOM positioning itself as a global logistics and trade hub, and what recent partnerships support this ambition?',
  "Across NEOM's different programs and initiatives, what is the evidence that NEOM is genuinely delivering on Saudi Vision 2030's economic diversification goals?",
  "What is the Lighthouse Operating System developed at Oxagon, and what does the WEF agreement signal about NEOM's role in shaping global industrial standards?",
  "What is the measurable social and economic return NEOM SR generated for the Tabuk region in 2023, and how does this compare to the project's broader development goals?",
  'How is NEOM building self-sustaining startup ecosystems across sectors like gaming and entrepreneurship, and what does the survival rate of its accelerator programs reveal about execution quality?',
]

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

function StreamedAnswer({
  text,
  charts,
  streaming,
}: {
  text: string
  charts: Record<string, import('../intelligence/types').ChartSpec>
  streaming?: boolean
}) {
  return (
    <AnswerMarkdownBody
      text={text}
      charts={charts}
      size="compact"
      streaming={streaming}
      className="space-y-2 text-[12px] leading-relaxed text-ma-ink"
    />
  )
}

/* ── page ── */

export function Landing() {
  const {
    messages,
    charts,
    isRunning,
    streamedAnswer,
    error,
    clarification,
    draft,
    setDraft,
    submitQuestion,
    newChat,
    backendRuntime,
  } = useCeoIntelligence()
  const readoutRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
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

  useEffect(() => {
    readoutRef.current?.scrollTo({
      top: readoutRef.current.scrollHeight,
      behavior: isRunning ? 'auto' : 'smooth',
    })
  }, [streamedAnswer, messages, isRunning])

  function handleSubmit(text?: string) {
    const q = (text ?? draft).trim()
    if (!q || isRunning) return
    submitQuestion(q)
  }

  return (
    <div className="flex min-h-[100dvh] flex-col gap-0 lg:flex-row">
      {/* ── LEFT: Navigation ── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-8 py-8 lg:min-h-[100dvh] lg:px-10">
        <div className="mb-8">
          <img
            src={neomLogoUrl}
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

      {/* ── RIGHT: Inline Chat (stack below nav on small screens; avoids wide min-w clipping) ── */}
      <div className="flex min-h-[min(520px,70dvh)] w-full flex-col overflow-hidden border-t border-ma-line bg-ma-surface/20 dark:bg-ma-charcoal/15 lg:sticky lg:top-0 lg:h-[100dvh] lg:min-h-0 lg:w-[36%] lg:min-w-[320px] lg:border-l lg:border-t-0 xl:min-w-[380px]">
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
              <p className="text-[14px] font-semibold text-ma-ink">NEOM intelligence</p>
              <p className="text-[11px] text-ma-muted">Document-grounded Q&amp;A</p>
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
            /* ── Active: answer thread ── */
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {isRunning ? (
                <div className="shrink-0 border-b border-ma-line/80 px-4 py-2.5">
                  <p className="text-[11px] text-ma-muted">Generating answer…</p>
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
                            <StreamedAnswer text={m.streamedAnswer} charts={charts} streaming={false} />
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
                          <StreamedAnswer text={streamedAnswer} charts={charts} streaming={isRunning} />
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
          {backendRuntime ? (
            <p className="mb-2 font-mono text-[9px] leading-snug text-ma-muted/85" title="Models reported by the API for this turn">
              <span className="text-ma-muted">Models</span>
              {' · main '}
              <span className="text-ma-ink/90">{backendRuntime.llm_model}</span>
              {' · gate '}
              <span className="text-ma-ink/90">{backendRuntime.gate_model}</span>
            </p>
          ) : null}
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
