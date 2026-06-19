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
}

export function useBackendChat(): UseBackendChatResult {
  const [streamedAnswer, setStreamedAnswer] = useState('')
  const [charts, setCharts] = useState<Record<string, ChartSpec>>({})
  const [activityLog, setActivityLog] = useState<AgentLogEvent[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<AgentId | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [clarification, setClarification] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Abort any in-flight request on unmount
  useEffect(() => () => { abortRef.current?.abort() }, [])

  const submit = useCallback(async (messages: BackendMessage[], context?: DashboardContext): Promise<string | null> => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setStreamedAnswer('')
    setCharts({})
    setActivityLog([])
    setError(null)
    setClarification(null)
    setActiveAgentId(null)
    setIsRunning(true)

    let currentAgent: AgentId = 'orchestrator'
    let accumulated = ''  // mutable local — returned to caller for history append

    const readSse = async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
      const decoder = new TextDecoder()
      outer: while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6)) as { type: string; agent_id?: string; content?: string }
            if (event.type === 'agent') {
              const mapped = AGENT_ID_MAP[event.agent_id ?? ''] ?? 'orchestrator'
              currentAgent = mapped
              setActiveAgentId(mapped)
              setActivityLog(prev => [...prev, { id: uid(), ts: Date.now(), agent: mapped, message: event.content ?? '' }])
            } else if (event.type === 'thinking') {
              setActivityLog(prev => [...prev, { id: uid(), ts: Date.now(), agent: currentAgent, message: event.content ?? '' }])
            } else if (event.type === 'clarification') {
              setClarification(event.content ?? '')
              setIsRunning(false)
              return null
            } else if (event.type === 'chart') {
              try {
                const spec = JSON.parse(event.content ?? '{}') as ChartSpec
                setCharts(prev => ({ ...prev, [spec.id]: spec }))
                const placeholder = `\n\n<!--chart:${spec.id}-->\n\n`
                accumulated += placeholder
                setStreamedAnswer(prev => prev + placeholder)
              } catch { /* skip malformed chart events */ }
            } else if (event.type === 'token') {
              accumulated += event.content ?? ''
              setStreamedAnswer(prev => prev + (event.content ?? ''))
            } else if (event.type === 'done') {
              setIsRunning(false)
              return accumulated
            } else if (event.type === 'error' || event.type === 'not_supported') {
              setError(event.content ?? 'Unknown error')
              setIsRunning(false)
              break outer
            }
          } catch { /* skip malformed SSE lines */ }
        }
      }
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
          } else if (shouldUseMockOnFetchFailure()) {
            reader = createMockQueryResponse(messages, ctrl.signal).body?.getReader() ?? null
          } else {
            setError(`Request failed (${res.status})`)
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
        setError('Connection error — is the backend running?')
        setIsRunning(false)
      }
    }
    return null
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setStreamedAnswer('')
    setCharts({})
    setActivityLog([])
    setError(null)
    setClarification(null)
    setActiveAgentId(null)
    setIsRunning(false)
  }, [])

  return { submit, reset, streamedAnswer, charts, activityLog, isRunning, activeAgentId, error, clarification }
}
