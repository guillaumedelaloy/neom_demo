# NEOM Strategy Activation — demo

AI-native strategy execution cockpit for NEOM’s portfolio review cycle. Ingests operational data across business sectors and delivers KPI scorecards, AI narrative headlines, and an analyst chatbot backed by a tool-calling agent.

---

## Prerequisites

- [uv](https://docs.astral.sh/uv/) — Python package manager (`curl -LsSf https://astral.sh/uv/install.sh | sh`)
- [Node.js](https://nodejs.org/) **20.19+**, **22.12+**, or **24.x** (LTS recommended; see `.nvmrc`) and [pnpm](https://pnpm.io/) — for the Vite 8 frontend (`npm i -g pnpm`). **Avoid Node 25** until Vite/Rolldown officially support it; if `pnpm dev` fails with `Cannot find module ... rolldown/parseAst`, use Node 22 and run `rm -rf node_modules && pnpm install`.
- An **Anthropic API key** (Claude) — required for the agent
- An **OpenAI API key** — required for RAG document search (embeddings)

---

## 1. Clone and install

```bash
git clone <repo-url>
cd <path-to-this-repo>

# Python dependencies
uv sync

# Frontend dependencies
pnpm install
```

---

## 2. Environment variables

Copy the example and fill in your keys:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# LLM — required (LiteLLM ids: openai/<model>, anthropic/<claude-id>, …)
# Defaults in api/config/config.yml use OpenAI so one key can run chat + RAG embeddings.
LLM_MODEL=openai/gpt-4o
GATE_MODEL=openai/gpt-4o-mini

# API keys — the client picks a key that matches the model provider (see llm_client._api_key_for_model).
# For OpenAI models, OPENAI_API_KEY is used first. For Anthropic models, ANTHROPIC_API_KEY first.
OPENAI_API_KEY=sk-proj-...
# ANTHROPIC_API_KEY=sk-ant-...   # if you use anthropic/* models instead

# Optional generic override (any provider, used as fallback in key chain)
# LLM_API_KEY=

# Password gate — optional (leave empty to disable)
VITE_BASIC_AUTH_USER=admin
VITE_BASIC_AUTH_PASS=...

# Optional: enable verbose agent debug logs
DEBUG_AGENT=false

# Optional: Logfire observability (see section 6)
LOGFIRE_TOKEN=
```

> **Chat shows “Assistant temporarily unavailable”?** Ensure **`OPENAI_API_KEY`** is set if you use default **`openai/*`** models, or **`ANTHROPIC_API_KEY`** for **`anthropic/*`**. If `.env` still sets `LLM_MODEL` / `GATE_MODEL` to a provider you do not use, remove or fix those lines. **Do not** point `openai/...` models at an Anthropic-only key: the API now selects keys by provider, but the model id must still match a key you have. Restart the API after changes. With `DEBUG_AGENT=true`, errors include a scrubbed provider message.
>
> **OpenAI `RateLimitError` / TPM (tokens per minute):** Low usage tiers often cap TPM (e.g. 10k/min). The agent sends a large system prompt, tools, and optional RAG text — one turn can exceed that. **`gpt-4o-mini` does not remove that overhead** (it mainly changes model pricing/quality). Mitigations: **raise your OpenAI usage tier** or wait between requests; in this repo you can also tighten **`LLM_MAX_COMPLETION_TOKENS`** (default `2048` for `openai/*` — caps completion reservation), **`AGENT_HISTORY_MAX_MESSAGES`** (default `8` user/assistant messages kept), **`AGENT_TOOL_RESULT_MAX_CHARS`** (default `6000` per tool payload), and **`rag_n_results`** in `api/config/config.yml`; then restart the API.
>
> **Opus 4.7 / 4.8:** When you enable them, Anthropic may reject non-default `temperature` / sampling. This repo omits `temperature` automatically for those model ids in `llm_client.py`.
>
> The app runs without `OPENAI_API_KEY` only if you use **non-OpenAI** chat models **and** you skip RAG — otherwise set `OPENAI_API_KEY` for embeddings and (by default) for chat.
>
> If `VITE_BASIC_AUTH_USER` and `VITE_BASIC_AUTH_PASS` are both empty the password gate is disabled entirely.

---

## 3. Add source data

Source documents are **gitignored** and must be added locally. Place files under `data_extract/` following this structure:

```
data_extract/
├── rag_manifest.json                    # already in repo — lists documents to index
├── strategy/
│   ├── financial_model/
│   │   └── v3.6_Financial Model_FY25-2040_MASTER_v116_Bestcase.xlsx
│   └── <strategy PDFs and PPTX files listed in rag_manifest.json>
└── project_schedules/
    ├── phosphate/   ← Phosphate Projects V18.xer + Phosphate V16.xer
    ├── aluminium/   ← Alum Projects V18.xer + Aluminium V16.xer
    ├── gold/        ← Luxury Tourism & Hospitality schedules (historical on-disk folder name)
    ├── copper/      ← Copper Projects V18.xer + Copper V16.xer
    └── ree/         ← REE Projects V18.xer + REE V16.xer
```

---

## 4. Run data preprocessing

Run these scripts once (or whenever source data changes). Order matters.

**Project schedules** — parses Primavera XER files into milestone/RAG JSON:
```bash
uv run python scripts/process_schedule_data.py
```

**Workbook intelligence index** — scans the Excel financial model and writes a pre-built sheet index used by the `describe_workbook()` agent tool (eliminates 3–4 round-trips per financial query):
```bash
uv run python scripts/build_workbook_index.py
```

**RAG index** — chunks PDFs/PPTX and builds the ChromaDB vector store (requires `OPENAI_API_KEY`). The persisted collection name is `neom_docs`. If you previously indexed under an older collection name, delete `data_extract/chroma_db/` (or run a fresh index) and run this script again.
```bash
uv run python scripts/build_rag_index.py
```

Processed outputs land in `data_extract/processed/`. The RAG index is written to `data_extract/chroma_db/`.

---

## 5. Run the app

The app has two processes. **The Vite proxy only forwards HTTP — it does not start Python.** If you see `http proxy error` / `ECONNREFUSED` on `127.0.0.1:8001`, nothing is listening on that port yet (start the backend below, or match `VITE_DEV_API_PORT` to the port you actually use).

**Option A — one terminal (API + Vite together):**
```bash
pnpm install   # once, after pulling (adds concurrently)
pnpm dev:stack
```

**Option B — two terminals (recommended for clearer logs):**

Terminal 1 — **Backend (FastAPI):**
```bash
uv run uvicorn api.index:app --reload --reload-dir api --host 127.0.0.1 --port 8001
```
Runs on `http://127.0.0.1:8001` by default in this repo — **Vite’s dev proxy defaults to the same port** (`vite.config.ts`). If your API listens on **8000** instead, set **`VITE_DEV_API_PORT=8000`** in `.env` or the shell and restart **`pnpm dev`**.

> **Note:** `--reload` without `--reload-dir` watches the whole project folder, including `.venv/`, which can cause endless reloads right after `uv sync`. Restrict reload to `api/` as above (add more `--reload-dir` paths if you edit other Python packages used by the app).

Terminal 2 — **Frontend (Vite):**
```bash
pnpm dev --host 127.0.0.1
```
Runs on `http://127.0.0.1:5173` (or the next free port — check the terminal). With **`VITE_API_BASE_URL` unset**, the dev server proxies `/api/*` to **`http://127.0.0.1:${VITE_DEV_API_PORT}`** (default **8001** in `vite.config.ts`). For production or a remote API, set **`VITE_API_BASE_URL`** to the full backend origin (no trailing slash); that bypasses the proxy.

Open `http://127.0.0.1:5173` in your browser (use the URL Vite prints if the port differs).

---

## CLI chatbot

To interact with the chatbot from the terminal (without the frontend):

```bash
uv run neom-chat
```

Type your question and press Enter. Type `exit` to quit. The backend must be running first.

---

## 6. Observability with Logfire (optional)

> This section is entirely optional. The app works fully without it — tracing is silently skipped if no token is configured.

The backend and CLI are instrumented with [Pydantic Logfire](https://logfire.pydantic.dev). When enabled, every query produces a full trace in the Logfire dashboard — agent rounds, tool calls, LLM latency, and token usage, all nested under a single trace.

**Setup:**

**Step 1 — Create a free account and project**

Go to [logfire.pydantic.dev](https://logfire.pydantic.dev), sign up, and create a project.

**Step 2 — Authenticate the CLI**

```bash
uv run logfire auth
```

**Step 3 — Get your write token**

In the Logfire dashboard, go to your project → **Settings** → **Write tokens** → create a token. Copy it.

**Step 4 — Add the token to `.env`**

```env
LOGFIRE_TOKEN=your-token-here
```

**Step 5 — Restart the backend**

```bash
uv run uvicorn api.index:app --reload
```

On startup you should see:
```
Logfire project URL: https://logfire-eu.pydantic.dev/<your-org>/<your-project>
```

---

## Available Tools

The AI agent has access to several tools for data analysis:

### Core Tools
- **Excel workbook analysis** - Preview sheets, describe structure, run Python code on DataFrames
- **Schedule tracking** - Get BU schedules, overview of delays, impact analysis
- **Urban Development flagship schedule tools** — Milestones, changes, project summaries (internal `get_phos3_*` tools)
- **RAG document search** - Semantic search across indexed PDFs and presentations

### Arithmetic Tool (Mandatory)
The system enforces that **ALL arithmetic operations must use the `calculate` tool**. Direct calculations in responses are prohibited. This ensures:
- Consistent precision and rounding
- Proper error handling (division by zero, etc.)
- Auditability of all calculations

Supported operations:
- `sum`, `average`, `min`, `max` - for lists of values
- `subtract`, `multiply`, `divide` - for two values
- `percentage` - calculate A as percentage of B
- `growth_rate` - calculate percentage change from old to new value

---

## Deployment

### Environments

| Environment | Frontend (example) | Backend (example) | GCS bucket (example) | Branch |
|-------------|------------------|-------------------|----------------------|--------|
| **Production** | *(your Vercel URL)* | *(your Cloud Run URL)* | `gs://your-prod-bucket` | `main` |
| **Development** | — | *(your dev Cloud Run URL)* | `gs://your-dev-bucket` | `develop` |

Both Vercel and Cloud Run auto-deploy from their respective branches. Cloud Run env vars (`LLM_API_KEY`, `OPENAI_API_KEY`, `BACKEND_API_KEY`) persist across auto-deploy revisions — set them once in the GCP Console.

### Frontend → Backend connection

All frontend API calls use `getApiBase()` from `src/lib/api.ts`, which reads `VITE_API_BASE_URL` (set in Vercel env vars for production). For local dev, leave **`VITE_API_BASE_URL` empty** — the Vite dev server proxies `/api/*` to **`127.0.0.1`**, port **`VITE_DEV_API_PORT`** (default **8001** in `vite.config.ts`). If your API listens on **8000**, set `VITE_DEV_API_PORT=8000` in `.env` and restart **`pnpm dev`**.

### API authentication

The backend requires an `x-api-key` header on all routes except `/api/health`. The key is set via `BACKEND_API_KEY` env var on Cloud Run. The frontend sends it via `VITE_BACKEND_API_KEY`.

### Data pipeline

1. Add/update source documents in `data_extract/`
2. Run `./sync-and-ingest.sh` — syncs to dev GCS bucket and triggers server-side reprocessing
3. Validate on the dev backend
4. Promote to production (replace bucket and service names with yours):
   ```bash
   gcloud storage rsync gs://YOUR_DEV_BUCKET/ gs://YOUR_PROD_BUCKET/ \
     --recursive --delete-unmatched-destination-objects --checksums-only
   # Restart production to pick up new ChromaDB index
   gcloud run services update YOUR_PROD_SERVICE --region YOUR_REGION \
     --update-env-vars REPROCESS_TS="$(date -u +%Y%m%dT%H%M%SZ)"
   ```

### Manual backend deploy

Use your GCP project, Artifact Registry repository, service account, and image tag. Example shape:

```bash
# Build
gcloud builds submit \
  --tag REGION-docker.pkg.dev/YOUR_PROJECT/YOUR_REPO/your-backend:latest \
  --service-account projects/YOUR_PROJECT/serviceAccounts/your-sa@YOUR_PROJECT.iam.gserviceaccount.com \
  --region REGION \
  --default-buckets-behavior regional-user-owned-bucket

# Deploy
gcloud run deploy your-backend \
  --image REGION-docker.pkg.dev/YOUR_PROJECT/YOUR_REPO/your-backend:latest \
  --region REGION --allow-unauthenticated \
  --set-env-vars "LLM_MODEL=openai/gpt-4o,GATE_MODEL=openai/gpt-4o-mini,OPENAI_API_KEY=<KEY>,BACKEND_API_KEY=<KEY>" \
  --port 8080 --memory 1Gi --timeout 900 \
  --service-account your-sa@YOUR_PROJECT.iam.gserviceaccount.com \
  --add-volume name=data-vol,type=cloud-storage,bucket=YOUR_DATA_BUCKET,readonly=true \
  --add-volume-mount volume=data-vol,mount-path=/app/data_extract
```

### Manual Vercel deploy

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel deploy --prod --yes
```

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React 19, React Router, Tailwind CSS |
| Backend | FastAPI + Python 3.11+, LiteLLM |
| Agent | Prompt-first `api/prompts/` (skills + system + runtime) + tool-calling loop (up to 15 rounds), ChromaDB RAG |
| Tools | Excel analysis, schedule tracking, Urban Development flagship detailed schedule tools, RAG search, **arithmetic calculations (mandatory for all math)** |
| LLM | OpenAI or Anthropic via LiteLLM (`LLM_MODEL` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`) |
| Observability | Pydantic Logfire (optional) |
| Deployment | Frontend on Vercel (static SPA); backend on Cloud Run with GCS volume mount |
