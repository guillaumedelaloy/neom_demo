# Story 4.2: Agent Identity in Chat UI

Status: review

<!--
PREREQUISITES:
- Story 3.6 done: backend already emits {"type": "agent", "agent_id": "...", "content": "<LABEL>"}
  as the first SSE event before any token. No backend changes needed.
- Story 7.4 done: FollowUpInput has a no-op agent handler placeholder ready to be wired.
- Story 7.1 done: chat thread + InsightDrawer structure established.

CURRENT STATE (what is broken):
- QueryBar.tsx:       Receives "agent" SSE event but never handles it — silently ignored
- FollowUpInput:      Has a no-op comment placeholder (from Story 7.4) — needs real handler
- shellStore.ts:      No activeAgentLabel state
- InsightDrawer.tsx:  Hardcodes "Strategic Co-pilot" everywhere
- AgentBadge.tsx:     Does not exist

This is a pure frontend story. No backend changes.

AGENT LABELS emitted by the backend (from api/agents.yaml):
  "DELIVERY ENGINE" | "VALUE LENS" | "RISK RADAR" | "GAP FINDER" | "ACTION DESK"
The backend emits payload.content = the display label; payload.agent_id = slug (not needed here).
-->

---

## Story

As an executive,
I want every chat response to show which agent answered it and to see which agent is analyzing my question while it thinks,
so that I understand the analytical lens being applied and can calibrate my trust accordingly.

---

## Acceptance Criteria

**AC1 — Store active agent:** `shellStore.ts` adds `activeAgentLabel: string` (empty = no active agent) and `setActiveAgentLabel: (label: string) => void`. `startLiveQuery` resets `activeAgentLabel` to `""`.

**AC2 — Agent event handled in QueryBar.tsx:** `payload.type === "agent"` calls `setActiveAgentLabel(payload.content)`.

**AC3 — Agent event handled in FollowUpInput:** Replace the Story 7.4 no-op placeholder with `setActiveAgentLabel(payload.content)`.

**AC4 — Active agent shown below query bar:** When `aiPhase === "thinking"` AND `activeAgentLabel` is non-empty, a single line appears below the textarea:
`<AGENT LABEL> · Analyzing your question…`
Styled: `text-[10px] font-semibold uppercase tracking-[0.18em]`, `color: var(--ai-text-muted)`, `mt-1`. Invisible when idle or speaking. No layout changes to textarea, button, or any other QueryBar element.

**AC5 — Agent name in InsightDrawer thinking header:** When `aiPhase === "thinking"` AND `activeAgentLabel` is set, the thinking block header reads `{activeAgentLabel}` instead of "Strategic Co-pilot".

**AC6 — Agent badge on completed response bubbles:** Completed agent messages show `<AgentBadge label={msg.agentLabel ?? null} />` in place of the "Strategic Co-pilot" span. When `agentLabel` is absent (out-of-scope message received without an agent event), fall back to the "Strategic Co-pilot" span. `ChatMessage` type gains `agentLabel?: string`; `appendChatMessage` calls in both QueryBar and FollowUpInput pass `agentLabel: useShellStore.getState().activeAgentLabel`.

**AC7 — AgentBadge component:** `components/ai/AgentBadge.tsx` created, ≤60 lines. Props: `{ label: string | null }`. Returns null when label is falsy. Badge style: `var(--ma-teal)` border + text, `var(--ai-panel-elevated)` bg, `text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm`. No hardcoded hex values.

**AC8 — Out-of-scope unaffected:** When `not_supported` arrives with no preceding `agent` event, `activeAgentLabel` is empty and the "Strategic Co-pilot" fallback renders correctly.

**AC9 — No backend changes, no regressions.** The SSE event contract is unchanged.

---

## Tasks / Subtasks

- [x] T1: Extend `lib/shellStore.ts` (AC: 1)
  - [x] T1.1: Add `activeAgentLabel: string` to `ShellState` interface
  - [x] T1.2: Add `setActiveAgentLabel: (label: string) => void` to `ShellState` interface
  - [x] T1.3: Initialize `activeAgentLabel: ""` in `create()`
  - [x] T1.4: Implement `setActiveAgentLabel: (activeAgentLabel) => set({ activeAgentLabel })`
  - [x] T1.5: Add `activeAgentLabel: ""` to the `set()` call inside `startLiveQuery`

