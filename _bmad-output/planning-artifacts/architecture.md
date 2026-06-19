---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-04-09'
lastUpdated: '2026-04-15'
updateReason: 'Backfill prompt/runtime governance: concise response contract, raw-file citations, corroboration/conflict rules, consolidation-first agent loop, Opus default model'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/product-brief-neom_demo.md
  - _bmad-output/planning-artifacts/product-brief-neom_demo-distillate.md
  - _bmad-output/planning-artifacts/implementation-readiness-report-2026-04-09.md
  - _bmad-output/planning-artifacts/validation-report-2026-04-09.md
  - _bmad-output/planning-artifacts/validation-report-2026-04-10.md
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-04-13.md
workflowType: 'architecture'
project_name: 'neom_demo'
user_name: 'BCG'
date: '2026-04-09'
---

# Architecture Decision Document

_Updated 2026-04-13 to reflect sprint pivot to MSE automation platform. See sprint-change-proposal-2026-04-13.md for full change rationale._

---

## Project Context Analysis

### Requirements Overview

**Product Vision (updated):**
NEOM Strategy Execution AI — automate, challenge, and improve the Monthly Strategy Execution (MSE) review process. Two components: (1) a static dashboard mock that replicates the MSE PowerPoint structure, and (2) an AI chat interface backed by an orchestrator/classifier routing to five specialist agent contexts.

**Functional Requirements:**

_Preserved from prior scope:_
- **Data Ingestion:** XER schedule files and XLS financial model parsed without redeployment; schema versioned via Pydantic
- **Chat Interface:** Streaming query bar; conversation history per session; suggested questions
- **Platform & Navigation:** LLM provider switchable via env var (`LLM_MODEL`) with zero code change; routing between MSE dashboard and chat views

_New / changed:_
- **Static MSE Dashboard:** Dashboard renders MSE-equivalent content (KPI status, initiative tracking, BU performance) from `mse_state.json` — no live data pipeline; no API call from frontend to backend for dashboard
- **Orchestrator:** Classifies incoming question → selects one of five agent contexts; agent identity surfaced in first SSE event ("Answered by DELIVERY ENGINE")
- **DELIVERY ENGINE:** Schedule/velocity questions answered using XER-derived tools (`get_project_schedule`, `get_delay_impact`)
- **VALUE LENS:** Financial questions answered using XLS-derived CSV tools (`get_financial_model`, `get_ebitda_projection`)
- **RISK RADAR:** Risk questions answered via ChromaDB RAG + scoped system prompt
- **GAP FINDER:** Performance gap questions answered via ChromaDB RAG + scoped system prompt
- **ACTION DESK:** Action/recommendation questions answered via ChromaDB RAG + scoped system prompt
- **Local-first:** System runs fully locally — `pnpm dev` (frontend) + `uvicorn api.main:app` (backend)
- **Response governance:** Answers are concise by default, cite original raw files, treat strategy documents as conditional context, surface ambiguity explicitly, and attempt consolidation before returning `not_supported`

_Removed from scope:_ What-if scenario engine, action recommendation cards, PIF generation, agent menu with user-selectable agents, confidence traffic light (universal), TTS/voice, iPad as primary optimization target.

**Architecturally critical requirements:**
- Orchestrator misclassification is a silent failure — must default gracefully to most applicable agent (ACTION DESK)
- LLM arithmetic prohibition: Python owns all numbers in tool-based agents; LLM narrates only
- Data files replaceable without redeployment; schema versioned
- LLM provider switchable via env var only (no code change)
- Dashboard independence: MSE dashboard must render without backend running (static JSON)

**Non-Functional Requirements:**
- Performance: <3s cold load (dashboard), <3s first token streaming (chat)
- Security: No in-app auth; secrets via env vars only; no runtime data persistence; no external SDK data leakage
- Integration: Provider-agnostic LLM throughout; GCP backend callable from Vercel frontend
- Reliability: Dashboard survives backend outage (static JSON); agent failures return explicit error, never silent
- Local-first: Full system starts with two commands; no cloud dependency for development

### Technical Constraints & Dependencies

- **Stack:** Next.js App Router + Tailwind CSS v4 with `--ma-*`/`--ai-*` token system + IBM Plex Sans (frontend); FastAPI + Python 3.12 (backend); LiteLLM for provider-agnostic LLM calls. Design language is NEOM Industrial Mineral (warm stone/charcoal/gold/teal). See `_bmad-output/planning-artifacts/design-system.md`.
- **Frontend deployment:** Vercel — GitHub auto-deploy on push to `main`
- **Backend deployment:** GCP Cloud Run (production) / local Uvicorn (development). **Not** Vercel Python serverless.
- **No database:** File-based data layer; `data_extract/` is the single source of truth; read-only at runtime
- **ChromaDB:** Local, file-based vector store at `data_extract/chroma_db/` — rebuilt from source PDFs at backend startup; gitignored
- **LLM arithmetic prohibition:** Python owns all numbers in tool-based agents — no exceptions. LLM role is parsing and narration only.
- **No in-app auth:** No login screen, no RBAC, no per-user state. Vercel Access secures the frontend URL.
- **No external SDKs:** No analytics, logging, or telemetry SDKs.
- **Branding:** NEOM Industrial Mineral — charcoal nav (`#1a1c1b`), warm stone page bg (`#f4f1ea`), mineral gold accent (`#b8956a`), teal data/CTAs (`#2d6a66`), AI chrome (`#0e0f10`). Font: IBM Plex Sans. Full spec in `_bmad-output/planning-artifacts/design-system.md`.
- **3-day / 3-person constraint:** Epic parallelism is an architectural requirement, not a preference.

### Cross-Cutting Concerns Identified

