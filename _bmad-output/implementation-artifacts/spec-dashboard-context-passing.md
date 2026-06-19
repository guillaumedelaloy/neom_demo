---
title: 'Dashboard Context Passing to Agent'
type: 'feature'
created: '2026-04-15'
status: 'done'
baseline_commit: '2bdd6d7375e0faa2f35f3225775847e4b20a25d0'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The frontend `CeoContext` (scope, BU, project) is never sent to the backend — the agent treats every query as global, regardless of which project or dashboard view the user is viewing.

**Approach:** Extend `useBackendChat.submit()` to accept and forward `CeoContext` in the POST body; extend `ChatRequest` to accept it; inject it as a scoping block at the top of the system prompt so the agent automatically focuses answers on the user's current view.

## Boundaries & Constraints

**Always:**
- Context is injected into the system prompt only when provided and scope is not `global`; omitting it preserves existing global behavior exactly.
- Context shape mirrors the existing `CeoContext` type: `scope`, `bu?`, `projectId?`, `projectName?`, `kpiLabel?`.
- Backend treats context as an optional field — no breaking change to existing callers.

**Ask First:**
- Whether context should also be forwarded to `query_gate.assess()` so the gate can scope its relevance check (default: don't — keep gate global).

**Never:**
- Add context to the messages array (would pollute chat history).
- Restructure `CeoIntelligenceProvider` state or route-context logic.
- Eagerly pre-filter tool calls or load project-specific data based on context.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Global query | `context` omitted or `scope: 'global'` | No scope block injected; behavior identical to today | N/A |
| Project-scoped query | `context: { scope: 'project', bu: 'PHO', projectId: 'P3PH1', projectName: 'Phos 3 Ph1' }` | System prompt includes DASHBOARD CONTEXT block naming the project | N/A |
| BU-scoped query | `context: { scope: 'bu', bu: 'PHO' }` | System prompt scopes to PHO BU | N/A |
| Partial context (KPI scope) | `context: { scope: 'kpi', kpiLabel: 'EBITDA' }` | Only non-null fields rendered in scope block | N/A |
| Missing optional fields | `context: { scope: 'project', projectName: 'Phos 3 Ph1' }` (no `projectId`) | Scope block omits the missing field line entirely | N/A |

</frozen-after-approval>

## Code Map

- `src/intelligence/types.ts:6` -- `CeoContext` type — shape to pass as context payload
- `src/intelligence/useBackendChat.ts:45` -- `submit()` — add optional `context` param, include in POST body
- `src/intelligence/CeoIntelligenceProvider.tsx:58` -- `submitQuestion` — pass `context` state to `submit()`
- `api/routers/query.py:19` -- `ChatRequest` — add `context: dict | None = None`
- `api/routers/query.py:31` -- `_build_system_prompt()` — prepend scope block when context is non-null and non-global

## Tasks & Acceptance

**Execution:**
- [x] `src/intelligence/useBackendChat.ts` -- Add `context?: Pick<CeoContext, 'scope' | 'bu' | 'projectId' | 'projectName' | 'kpiLabel'>` parameter to `submit()`; include it in the JSON body when present — keeps hook self-contained
- [x] `src/intelligence/CeoIntelligenceProvider.tsx` -- Pass `context` state to `submit([...history, { role: 'user', content: text }], context)` in `submitQuestion` — wires live dashboard context into every query
- [x] `api/routers/query.py` -- Add `context: dict | None = None` to `ChatRequest`; thread it through to `_build_system_prompt(messages, context)`; prepend the DASHBOARD CONTEXT block (see Design Notes) when context scope is present and not `'global'`

**Acceptance Criteria:**
- Given a user opens chat from a project card (scope=project, projectName=Phos 3 Ph1), when they submit a query, then the backend system prompt contains a DASHBOARD CONTEXT block naming that project.
- Given scope is global (default), when a query is submitted, then the system prompt is identical to today's behavior — no scope block prepended.
- Given `context` is omitted from the POST body entirely, when the backend receives it, then the endpoint accepts the request without error (backward-compatible default).
- Given a BU-scoped context, when the agent answers, then its response focuses on that BU without requiring the user to name it in their question.

## Spec Change Log

## Design Notes

Scope block format to prepend (after `core`) when context is present and scope is not `global`:

```
DASHBOARD CONTEXT
Scope: {scope}
BU: {bu}                             ← only when bu is set
Project: {projectName} ({projectId}) ← only when projectName is set; omit projectId if absent
KPI: {kpiLabel}                      ← only when kpiLabel is set

When answering, focus on the above scope unless the user explicitly asks about a broader view.
```

Inject this block between `core` and `turn_guidance` in `_build_system_prompt` so grounding rules (core) apply before scope narrowing.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: no TypeScript errors

**Manual checks (if no CLI):**
- Open portfolio page, click a project card to open chat, submit any question, and confirm the backend logs show the scope block in the system prompt (add a temporary `print(system_prompt[:500])` in `query.py` if needed).

## Suggested Review Order

**API contract — entry point**

- New optional field; default `None` ensures backward compatibility.
  [`query.py:21`](../../api/routers/query.py#L21)

**Prompt injection — sanitization boundary**

- `_sanitize()` strips newlines from all user-controlled context values before interpolation.
  [`query.py:32`](../../api/routers/query.py#L32)

- `_build_context_block()` builds the DASHBOARD CONTEXT block; skips global scope; renders only present fields.
  [`query.py:37`](../../api/routers/query.py#L37)

- Context block injected between `core` and `turn_guidance`; global scope uses original separator unchanged.
  [`query.py:57`](../../api/routers/query.py#L57)

**Frontend wiring**

- Destructures to 5 explicit fields before submit, preventing `contextBanner` from leaking into the POST body.
  [`CeoIntelligenceProvider.tsx:69`](../../src/intelligence/CeoIntelligenceProvider.tsx#L69)

- `context` added to `useCallback` deps so follow-up turns always use the live context.
  [`CeoIntelligenceProvider.tsx:74`](../../src/intelligence/CeoIntelligenceProvider.tsx#L74)

**Hook extension**

- `DashboardContext` Pick type enforces the 5-field contract at the call site.
  [`useBackendChat.ts:22`](../../src/intelligence/useBackendChat.ts#L22)

- Context spread into POST body only when present; omission preserves existing behavior.
  [`useBackendChat.ts:70`](../../src/intelligence/useBackendChat.ts#L70)
