# NEOM Strategy Activation — demo

AI-native strategy execution cockpit for NEOM’s portfolio review cycle. Ingests operational data across business sectors and delivers KPI scorecards, AI narrative headlines, and an analyst chatbot backed by a tool-calling agent.

---

## Prerequisites

- [uv](https://docs.astral.sh/uv/) — Python package manager (`curl -LsSf https://astral.sh/uv/install.sh | sh`)
- [Node.js](https://nodejs.org/) **20.19+**, **22.12+**, or **24.x** (LTS recommended; see `.nvmrc`) and [pnpm](https://pnpm.io/) — for the Vite 8 frontend (`npm i -g pnpm`). **Avoid Node 25** until Vite/Rolldown officially support it; if `pnpm dev` fails with `Cannot find module ... rolldown/parseAst`, use Node 22 and run `rm -rf node_modules && pnpm install`.
- An **Anthropic API key** (Claude) — required for the agent
- An **OpenAI API key** — required for RAG document search (embeddings)

---

## Deploying (Vercel, light)

The root **`vercel.json`** builds **only the Vite frontend** (`dist/`). Scorecards and navigation work **without** `data_extract/` on Vercel. The analyst **chat** needs either **`VITE_MOCK_BACKEND=true`** on Vercel (demo stream, no server) or **`VITE_API_BASE_URL`** pointing at a FastAPI process you run elsewhere (still no S3/GCP required — files live next to the API). Full checklist, minimal `data_extract/` layout, and a slim RAG manifest example: **[docs/vercel-handoff.md](docs/vercel-handoff.md)**.  
**Step-by-step (UI on Vercel, mock chat, no data_extract):** **[docs/vercel-light-deploy.md](docs/vercel-light-deploy.md)**.

**Railway (FastAPI + optional static UI):** **[docs/railway-deploy.md](docs/railway-deploy.md)** — root **`railway.json`** configures the Docker API service and `/api/health` checks.

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
# Defaults in api/config/config.yml: main agent openai/gpt-5.5; gate openai/gpt-4o (override here).
LLM_MODEL=openai/gpt-5.5
GATE_MODEL=openai/gpt-4o

# API keys — the client picks a key that matches the model provider (see llm_client._api_key_for_model).
# For OpenAI models, OPENAI_API_KEY is used first. For Anthropic models, ANTHROPIC_API_KEY first.
OPENAI_API_KEY=sk-proj-...
# ANTHROPIC_API_KEY=sk-ant-...   # if you use anthropic/* models instead

# Optional generic override (any provider, used as fallback in key chain)
# LLM_API_KEY=

# UI password gate — optional (both must be set to enable; omit either to disable)
# Server (Railway / Docker / local API): preferred names
APP_AUTH_USER=demo
APP_AUTH_PASSWORD=...
# Legacy / same values in .env for Vite fallback when the API is unreachable (optional)
# VITE_BASIC_AUTH_USER=demo
# VITE_BASIC_AUTH_PASS=...

# Optional: enable verbose agent debug logs
DEBUG_AGENT=false

# Optional: Logfire observability (see section 6)
LOGFIRE_TOKEN=
```

> **Chat shows “Assistant temporarily unavailable”?** Ensure **`OPENAI_API_KEY`** is set if you use default **`openai/*`** models, or **`ANTHROPIC_API_KEY`** for **`anthropic/*`**. If `.env` still sets `LLM_MODEL` / `GATE_MODEL` to a provider you do not use, remove or fix those lines. **Do not** point `openai/...` models at an Anthropic-only key: the API now selects keys by provider, but the model id must still match a key you have. Restart the API after changes. With `DEBUG_AGENT=true`, errors include a scrubbed provider message.
>
> **`SSLCertVerificationError` / `certificate verify failed` toward `api.anthropic.com` (or other providers):** Your Python process does not trust the TLS chain — typical on **corporate inspection** proxies or some **macOS Python** installs. **Preferred:** set **`SSL_CERT_FILE`** in `.env` to a PEM bundle that includes your organization’s root (ask IT for a `.pem` / root CA export if you do not have one). To **merge** Mozilla’s public CAs (from `certifi`) with **your** corporate root, replace the second path with a real file — the snippet below uses a placeholder on purpose:
>
> `cat "$(uv run python -c "import certifi; print(certifi.where())")" /ABSOLUTE/PATH/TO/your-corp-root-or-chain.pem > "$HOME/combined-certs.pem"` then set **`SSL_CERT_FILE=$HOME/combined-certs.pem`** (absolute path) in `.env`. **Last-resort local dev only:** `SSL_VERIFY=false` (disables verification for LiteLLM HTTP clients — insecure). On python.org macOS builds, also run **Install Certificates.command** from the Python folder in **Applications**. Restart the API after any change. See [LiteLLM security settings](https://docs.litellm.ai/docs/guides/security_settings).
>
> **FastAPI dotenv:** The API loads **`/.env`** then **`/.env.local`** at the **repository root** (same idea as Vite). Put `LLM_MODEL` / API keys in either file. With **`DEBUG_AGENT=true`**, look for a startup log line `env after dotenv: LLM_MODEL=...` — if it is `None`, those variables were not loaded (wrong file, typo, or unsaved editor buffer). If the UI still shows **`openai/gpt-5.5`** from `config.yml`, open **`/api/health?diagnose=1`** (via the Vite URL) and check **`LLM_MODEL_in_environ`**, **`dotenv_files_loaded`**, and **`repo_root`** vs where your `.env` actually lives.
>
> **OpenAI `RateLimitError` / TPM (tokens per minute):** Low usage tiers often cap TPM (e.g. 10k/min). The agent sends a large system prompt, tools, and optional RAG text — one turn can exceed that. **Smaller models do not remove that overhead** (they mainly change price/quality). Mitigations: **raise your OpenAI usage tier** or wait between requests; in this repo you can also tighten **`LLM_MAX_COMPLETION_TOKENS`** (default **`8192`** when the model id contains **`gpt-5.5`**, otherwise **`2048`** — caps completion reservation), **`AGENT_HISTORY_MAX_MESSAGES`** (default `8` user/assistant messages kept), **`AGENT_TOOL_RESULT_MAX_CHARS`** (default `6000` per tool payload), and **`rag_n_results`** in `api/config/config.yml`; then restart the API.
>
> **Frontier OpenAI (`openai/gpt-5.5`, `openai/gpt-5.5-pro`):** This repo omits `temperature` and passes **`reasoning_effort`** for the GPT‑5.5 family via LiteLLM (`llm_client.py`). Use **`LLM_MODEL=openai/gpt-5.5-pro`** only if your account and LiteLLM version support it (pricier).
>
> **Anthropic `not_found_error` / `model: claude-…`:** The id is wrong for your account or **retired** on Anthropic’s API. As of mid‑2026, dated ids such as **`claude-sonnet-4-20250514`** are retired — use a current id (for example **`anthropic/claude-sonnet-4-6`** for main chat, or **`anthropic/claude-sonnet-4-5-20250929`**). Older **`claude-3-5-haiku-20241022`** is also retired for API use; prefer a current Haiku id such as **`anthropic/claude-haiku-4-5-20251001`** for a fast gate model. See Anthropic’s [model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations).
>
> The app runs without `OPENAI_API_KEY` only if you use **non-OpenAI** chat models **and** you skip RAG — otherwise set `OPENAI_API_KEY` for embeddings and (by default) for chat.
>
> The gate calls **`POST /api/auth/login`**. If **`APP_AUTH_USER`** and **`APP_AUTH_PASSWORD`** are both set on the API, credentials are checked server-side. If they are unset, the API also checks legacy **`VITE_BASIC_AUTH_USER`** / **`VITE_BASIC_AUTH_PASS`**. If the API has no credentials configured, the UI falls back to matching **`VITE_BASIC_AUTH_*`** in the browser only (useful when the static site cannot reach the API). If nothing is configured, sign-in is skipped (**fail open** for local demos).

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

The app has two processes. **The Vite proxy only forwards HTTP — it does not start Python.** If you see `http proxy error` / `ECONNREFUSED` on `127.0.0.1:8001`, nothing is listening on that port yet (start the backend below, or match `VITE_DEV_API_PORT` to the port you actually use). **`ETIMEDOUT`** on the first request usually means Vite tried the proxy while the API was still importing (first load can take tens of seconds); **`pnpm dev:stack`** runs **`wait-on http-get://127.0.0.1:8001/api/health`** before starting Vite so the API is ready (plain **`http://`** would use **HEAD**; **`/api/health`** also accepts **HEAD** for probes).

**Option A — one terminal (API + Vite together):**
```bash
pnpm install   # once, after pulling (adds concurrently + wait-on)
pnpm dev:stack
```

If **`pnpm dev`** / Vite fails with **`Cannot find package .../fdir/index.js`** (from `tinyglobby`), your **`node_modules`** is usually **incomplete** (e.g. `pnpm install` interrupted). From the repo root run **`rm -rf node_modules`** then **`pnpm install`** again. The repo **`.npmrc`** hoists `fdir` / `tinyglobby` to reduce recurrence. Prefer **Node 22 LTS** if you still see odd resolver errors on very new Node versions.

If the browser shows **`cookie` … does not provide an export named `parse`**, clear Vite’s cache (**`rm -rf node_modules/.vite`**) and restart **`pnpm dev`** — `vite.config.ts` pre-bundles `cookie` with `react-router` for correct CJS/ESM interop ([upstream context](https://github.com/remix-run/react-router/issues/13949)).

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

**Which LLM is the API using?** Send any chat message: above the chat input, **Models · main … · gate …** reflects the values the backend streamed (same as `GET /api/health`, which returns `llm_model` and `gate_model`). **Environment variables win over `api/config/config.yml`:** set `LLM_MODEL` / `GATE_MODEL` in `.env`, then restart the API. If the UI still shows an old model after you edited `.env`, you likely had the same variable **exported in your terminal** (`export LLM_MODEL=…`); the app now reloads **repo `.env` with override** so the file wins—restart uvicorn once more. To see what the shell would force without that, run `echo $LLM_MODEL`.

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

The backend requires an `x-api-key` header on all `/api/*` routes except **`/api/health`** and **`/api/auth/login`**. The key is set via `BACKEND_API_KEY` env var on Cloud Run. The frontend sends it via `VITE_BACKEND_API_KEY`.

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
  --set-env-vars "LLM_MODEL=openai/gpt-5.5,GATE_MODEL=openai/gpt-4o,OPENAI_API_KEY=<KEY>,BACKEND_API_KEY=<KEY>" \
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