1. **LLM provider abstraction** — LiteLLM interface enforced throughout; single `llm_client.py` module; switching provider = changing `LLM_MODEL` env var only. Default model is `anthropic/claude-opus-4-6` unless overridden.
2. **Calculation/narration boundary** — Hard separation between Python (numbers) and LLM (language) in all tool-based agents; interface contract: tool returns structured dict, LLM narrates it
3. **Orchestrator routing contract** — Single `/api/query` endpoint; orchestrator classifies question → selects agent id → calls agent module; agent id returned in first SSE event before any tokens
4. **Agent interface contract** — Each agent module in `api/services/agents/` exposes one async generator function: `async def run(question: str, context: list) -> AsyncGenerator[str, None]`. Orchestrator calls it uniformly regardless of agent type.
5. **Dashboard independence** — MSE dashboard reads `data_extract/mse_mock/mse_state.json` directly via Next.js Server Component `fs.readFile`; zero API calls to backend; renders even if backend is down
6. **Demo stability** — Cold load performance, visible loading states, zero error surfaces are demo-critical; must be architectural concerns, not afterthoughts
7. **Schema versioning** — Pydantic models in `api/schemas/` are the canonical contract; breaking change = new model version; backward-compat in parser
8. **Response trust contract** — User-facing answers cite original raw files rather than tools or processed artefacts, stay concise by default, use confidence/ambiguity sections only when relevant, and explicitly call out corroboration or source conflicts using the Data Catalogue authority hierarchy
9. **Consolidation-first degradation** — On empty-content or max-round exhaustion paths, the agent loop makes one consolidation attempt with gathered evidence before emitting `not_supported`

---

## Starter Template Evaluation

### Primary Technology Domain

Full-stack enterprise web app + agentic AI backend.
Frontend: professional React UI (thin rendering layer), deployed to Vercel.
Backend: Python business logic and AI orchestration, running locally or on GCP Cloud Run.

### Starter Options Considered

| Option | Assessment | Verdict |
|--------|-----------|---------|
| `create-next-app` v16.2.3 + FastAPI | Clean Next.js frontend + FastAPI backend; local-first, GCP Cloud Run for production | **Selected** |
| Vercel AI Chatbot (`vercel/chatbot`) | Bundles Neon Postgres, NextAuth, chat sessions — all out-of-scope | Rejected |
| Pure Python (Streamlit/Gradio) | Cannot achieve "extremely professional" executive UI | Rejected |

### Selected Starter: create-next-app + FastAPI (GCP Cloud Run backend)

**Rationale:** FastAPI + Uvicorn runs identically locally and in GCP Cloud Run — zero environment delta. LiteLLM provides provider-agnostic LLM access. Next.js App Router + custom NEOM design system provides the executive UI layer.

**Frontend Initialization:**

```bash
npx create-next-app@latest neom-demo \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --import-alias "@/*"
```

**Backend Initialization:**