- [x] T2: Extend `lib/types.ts` (AC: 6)
  - [x] T2.1: Add `agentLabel?: string` to the `ChatMessage` interface

- [x] T3: Create `components/ai/AgentBadge.tsx` (AC: 7)
  - [x] T3.1: Create file with `export function AgentBadge({ label }: { label: string | null })`
  - [x] T3.2: Return `null` when `!label`
  - [x] T3.3: Render `<span>` with teal border/text tokens and correct typography classes (see Dev Notes)
  - [x] T3.4: Confirm file ≤60 lines

- [x] T4: Update `components/ai/QueryBar.tsx` (AC: 2, 4, 6)
  - [x] T4.1: Destructure `setActiveAgentLabel` and `activeAgentLabel` from `useShellStore`
  - [x] T4.2: In SSE loop, add: `if (payload.type === "agent") { setActiveAgentLabel(payload.content); }`
  - [x] T4.3: Add `agentLabel: useShellStore.getState().activeAgentLabel` to the `appendChatMessage({...})` call
  - [x] T4.4: Below the `<textarea>` + `<AiButton>` row div, still inside the `min-w-0 flex-1` container, add:
    ```tsx
    {aiPhase === "thinking" && activeAgentLabel && (
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
         style={{ color: "var(--ai-text-muted)" }}>
        {activeAgentLabel} · Analyzing your question…
      </p>
    )}
    ```

- [x] T5: Update `components/ai/InsightDrawer.tsx` (AC: 3, 5, 6)
  - [x] T5.1: `FollowUpInput` — destructure `setActiveAgentLabel` from `useShellStore`
  - [x] T5.2: `FollowUpInput` — replace Story 7.4 no-op with: `if (payload.type === "agent") { setActiveAgentLabel(payload.content); }`
  - [x] T5.3: `FollowUpInput` — add `agentLabel: useShellStore.getState().activeAgentLabel` to `appendChatMessage` call
  - [x] T5.4: `InsightDrawer` — destructure `activeAgentLabel` from `useShellStore`
  - [x] T5.5: `InsightDrawer` — import `AgentBadge`
  - [x] T5.6: In thinking block header, replace `"Strategic Co-pilot"` with `{activeAgentLabel || "Strategic Co-pilot"}`
  - [x] T5.7: In completed agent bubbles, replace the "Strategic Co-pilot" span with AgentBadge + fallback

- [x] T6: Smoke test (AC: all)
  - [x] T6.1: Submit financial question — "VALUE LENS · Analyzing your question…" appears below textarea
  - [x] T6.2: InsightDrawer thinking header shows "VALUE LENS" (not "Strategic Co-pilot")
  - [x] T6.3: After answer, completed bubble shows VALUE LENS badge in teal
  - [x] T6.4: Submit follow-up — same agent display from FollowUpInput
  - [x] T6.5: Submit out-of-scope question — "Strategic Co-pilot" fallback renders, no badge
  - [x] T6.6: `npx tsc --noEmit` — 0 errors

---

## Dev Notes

### SSE event to handle (api/routers/query.py line ~101)

```python
yield f"data: {json.dumps({'type': 'agent', 'agent_id': agent['id'], 'content': agent['label']})}\n\n"
```
- `payload.type === "agent"`
- `payload.content` = display label: `"DELIVERY ENGINE"` | `"VALUE LENS"` | `"RISK RADAR"` | `"GAP FINDER"` | `"ACTION DESK"`
- `payload.agent_id` = slug — not used in this story

### AgentBadge.tsx — complete implementation

```tsx
"use client";

export function AgentBadge({ label }: { label: string | null }) {
  if (!label) return null;
  return (
    <span
      className="inline-block rounded-sm border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
      style={{
        borderColor: "var(--ma-teal)",
        backgroundColor: "var(--ai-panel-elevated)",
        color: "var(--ma-teal)",
      }}
    >
      {label}
    </span>
  );
}
```

`var(--ma-teal)` = teal data/CTA token (`#2d6a66`). Never use the hex directly — always the CSS variable.

### QueryBar.tsx — where to add the indicator (T4.4)

The indicator `<p>` goes AFTER the `<div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end">` closing tag (which wraps the textarea + button), still inside the `min-w-0 flex-1` parent div. This avoids any change to textarea height, button alignment, or flex layout.

