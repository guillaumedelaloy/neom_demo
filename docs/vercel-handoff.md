# Vercel handoff — light deploy without cloud storage

This repo’s root **`vercel.json`** deploys **only the Vite frontend** (`pnpm build` → `dist/`). The **dashboards, KPIs, and charts** ship as static JSON/TS in `src/data/` and work on Vercel with **no** `data_extract/` and **no** Python process.

The **NEOM analyst chat** calls FastAPI (`/api/...`). Vercel is **not** running that API today, so you choose one of the paths below.

---

## Option A — Fastest colleague demo (Vercel only)

**What works:** Full UI, navigation, scorecards, charts (all bundled).

**Chat:** Set **`VITE_MOCK_BACKEND=true`** in the Vercel project → **Environment Variables** (Production + Preview), then redeploy. The chat streams a canned mock answer so people can click through the product without keys or a server.

**`data_extract/`:** Not required for this option. You can omit it from the git branch you connect to Vercel.

---

## Option B — Real chat, still “light” (Vercel UI + tiny API elsewhere)

Keep Vercel for the UI. Run the Python API on any small host you already use (laptop for a workshop, **Render** / **Fly.io** free tier, etc.) — still **no GCP bucket and no S3**; the API reads files from the same repo directory on that machine.

1. On the API host: clone the repo, `uv sync`, add `.env` with `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` as today.
2. Copy a **minimal** `data_extract/` (see below) onto that host.
3. In **Vercel → Settings → Environment Variables**, set **`VITE_API_BASE_URL`** (or **`NEXT_PUBLIC_API_URL`**) to the API origin, e.g. `https://your-api.onrender.com` (no trailing slash). Rebuild the frontend.

---

## Option C — Commit a minimal `data_extract/` for the API host (or a Docker image)

Use this when you want the smallest **on-disk** corpus for schedule + strategy RAG + Excel tools, and you are okay **not** shipping 10+ years of investor PDFs.

### Runtime files the backend actually opens

| Area | Keep | Safe to delete *after* you have generated outputs |
|------|------|-----------------------------------------------------|
| Schedules / milestones | `data_extract/processed/schedules.json` | `data_extract/project_schedules/**/*.xer` (raw Primavera — only needed to **regenerate** `schedules.json`) |
| Financial model tools | `data_extract/strategy/financial_model/v3.6_Financial Model_FY25-2040_MASTER_v116_Bestcase.xlsx` + `data_extract/processed/workbook_index.json` | — |
| Document search (RAG) | `data_extract/chroma_db/` (pre-built index) **or** source PDFs/PPTX listed in `rag_manifest.json` + run `build_rag_index.py` on deploy | Any PDF/PPTX **not** listed in the manifest you use |
| Manifest | `data_extract/rag_manifest.json` must list **only** files you keep (or Chroma built from that list) | Entire `investor_relations/` tree if you slim the manifest and rebuild Chroma without it |

### Slimming RAG without S3

1. Copy `docs/examples/rag_manifest.slim.json` to `data_extract/rag_manifest.json` (or edit your manifest to only the strategy/execution docs you care about).
2. Delete from `data_extract/` every PDF/PPTX not referenced in that manifest (and drop `investor_relations/` if you removed those entries).
3. Delete old index: `rm -rf data_extract/chroma_db`.
4. Run **`uv run python scripts/build_rag_index.py`** (needs `OPENAI_API_KEY` once) → new smaller `data_extract/chroma_db/`.
5. **Size check:** if `chroma_db` + `xlsx` + `schedules.json` is still large for git, keep them out of GitHub and copy them onto the API host only, or use Git LFS.

### Making git track selected `data_extract/` files

Root `.gitignore` ignores most of `data_extract/`. To **commit** a minimal bundle on a handoff branch:

```bash
git checkout -b vercel-handoff
# after placing minimal files:
git add -f data_extract/rag_manifest.json \
  data_extract/processed/schedules.json \
  data_extract/processed/workbook_index.json \
  data_extract/strategy/financial_model/*.xlsx \
  data_extract/chroma_db
```

Adjust paths to match what you actually kept.

---

## Vercel project checklist

| Setting | Value |
|--------|--------|
| Framework | Vite (or leave auto-detect) |
| Build command | `pnpm build` |
| Output | `dist` |
| Install | Default pnpm is fine if packageManager is set; otherwise set install command to `pnpm install` |

Env vars:

- **Option A:** `VITE_MOCK_BACKEND=true`
- **Option B:** `VITE_API_BASE_URL=https://…` and **do not** set mock backend
- Optional: `VITE_BASIC_AUTH_USER` / `VITE_BASIC_AUTH_PASS` for a simple gate (client-side only — not secret security)

---

## Honest scope note

**“Full app on Vercel alone”** in the sense of **Python + Chroma + LiteLLM + large XLSX** on the same Vercel deployment is possible only with a heavy serverless redesign (size limits, timeouts, cold starts). The **light** approach this repo supports out of the box is: **static app on Vercel** + either **mock chat** or **API on another small host** with a **trimmed `data_extract/`** as above — no object storage required.