```
# requirements.txt
fastapi
uvicorn[standard]
litellm
pydantic
python-multipart
xerparser
pandas
openpyxl
chromadb
sentence-transformers
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:** TypeScript (frontend) + Python 3.12 (backend). No JavaScript in backend. No Python in frontend.

**Styling:** Tailwind CSS v4 (`@import "tailwindcss"` + `@theme inline`) with custom `--ma-*` / `--ai-*` CSS variable token system. No `tailwind.config.ts`. See design-system.md.

**Build Tooling:** Frontend: Turbopack (dev), `next build` (production). Backend: Uvicorn (local), GCP Cloud Run (production).

**LLM Provider Abstraction:** LiteLLM in `api/services/llm_client.py`. All LLM calls route through this module. `LLM_MODEL` + `LLM_API_KEY` env vars — zero code change to switch provider. Default `LLM_MODEL` is `anthropic/claude-opus-4-6`.

**Streaming:** FastAPI `StreamingResponse` (SSE) → Next.js `fetch` with `ReadableStream` → React streaming UI.

**Frontend → Backend API Calls (MANDATORY):** Every `fetch` call to the backend MUST use these two env vars:
```ts
fetch(`${process.env.VITE_API_BASE_URL || ""}/api/<endpoint>`, {
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.VITE_BACKEND_API_KEY || "",
  },
  ...
})
```
- `VITE_API_BASE_URL` — backend URL. Empty in local dev (falls back to relative URL, proxied to localhost:8000 by `next.config.ts`). Set to Cloud Run URL in production via Vercel env var.
- `VITE_BACKEND_API_KEY` — API key sent as `x-api-key` header. Backend middleware rejects requests without a valid key.
- **Never hardcode `/api/query` as a relative URL** — it will 404 on Vercel since there's no backend there.

**Testing:** pytest for Python backend. Not configured for frontend (POC scope).

---

## Core Architectural Decisions

### POC Constraint — Complexity Budget

**3 working days. 3 people. Walking skeleton first.** Every architectural decision is subject to this override: if a component isn't on screen and interactive by end of Day 1, it's too complex for the POC phase. The static dashboard mock and the orchestrator shell are the Day 1 deliverables.

**Simplification hierarchy:**
1. MSE dashboard mock renders on screen (Day 1 — static JSON, no backend)
2. Orchestrator shell routes questions to an agent (Day 1–2 — hardcoded responses acceptable)
3. DELIVERY ENGINE + VALUE LENS answer with real data (Day 2)
4. RAG agents respond coherently (Day 2–3)
5. GCP deployment + smoke test (Day 3)

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Orchestrator: LLM classifier prompt; fallback to ACTION DESK when unclassified
- Data layer: XER + XLS for tool-based agents; ChromaDB for RAG agents
- Streaming: FastAPI `StreamingResponse` → client-side `ReadableStream`
- Agent interface contract: uniform `run(question, context)` signature across all five agents

**Important Decisions (Shape Architecture):**
- Dashboard: static JSON — zero API dependency; renders via Server Component `fs.readFile`
- RAG corpus: `data_extract/knowledge_base/` PDFs indexed at startup; no index = empty retrieval, not an error
- Orchestrator routing: keyword hints + LLM classifier hybrid; graceful fallback
- Agent system prompts: scoped to agent domain; cannot answer outside domain (explicit "I can't help with that" preferred over hallucination)

**Deferred Decisions (Post-POC):**
- External vector DB (ChromaDB → Pinecone/Weaviate)
- Neural re-ranking for RAG retrieval
- Role-based data access
- Phone-breakpoint responsiveness (out of scope)

### Data Architecture

**Two-track data layer:**

| Track | Source Types | Parser | Consumer | POC Priority |
|-------|-------------|--------|----------|-------------|
| A — Structured | XER (Primavera), XLS (financial model) | `xerparser`, `pandas`/`openpyxl` | DELIVERY ENGINE, VALUE LENS | Day 2 |
| B — Unstructured | PDF (strategy docs, reports) | `chromadb` + `sentence-transformers` | RISK RADAR, GAP FINDER, ACTION DESK | Day 2–3 |
| C — Static mock | JSON | Direct `fs.readFile` in Next.js Server Component | MSE dashboard | Day 1 |

**Track B (ChromaDB) configuration:**
- Store: `data_extract/chroma_db/` — persisted, gitignored, rebuilt by `scripts/build_chroma_index.py`
- Model: `sentence-transformers/all-MiniLM-L6-v2` (~22MB, no external service)
- Retrieval: cosine similarity, top-k chunks passed as LLM context
- Index absent = empty retrieval → agent responds from system prompt only; not a crash

**Track A source files:**
- XER: `data_extract/project_schedules/{bu}/` — V18 (current), V16 (baseline)
- XLS: `data_extract/strategy/financial_model/` — EBITDA, capex, production 2025–2040

**KPI threshold configuration** (retained for potential agent tool use):
- Location: `api/config/thresholds.json`
- Update path: edit file → restart backend (no code change)

### Authentication & Security

- Vercel Access secures the frontend URL at infrastructure level
- FastAPI runs locally (no auth) or on GCP Cloud Run (service account; `LLM_API_KEY` via GCP Secret Manager or env)
- All secrets in `.env` locally; GCP env vars in Cloud Run service configuration; never committed
- No session persistence; no data written at runtime (ChromaDB index is read-only after startup)

### API & Communication Patterns

**FastAPI REST + SSE — minimal surface:**
- `POST /api/query` — orchestrated streaming chat (`StreamingResponse` SSE)
- `GET /api/health` — health check (used by GCP Cloud Run readiness probe)

All agent logic is internal — no per-agent HTTP endpoints. The orchestrator selects and calls the agent module directly inside the `/api/query` handler.

**Streaming SSE format — `/api/query`:**

```
data: {"type": "agent", "agent_id": "delivery_engine", "content": "Delivery Engine"}\n\n
data: {"type": "thinking", "content": "Loading project schedule overview..."}\n\n
data: {"type": "token", "content": "Phosphate"}\n\n
data: {"type": "done", "content": ""}\n\n
data: {"type": "not_supported", "content": "..."}\n\n
data: {"type": "error", "content": "Provider unavailable"}\n\n
```

Event types:
- `agent` — first event on successful routed answers; carries `agent_id` and display content; frontend renders "Answered by {label}" badge
- `thinking` — progress message during tool use or consolidation
- `token` — streaming text content
- `done` — response complete; no additional fields required
- `not_supported` — terminal scope or evidence failure after guardrails/consolidation
- `error` — terminal error; display inline, do not crash UI

Frontend reads `type` to determine rendering. Six event types — no extensions without updating this spec.

**Error contract:** All non-streaming errors return `{"error": "message", "code": "ERROR_CODE"}`. Never empty responses, never silent HTTP 500s.

**ChatRequest shape:**
```python
class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []   # [{role, content}] — last N turns only
```

### Frontend Architecture

**State management:** Zustand (`lib/shellStore.ts`) for AI sidebar/chat state. React `useState` for local component state only.

Key Zustand state:
- `chatOpen: boolean`
- `activeAgent: AgentId | null`       # set from first SSE 'agent' event
- `aiPhase: "idle" | "streaming" | "done" | "error"`

**Data fetching:**
- MSE dashboard: Next.js Server Component reads `data_extract/mse_mock/mse_state.json` via `fs.readFile` at request time — no fetch, no API
- Chat: client-side `fetch` to `/api/query` with streaming — preserves interactivity

**Component library:** Custom `--ma-*` / `--ai-*` token system via Tailwind v4 utilities. Recharts for any charts in MSE mock. All chart/interactive components are client components. Layout and MSE mock are server components. See design-system.md.

### LLM Integration Architecture

**Orchestrator + five-agent model:**

| Component | Pattern | Data Access | Depth |
|-----------|---------|-------------|-------|
| Orchestrator | Classifier prompt → agent id | None | Full |
| DELIVERY ENGINE | Tool-calling agent | XER via `schedule_tools.py` | Full |
| VALUE LENS | Tool-calling agent | XLS/CSV via `financial_tools.py` | Full |
| RISK RADAR | RAG prompt | ChromaDB retrieval | Standard |
| GAP FINDER | RAG prompt | ChromaDB retrieval | Standard |
| ACTION DESK | RAG prompt | ChromaDB retrieval | Standard |

**Orchestrator classifier:**
System prompt scoped to question routing only. Input: user question. Output: one of `["DELIVERY_ENGINE", "VALUE_LENS", "RISK_RADAR", "GAP_FINDER", "ACTION_DESK"]`. If LLM returns ambiguous output → default `ACTION_DESK`. Classifier is a single non-streaming LLM call before the agent streaming begins.

**Agent interface contract:**
```python
# All agents in api/services/agents/ must implement this signature:
async def run(
    question: str,
    history: list[dict],
) -> AsyncGenerator[str, None]:
    ...
