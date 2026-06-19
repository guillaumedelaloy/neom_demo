# Deploy on Railway

This repo supports **these patterns**:

1. **Single Railway service (default `Dockerfile`)** — multi-stage image builds the **Vite** app, copies **`dist/`** into the Python image, and FastAPI serves **`/`** and **`/assets/*`** from that folder (same origin as **`/api/*`**). Set **`VITE_API_BASE_URL`** empty or omit it so the browser calls your Railway host.
2. **API on Railway, SPA elsewhere** — use a custom image or build that skips the web stage if you prefer; point **`VITE_API_BASE_URL`** / **`NEXT_PUBLIC_API_URL`** at the Railway API URL.
3. **Two Railway services** — API Dockerfile + separate static host (see Service B below).

Root **`railway.json`** targets the **FastAPI** `Dockerfile` and health-checks **`/api/health`**.

---

## Service A — FastAPI (Dockerfile)

### One-click shape

1. Railway → **New Project** → **Deploy from GitHub** → select this repo.
2. Railway auto-detects **`Dockerfile`** (or reads **`railway.json`**).
3. Generate a **public domain** for the service (Settings → Networking).
4. Add **environment variables** (Variables tab) — at minimum:

| Variable | Required | Notes |
|----------|----------|--------|
| `PORT` | no | **Injected by Railway**; the Dockerfile defaults to `8080` if unset. |
| `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` | yes* | Match your `LLM_MODEL` / `GATE_MODEL` providers. |
| `LLM_MODEL` | no | Overrides `api/config/config.yml` (e.g. `anthropic/claude-sonnet-4-6`). |
| `GATE_MODEL` | no | Gate model id. |
| `BACKEND_API_KEY` | recommended | If set, the browser must send header **`x-api-key`** on `/api/*` (configure the SPA env or a reverse proxy). |
| `SSL_CERT_FILE` | maybe | Corporate TLS inspection — PEM bundle path **inside the image** (mount file or bake). |
| `SSL_VERIFY` | dev only | `false` disables TLS verification for LLM HTTP clients (insecure). |

\*Chat + RAG need keys per README; demo UI can use `VITE_MOCK_BACKEND=true` on the frontend without this API.

5. **Data / RAG:** The image still does **not** bake in **`data_extract/`** (kept out of the build context via **`.dockerignore`** so large PDFs/XER do not slow builds). Startup warnings for missing **`schedules.json`**, Excel, or Chroma are expected until you attach data. For a full demo either:
   - attach a **Railway volume** at **`/app/data_extract`** and upload a slim tree + run preprocessing, or  
   - extend the Dockerfile with a **`COPY data_extract/...`** slice you are willing to ship.

6. After deploy, open **`https://<your-railway-host>/`** for the UI and **`/api/health`** for JSON **`{"status":"ok",...}`**.

### Health check

`railway.json` sets **`healthcheckPath`** to **`/api/health`**. First boot can be slow (LiteLLM cold start); timeout is 300s.

---

## Service B — Static Vite UI (optional second service)

Keep the **API** as its own Railway service. Add a **second** service from the **same repo**:

| Setting | Suggested value |
|---------|------------------|
| **Builder** | Railpack (Nixpacks) — **not** Dockerfile, or use a separate root without Dockerfile detection |
| **Build command** | `corepack enable && pnpm install && pnpm run build` |
| **Start command** | `npx --yes serve@14 dist -s -l $PORT` |

**Runtime variables for the static service:**

| Variable | Example | Purpose |
|----------|---------|---------|
| `VITE_API_BASE_URL` | `https://your-api-service.up.railway.app` | Baked at **build** time — must be set **before** build if you use this name. Railway “build-time” vars: set in service variables and ensure they are available to the build step. |

> **Note:** Vite inlines `VITE_*` at **build** time. If Railway only exposes the API URL after the first deploy, either rebuild the static service after setting `VITE_API_BASE_URL`, or use **`NEXT_PUBLIC_API_URL`** (also read in `src/lib/api.ts`) with the same rebuild rule.

---

## CORS

FastAPI currently allows **origins `*`** in `api/index.py`. For production you may tighten `CORSMiddleware` to your static origin only.

---

## Troubleshooting

- **502 / crash on boot:** Check deploy logs — missing Python deps vs `requirements.txt`, or import errors.
- **Chat 403:** `BACKEND_API_KEY` is set but the SPA is not sending **`x-api-key`**.
- **`/api/health?diagnose=1`:** Use it to confirm `LLM_MODEL` / dotenv paths when debugging env.

---

## Config-as-code reference

- [Railway config file](https://docs.railway.app/reference/config-as-code) (`railway.json` / `railway.toml`).
