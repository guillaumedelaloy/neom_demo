import type { AgentId, AgentLogEvent } from './types'

let seq = 0
function nextId() {
  seq += 1
  return `log-${seq}`
}

export function createActivityEmitter(onLine: (e: AgentLogEvent) => void) {
  return async function emit(agent: AgentId, message: string, delayMs = 280) {
    await new Promise((r) => setTimeout(r, delayMs))
    onLine({
      id: nextId(),
      ts: Date.now(),
      agent,
      message,
    })
  }
}