```
Orchestrator calls `agent_module.run(question, history)` and pipes output tokens to SSE. No agent-specific branching in the router.

**Tool-based agents (DELIVERY ENGINE + VALUE LENS):**
LiteLLM tool-calling pattern. Tools defined in `api/services/tools/`. Python executes tool → returns structured dict → LLM narrates. LLM never generates numerical values. Tool returns `{"error": "...", "code": "DATA_MISSING"}` on failure → agent narrates data unavailability.

**RAG agents (RISK RADAR + GAP FINDER + ACTION DESK):**
ChromaDB cosine retrieval (top-k chunks) → assembled into LLM context. System prompt scoped to agent domain. Agent responds from context only — explicit "I don't have information on that" when context is empty, never hallucinated.

**LLM arithmetic prohibition:** Python owns all numbers. LLM narrates only. Zero LLM-generated financial values or percentages anywhere.

### Infrastructure & Deployment

**Frontend (Vercel):**
- Platform: Vercel — GitHub auto-deploy on push to `main`
- Package manager: `pnpm`
- Environment variables: `NEXT_PUBLIC_API_URL` (GCP Cloud Run URL in production; unused in local dev as next.config.ts proxy handles it)
- `vercel.json`: frontend configuration only — no Python runtime entries

**Backend (local + GCP Cloud Run):**
- Local dev: `uvicorn api.main:app --reload --port 8000`
- Production: GCP Cloud Run — Docker container, `PORT` env var, `api.main:app`
- Python version: 3.12 (`.python-version` file)
- Dockerfile: standard Python 3.12-slim image, `CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8080"]`
- Environment variables: `.env` locally; GCP Secret Manager or Cloud Run env vars in production — `LLM_MODEL`, `LLM_API_KEY`

**Local dev topology:**
```
pnpm dev                                          # Next.js on :3000 (Turbopack)
uvicorn api.main:app --reload --port 8000         # FastAPI on :8000
```

**next.config.ts dev proxy** (local only):
```typescript
async rewrites() {
  return process.env.NODE_ENV === 'development'
    ? [{ source: '/api/:path*', destination: 'http://localhost:8000/api/:path*' }]
    : []
}
```
In production (Vercel), frontend calls `NEXT_PUBLIC_API_URL` directly — no proxy.

**CORS:** `CORSMiddleware` in `api/main.py` allows `https://<vercel>.vercel.app` and `http://localhost:3000`.

**vercel.json** (frontend only — no Python runtime config):
```json
{}
```
Plain Next.js deployment; Vercel auto-detects the framework.

### Decision Impact Analysis

**Implementation sequence (3-day parallel workstreams):**

| Day | Person | Focus | Deliverable |
|-----|--------|-------|-------------|
| 1 | 1 | Epic 7: Static MSE dashboard mockup integration | MSE dashboard renders in Next.js shell |
| 1–2 | 2 | Epic 3 shell → Epic 4 orchestrator + chat UI | Chat window routes question to correct agent; agent badge appears |
| 2 | 3 | Epic 5: DELIVERY ENGINE + VALUE LENS (tool-based) | Schedule and financial questions answered with real XER/XLS data |
| 2–3 | 2 | Epic 6: RAG agents (RISK RADAR + GAP FINDER + ACTION DESK) | All 5 agents respond coherently |
| 3 | All | Epic 8: GCP Cloud Run + local smoke test | System runs on GCP + `pnpm dev` + `uvicorn` |

**Cross-Component Dependencies:**
- XER + XLS parsers must be complete before DELIVERY ENGINE and VALUE LENS tools can be tested
- ChromaDB index must be pre-built (`scripts/build_chroma_index.py`) before RAG agents activate
- Orchestrator classifier must be callable before any agent integration test
- `api/main.py` skeleton must be deployed locally before any epic beyond Epic 7 can proceed

---

## Implementation Patterns & Consistency Rules

### Overriding Principles (apply to every file written)

**Simplicity is a hard constraint, not a nice-to-have.**
- A file that does one thing clearly beats a file that does three things cleverly
- If a function needs a comment to be understood, rewrite the function
- No commented-out code — delete it, git has history
- No TODO comments in committed code — they become permanent fixtures
- Flat is better than nested: max 2 levels of indentation in business logic; refactor if you need a third
- No class hierarchies for a 3-day POC — plain functions and Pydantic models cover everything

**File size limit:** ~150 lines. If a file exceeds this, it is doing too much. Split it.

---

### Naming Patterns

**Language boundary rule — the most critical convention:**
Python backend uses `snake_case` natively. TypeScript frontend uses `camelCase`.
API JSON responses are `snake_case` (Python native — no serialization transform).
TypeScript code accepts `snake_case` from the API directly. Convert to `camelCase` only at the React component prop boundary.

```
API JSON:       { "agent_id": "DELIVERY_ENGINE", "bu_code": "phosphate" }
TS fetch layer: response.agent_id          ← accept as-is
React prop:     agentId={response.agent_id}  ← convert only here
```

**BU identifiers — locked values:**

| Code (URLs / data keys) | Display label |
|------------------------|--------------|
| `phosphate` | Phosphate |
| `aluminum` | Aluminum |
| `gold` | Gold |
| `copper` | Copper |

Never: `Phosphate`, `PHOSPHATE`, `phos`, `alum`. Lowercase in code; title-case in rendered UI only.

**Agent identifiers — locked values:**

