import { createContext, useContext } from 'react'
import type { AgentLogEvent, ChartSpec, CeoContext } from './types'

export type ChatMessage =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; streamedAnswer: string }

export type CeoIntelligenceContextValue = {
  openChat: (patch?: Partial<CeoContext>) => void
  closeChat: () => void
  newChat: () => void
  setContext: (next: CeoContext) => void
  context: CeoContext
  contextAware: boolean
  setContextAware: (v: boolean) => void
  isOpen: boolean
  messages: ChatMessage[]
  charts: Record<string, ChartSpec>
  activityLog: AgentLogEvent[]
  isRunning: boolean
  reasoningSession: number
  streamedAnswer: string
  error: string | null
  clarification: string | null
  draft: string
  setDraft: (v: string) => void
  submitQuestion: (overrideText?: string) => void
  /** Resolved LLM ids from the last chat response (SSE meta) or mock labels. */
  backendRuntime: { llm_model: string; gate_model: string } | null
}

export const CeoIntelligenceContext = createContext<CeoIntelligenceContextValue | null>(null)

export function useCeoIntelligence() {
  const ctx = useContext(CeoIntelligenceContext)
  if (!ctx) throw new Error('useCeoIntelligence must be used within CeoIntelligenceProvider')
  return ctx
}
