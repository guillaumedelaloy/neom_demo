# Deploy a light version on Vercel (dashboards only, mock chat)

You get the **full static UI** (navigation, KPIs, charts, pages). **No Python**, **no `data_extract/`**, **no API keys** on Vercel.

The analyst chat uses a **built-in mock stream** so the drawer still animates and shows placeholder text (not the real agent).

---

## 0. Smoke-test locally (optional)

From the repo root:

```bash
pnpm install
VITE_MOCK_BACKEND=true pnpm build
pnpm preview
```

Open the URL Vite prints, click through pages, open chat, send a message — you should see the mock “no live API” answer.

---

## 1. Put the project on GitHub

If it is not already on GitHub:

1. Create a new empty repository on GitHub (no README needed).
2. In your project folder:

```bash
git remote add origin https://github.com/<you>/<repo>.git   # skip if origin exists
git add -A
git commit -m "Prepare Vercel light deploy"
git push -u origin main
```

Use your real branch name if it is not `main`.

---

## 2. Import the project in Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (GitHub login is easiest).
2. **Add New… → Project**.
3. **Import** your GitHub repository. Grant access to that repo if asked.
4. Vercel should detect **Vite** and read root **`vercel.json`**:
   - **Build Command:** `pnpm build`
   - **Output Directory:** `dist`
5. **Root Directory:** leave default (`.`).

Because **`packageManager`** is set in `package.json`, Vercel uses **pnpm** automatically (Corepack).

---

## 3. Set environment variables (important)

Open **Settings → Environment Variables** for the project and add:

| Name | Value | Environments |
|------|--------|--------------|
| `VITE_MOCK_BACKEND` | `true` | Production, Preview, Development |

**Why:** On Vercel there is no FastAPI. Without this flag, the app tries `POST /api/...` on the same origin and the chat **fails** (network error). With `true`, the frontend never calls the server and uses the mock stream instead.

Redeploy after saving variables (or trigger a new deploy from the **Deployments** tab).

**Optional — simple password gate** (not high security, fine for casual demos):

| Name | Value |
|------|--------|
| `VITE_BASIC_AUTH_USER` | e.g. `demo` |
| `VITE_BASIC_AUTH_PASS` | a password you share verbally |

If both are set, the gate appears in the UI. Leave both empty to disable.

---

## 4. Deploy

Click **Deploy**. When the build finishes, open the **`.vercel.app`** URL Vercel shows.

---

## 5. Share with a colleague

Send them:

- The **Vercel URL**
- Optional: **user / password** if you enabled the gate

They do **not** need `uv`, `.env`, or `data_extract/`.

---

## Troubleshooting

| Symptom | What to do |
|--------|------------|
| Build fails on `pnpm` / lockfile | Ensure latest `package.json` with `"packageManager": "pnpm@9.15.9"` is pushed; in Vercel **Settings → General**, set **Install Command** to `pnpm install` if needed. |
| Blank page on refresh on a deep route | Root **`vercel.json`** already rewrites `/*` → `/index.html` for the SPA. If you changed it, restore that rewrite. |
| Chat shows errors / “failed to fetch” | Confirm **`VITE_MOCK_BACKEND=true`** is set for **Production** (and Preview if you use preview URLs), then **Redeploy**. |
| TypeScript errors during `pnpm build` | Fix locally first; Vercel runs the same `pnpm build`. |

---

## What you are *not* deploying

- FastAPI / `uv run`
- `data_extract/`, Chroma, Excel parsers
- Real LLM keys on Vercel (not needed for this mode)

When you later want real chat, see **[vercel-handoff.md](./vercel-handoff.md)** (API URL + minimal data on a host that runs Python).