| ID (internal) | Display label |
|--------------|--------------|
| `DELIVERY_ENGINE` | Delivery Engine |
| `VALUE_LENS` | Value Lens |
| `RISK_RADAR` | Risk Radar |
| `GAP_FINDER` | Gap Finder |
| `ACTION_DESK` | Action Desk |

**File naming:**
- Python: `snake_case.py` — `orchestrator.py`, `delivery_engine.py`
- React components: `PascalCase.tsx` — `AgentBadge.tsx`, `MseDashboard.tsx`
- TypeScript utilities: `camelCase.ts` — `useStream.ts`, `apiClient.ts`

**API endpoints:** plural nouns or action verbs, lowercase: `/api/query`, `/api/health`

---

### Structure Patterns

**Python — thin routers, logic in services:**
```
api/routers/chat.py              ← validate input, call orchestrator, stream response (~40 lines)
api/services/orchestrator.py     ← classify question → agent id (~50 lines)
api/services/agents/delivery_engine.py  ← tool-calling agent logic (~100 lines)
```

Routers contain zero business logic. Orchestrator selects the agent and calls it. Agents contain all domain logic.

**Agent modules — one agent per file:**
Each file in `api/services/agents/` implements one async generator function named `run`. No shared state between agents. Tools are imported from `api/services/tools/`.

**LLM tools — all in one place:**
All tool functions live in `api/services/tools/`. One file per domain. Registered in `api/services/tools/__init__.py`. Never inline in agents or routers.

```
api/services/tools/schedule_tools.py     ← get_project_schedule(), get_delay_impact()
api/services/tools/financial_tools.py   ← get_financial_model(), get_ebitda_projection()
api/services/tools/__init__.py          ← TOOL_REGISTRY = [...]
```

**React components — one concern per file:**
```
components/mse/KpiStatusPanel.tsx       ← renders KPI status grid from JSON
components/chat/QueryBar.tsx            ← streaming chat input + output
components/chat/AgentBadge.tsx          ← "Answered by {label}" badge
```

No mega-components combining layout, data fetching, and rendering in one file.

---

### Format Patterns

**API success response — direct data, no envelope:**
```json
{ "agent": "DELIVERY_ENGINE", "content": "..." }
```

**API error response — always this exact shape:**
```json
{ "error": "Classifier failed to select agent", "code": "ROUTING_FAILURE" }
```

HTTP status: 200 success, 400 bad input, 404 not found, 500 server fault. Never HTTP 200 with an error in the body.

**Streaming SSE format — `/api/query` only:**
```
data: {"type": "agent", "agent_id": "delivery_engine", "content": "Delivery Engine"}\n\n
data: {"type": "thinking", "content": "Loading project schedule overview..."}\n\n
data: {"type": "token", "content": "Phosphate"}\n\n
data: {"type": "done", "content": ""}\n\n
data: {"type": "not_supported", "content": "..."}\n\n
data: {"type": "error", "content": "Provider unavailable"}\n\n
```

Frontend reads `type` to determine rendering. The `agent` event is first on successful routed answers. Six event types — no extensions without updating this spec.

**Financial values:** SAR billions as `float` to 1 decimal (`12.4`). Units in metadata, never in value strings.

**Dates:** ISO 8601 (`2025-03-01`). Periods: `YYYY-QN` or `YYYY-MM`. Display formatting is a frontend concern only.

---

### Process Patterns

**Error handling — Python:**
```python
raise HTTPException(status_code=404, detail={"error": "...", "code": "DATA_NOT_FOUND"})
# Never: bare except, silent pass, returning None from a function that can fail
```

**Error handling — TypeScript:**
All `fetch` calls in try/catch. On error: set local error state, render inline message. MSE dashboard must remain visible even if chat API fails.

**Loading states — three values only:** `idle` | `streaming` | `error`

**Walking skeleton rule — for every new feature:**
1. Return hardcoded data from the endpoint
2. Render it in the UI
3. Replace with real logic
4. Add LLM layer last

Never build LLM orchestration before the data pipeline is validated.

---

## Agent Tools Architecture

### DELIVERY ENGINE Tools (Track A — XER)

**Source files:**
- `data_extract/project_schedules/{bu}/` V18.xer (current), V16.xer (baseline)

**Service files:**
```
api/services/parsers/xer_parser.py            ← parse_xer(bu_code, version) → list[ActivityDict]
api/services/tools/schedule_tools.py          ← tool functions registered in TOOL_REGISTRY
```

**Tool functions:**
```python
def get_project_schedule(bu_code: str) -> dict:
    """V18 parsed activities for the BU. V16 included as 'baseline' sub-key."""

def get_delay_impact(bu_code: str, activity_id: str, delay_quarters: int) -> dict:
    """Propagates schedule slip → affected activities + estimated timeline shift."""
```

**Error contract:** Both functions return `{"error": "...", "code": "DATA_MISSING"}` if source file absent — no exception propagates to agent. Agent narrates data unavailability.

**File size limits:** `xer_parser.py` ≤ 150 lines, `schedule_tools.py` ≤ 100 lines.

---

### VALUE LENS Tools (Track A — XLS)

**Source file:**
- `data_extract/strategy/financial_model/` — EBITDA, capex, production 2025–2040

**Service files:**
```
api/services/parsers/financial_model_parser.py ← parse_financial_model(bu_code, metric) → dict
api/services/tools/financial_tools.py          ← tool functions registered in TOOL_REGISTRY
```

**Tool functions:**
```python
def get_financial_model(bu_code: str, metric: str) -> dict:
    """metric: 'ebitda' | 'capex' | 'production'. Returns {year: value} for 2025–2040."""

def get_ebitda_projection(bu_code: str, scenario: str = "base") -> dict:
    """Returns EBITDA projection series for the BU under named scenario."""
```

**Error contract:** Same as schedule tools — `DATA_MISSING` on absent file, never an exception.

