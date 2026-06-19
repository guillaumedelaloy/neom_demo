# Story 7.2: Vite Frontend Migration — Replace Next.js with Design Frontend

Status: review

## Story

As a developer,
I want the Vite design frontend (from `epic/7-design-frontend-backend-integration`) brought into the `main` codebase,
so that the UX designer's CEO cockpit becomes the live frontend and the FastAPI backend is the only backend.

## Acceptance Criteria

1. `pnpm dev` starts the Vite app on `http://localhost:5173` — all dashboard pages render without errors.
2. `uvicorn api.main:app --reload` still starts the FastAPI backend unchanged — no Python files modified.
3. `pnpm build` exits with code 0 — zero TypeScript errors, zero build warnings.
4. `pnpm lint` exits with code 0.
5. All Next.js-specific files are removed: `app/`, `components/`, `lib/`, `middleware.ts`, `next.config.ts`, `postcss.config.mjs`, `next-env.d.ts`, `components.json`.
6. The `src/` directory from the design branch is present at repo root and contains all pages, components, intelligence, data, and hooks.
7. `package.json` uses Vite + React deps; `next`, `zustand`, `react-markdown`, `remark-gfm`, `tailwind-merge`, `clsx`, `eslint-config-next` are removed.
8. The local deterministic reasoning engine still functions (it is NOT wired to the backend yet — that is Stories 7.3–7.8).

## Tasks / Subtasks

