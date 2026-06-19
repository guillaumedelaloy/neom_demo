import { useCallback, useEffect, useRef, useState } from 'react'
import { getApiBase } from '../lib/api'
import {
  createMockQueryResponse,
  shouldForceMockBackend,
  shouldUseMockOnFetchFailure,
} from './mockCeoQueryStream'
import type { AgentId, AgentLogEvent, BackendMessage, CeoContext, ChartSpec } from './types'

export type { BackendMessage }

// Backend agent IDs → designer's AgentId (drives avatar icons in CeoChatDrawer)
const AGENT_ID_MAP: Record<string, AgentId> = {
  'clarification-agent': 'clarification_agent',
  'data-extraction':     'data_extraction',
  'data-retrieval':      'orchestrator',
  'risk-radar':          'risk_radar',
  'delivery-engine':     'delivery_engine',
  'value-lens':          'value_lens',
  'gap-finder':          'gap_finder',
  'action-desk':         'action_desk',
}

function uid() {
  return `e-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

type DashboardContext = Pick<CeoContext, 'scope' | 'bu' | 'projectId' | 'projectName' | 'kpiLabel' | 'page' | 'reportingPeriod' | 'pageEntities'>

type UseBackendChatResult = {
  submit: (messages: BackendMessage[], context?: DashboardContext) => Promise<string | null>
  reset: () => void
  streamedAnswer: string
  charts: Record<string, ChartSpec>
  activityLog: AgentLogEvent[]
  isRunning: boolean
  activeAgentId: AgentId | null
  error: string | null
  clarification: string | null
  /** From backend SSE `meta` (or mock) — models used for the last chat turn. */
  backendRuntime: { llm_model: string; gate_model: string } | null
}

export function useBackendChat(): UseBackendChatResult {
  const [streamedAnswer, setStreamedAnswer] = useState('')
  const [charts, setCharts] = useState<Record<string, ChartSpec>>({})
  const [activityLog, setActivityLog] = useState<AgentLogEvent[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<AgentId | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [clarification, setClarification] = useState<string | null>(null)
  const [backendRuntime, setBackendRuntime] = useState<{ llm_model: string; gate_model: string } | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  /** Coalesce token updates to one React commit per frame (avoids tab freeze from markdown re-parsing). */
  const streamRafRef = useRef<number | null>(null)
  const activityQueueRef = useRef<AgentLogEvent[]>([])
  const activityRafRef = useRef<number | null>(null)

  const cancelStreamRaf = () => {
    if (streamRafRef.current != null) {
      cancelAnimationFrame(streamRafRef.current)
      streamRafRef.current = null
    }
  }

  const cancelActivityRaf = () => {
    if (activityRafRef.current != null) {
      cancelAnimationFrame(activityRafRef.current)
      activityRafRef.current = null
    }
  }

  const flushActivityQueue = () => {
    const batch = activityQueueRef.current.splice(0, activityQueueRef.current.length)
    if (batch.length) setActivityLog(prev => [...prev, ...batch])
  }

  const queueActivityEvent = (ev: AgentLogEvent) => {
    activityQueueRef.current.push(ev)
    if (activityRafRef.current != null) return
    activityRafRef.current = requestAnimationFrame(() => {
      activityRafRef.current = null
      flushActivityQueue()
    })
  }

  // Abort any in-flight request on unmount
  useEffect(
    () => () => {
      abortRef.current?.abort()
      cancelStreamRaf()
      cancelActivityRaf()
      activityQueueRef.current = []
    },
    [],
  )

  const submit = useCallback(async (messages: BackendMessage[], context?: DashboardContext): Promise<string | null> => {
    abortRef.current?.abort()
    cancelStreamRaf()
    cancelActivityRaf()
    activityQueueRef.current = []
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setStreamedAnswer('')
    setCharts({})
    setActivityLog([])
    setError(null)
    setClarification(null)
    setBackendRuntime(null)
    setActiveAgentId(null)
    setIsRunning(true)

    let currentAgent: AgentId = 'orchestrator'
    let accumulated = ''  // mutable local — returned to caller for history append

    const scheduleStreamFlush = () => {
      if (streamRafRef.current != null) return
      streamRafRef.current = requestAnimationFrame(() => {
        streamRafRef.current = null
        setStreamedAnswer(accumulated)
      })
    }

    const readSse = async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
      const decoder = new TextDecoder()
      outer: while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6)) as {
              type: string
              agent_id?: string
              content?: string
              llm_model?: string
              gate_model?: string
            }
            if (event.type === 'meta') {
              if (event.llm_model && event.gate_model) {
                setBackendRuntime({ llm_model: event.llm_model, gate_model: event.gate_model })
              }
            } else if (event.type === 'agent') {
              const mapped = AGENT_ID_MAP[event.agent_id ?? ''] ?? 'orchestrator'
              currentAgent = mapped
              setActiveAgentId(mapped)
              queueActivityEvent({ id: uid(), ts: Date.now(), agent: mapped, message: event.content ?? '' })
            } else if (event.type === 'thinking') {
              queueActivityEvent({ id: uid(), ts: Date.now(), agent: currentAgent, message: event.content ?? '' })
            } else if (event.type === 'clarification') {
              cancelStreamRaf()
              setStreamedAnswer(accumulated)
              setClarification(event.content ?? '')
              setIsRunning(false)
              return null
            } else if (event.type === 'chart') {
              try {
                const spec = JSON.parse(event.content ?? '{}') as ChartSpec
                setCharts(prev => ({ ...prev, [spec.id]: spec }))
                const placeholder = `\n\n<!--chart:${spec.id}-->\n\n`
                accumulated += placeholder
                scheduleStreamFlush()
              } catch { /* skip malformed chart events */ }
            } else if (event.type === 'token') {
              accumulated += event.content ?? ''
              scheduleStreamFlush()
            } else if (event.type === 'done') {
              cancelStreamRaf()
              setStreamedAnswer(accumulated)
              cancelActivityRaf()
              flushActivityQueue()
              setIsRunning(false)
              return accumulated
            } else if (event.type === 'error' || event.type === 'not_supported') {
              cancelStreamRaf()
              setStreamedAnswer(accumulated)
              cancelActivityRaf()
              flushActivityQueue()
              setError(event.content ?? 'Unknown error')
              setIsRunning(false)
              break outer
            }
          } catch { /* skip malformed SSE lines */ }
        }
      }
      cancelStreamRaf()
      setStreamedAnswer(accumulated)
      cancelActivityRaf()
      flushActivityQueue()
      return null
    }

    try {
      let reader: ReadableStreamDefaultReader<Uint8Array> | null = null

      if (shouldForceMockBackend()) {
        reader = createMockQueryResponse(messages, ctrl.signal).body?.getReader() ?? null
      } else {
        const apiKey = import.meta.env.VITE_BACKEND_API_KEY || ''
        try {
          const res = await fetch(`${getApiBase()}/api/query`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(apiKey ? { 'x-api-key': apiKey } : {}),
            },
            body: JSON.stringify({ messages, ...(context ? { context } : {}) }),
            signal: ctrl.signal,
          })
          if (res.ok && res.body) {
            reader = res.body.getReader()
          } else if (
            shouldUseMockOnFetchFailure() &&
            (res.status === 502 || res.status === 503 || res.status === 504)
          ) {
            // Dev-only: proxy “upstream unreachable” — likely no API on the target port.
            reader = createMockQueryResponse(messages, ctrl.signal).body?.getReader() ?? null
          } else {
            let detail = ''
            try {
              const j = (await res.clone().json()) as { detail?: string }
              if (typeof j?.detail === 'string') detail = j.detail
            } catch {
              /* ignore non-JSON error bodies */
            }
            const hint403 =
              res.status === 403
                ? ' If the API sets BACKEND_API_KEY, add VITE_BACKEND_API_KEY with the same value to .env and restart Vite.'
                : ''
            const base =
              detail
                ? `Request failed (${res.status}): ${detail}`
                : `Request failed (${res.status})`
            const tail = hint403 || (!detail ? ' — check the API terminal logs.' : '')
            setError(`${base}${tail}`)
            setIsRunning(false)
            return null
          }
        } catch (fetchErr) {
          if ((fetchErr as Error).name === 'AbortError') throw fetchErr
          const msg = String((fetchErr as Error).message ?? fetchErr)
          const looksNetwork =
            fetchErr instanceof TypeError || /Failed to fetch|NetworkError|load failed/i.test(msg)
          if (shouldUseMockOnFetchFailure() && looksNetwork) {
            reader = createMockQueryResponse(messages, ctrl.signal).body?.getReader() ?? null
          } else {
            setError('Connection error — is the backend running?')
            setIsRunning(false)
            return null
          }
        }
      }

      if (!reader) {
        setError('No response body')
        setIsRunning(false)
        return null
      }

      const out = await readSse(reader)
      if (out != null) return out
      setIsRunning(false)
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        cancelStreamRaf()
        cancelActivityRaf()
        activityQueueRef.current = []
        setError('Connection error — is the backend running?')
        setIsRunning(false)
      }
    }
    return null
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    cancelStreamRaf()
    cancelActivityRaf()
    activityQueueRef.current = []
    setStreamedAnswer('')
    setCharts({})
    setActivityLog([])
    setError(null)
    setClarification(null)
    setBackendRuntime(null)
    setActiveAgentId(null)
    setIsRunning(false)
  }, [])

  return {
    submit,
    reset,
    streamedAnswer,
    charts,
    activityLog,
    isRunning,
    activeAgentId,
    error,
    clarification,
    backendRuntime,
  }
}
