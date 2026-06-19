# Story 2.3: KPI Scorecards and Trend Charts UI

**Story ID:** 2.3
**Story Key:** 2-3-kpi-scorecards-and-trend-charts-ui
**Epic:** Epic 2 — Data Layer + KPI Dashboard
**Status:** done
**Date Created:** 2026-04-10

---

## User Story

As an executive,
I want to see KPI scorecards with actual vs. plan for each BU and trend charts for key metrics,
so that I can assess BU performance at a glance without opening any spreadsheet.

---

## Context and Business Value

This story wires the existing hardcoded UI shell (Story 1.2) to real scored data from Epic 2's backend. The walking skeleton approach applies: implement against `GET /api/kpi/{bu}` — if backend is not yet deployed, fall back to extended `lib/data.ts` hardcoded data that matches the API response shape exactly. By end of this story, executives can navigate between BU views and see accurate KPI scorecards, trend charts for all 4 BUs × 4 metrics, and a corporate aggregated view.

**Dependencies:** Story 2.2 backend (preferred) — but story is unblocked via walking skeleton.

---

## Acceptance Criteria

**AC1:** Given the KPI API endpoint returns scored data for a BU, when I navigate to a BU view, then KPI scorecards display: KPI name, actual value, plan value, 2030/2040 targets, and a status indicator (color-coded: green = on_track, amber = at_risk, red = off_track).

**AC2:** Trend charts render for production volumes, capex burn, leverage ratio, and EBITDA contribution using Recharts — one chart per metric, for all 4 BUs.

**AC3:** A time period filter (e.g. YTD, Q1, Q2, Q3, Q4) is present in the TopBar and updates the displayed data.

**AC4:** A consolidated corporate view at `/dashboard/corporate` aggregates all 4 BUs on a single screen.

**AC5:** Switching between BU views completes in <500ms (NFR4) — client-side routing, no re-fetching on tab switch.

**AC6:** No financial data is persisted client-side beyond the current session (NFR8) — no localStorage, no sessionStorage writes.

---

## Tasks / Subtasks

- [x] T1: Extend type system (AC: 1)
  - [x] T1.1: Update `lib/types.ts` — add `target2030?: number` and `target2040?: number` to `KpiRecord`
  - [x] T1.2: Add `TrendSeries` type: `{ metric: string; bu: BuCode; points: TrendPoint[] }`
  - [x] T1.3: Add `TimePeriod` type: `'YTD' | 'Q1' | 'Q2' | 'Q3' | 'Q4'`

- [x] T2: Extend hardcoded data (AC: 1, 2)
  - [x] T2.1: Update `lib/data.ts` — add `target2030` and `target2040` to all existing `KpiRecord` entries in `BU_KPI_DATA`
  - [x] T2.2: Add trend data for all 4 BUs × 4 metrics (production_volume, capex_burn, leverage_ratio, ebitda_contribution) — 6 quarterly data points each — as `TREND_DATA: TrendSeries[]`
  - [x] T2.3: Keep `PHOSPHATE_PRODUCTION_TREND` for backward compatibility but no longer use it in components

- [x] T3: Fix KPI scorecard display (AC: 1)
  - [x] T3.1: Update `components/dashboard/KpiCard.tsx` — add `target2030` and `target2040` props; display them below plan value (e.g. "2030: 12.0Mt | 2040: 15.0Mt")
  - [x] T3.2: Update `components/dashboard/KpiGrid.tsx` — accept `buCode: BuCode` prop; filter `BU_KPI_DATA` to only the selected BU's records (currently shows all 4 BUs always)
  - [x] T3.3: Update `app/dashboard/[bu]/page.tsx` — pass `buCode` param down to `<KpiGrid buCode={bu} />`

- [x] T4: Make TrendChart dynamic (AC: 2)
  - [x] T4.1: Refactor `components/dashboard/TrendChart.tsx` — accept `buCode: BuCode` and `metric: string` props; look up `TREND_DATA` by those keys instead of hardcoding Phosphate production
  - [x] T4.2: Add chart title displaying `${metric} — ${buLabel}` above the chart
  - [x] T4.3: Update `app/dashboard/[bu]/page.tsx` — render 4 `<TrendChart>` instances (one per metric) for the selected BU

