# Push this snapshot to Git and deploy

## 1. Push to GitHub (first time)

This folder was initialized as a new Git repo. **Create an empty repository** on GitHub (no README/license if you want a clean history), then:

```bash
cd /path/to/maaden_demo   # this project root

git remote add origin https://github.com/YOUR_ORG/YOUR_REPO.git
git push -u origin main
```

Use SSH if you prefer: `git@github.com:YOUR_ORG/YOUR_REPO.git`

**Never commit** `.env` — it stays gitignored. Copy `.env.example` → `.env` on each machine and in each host’s env (Vercel / Cloud Run).

---

## 2. Frontend (Vercel)

1. In [Vercel](https://vercel.com): **Add New Project** → import the GitHub repo.
2. Framework: **Vite**. Root: repo root (or leave default).
3. **Environment variables** (Production + Preview as needed), for example:
   - `VITE_API_BASE_URL` — full URL of your Cloud Run API, e.g. `https://your-service-xxxxx.run.app` (no trailing slash), **or** leave empty if you use same-origin proxy only in dev.
   - `VITE_BACKEND_API_KEY` — must match `BACKEND_API_KEY` on the API.
   - `VITE_BASIC_AUTH_USER` / `VITE_BASIC_AUTH_PASS` — optional password gate.
4. Deploy. Each `git push` to the tracked branch triggers a new build.

---

## 3. Backend (Google Cloud Run)

Follow the **Deployment** section in the root `README.md` (Cloud Run + GCS volume). Set at least:

- `LLM_API_KEY` or `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY` (if you use RAG)
- `BACKEND_API_KEY` (must match the frontend `VITE_BACKEND_API_KEY`)
- Optional: `LLM_MODEL` / `GATE_MODEL` overrides

Redeploy the service after changing env vars or data.

---

## 4. Quick checklist

- [ ] `.env` not in git (`git status` clean of secrets)
- [ ] `public/neom-logo.png` committed (sidebar / landing)
- [ ] API health: `GET /api/health`
- [ ] Frontend can reach API (CORS / `VITE_API_BASE_URL` / API key header)
