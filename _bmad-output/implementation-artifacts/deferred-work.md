# Deferred Work

## Deferred from: code review of 4-3-data-catalogue (2026-04-13)

- **All agents receive full catalogue regardless of relevance** — `api/routers/query.py:84` — spec-mandated by AC4; per-agent filtering would require spec changes; revisit before adding many more agents or catalogue sections

## Deferred from: dashboard-context-passing (2026-04-15)

- **`context` field on `ChatRequest` is an untyped `dict`** — `api/routers/query.py:21` — pre-existing pattern (`messages` is also `list[dict]`); consider replacing with a typed Pydantic model (`class DashboardContext(BaseModel)`) when hardening the API surface
- **~2,400 tokens added to every request (router + agent call)** — `api/services/agent_registry.py:45`, `api/routers/query.py:84` — accepted trade-off for demo; add per-agent filtering or lazy injection before production scale
- **Hardcoded path `_HERE.parent / "config"`** — `api/services/agent_registry.py:38` — pre-existing pattern throughout module; no config override or env var; refactor if the api/config directory layout changes

## Deferred from: code review of 7-1-chat-ux-iteration (2026-04-13)

- **`res.ok` not checked before streaming body** — `components/ai/QueryBar.tsx`, `components/ai/InsightDrawer.tsx` — pre-existing pattern; 4xx/5xx responses stream as if successful; add `if (!res.ok) throw new Error(...)` before `getReader()` call
- **`JSON.parse` on SSE lines without try/catch** — `components/ai/QueryBar.tsx`, `components/ai/InsightDrawer.tsx` — pre-existing; malformed SSE line crashes the stream loop and triggers the wrong preset fallback; wrap `JSON.parse` in try/catch
- **SSE `TextDecoder` used without `{ stream: true }`** — `components/ai/QueryBar.tsx`, `components/ai/InsightDrawer.tsx` — pre-existing; can corrupt multi-byte UTF-8 characters at network chunk boundaries; use `new TextDecoder()` with `decode(value, { stream: true })`
- **`chatHistory` grows unbounded** — `lib/shellStore.ts` — no eviction or cap; acceptable for POC since refresh clears in-memory state; add a max-messages cap (e.g., 50) before production
- **`textarea` elements missing `htmlFor`/`id` aria association** — `components/ai/QueryBar.tsx`, `components/ai/InsightDrawer.tsx` — placeholder is not a valid accessible name substitute; add `id` to textarea and `htmlFor` to label before accessibility audit

## Deferred from: code review of context-scoping fix (2026-04-13)

- **`route_query` and `validate_query` are context-blind** — `api/routers/query.py:39,71` — both receive only the last user message; ambiguous follow-ups (e.g. "what enablers are behind") may misroute if the subject is implicit from prior turns; fix by passing last N messages as context string to both functions and updating `router.md` / `validator.md` templates

## Deferred from: code review of date-injection (2026-04-13)

- **Triple duplicate `return` block in `generate_headlines`** — `api/services/narrative_service.py:164–173` — pre-existing; lines 164–173 are unreachable dead code; delete the two extra return blocks

## Deferred from: code review of 3-2-ai-narrative-headlines-and-suggested-interrogations (2026-04-10)

- **No response size cap before json.loads** — `narrative_service.py:69` — runaway LLM response parsed in full; add max-size guard before Epic 2 when real data wires in
- **No rate-limiting or auth on GET /api/headlines/{bu}** — Vercel Access handles auth; add per-IP throttling before public exposure
- **Case-sensitive BU path parameter** — `/api/headlines/Phosphate` returns 404 with no hint; consider normalising to lowercase or adding a clear error message
- **Headline ≤25 words not validated in code** — system prompt only; if LLM drift becomes an issue, add word-count assertion post-parse
- **AC2 interrogation scope not validated in code** — prompt-enforced only; could add keyword blocklist check post-parse if hallucinated questions become a problem
- **No startup validation for LLM_API_KEY** — `RuntimeError` surfaces on first call rather than at boot; add a startup event check in `api/index.py`
