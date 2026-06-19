# Story 7.3: Vite Proxy + API Environment Config

Status: review

## Story

As a developer,
I want the Vite dev server to proxy `/api/*` to the Python backend automatically, and the fetch URL to be driven by an environment variable in production,
so that no hardcoded `localhost` URLs appear in application code and local dev works without manual config per developer.

## Acceptance Criteria

1. `vite.config.ts` has a `server.proxy` entry: `'/api' → { target: 'http://localhost:8000', changeOrigin: true }` — requests to `/api/*` during `pnpm dev` are forwarded to the FastAPI backend with no CORS errors.
2. `src/lib/api.ts` (≤15 lines) exports `getApiBase(): string` — the only place the API base URL logic lives in the codebase.
3. When `VITE_API_BASE_URL` is set (e.g. to the GCP Cloud Run URL), `getApiBase()` returns that value.
4. When `VITE_API_BASE_URL` is unset, `getApiBase()` returns `""` (empty string) — frontend calls `/api/query`, which is proxied in dev and resolves via same-origin in production.
5. `.env.example` documents `VITE_API_BASE_URL=` with a one-line comment explaining its purpose.
6. `pnpm build` exits with code 0 after the changes.

## Tasks / Subtasks

- [x] Task 1 — Add dev proxy to `vite.config.ts` (AC: #1)
  - [x] Add `server: { proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } } }` to the `defineConfig` call
  - [x] Verify existing `plugins: [react(), tailwindcss()]` are unchanged

- [x] Task 2 — Create `src/lib/api.ts` (AC: #2, #3, #4)
  - [x] Create `src/lib/api.ts` with single exported function `getApiBase()`
  - [x] Implementation: `export function getApiBase(): string { return import.meta.env.VITE_API_BASE_URL ?? '' }`
  - [x] File must be ≤15 lines including any type comment

- [x] Task 3 — Document env var (AC: #5)
  - [x] Add `VITE_API_BASE_URL=` to `.env.example` with comment: `# Set to backend URL in production (e.g. https://your-api.run.app); leave blank for local dev proxy`

- [x] Task 4 — Validation (AC: #6)
  - [x] Run `pnpm build` — 0 errors
  - [x] Run `pnpm lint` — 0 errors
  - [x] With both `pnpm dev` and `uvicorn api.main:app --reload` running: open app, verify no CORS errors in browser console when chat would normally call the backend

## Dev Notes

### `vite.config.ts` final shape
```ts
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
```

### `src/lib/api.ts` final shape
```ts
// Returns the API base URL. Empty string = same-origin (proxied in dev, direct in prod).
export function getApiBase(): string {
  return import.meta.env.VITE_API_BASE_URL ?? ''
}
```

### Usage in later stories
`useBackendChat` (Story 7.4) will call `getApiBase()` to construct the fetch URL:
```ts
const url = `${getApiBase()}/api/query`
```

### Note on `src/lib/` vs `src/intelligence/`
`src/lib/` already exists in the design branch (`src/lib/format.ts`, `src/lib/portfolioMath.ts` etc.). Add `api.ts` alongside these existing files.

### FastAPI backend port
The FastAPI backend runs on port `8000` by default (`uvicorn api.main:app --reload`). Do not change the proxy target.

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
(none)

### Completion Notes List
- Added `server.proxy` block to `vite.config.ts` — existing `plugins` array unchanged.
- Created `src/lib/api.ts` (4 lines) — `getApiBase()` reads `VITE_API_BASE_URL`, falls back to `""` for same-origin proxy behaviour.
- Added `VITE_API_BASE_URL=` to `.env.example` alongside existing backend connection vars.
- `pnpm build` → clean, `pnpm lint` → clean.

### File List
**Modified:**
- `vite.config.ts` — added `server.proxy` for `/api` → `:8000`
- `.env.example` — added `VITE_API_BASE_URL=` with comment
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — 7-3 status updated

**Added:**
- `src/lib/api.ts` — `getApiBase()` utility (4 lines)

### Change Log
- 2026-04-14: Added Vite dev proxy for `/api` → FastAPI :8000; created `src/lib/api.ts` with `getApiBase()`.