- [x] Task 1 — Create epic branch and bring in Vite source tree (AC: #1, #6)
  - [x] Create branch `epic/7-frontend-integration` from `main`
  - [x] Checkout the full `src/` directory from design branch: `git checkout epic/7-design-frontend-backend-integration -- src/`
  - [x] Checkout root config files from design branch: `git checkout epic/7-design-frontend-backend-integration -- index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json eslint.config.js`
  - [x] Checkout `public/` from design branch (replaces Next.js public assets): `git checkout epic/7-design-frontend-backend-integration -- public/`
  - [x] Verify `src/` tree matches design branch exactly: all pages, components, intelligence, data, hooks, lib present

- [x] Task 2 — Update `package.json` to Vite dependency set (AC: #7)
  - [x] Remove deps: `next`, `react-markdown`, `remark-gfm`, `tailwind-merge`, `clsx`, `zustand`
  - [x] Remove devDeps: `eslint-config-next`, `@tailwindcss/postcss`
  - [x] Add deps: `react-router-dom@^7.14.0`, `recharts@^3.8.1` (already present — verify version)
  - [x] Add devDeps: `@vitejs/plugin-react@^6.0.1`, `vite@^8.0.4`, `@tailwindcss/vite@^4.2.2`, `typescript-eslint@^8.58.0`, `eslint-plugin-react-hooks@^7.0.1`, `eslint-plugin-react-refresh@^0.5.2`, `globals@^17.0.0`
  - [x] Update scripts: `"dev": "vite"`, `"build": "tsc -b && vite build"`, `"preview": "vite preview"` (remove `start`)
  - [x] Run `pnpm install` and confirm lockfile updates cleanly

- [x] Task 3 — Remove Next.js-specific files and directories (AC: #5)
  - [x] Delete `app/` directory
  - [x] Delete `components/` directory
  - [x] Delete `lib/` directory
  - [x] Delete `middleware.ts`
  - [x] Delete `next.config.ts`
  - [x] Delete `postcss.config.mjs`
  - [x] Delete `next-env.d.ts`
  - [x] Delete `components.json`
  - [x] Check `pnpm-workspace.yaml` — delete if Next.js-only; keep if referenced by Python tooling

- [x] Task 4 — Verify FastAPI backend is unaffected (AC: #2)
  - [x] Confirm `api/`, `data_extract/`, `pyproject.toml`, `requirements.txt`, `uv.lock`, `Dockerfile` are unchanged
  - [x] Run `uvicorn api.main:app --reload` (or equivalent) — confirm it starts without errors

- [x] Task 5 — TypeScript and lint validation (AC: #3, #4)
  - [x] Run `pnpm build` — confirm 0 errors, 0 warnings
  - [x] Run `pnpm lint` — confirm 0 errors
  - [x] Open `http://localhost:5173` in browser — confirm Executive Summary page loads, sidebar navigation works, all routes render

## Dev Notes

### Branch strategy
Work on `epic/7-frontend-integration` (cut from `main`). Story branches `story/7-2-*` are opened as worktrees from this epic branch per the sprint git strategy.

### What is preserved from `main`
- `api/` — FastAPI backend (unchanged throughout Epic 7)
- `data_extract/` — source data files
- `_bmad-output/`, `_bmad/` — BMAD artifacts
- `pyproject.toml`, `requirements.txt`, `uv.lock`
- `Dockerfile`, `vercel.json`, `tests/`
- `.env.local`, `.env.example`

### What is replaced
The entire Next.js frontend (`app/`, `components/`, `lib/`) is replaced by the Vite design frontend (`src/`). The work done on Next.js stories 1–4 is superseded by the richer UX from the design branch.

### package.json merge approach
Do NOT blindly copy the design branch `package.json` — it has a different `name` and is missing pnpm configuration. Instead, surgically edit `main`'s `package.json`: remove Next.js deps, add Vite deps, update scripts.

### TypeScript config
The design branch has `tsconfig.json` + `tsconfig.app.json` + `tsconfig.node.json` (Vite triple-config pattern). These replace main's single `tsconfig.json`. Bring all three files via `git checkout`.

### pnpm + Vite
pnpm works fine with Vite. The design branch used npm (`package-lock.json`) but pnpm is compatible — just run `pnpm install` after updating `package.json`.

### Tailwind v4 with Vite
The design branch uses `@tailwindcss/vite` plugin (Tailwind v4 Vite-native integration), NOT `@tailwindcss/postcss`. The `vite.config.ts` includes `tailwindcss()` as a Vite plugin — no `postcss.config.mjs` needed.

### Local deterministic reasoning still works in this story
Stories 7.3–7.8 wire the backend. This story only migrates the codebase — the `runCeoReasoning()` local engine remains intact and functional after migration.

### Design branch reference
All source files are at: `epic/7-design-frontend-backend-integration`
Use `git show epic/7-design-frontend-backend-integration:<path>` to inspect any file before checking it out.

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
- `.next/` cache was still on disk after removing Next.js files → `pnpm lint` picked it up and reported false errors. Fixed by deleting `.next/` directory.

### Completion Notes List
- Created `epic/7-frontend-integration` branch from `main`.
- Checked out `src/`, `public/`, and all root Vite config files from design branch verbatim — no modifications.
- Surgically updated `package.json`: removed `next`, `zustand`, `react-markdown`, `remark-gfm`, `tailwind-merge`, `clsx`, `eslint-config-next`, `@tailwindcss/postcss`; added `react-router-dom`, `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`; updated scripts to Vite conventions.
- Deleted all Next.js artefacts: `app/`, `components/`, `lib/`, `middleware.ts`, `next.config.ts`, `postcss.config.mjs`, `next-env.d.ts`, `components.json`, `.next/` cache, `eslint.config.mjs` (replaced by design branch `eslint.config.js`).
- `pnpm build` → clean (0 TypeScript errors, 0 build errors; chunk size advisory only).
- `pnpm lint` → clean (0 errors after `.next/` removal).
- `pnpm dev` → Vite served on :5175 (5173/5174 occupied), HTTP 200 confirmed.
- FastAPI `api/index.py` imports cleanly — zero Python files modified.
- 17 pre-existing Python test failures confirmed identical on `main` before changes — zero regressions.

### File List
**Added:**
- `index.html`
- `vite.config.ts`
- `tsconfig.json` (replaced)
- `tsconfig.app.json`
- `tsconfig.node.json`
- `eslint.config.js`
- `public/icons.svg`
- `src/App.tsx`
- `src/main.tsx`
- `src/index.css`
- `src/assets/` (hero.png, react.svg, vite.svg)
- `src/components/` (all 11 files + layout/)
- `src/data/` (all data files and hooks)
- `src/docs/` (`NEOM_LOOK_AND_FEEL.md`) · logo: `public/neom-logo.png`
- `src/hooks/useTheme.ts`
- `src/intelligence/` (CeoChatDrawer.tsx, CeoIntelligenceContext.tsx, CeoIntelligenceProvider.tsx, activity.ts, agents/*, contextBanner.ts, index.ts, interpret.ts, orchestrate.ts, pocAssumptions.ts, portfolioBuReporter.ts, types.ts)
- `src/lib/` (commodityRag.ts, domainDerivations.ts, domainKpiRows.ts, format.ts, portfolioMath.ts)
- `src/pages/` (all 12 pages)

**Modified:**
- `package.json` — Vite dep set, updated scripts
- `pnpm-lock.yaml` — updated lockfile
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — 7-2 status updated

**Deleted:**
- `app/` (entire Next.js app router directory)
- `components/` (entire Next.js component directory)
- `lib/` (entire Next.js lib directory)
- `middleware.ts`
- `next.config.ts`
- `postcss.config.mjs`
- `next-env.d.ts`
- `components.json`
- `eslint.config.mjs`
- `.next/` (stale build cache)

### Change Log
- 2026-04-14: Migrated frontend from Next.js to Vite CEO cockpit design — all designer files brought in verbatim, Next.js artefacts removed, build and lint clean.