**File size limits:** `financial_model_parser.py` ≤ 150 lines, `financial_tools.py` ≤ 100 lines.

---

### RAG Agents (Track B — ChromaDB)

**Source files:** `data_extract/knowledge_base/` — PDFs (strategy docs, earnings calls, annual reports)

**ChromaDB corpus (POC scope — skip everything else):**
- `strategy/` — all subfolders (high-signal)
- `investor_relations/earnings_calls/2022–2025` — recent quarters
- `investor_relations/annual_reports/2024`, `2023`, `2022` — last 3 years
- **Skip:** `investor_relations/annual_reports/2011–2021` (low signal for 2026 demo)
- **Skip:** `investor_relations/news_announcements/` (context noise)

**Service file:**
```
api/services/rag.py   ← load_chroma_collection(), retrieve(query, k=5) → list[str]
```

**Agent pattern (same for RISK RADAR, GAP FINDER, ACTION DESK):**
```python
async def run(question: str, history: list[dict]) -> AsyncGenerator[str, None]:
    chunks = rag.retrieve(question, k=5)
    context = "\n---\n".join(chunks)
    system_prompt = AGENT_SYSTEM_PROMPT  # domain-scoped, defined in this file
    async for token in llm_client.stream(system_prompt, context, question, history):
        yield token
```

**Index absent behavior:** `retrieve()` returns empty list → agent responds from system prompt only. Not a crash. User sees a coherent (if thin) response.

---

## Project Structure & Boundaries

### Complete Project Directory

```
neom-demo/
├── .env.example
├── .gitignore
├── Dockerfile                                    # GCP Cloud Run backend
├── next.config.ts                                # Dev proxy rewrites (development only)
├── package.json
├── pnpm-lock.yaml
├── requirements.txt
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json                                   # Frontend only — no Python runtime config
│
├── app/                                          # Next.js App Router
│   ├── globals.css                               # NEOM palette tokens
│   ├── layout.tsx                                # Root layout
│   ├── page.tsx                                  # Redirects → /dashboard/mse
│   └── dashboard/
│       ├── layout.tsx                            # Shell (sidebar + topbar)
│       ├── mse/
│       │   └── page.tsx                          # Static MSE dashboard mock (Epic 7)
│       └── chat/
│           └── page.tsx                          # AI chat interface (Epics 3 + 4)
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx                           # Navigation (MSE + Chat)
│   │   └── TopBar.tsx                            # Period + filter bar
│   ├── mse/                                      # Static MSE dashboard (Epic 7)
│   │   ├── MseLayout.tsx                         # Overall MSE page layout
│   │   ├── KpiStatusPanel.tsx                    # KPI status grid from mse_state.json
│   │   ├── InitiativeTracker.tsx                 # Initiative status list
│   │   └── BuPerformancePanel.tsx                # BU performance summary
│   └── chat/                                     # AI chat (Epics 3 + 4)
│       ├── QueryBar.tsx                          # Streaming chat input + output (Epic 3)
│       ├── AgentBadge.tsx                        # "Answered by {label}" badge (Epic 4)
│       └── SuggestedQuestions.tsx                # Suggested question chips (Epic 3)
│
├── lib/
│   ├── api.ts                                    # Typed fetch wrapper for /api/chat
│   ├── stream.ts                                 # SSE reader (agent/token/done/error)
│   └── types.ts                                  # AgentId, ChatMessage, MseState…
│
├── api/                                          # FastAPI backend
│   ├── main.py                                   # FastAPI app + router registration + CORS
│   ├── routers/
│   │   ├── query.py                              # POST /api/query (orchestrated SSE)
│   │   └── health.py                             # GET /api/health
│   ├── services/
│   │   ├── orchestrator.py                       # Classifier: question → agent id
│   │   ├── agents/
│   │   │   ├── __init__.py                       # AGENT_REGISTRY: id, label, type
│   │   │   ├── delivery_engine.py                # DELIVERY ENGINE: XER tool-calling
│   │   │   ├── value_lens.py                     # VALUE LENS: XLS/CSV tool-calling
│   │   │   ├── risk_radar.py                     # RISK RADAR: ChromaDB RAG
│   │   │   ├── gap_finder.py                     # GAP FINDER: ChromaDB RAG
│   │   │   └── action_desk.py                    # ACTION DESK: ChromaDB RAG
│   │   ├── parsers/
│   │   │   ├── xer_parser.py                     # Primavera XER → list[ActivityDict]
│   │   │   └── financial_model_parser.py         # Excel → dict[year, value]
│   │   ├── rag.py                                # ChromaDB load + cosine retrieval
│   │   ├── llm_client.py                         # LiteLLM wrapper — single import point
│   │   └── tools/
│   │       ├── __init__.py                       # TOOL_REGISTRY list
│   │       ├── schedule_tools.py                 # get_project_schedule(), get_delay_impact()
│   │       └── financial_tools.py                # get_financial_model(), get_ebitda_projection()
│   ├── schemas/
│   │   ├── requests.py                           # ChatRequest
│   │   └── responses.py                          # AgentEvent, StreamToken, DoneEvent
│   └── config/
│       ├── agents.json                           # Agent definitions: id, label, domain keywords
│       └── thresholds.json                       # KPI thresholds (retained for tool use)
│
├── data_extract/                                 # Source data — read-only at runtime
│   ├── mse_mock/
│   │   └── mse_state.json                        # Static MSE dashboard data
│   ├── project_schedules/                        # XER files per BU
│   ├── strategy/
│   │   └── financial_model/                      # XLS financial model
│   └── knowledge_base/                           # PDFs indexed by ChromaDB
│       └── .chromadb/                            # ChromaDB persistent store (gitignored)
│
├── scripts/
│   └── build_chroma_index.py                     # Index knowledge_base/ PDFs (run once before dev)
│
└── tests/
    ├── test_orchestrator.py
    ├── test_delivery_engine.py
    └── test_value_lens.py
```

