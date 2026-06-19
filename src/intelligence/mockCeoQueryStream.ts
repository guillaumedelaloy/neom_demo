import type { BackendMessage } from './types'

function sseLine(payload: object): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`)
}

function lastUserQuestion(messages: BackendMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m?.role === 'user' && m.content?.trim()) return m.content.trim()
  }
  return ''
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const id = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      window.clearTimeout(id)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * Same SSE shape as POST /api/query — for local UI work without FastAPI.
 */
export function createMockQueryResponse(messages: BackendMessage[], signal: AbortSignal): Response {
  const topic = lastUserQuestion(messages)
  const topicLine = topic ? `You asked: *“${topic.slice(0, 200)}${topic.length > 200 ? '…' : ''}”*.\n\n` : ''

  const bodyMarkdown =
    `${topicLine}` +
    `**No early warning —** this is **mock CEO intelligence** (the real API did not answer). Use it to iterate on layout, streaming, and actions.\n\n` +
    `## Key Basis\n` +
    `- Placeholder narrative only — no live tools or files.\n` +
    `- Start the backend: \`uv run uvicorn api.index:app --reload\` on port **8000** (Vite proxies \`/api\`).\n\n` +
    `## Action\n` +
    `- **Owner:** Strategy PMO (demo)\n` +
    `- **Move:** Turn off mock (\`VITE_MOCK_BACKEND\`) when the API is up; confirm chat end-to-end.\n` +
    `- **By when:** Next working session\n` +
    `- **Urgency:** P2 — UI iteration\n\n` +
    `## Sources\n` +
    `- NEOM POC — mock stream (no underlying file)\n`

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const push = (obj: object) => {
        if (signal.aborted) return
        controller.enqueue(sseLine(obj))
      }

      try {
        push({
          type: 'agent',
          agent_id: 'data-retrieval',
          content: 'Reading your question (mock)…',
        })
        await delay(90, signal)

        push({
          type: 'thinking',
          content: 'Using demo activity — no tools are running.',
        })
        await delay(120, signal)

        push({ type: 'agent', agent_id: 'delivery-engine', content: 'Tracing schedule view (mock)…' })
        await delay(100, signal)
        push({ type: 'agent', agent_id: 'value-lens', content: 'Estimating financial posture (mock)…' })
        await delay(100, signal)
        push({ type: 'agent', agent_id: 'risk-radar', content: 'Scoring risk posture (mock)…' })
        await delay(90, signal)
        push({ type: 'agent', agent_id: 'gap-finder', content: 'Stress-testing assumptions (mock)…' })
        await delay(90, signal)
        push({ type: 'agent', agent_id: 'action-desk', content: 'Drafting next steps (mock)…' })
        await delay(120, signal)

        const chunkSize = 48
        for (let i = 0; i < bodyMarkdown.length; i += chunkSize) {
          if (signal.aborted) break
          push({ type: 'token', content: bodyMarkdown.slice(i, i + chunkSize) })
          await delay(22, signal)
        }

        if (!signal.aborted) {
          push({ type: 'done', content: '' })
        }
      } catch (e) {
        if ((e as Error).name === 'AbortError') {
          /* normal */
        }
      } finally {
        try {
          controller.close()
        } catch {
          /* already closed */
        }
      }
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Mock-Backend': '1',
    },
  })
}

export function shouldForceMockBackend(): boolean {
  const v = import.meta.env.VITE_MOCK_BACKEND
  return v === 'true' || v === '1'
}

/** In dev, use mock when fetch fails (offline / no server), unless explicitly disabled. */
export function shouldUseMockOnFetchFailure(): boolean {
  if (!import.meta.env.DEV) return false
  const v = import.meta.env.VITE_DISABLE_MOCK_ON_BACKEND_DOWN
  return v !== 'true' && v !== '1'
}
