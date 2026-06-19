import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Brain, Plus, X } from 'lucide-react'
import type { AgentId, AgentLogEvent, ChartSpec, CeoContext } from './types'
import type { ChatMessage } from './CeoIntelligenceContext'
import { AnswerMarkdownBody } from './answerMarkdown'

const BROAD_SUGGESTIONS = [
  'How is NEOM positioning itself as a global logistics and trade hub, and what recent partnerships support this ambition?',
  "Across NEOM's different programs and initiatives, what is the evidence that NEOM is genuinely delivering on Saudi Vision 2030's economic diversification goals?",
  "What is the Lighthouse Operating System developed at Oxagon, and what does the WEF agreement signal about NEOM's role in shaping global industrial standards?",
  "What is the measurable social and economic return NEOM SR generated for the Tabuk region in 2023, and how does this compare to the project's broader development goals?",
  'How is NEOM building self-sustaining startup ecosystems across sectors like gaming and entrepreneurship, and what does the survival rate of its accelerator programs reveal about execution quality?',
]

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
  /** Shown above the composer — from backend SSE `meta` after each ask. */
  backendRuntime: { llm_model: string; gate_model: string } | null
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
  activityLog: _activityLog,
  isRunning,
  activeAgentId: _activeAgentId,
  streamedAnswer,
  error,
  clarification,
  backendRuntime,
  draft,
  onDraftChange,
  onSubmit,
  contextAware,
  onContextAwareChange,
}: CeoChatDrawerProps) {
  const renderAnswer = (text: string, streaming: boolean) => (
    <AnswerMarkdownBody text={text} charts={charts} size="normal" streaming={streaming} />
  )

  const readoutRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [confirmingNewChat, setConfirmingNewChat] = useState(false)
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasPageContext = !!(context.page || context.pageEntities?.length)

  const scopedSuggestions = useMemo(() => {
    if (context.suggestedQuestions?.length) return context.suggestedQuestions
    if (context.scope === 'project') {
      return [
        'What does the strategy corpus highlight about this project or comparable flagship builds?',
        'What risks or dependencies are described in indexed documents?',
        'Summarize stakeholder messaging that relates to this initiative.',
      ]
    }
    if (context.scope === 'bu') {
      return [
        'What themes in the documents are most relevant to this sector?',
        'How does recent strategy material describe priorities for this area?',
        'What execution or delivery narratives show up in search results?',
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
                NEOM intelligence
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

          {messages.length > 0 && isRunning ? (
            <div className="shrink-0 border-b border-ma-line px-4 py-2.5">
              <p className="text-[11px] text-ma-muted">Generating answer…</p>
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
              {backendRuntime ? (
                <p className="mb-2 font-mono text-[10px] leading-snug text-ma-muted/85" title="Models reported by the API for this turn">
                  <span className="text-ma-muted">Models</span>
                  {' · main '}
                  <span className="text-ma-ink/90">{backendRuntime.llm_model}</span>
                  {' · gate '}
                  <span className="text-ma-ink/90">{backendRuntime.gate_model}</span>
                </p>
              ) : null}
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