### Architectural Boundaries

**The three hard boundaries — never cross these:**

| Boundary | Rule |
|----------|------|
| Data access | Only `api/services/parsers/` and `api/services/rag.py` read from `data_extract/` |
| LLM access | Only `api/services/llm_client.py` imports LiteLLM |
| Tool definitions | Only `api/services/tools/` defines tool functions |

**Frontend ↔ Backend:** HTTP REST + SSE over `/api/*`. Frontend never imports from `api/`. Backend never imports from `app/` or `components/`.

**Service ↔ Router:** Routers are thin HTTP adapters. All logic in services. A router exceeding ~40 lines is absorbing service logic — fix it.

**MSE dashboard ↔ Backend:** MSE dashboard reads static JSON via `fs.readFile` — no HTTP call to backend. This boundary must be maintained; do not introduce an API call to load the MSE dashboard.

### Requirements → Files Mapping

| Requirement | File(s) |
|-------------|---------|
| Static MSE dashboard | `data_extract/mse_mock/mse_state.json`, `components/mse/`, `app/dashboard/mse/page.tsx` |
| Chat shell (query bar) | `api/routers/chat.py`, `components/chat/QueryBar.tsx` |
| Orchestrator/classifier | `api/services/orchestrator.py`, `api/config/agents.json` |
| DELIVERY ENGINE | `api/services/agents/delivery_engine.py`, `api/services/tools/schedule_tools.py`, `api/services/parsers/xer_parser.py` |
| VALUE LENS | `api/services/agents/value_lens.py`, `api/services/tools/financial_tools.py`, `api/services/parsers/financial_model_parser.py` |
| RISK RADAR + GAP FINDER + ACTION DESK | `api/services/agents/{risk_radar,gap_finder,action_desk}.py`, `api/services/rag.py` |
| Agent identity in response | `api/routers/chat.py` (first SSE event), `components/chat/AgentBadge.tsx` |
| Navigation/platform | `app/dashboard/layout.tsx`, `components/layout/Sidebar.tsx` |
| LLM provider switching | `api/services/llm_client.py`, `LLM_MODEL` env var |
| Data ingestion (XER, XLS) | `api/services/parsers/` |
| GCP Cloud Run deployment | `Dockerfile`, `api/main.py` |

### Data Flow

```
data_extract/mse_mock/mse_state.json
      ↓ (fs.readFile — no HTTP)
app/dashboard/mse/page.tsx → components/mse/
      (MSE dashboard — fully static)

data_extract/project_schedules/ + strategy/financial_model/
      ↓
api/services/parsers/ (xer_parser, financial_model_parser)
      ↓
api/services/tools/ (schedule_tools, financial_tools)
      ↓ (tool-calling)
api/services/agents/ (delivery_engine, value_lens)
      ↑
data_extract/knowledge_base/
      ↓
api/services/rag.py (ChromaDB retrieval)
      ↓
api/services/agents/ (risk_radar, gap_finder, action_desk)

All agents:
      ↓
api/services/llm_client.py + LiteLLM
      ↓
api/services/orchestrator.py (selects agent)
      ↓
api/routers/chat.py (SSE StreamingResponse)
      ↓
lib/api.ts + lib/stream.ts (frontend fetch layer)
      ↓
components/chat/ (streaming render + AgentBadge)
```

### Development Workflow

**Local dev (two terminals):**
```bash
pnpm dev                                          # Next.js on :3000 (Turbopack)
uvicorn api.main:app --reload --port 8000         # FastAPI on :8000
```

**Build ChromaDB index (once, before first dev run):**
```bash
python scripts/build_chroma_index.py
```

**GCP Cloud Run deploy:**
```bash
docker build -t neom-api .
docker tag neom-api gcr.io/{PROJECT_ID}/neom-api
docker push gcr.io/{PROJECT_ID}/neom-api
gcloud run deploy neom-api --image gcr.io/{PROJECT_ID}/neom-api --region {REGION}
```

---

## Architecture Validation Results

### Coherence Validation

**Decision compatibility:** All technology choices are mutually compatible.
Next.js 16 + FastAPI (Python 3.12) + LiteLLM + Tailwind + Vercel frontend + GCP Cloud Run backend — no version conflicts. ChromaDB + sentence-transformers (~22MB) runs locally and in Docker. LiteLLM is async-compatible with FastAPI.

**Pattern consistency:** snake_case/camelCase boundary rule consistent with Python and TypeScript idioms. SSE format consistent with FastAPI `StreamingResponse` and browser `ReadableStream`. Agent interface contract uniform across all five agent types.

**Structure alignment:** Directory structure maps cleanly to all layers: frontend (app/components/lib), API routing, orchestration, agent services, parsers, tools, schemas, config.

### Requirements Coverage Validation

| Requirement Area | Coverage |
|-----------------|----------|
| Static MSE dashboard | `mse_state.json` + `components/mse/` — no API dependency |
| Orchestrator routing | `orchestrator.py` — LLM classifier + fallback to ACTION_DESK |
| DELIVERY ENGINE | `delivery_engine.py` + `schedule_tools.py` + `xer_parser.py` |
| VALUE LENS | `value_lens.py` + `financial_tools.py` + `financial_model_parser.py` |
| RAG agents (3) | `risk_radar/gap_finder/action_desk.py` + `rag.py` + ChromaDB |
| Agent identity in UI | `chat.py` first SSE event + `AgentBadge.tsx` |
| LLM provider switching | `llm_client.py` + `LLM_MODEL` env var |
| Local-first execution | `pnpm dev` + `uvicorn api.main:app` |
| GCP Cloud Run deployment | `Dockerfile` + `api/main.py` |