- [x] T5: Add time period filter (AC: 3)
  - [x] T5.1: Update `components/layout/TopBar.tsx` — replace period filter placeholder with functional `<Select>` (shadcn) showing YTD, Q1, Q2, Q3, Q4
  - [x] T5.2: Add `usePeriodFilter` store in `lib/shellStore.ts` (Zustand) — `period: TimePeriod`, `setPeriod` action; default `'YTD'`
  - [x] T5.3: Filter `TREND_DATA` points by selected period in `TrendChart.tsx` — YTD = all points; Q1/Q2/Q3/Q4 = only that quarter's data point(s)

- [x] T6: Add corporate view (AC: 4)
  - [x] T6.1: Create `app/dashboard/corporate/page.tsx` — server component; renders 4 BU sections in a 2×2 grid each with `<KpiGrid buCode={bu} />` and a section label
  - [x] T6.2: Update `components/layout/Sidebar.tsx` — add "Corporate" entry in Module 1 BU sub-nav linking to `/dashboard/corporate`
  - [x] T6.3: Update `app/dashboard/[bu]/page.tsx` BU validation — ensure `corporate` is not treated as a valid `BuCode` (it's a separate route)

- [x] T7: API integration path (walking skeleton → real API) (AC: 1, 5, 6)
  - [x] T7.1: Create `lib/api.ts` — `fetchKpis(bu: BuCode): Promise<KpiRecord[]>` that calls `GET /api/kpi/{bu}`; falls back to `BU_KPI_DATA` mock if `NEXT_PUBLIC_USE_MOCK_DATA=true` or on network error
  - [x] T7.2: Update `app/dashboard/[bu]/page.tsx` — call `fetchKpis(bu)` and pass result to `<KpiGrid>`; keep server component (no `'use client'`)
  - [x] T7.3: Never write API response data to localStorage or sessionStorage (AC6 compliance)

---

## Dev Notes

### Critical Bugs to Fix

1. **`KpiGrid` shows all 4 BUs regardless of route** — `KpiGrid` currently maps over all keys in `BU_KPI_DATA`. It must receive and respect `buCode` prop. Fix in T3.2.

2. **`TrendChart` is hardcoded to Phosphate production** — line 1 of `TrendChart.tsx` imports `PHOSPHATE_PRODUCTION_TREND` directly. Must be replaced with dynamic lookup. Fix in T4.1.

3. **`KpiRecord` is missing `target2030`/`target2040`** — PRD FR4 requires "actuals vs. plan vs. 2030/2040 targets". These fields are currently absent from the type. Fix in T1.1.

4. **`ScenarioInput` is not defined** error in `app/dashboard/[bu]/page.tsx:35` — a `<ScenarioInput />` reference was added but the component was never created/imported. Remove it from the page or stub it out as a `<ModulePlaceholder>` during this story (it belongs to Epic 4).

### File Inventory — What Exists vs. What Needs Changing

| File | Exists | Change Needed |
|------|--------|--------------|
| `lib/types.ts` | ✓ | Add `target2030?`, `target2040?`, `TrendSeries`, `TimePeriod` |
| `lib/data.ts` | ✓ | Add targets to all records; add `TREND_DATA` for all 4 BUs × 4 metrics |
| `lib/store.ts` | Unknown | Create if missing — add `usePeriodFilter` Zustand store |
| `lib/api.ts` | Unknown — likely missing | Create: `fetchKpis()` with mock fallback |
| `components/dashboard/KpiCard.tsx` | ✓ (54 lines) | Add `target2030?`/`target2040?` props and display |
| `components/dashboard/KpiGrid.tsx` | ✓ (32 lines) | Accept `buCode` prop, filter data |
| `components/dashboard/TrendChart.tsx` | ✓ (73 lines) | Accept `buCode` + `metric` props, dynamic data |
| `components/layout/TopBar.tsx` | ✓ | Replace period placeholder with functional Select |
| `components/layout/Sidebar.tsx` | ✓ | Add "Corporate" BU nav entry |
| `app/dashboard/[bu]/page.tsx` | ✓ | Pass `buCode` to KpiGrid; render 4 TrendCharts; fix ScenarioInput error |
| `app/dashboard/corporate/page.tsx` | ✗ | Create new |

### Data Structure for TREND_DATA

```typescript
// lib/data.ts
export const TREND_DATA: TrendSeries[] = [
  { metric: 'production_volume', bu: 'phosphate', points: [...] },
  { metric: 'production_volume', bu: 'aluminum',  points: [...] },
  { metric: 'production_volume', bu: 'gold',      points: [...] },
  { metric: 'production_volume', bu: 'copper',    points: [...] },
  { metric: 'capex_burn',        bu: 'phosphate', points: [...] },
  // ... 16 entries total (4 metrics × 4 BUs)
];
```

Lookup helper in `TrendChart.tsx`:
```typescript
const series = TREND_DATA.find(s => s.bu === buCode && s.metric === metric);
```

Use plausible but hardcoded values. For YTD, provide 6 quarterly data points (Q1 2024 – Q2 2025). For quarterly filter, each point has a `quarter: 'Q1' | 'Q2' | ...` field so the component can filter.

### API Contract (`GET /api/kpi/{bu}`)

Expected response shape (must match what `fetchKpis()` normalizes to):
```typescript
// Matches BuKpiData: KpiRecord[]
[
  {
    name: "Production Volume",
    actual: 9.8,
    plan: 10.5,
    target2030: 12.0,
    target2040: 15.0,
    unit: "Mt",
    status: "at_risk"
  },
  // ... 3 more KPIs
]
```

Walking skeleton: if backend is unavailable, `fetchKpis()` silently falls back to `lib/data.ts`. No error state shown — this is intentional per Epic 2 design.

### Architecture Compliance

- `app/dashboard/[bu]/page.tsx` and `app/dashboard/corporate/page.tsx` must remain **async server components** — no `'use client'` at page level. Data fetching happens server-side via `fetchKpis()`.
- `TrendChart.tsx` stays `'use client'` (Recharts requirement).
- `TopBar.tsx` must become `'use client'` if it holds interactive Select state — or hoist period state to Zustand so TopBar reads/writes store.
- **Zustand store**: use the existing pattern from `lib/store.ts` if it exists; if not, create it following the same pattern as Story 1.2. Shell-level state only.
- **Component file size**: KpiCard ≤ 100 lines, TrendChart ≤ 120 lines, KpiGrid ≤ 60 lines (architecture constraint).
- **Naming**: component files PascalCase, util files camelCase. No `.jsx` — always `.tsx`.
- **shadcn Select**: use `import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"`. Run `npx shadcn add select` if not installed.

### Token System (do not use raw hex values)

```css
/* Use these CSS vars from globals.css */
--ma-stone-50:  #f4f1ea  /* page background */
--ma-charcoal:  #1a1c1b  /* nav */
--ma-gold:      #b8956a  /* active/accent */
--ma-teal:      #2d6a66  /* data/CTA */
--ma-on-track:  green variant
--ma-at-risk:   amber variant
--ma-off-track: red variant
```

Status colors in `KpiCard.tsx`: match the existing `status` → badge color mapping already present in the component — do not change the pattern, just extend with the new target fields.

### Previous Story Learnings (from Story 1.2)

- `TrendChart.tsx` uses Recharts `LineChart` with `ResponsiveContainer` — follow the same chart wrapper pattern, don't reinvent.
- `KpiCard.tsx` uses shadcn `Badge` for status — continue that pattern.
- Page-level data is passed as props to `'use client'` components — never import `lib/data.ts` directly in a client component.
- `pnpm` is the package manager — use `pnpm add` not `npm install`.
- shadcn components are already installed: `card`, `badge`, `input`, `scroll-area`. Check before installing `select`.

### Git Intelligence

Recent commits show:
- `feat(branding): rebrand to CEO Cockpit` — confirms NEOM CEO Cockpit design language must be maintained
- `fix(build): exclude repo_design from TypeScript` — tsconfig has exclusions; don't touch tsconfig
- Turbopack root fix already in `next.config.ts` — don't modify that file

### Known Issue to Fix

`app/dashboard/[bu]/page.tsx` line 35 has `<ScenarioInput />` which is not defined anywhere. This causes a runtime `ReferenceError`. **Fix immediately as part of T3.3**: remove the import/usage and replace with `<ModulePlaceholder label="Scenario Analysis" note="Coming in Epic 4" />` (component already exists from Story 1.2).

### Testing Notes

- No automated tests required for this story (Epic 1 pattern: visual validation)
- Manual validation: open `/dashboard/phosphate`, `/dashboard/aluminum`, `/dashboard/gold`, `/dashboard/copper`, `/dashboard/corporate` — all must render without console errors
- Period filter: switch from YTD → Q1 → Q2 — trend chart data points must change
- NetworkTab: confirm no requests to localStorage/sessionStorage

### Project Structure Notes

```
app/
  dashboard/
    [bu]/
      page.tsx          ← modify
    corporate/
      page.tsx          ← CREATE NEW
    layout.tsx          ← do not touch
components/
  dashboard/
    KpiCard.tsx         ← modify
    KpiGrid.tsx         ← modify
    TrendChart.tsx      ← modify
  layout/
    TopBar.tsx          ← modify
    Sidebar.tsx         ← modify
lib/
  types.ts              ← modify
  data.ts               ← modify
  api.ts                ← create
  store.ts              ← create or modify
```

### References

- Acceptance Criteria: [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3]
- API contract `GET /api/kpi/{bu}`: [Source: _bmad-output/planning-artifacts/architecture.md#API Layer]
- Frontend architecture patterns: [Source: _bmad-output/planning-artifacts/architecture.md#Frontend]
- Walking skeleton approach: [Source: _bmad-output/planning-artifacts/epics.md#Epic 2]
- NFR4 (<500ms), NFR8 (no client persistence): [Source: _bmad-output/planning-artifacts/epics.md#NFR]
- FR4 (2030/2040 targets): [Source: _bmad-output/planning-artifacts/epics.md#FR Coverage Map]
- Design token system: [Source: _bmad-output/planning-artifacts/design-system.md]

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — story shipped clean with no regressions.

### Completion Notes List

- T1: `lib/types.ts` extended — `KpiRecord` now includes `target2030?`/`target2040?`; `TrendSeries`, `TrendPoint`, `TimePeriod`, and `BuKpiData` types added.
- T2: `lib/data.ts` extended — all 4 BU KPI records include targets; `TREND_DATA` (16 entries: 4 metrics × 4 BUs, 6 quarterly points each) added. `PHOSPHATE_PRODUCTION_TREND` retained for backward compat.
- T3: `KpiCard.tsx` displays `target2030`/`target2040` below plan; `KpiGrid.tsx` accepts `buCode` prop and filters data to the selected BU only.
- T4: `TrendChart.tsx` fully dynamic — accepts `buCode` + `metric` props, looks up from `TREND_DATA`. Chart title renders `${metric} — ${buLabel}`. BU page renders 4 chart instances.
- T5: Period filter wired via `lib/shellStore.ts` (Zustand) — `usePeriodStore` with `period: TimePeriod` and `setPeriod`; `TopBar.tsx` renders functional shadcn `<Select>`; `TrendChart.tsx` filters points by selected period.
- T6: `app/dashboard/corporate/page.tsx` created — 2×2 grid of all 4 BUs, each with `<KpiGrid buCode={code} />` and section label. `Sidebar.tsx` updated with "Corporate" sub-nav link. `[bu]/page.tsx` validated against `BuCode` type — `corporate` route is unreachable via the dynamic segment.
- T7: `lib/api.ts` created — `fetchKpis()` calls `GET /api/kpi/{bu}` with silent mock fallback on error or when `NEXT_PUBLIC_USE_MOCK_DATA=true`. `[bu]/page.tsx` calls `fetchKpis()` server-side; no client-side persistence.

### File List

- `lib/types.ts` (modified — added TimePeriod, KpiRecord targets, TrendSeries, TrendPoint, BuKpiData)
- `lib/data.ts` (modified — added target2030/40 to all KPI records, added TREND_DATA 16-entry array)
- `lib/shellStore.ts` (modified — added usePeriodStore with TimePeriod state)
- `lib/api.ts` (new — fetchKpis with mock fallback)
- `components/dashboard/KpiCard.tsx` (modified — target2030/40 display)
- `components/dashboard/KpiGrid.tsx` (modified — buCode prop, filtered data)
- `components/dashboard/TrendChart.tsx` (modified — dynamic buCode + metric props, period filter)
- `components/layout/TopBar.tsx` (modified — functional period Select)
- `components/layout/Sidebar.tsx` (modified — Corporate sub-nav entry)
- `app/dashboard/[bu]/page.tsx` (modified — fetchKpis call, 4 TrendChart instances)
- `app/dashboard/corporate/page.tsx` (new — 2×2 BU grid corporate view)
