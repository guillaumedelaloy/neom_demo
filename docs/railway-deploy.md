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
| `BACKEND_API_KEY` | recommended | If set, the browser must send header **`x-api-key`** on `/api/*` except **`/api/health`** and **`/api/auth/login`** (configure **`VITE_BACKEND_API_KEY`** on the client or rely on same-origin env at build time). |
| `APP_AUTH_USER` | optional | With **`APP_AUTH_PASSWORD`**, enables the **UI sign-in** form (`POST /api/auth/login`). Set both on Railway for a simple username/password gate. |
| `APP_AUTH_PASSWORD` | optional | Must be set together with **`APP_AUTH_USER`**. Use a strong secret; store only in Railway Variables. |
| `VITE_BASIC_AUTH_USER` / `VITE_BASIC_AUTH_PASS` | optional | Legacy names still read by the API if **`APP_AUTH_*`** are unset. Prefer **`APP_AUTH_*`** on the server. |
| `SSL_CERT_FILE` | maybe | Corporate TLS inspection — PEM bundle path **inside the image** (mount file or bake). |
| `SSL_VERIFY` | dev only | `false` disables TLS verification for LLM HTTP clients (insecure). |

\*Chat + RAG need keys per README; demo UI can use `VITE_MOCK_BACKEND=true` on the frontend without this API.

5. **Data / RAG:** The **`Dockerfile` copies `data_extract/chroma_db/`** and **`data_extract/rag_manifest.json`** into the image. They must exist in the **git repo** you deploy (Railway builds from Git). **`.dockerignore`** excludes heavy folders (`strategy/`, `processed/`, etc.) but **not** `chroma_db`. If the build fails with “file not found”, run **`uv run python scripts/build_rag_index.py`** locally, commit **`chroma_db/`** + **`rag_manifest.json`**, and redeploy. Schedules / Excel remain optional unless you add a volume or further **`COPY`** lines.

6. After deploy, open **`https://<your-railway-host>/`** for the UI and **`/api/health`** for JSON **`{"status":"ok",...}`**.

### UI username / password (sign-in gate)

The SPA shows a sign-in form until **`POST /api/auth/login`** succeeds. On Railway, set **both**:

- **`APP_AUTH_USER`** — e.g. `demo` or your team username  
- **`APP_AUTH_PASSWORD`** — use a long random string (Railway → Variables → generate or paste)

Redeploy or restart after saving variables. The Docker image does **not** need `VITE_BASIC_AUTH_*` at build time for this path: the browser calls the API on the same host, and the server validates credentials.

If you also set **`BACKEND_API_KEY`**, add **`VITE_BACKEND_API_KEY`** with the same value in Railway **before** the Docker build (so Vite embeds it), or the chat proxy requests will return **403** after sign-in.

Legacy: **`VITE_BASIC_AUTH_USER`** / **`VITE_BASIC_AUTH_PASS`** on the API process are still honored if **`APP_AUTH_*`** are empty.

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
- **Chat 403:** `BACKEND_API_KEY` is set but the SPA is not sending **`x-api-key`** (set **`VITE_BACKEND_API_KEY`** at **build** time on Railway, or unset **`BACKEND_API_KEY`** for a demo-only deploy).
- **Sign-in always skipped:** **`APP_AUTH_USER`** and **`APP_AUTH_PASSWORD`** must both be non-empty on the **API** service — check Railway Variables and restart. **`POST /api/auth/login`** should return **`{"enabled":true,"ok":true}`** for valid credentials.
- **`/api/health?diagnose=1`:** Use it to confirm `LLM_MODEL` / dotenv paths when debugging env.
- **Missing `data_extract` / Chroma / Excel / schedules:** Expected on the default slim image. The API logs those conditions at **DEBUG** only so Railway’s default **INFO** deploy logs stay quiet. To see them locally, set your root logger to **DEBUG** (or use `uvicorn --log-level debug` and configure `logging` for the `api` namespace).

---

## Config-as-code reference

- [Railway config file](https://docs.railway.app/reference/config-as-code) (`railway.json` / `railway.toml`).