### Gap Analysis & Resolutions

**Gap 1 — Backend not on Vercel (resolved):**
`vercel.json` contains no Python runtime config. Backend runs locally via Uvicorn or in GCP Cloud Run via Docker. `next.config.ts` proxy rewrites handle local dev routing. Production: `NEXT_PUBLIC_API_URL` env var points to Cloud Run service URL.

**Gap 2 — MSE dashboard data source (resolved):**
`app/dashboard/mse/page.tsx` is a Server Component that reads `data_extract/mse_mock/mse_state.json` via `fs.readFile` at request time. No API call. No backend dependency. Dashboard renders even if FastAPI is down.

**Gap 3 — Orchestrator fallback (resolved):**
If classifier LLM call fails or returns an unrecognized agent id, orchestrator defaults to `ACTION_DESK`. Error in classifier is never exposed to user as a routing failure; ACTION_DESK response acknowledges limited context gracefully.

**Gap 4 — Agent identity in chat UI (resolved):**
First SSE event from a successful `/api/query` routed answer is `{"type": "agent", "agent_id": "...", "content": "..."}`. Frontend sets `activeAgent` in Zustand on this event and renders `AgentBadge` before first token appears.

**Gap 5 — ChromaDB index missing at startup (resolved):**
`rag.py` loads ChromaDB collection with `get_or_create_collection`. If collection is empty, `retrieve()` returns `[]`. RAG agents handle empty context gracefully — respond from system prompt only. `build_chroma_index.py` documents must be run once before first meaningful RAG response.

**Gap 6 — CORS for GCP backend (resolved):**
`CORSMiddleware` in `api/main.py` allows both `http://localhost:3000` and `https://*.vercel.app`. GCP Cloud Run URL also allowed explicitly when known.

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] New FRs analyzed and mapped to architectural components
- [x] Removed FRs confirmed absent from file structure (no whatif/, recommendation/, pif/, confidence/, voice/ directories)
- [x] Technical constraints honored (no DB, no in-app auth, GCP Cloud Run backend, local-first)
- [x] Cross-cutting concerns mapped (orchestrator contract, agent interface, dashboard independence, LLM abstraction)

**Architectural Decisions**
- [x] Stack: Next.js 16 + FastAPI + LiteLLM + Tailwind + Vercel frontend + GCP backend
- [x] Data layer: Track A (XER/XLS) for tool agents; Track B (ChromaDB) for RAG agents; Track C (static JSON) for dashboard
- [x] LLM integration: orchestrator classifier + 5-agent pattern; Python owns arithmetic
- [x] Streaming: SSE format with `agent`/`token`/`done`/`error` event types
- [x] Deployment: Vercel (frontend) + GCP Cloud Run / Uvicorn (backend)

**Implementation Patterns**
- [x] Naming conventions: locked BU codes, locked agent ids, file naming by language
- [x] Structure: thin routers, orchestrator + agent service layer, tools in `tools/` only
- [x] Format: direct response (no envelope), standard error shape, SSE type field
- [x] Process: error handling, loading states, walking skeleton rule, LLM arithmetic prohibition

**Project Structure**
- [x] Complete directory with 40+ specific named files
- [x] Three hard boundaries defined (data access, LLM access, tool definitions) + fourth (dashboard/backend independence)
- [x] Requirement → file mapping for all functional areas
- [x] Data flow documented end-to-end (two separate flows: static dashboard + chat)

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence level: High**

**Key strengths:**
- Dashboard independence (static JSON) eliminates all risk from Epic 7 blocking other work — Person 1 can proceed day 1 with zero backend dependency
- Agent interface contract (`run(question, history)`) allows Epics 5 and 6 to be built in parallel without merge conflicts
- Orchestrator fallback to ACTION_DESK means routing failure is never a crash — system degrades gracefully
- Walking skeleton rule applied to all three teams: hardcoded first, real data second, LLM last
- LLM arithmetic prohibition enforced architecturally (Python tool boundary), not by convention

**Post-POC enhancement paths (Phase 2):**
- Replace ChromaDB with external vector DB (Pinecone/Weaviate)
- Add RAG re-ranking
- Add RBAC for multi-user access
- Expand dashboard to live data pipeline once POC is validated

### Implementation Handoff

**Starting command for each person:**

Person 1 (Epic 7):
```bash
# Create app/dashboard/mse/page.tsx reading mse_state.json
# Build components/mse/* from MSE PowerPoint structure
# No backend needed until integration test
```

Person 2 (Epics 3 → 4 → 6):
```bash
pnpm dev
uvicorn api.main:app --reload --port 8000
# Epic 3: confirm QueryBar streams tokens from /api/chat
# Epic 4: wire orchestrator; confirm AgentBadge appears
# Epic 6: build risk_radar, gap_finder, action_desk
```

Person 3 (Epics 2 → 5 → 8):
```bash
python scripts/build_chroma_index.py
uvicorn api.main:app --reload --port 8000
# Epic 2: confirm xer_parser and financial_model_parser return clean dicts
# Epic 5: build delivery_engine, value_lens with real tool calls
# Epic 8: Docker build → Cloud Run deploy → smoke test
```

**All agents implementing this project must:**
1. Read this document before writing a single line
2. Follow the walking skeleton rule — hardcoded first, real data second, LLM last
3. Respect the four hard boundaries (data access, LLM access, tool definitions, dashboard/backend independence)
4. Keep files ≤150 lines — split before exceeding
5. Use BU codes and agent ids exactly as defined in the locked tables
6. No commented-out code, no class hierarchies, no nested logic beyond 2 levels
7. Implement the `run(question, history)` agent signature exactly — orchestrator depends on it
