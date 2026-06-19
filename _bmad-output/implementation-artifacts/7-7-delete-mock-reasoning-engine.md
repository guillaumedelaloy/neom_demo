# Story 7.7: Delete Local Mock Reasoning Engine

Status: review

## Story

As a developer,
I want all local deterministic agent files removed,
so that the codebase contains no dead code and the TypeScript build is clean.

## Acceptance Criteria

1. The following files are deleted:
   - `src/intelligence/orchestrate.ts`
   - `src/intelligence/interpret.ts`
   - `src/intelligence/pocAssumptions.ts`
   - `src/intelligence/activity.ts`
   - `src/intelligence/agents/valueLens.ts`
   - `src/intelligence/agents/deliveryEngine.ts`
   - `src/intelligence/agents/riskRadar.ts`
   - `src/intelligence/agents/gapFinder.ts`
   - `src/intelligence/agents/actionDesk.ts`
2. The following types are removed from `src/intelligence/types.ts`: `CeoAnswer`, `AgentBreakdownEntry`, `CeoIntent`, `CeoDataSnapshot`, `ReasoningScratchpad`.
3. `pnpm build` exits with code 0 — zero TypeScript errors.
4. `pnpm lint` exits with code 0.
5. No import of any deleted file remains in the codebase.

## Tasks / Subtasks

- [x] Task 1 — Delete mock agent files (AC: #1)
  - [x] Delete `src/intelligence/orchestrate.ts`
  - [x] Delete `src/intelligence/interpret.ts`
  - [x] Delete `src/intelligence/pocAssumptions.ts`
  - [x] Delete `src/intelligence/activity.ts`
  - [x] Delete `src/intelligence/agents/valueLens.ts`
  - [x] Delete `src/intelligence/agents/deliveryEngine.ts`
  - [x] Delete `src/intelligence/agents/riskRadar.ts`
  - [x] Delete `src/intelligence/agents/gapFinder.ts`
  - [x] Delete `src/intelligence/agents/actionDesk.ts`
  - [x] If `src/intelligence/agents/` directory is now empty, delete the directory too

- [x] Task 2 — Remove dead types from `src/intelligence/types.ts` (AC: #2)
  - [x] Remove type `CeoAnswer` and all its fields
  - [x] Remove type `AgentBreakdownEntry`
  - [x] Remove type `CeoIntent`
  - [x] Remove type `CeoDataSnapshot`
  - [x] Remove type `ReasoningScratchpad`
  - [x] Verify remaining types (`AgentId`, `AgentLogEvent`, `CeoContext`, `BackendMessage`) are intact

- [x] Task 3 — Confirm no remaining imports (AC: #5)
  - [x] Grep for any remaining imports of the deleted files: none found
  - [x] Grep for any remaining uses of deleted types: none found
  - [x] Fix any remaining references before proceeding

- [x] Task 4 — Validation (AC: #3, #4)
  - [x] Run `pnpm build` — 0 errors
  - [x] Run `pnpm lint` — 0 errors

## Dev Notes

### Prerequisite: Stories 7.3–7.6 must be done
This story assumes `CeoIntelligenceProvider` no longer imports `runCeoReasoning` (done in Story 7.5) and `CeoChatDrawer` no longer uses `CeoAnswer` (done in Story 7.6). Delete only after those stories are complete.

### `contextBanner.ts` and `portfolioBuReporter.ts`
These files are NOT deleted — they remain in `src/intelligence/` and may still be used by `CeoIntelligenceProvider` for context building (scope banners). Verify before deleting anything beyond the list above.

### `src/data/` files are NOT deleted
`buildCeoDataSnapshot` used hooks like `usePortfolioData` and `useRiskData` from `src/data/`. Those data files remain — they power the dashboard pages independently of the chat engine.

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
None — clean deletion. `CeoIntelligenceProvider` already migrated to `useBackendChat` in Story 7.5 so no live references to the deleted files existed outside of `index.ts`.

### Completion Notes List
- Deleted all 9 mock agent files + `agents/` directory (now empty)
- Removed 5 dead types from `types.ts`: `CeoAnswer`, `AgentBreakdownEntry`, `CeoIntent`, `CeoDataSnapshot`, `ReasoningScratchpad`
- Also removed unused `import type { GrowthProjectDetail, Project } from '../data/types'` from `types.ts` (was only needed by `CeoDataSnapshot`)
- Cleaned `index.ts`: removed dead type re-exports and `orchestrate` function exports; kept `AgentId`, `AgentLogEvent`, `CeoContext`, `CeoScope`, `useCeoIntelligence`, `CeoIntelligenceProvider`, `reportPortfolioBuFilterForChat`
- Grep confirmed 0 remaining references to deleted modules or types across all `src/**/*.{ts,tsx}`
- `pnpm build` and `pnpm lint` both exit 0

### File List
- src/intelligence/orchestrate.ts (deleted)
- src/intelligence/interpret.ts (deleted)
- src/intelligence/pocAssumptions.ts (deleted)
- src/intelligence/activity.ts (deleted)
- src/intelligence/agents/valueLens.ts (deleted)
- src/intelligence/agents/deliveryEngine.ts (deleted)
- src/intelligence/agents/riskRadar.ts (deleted)
- src/intelligence/agents/gapFinder.ts (deleted)
- src/intelligence/agents/actionDesk.ts (deleted)
- src/intelligence/agents/ (directory deleted)
- src/intelligence/types.ts (removed 5 dead types + unused import)
- src/intelligence/index.ts (removed dead exports)

### Change Log
- 2026-04-14: Deleted mock reasoning engine (9 files, 1 directory), cleaned types.ts and index.ts — Story 7.7 complete