### ChatMessage.agentLabel — how appendChatMessage is called

`appendChatMessage` accepts `Omit<ChatMessage, "id">`. Since `agentLabel` is optional, no interface change is needed beyond adding `agentLabel?: string` to `ChatMessage`. Pass it as:
```typescript
appendChatMessage({ role: "agent", content: accumulated, agentLabel: useShellStore.getState().activeAgentLabel || undefined });
```
Using `|| undefined` ensures absent labels stay absent (not stored as empty string), keeping the fallback logic in T5.7 clean.

### InsightDrawer — thinking header location

Current thinking block (lines ~218-241):
```tsx
{aiPhase === "thinking" && (
  <div className="flex flex-col gap-1">
    <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--ai-text-muted)" }}>
      Strategic Co-pilot        {/* ← CHANGE THIS */}
    </span>
    ...
  </div>
)}
```
Change only the text content of that `<span>` to `{activeAgentLabel || "Strategic Co-pilot"}`.

### Do NOT touch these files

- `components/ai/AiOrb.tsx`, `AiBarMeter.tsx`, `AiButton.tsx`, `AiPanel.tsx` — design primitives
- `components/shell/DashboardShell.tsx` — layout shell
- `api/routers/query.py` — already emits the `agent` event correctly
- `api/services/agent_service.py` — no changes needed

### File boundaries

| File | Change |
|---|---|
| `lib/types.ts` | Add `agentLabel?: string` to `ChatMessage` |
| `lib/shellStore.ts` | Add `activeAgentLabel` state + `setActiveAgentLabel` + reset in `startLiveQuery` |
| `components/ai/AgentBadge.tsx` | NEW — ≤60 lines |
| `components/ai/QueryBar.tsx` | Handle `agent` event; below-textarea indicator; pass `agentLabel` to `appendChatMessage` |
| `components/ai/InsightDrawer.tsx` | `FollowUpInput`: wire agent handler + pass `agentLabel`; `InsightDrawer`: active agent in thinking header + badge in bubbles |

### References
- Agent event source: `api/routers/query.py` line ~101
- Agent label values: `api/agents.yaml`
- Current chat bubble structure: `components/ai/InsightDrawer.tsx` lines ~189-215
- Current QueryBar submit: `components/ai/QueryBar.tsx` lines 34-75
- Current shellStore: `lib/shellStore.ts`
- Design tokens: `_bmad-output/planning-artifacts/design-system.md`
- Epic 4 goal / FR21: every agent response labelled with agent name

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Rebased story branch onto `origin/main` — epic/4 integration branch predated chat thread features; main was the correct base for all prerequisites (7.1, 7.4, 3.6).

### Completion Notes List

- AC1: `activeAgentLabel: string` + `setActiveAgentLabel` added to `ShellState`; reset to `""` in `startLiveQuery`.
- AC2: QueryBar SSE loop handles `payload.type === "agent"` → `setActiveAgentLabel(payload.content)`.
- AC3: FollowUpInput SSE loop wired identically; no-op placeholder replaced.
- AC4: Indicator `<p>` renders below the textarea+button row inside `min-w-0 flex-1` — zero layout impact.
- AC5: InsightDrawer thinking header uses `{activeAgentLabel || "Strategic Co-pilot"}`.
- AC6: `ChatMessage.agentLabel?: string` added; both `appendChatMessage` calls pass `activeAgentLabel || undefined`; completed bubbles show `<AgentBadge>` or fallback span.
- AC7: `AgentBadge.tsx` created, 17 lines, all tokens via CSS variables.
- AC8: `not_supported` path has no preceding `agent` event → `activeAgentLabel` stays `""` → fallback renders.
- AC9: Zero backend changes; `npx tsc --noEmit` returns 0 errors.

### File List

- `lib/types.ts`
- `lib/shellStore.ts`
- `components/ai/AgentBadge.tsx` (NEW)
- `components/ai/QueryBar.tsx`
- `components/ai/InsightDrawer.tsx`
- `_bmad-output/implementation-artifacts/4-2-agent-identity-in-chat-ui.md`

### Change Log

- 2026-04-14: Implemented Story 4.2 — agent identity in chat UI. Added `activeAgentLabel` state, `AgentBadge` component, wired SSE agent events in QueryBar and FollowUpInput, updated InsightDrawer thinking header and completed bubbles.
