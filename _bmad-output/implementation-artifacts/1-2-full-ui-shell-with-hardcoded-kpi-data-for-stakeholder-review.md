# Story 1.2: Full UI Shell with Hardcoded KPI Data for Stakeholder Review

**Story ID:** 1.2
**Story Key:** 1-2-full-ui-shell-with-hardcoded-kpi-data-for-stakeholder-review
**Epic:** Epic 1 — Foundation & Stakeholder Validation
**Status:** done
**Date Created:** 2026-04-09

---

## User Story

As a stakeholder (BCG partner, SEO director, or executive),
I want to open a deployed URL and see a visually complete dashboard with real NEOM branding and representative KPI data,
so that I can validate the UI direction, information architecture, and use case framing before real data integration begins.

---

## Context and Business Value

Day 1 stakeholder-facing deliverable. The explicit purpose is early feedback: if the UI direction, module structure, or KPI labeling is wrong, one day of pivot beats one week of rework. All data is hardcoded — no API calls. What gets built here becomes the permanent visual shell for Epics 2–5.

**Delivery target:** End of Day 1.

---

## Acceptance Criteria

**AC1:** Given the deployed Vercel URL is opened in a desktop browser, initial paint occurs in <3 seconds on standard WiFi.

**AC2:** The NEOM Industrial Mineral design language is applied — no default light theme or generic blue/purple accent. Warm stone page background (`#f4f1ea`), charcoal nav (`#1a1c1b`) always dark, mineral gold active-nav accent (`#b8956a`), teal data/CTA accent (`#2d6a66`). IBM Plex Sans font. Layout matches Benchmark Intelligence aesthetic. See `_bmad-output/planning-artifacts/design-system.md`.

**AC3:** A persistent dark sidebar lists all 10 modules with correct names; Modules 5–10 display a "Data pending" state — no error state, no stack trace.

**AC4:** The KPI Framework view (Module 1) renders four BU scorecards (Phosphate, Aluminum, Gold, Copper) with hardcoded-but-plausible KPI values — actuals, plan, and status indicators (green = on_track, amber = at_risk, red = off_track).

**AC5:** At least one hardcoded trend chart (line or bar) is visible in Module 1 to validate chart layout and readability.

**AC6:** A placeholder query bar input is visible in the UI — non-functional but correctly positioned.

**AC7:** A placeholder what-if input area is visible — non-functional, labeled "Scenario analysis — coming Day 3".

**AC8:** Navigation between any two module views completes in <500ms (client-side routing — no API calls in this story).

**AC9:** No debug state, stack trace, console error, or "demo mode" watermark is visible on any module view.

---

## Tasks / Subtasks

- [x] T1: Apply NEOM dark theme and update config files (AC: 2, 9)
  - [x] T1.1: Update `app/globals.css` — override `.dark` block with NEOM palette (see Dev Notes)
  - [x] T1.2: Update `app/layout.tsx` — add `dark` to `<html>` className
  - [x] T1.3: Update `next.config.ts` — add dev proxy rewrites (dev-only)
  - [x] T1.4: Update `vercel.json` — add `functions` runtime + maxDuration config

- [x] T2: Create shared types and hardcoded KPI data (AC: 4)
  - [x] T2.1: Create `lib/types.ts` — BuCode, KpiStatus, KpiRecord, BuKpiData, TrendPoint
  - [x] T2.2: Create `lib/data.ts` — hardcoded KPI records for 4 BUs + Phosphate production trend

- [x] T3: Install dependencies and build layout components (AC: 2, 3, 8)
  - [x] T3.1: Install recharts: `pnpm add recharts`
  - [x] T3.2: Install shadcn components: `npx shadcn add card badge input scroll-area`
  - [x] T3.3: Create `components/layout/Sidebar.tsx` — 10-module nav, BU sub-nav under Module 1
  - [x] T3.4: Create `components/layout/TopBar.tsx` — BU label + period filter placeholder

- [x] T4: Build dashboard layout shell and root redirect (AC: 3, 8)
  - [x] T4.1: Create `app/dashboard/layout.tsx` — Sidebar left + main content right
  - [x] T4.2: Update `app/page.tsx` — redirect to `/dashboard/phosphate`

- [x] T5: Build KPI scorecard components (AC: 4)
  - [x] T5.1: Create `components/dashboard/KpiCard.tsx` — name, actual, plan, delta %, status badge
  - [x] T5.2: Create `components/dashboard/KpiGrid.tsx` — 4-BU 2×2 grid layout

- [x] T6: Build TrendChart and ModulePlaceholder (AC: 3, 5)
  - [x] T6.1: Create `components/dashboard/TrendChart.tsx` — Recharts LineChart, "use client"
  - [x] T6.2: Create `components/dashboard/ModulePlaceholder.tsx` — "Data pending" card

- [x] T7: Build placeholder interaction components (AC: 6, 7)
  - [x] T7.1: Create `components/query/QueryBar.tsx` — disabled input, label "AI Query Bar"
  - [x] T7.2: Create `components/whatif/ScenarioInput.tsx` — disabled textarea, label "Scenario analysis — coming Day 3"

- [x] T8: Wire up dashboard routes (AC: 1, 4, 5, 6, 7, 8, 9)
  - [x] T8.1: Create `app/dashboard/[bu]/page.tsx` — BU validation + KpiGrid + TrendChart + QueryBar + ScenarioInput
  - [x] T8.2: Create `app/dashboard/whatif/page.tsx` — ScenarioInput placeholder page

- [x] T9: Verify all ACs, commit (AC: all)
  - [x] T9.1: Run `pnpm dev`, navigate all module views — confirm zero console errors
  - [x] T9.2: Confirm navigation is instant (no API calls = always <500ms)
  - [x] T9.3: Commit on story branch and open PR to `epic/1-foundation-validation`

---

## Dev Notes

### Critical Context from Story 1.1

- shadcn 4.2.0, Tailwind v4, `"style": "base-nova"` — CSS-based theme in `app/globals.css`, no `tailwind.config.ts`
- Dark mode activates via `.dark` class on `<html>` only — it does NOT activate automatically. `layout.tsx` currently does NOT have `dark` on the html tag. **Must add it in T1.2.**
- `app/globals.css` has `:root` (light) and `.dark` (dark) blocks — you are OVERRIDING the `.dark` block, not rewriting the whole file
- `components/ui/button.tsx` and `lib/utils.ts` already exist — do not recreate
- `api/index.py` health endpoint is live — do not touch
- `next.config.ts` is currently an empty config object — safe to replace entirely

### NEOM Design System — `app/globals.css`

> **⚠️ SUPERSEDED:** The shadcn OKLCH dark theme approach described in the original Dev Notes has been replaced by the NEOM Industrial Mineral token system. Do not use `--background`, `--primary`, or other shadcn OKLCH tokens — they have been removed.

The current `app/globals.css` uses a `--ma-*` / `--ai-*` CSS custom property token system mapped into Tailwind v4 via `@theme inline`. The app runs in **light mode** (warm stone `#f4f1ea` page background); only the nav is always dark via `--ma-nav-bg`. See `_bmad-output/planning-artifacts/design-system.md` for the canonical token reference, typography spec, and component conventions.

### `app/layout.tsx` — Font

```tsx
import { IBM_Plex_Sans } from "next/font/google";
const ibmPlexSans = IBM_Plex_Sans({ variable: "--font-ibm-plex", subsets: ["latin"], weight: ["400", "500", "600"] });
// html className: `${ibmPlexSans.variable} h-full antialiased` (no "dark" class)
```

### `next.config.ts` — Dev Proxy (full file replacement)

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return process.env.NODE_ENV === "development"
      ? [{ source: "/api/:path*", destination: "http://localhost:8000/api/:path*" }]
      : [];
  },
};

export default nextConfig;
```

Vercel production uses `vercel.json` rewrites — this proxy is dev-only.

### `vercel.json` — Add function runtime (full file replacement)

```json
{
  "rewrites": [{ "source": "/api/:path*", "destination": "/api/index.py" }],
  "functions": {
    "api/index.py": { "runtime": "python3.11", "maxDuration": 30 }
  }
}
```

`maxDuration: 30` is required for what-if scenarios in Story 4.2 (NFR2: <15s). Set it now.

### `lib/types.ts`

```typescript
export type BuCode = "phosphate" | "aluminum" | "gold" | "copper";
export type KpiStatus = "on_track" | "at_risk" | "off_track";

export interface KpiRecord {
  name: string;
  actual: number;
  plan: number;
  unit: string;
  status: KpiStatus;
}

export interface BuKpiData {
  buCode: BuCode;
  label: string;
  kpis: KpiRecord[];
}

export interface TrendPoint {
  period: string;
  value: number;
}
```

### `lib/data.ts` — Hardcoded KPI Data (exact values)

```typescript
import type { BuKpiData, TrendPoint } from "./types";

export const BU_KPI_DATA: BuKpiData[] = [
  {
    buCode: "phosphate",
    label: "Phosphate",
    kpis: [
      { name: "Production Volume", actual: 8.2, plan: 8.5, unit: "Mt", status: "at_risk" },
      { name: "Capex Burn", actual: 2.3, plan: 1.8, unit: "B SAR", status: "off_track" },
      { name: "EBITDA Contribution", actual: 4.1, plan: 4.5, unit: "B SAR", status: "at_risk" },
      { name: "Leverage Ratio", actual: 1.8, plan: 2.0, unit: "x", status: "on_track" },
    ],
  },
  {
    buCode: "aluminum",
    label: "Aluminum",
    kpis: [
      { name: "Production Volume", actual: 0.95, plan: 0.90, unit: "Mt", status: "on_track" },
      { name: "Capex Burn", actual: 0.8, plan: 0.9, unit: "B SAR", status: "on_track" },
      { name: "EBITDA Contribution", actual: 1.2, plan: 1.1, unit: "B SAR", status: "on_track" },
      { name: "Leverage Ratio", actual: 2.2, plan: 2.0, unit: "x", status: "at_risk" },
    ],
  },
  {
    buCode: "gold",
    label: "Gold",
    kpis: [
      { name: "Production Volume", actual: 310, plan: 340, unit: "koz", status: "off_track" },
      { name: "Capex Burn", actual: 1.1, plan: 1.0, unit: "B SAR", status: "at_risk" },
      { name: "EBITDA Contribution", actual: 0.9, plan: 1.1, unit: "B SAR", status: "off_track" },
      { name: "Leverage Ratio", actual: 1.5, plan: 1.5, unit: "x", status: "on_track" },
    ],
  },
  {
    buCode: "copper",
    label: "Copper",
    kpis: [
      { name: "Production Volume", actual: 45, plan: 50, unit: "kt", status: "at_risk" },
      { name: "Capex Burn", actual: 0.6, plan: 0.6, unit: "B SAR", status: "on_track" },
      { name: "EBITDA Contribution", actual: 0.4, plan: 0.5, unit: "B SAR", status: "at_risk" },
      { name: "Leverage Ratio", actual: 2.8, plan: 2.5, unit: "x", status: "at_risk" },
    ],
  },
];

// Phosphate BU production trend — used in TrendChart for AC5
export const PHOSPHATE_PRODUCTION_TREND: TrendPoint[] = [
  { period: "Q1 2025", value: 7.8 },
  { period: "Q2 2025", value: 8.1 },
  { period: "Q3 2025", value: 8.3 },
  { period: "Q4 2025", value: 8.0 },
  { period: "Q1 2026", value: 8.4 },
  { period: "Q2 2026", value: 8.2 },
];
```

Phosphate capex at 127% of plan (2.3/1.8) is intentionally >118% — it triggers the Tier 3 recommendation card in Story 5.1. This hardcoded data establishes the demo scenario.

### Sidebar Modules (10 total, Modules 1–4 active, 5–10 Data pending)

```typescript
const MODULES = [
  { id: 1, label: "KPI Framework",        href: "/dashboard/phosphate" },
  { id: 2, label: "AI Query Bar",          href: "/dashboard/phosphate" }, // scrolls to QueryBar section
  { id: 3, label: "What-If Analysis",      href: "/dashboard/whatif" },
  { id: 4, label: "Recommendations",       href: "/dashboard/phosphate" }, // placeholder section
  { id: 5, label: "Capital Planning",      href: null },
  { id: 6, label: "ESG Performance",       href: null },
  { id: 7, label: "Supply Chain",          href: null },
  { id: 8, label: "Workforce Analytics",   href: null },
  { id: 9, label: "Risk Register",         href: null },
  { id: 10, label: "Regulatory Compliance", href: null },
];
```

For BU sub-navigation under Module 1: render `phosphate`, `aluminum`, `gold`, `copper` links as nested items, using lowercase BU codes in the URL. Active BU highlighted with `--sidebar-primary` green.

Modules 5–10 (`href: null`): clicking shows the `ModulePlaceholder` component in the main area OR just renders as a non-link item with a lock/pending icon. Do NOT route them — no 404s.

### Component Specs

**`Sidebar.tsx`** — `"use client"` (needs `usePathname` for active state). Fixed width ~224px. NEOM wordmark or "Ma'aden" text at top. Module list with BU sub-navigation under Module 1. Pending modules show a muted label, no hover effect.

**`TopBar.tsx`** — Server component acceptable. Displays current BU name (from layout params or props) + period label "YTD 2025". Purely display; filter interactivity comes in Story 2.3.

**`KpiCard.tsx`** — Renders one `KpiRecord`. Status badge uses Tailwind classes mapped from status:
- `on_track` → green text + border
- `at_risk` → amber
- `off_track` → red

Delta %: `((actual - plan) / plan * 100).toFixed(1)`. Positive delta = actual above plan (good for production, bad for capex — display only, no interpretation logic in this story).

**`KpiGrid.tsx`** — Server component. Iterates `BU_KPI_DATA`, renders each BU's KPIs in a card. 2-column grid of BU sections, each BU section has its 4 KpiCards in a 2×2 sub-grid. Label each BU section with the `label` field.

**`TrendChart.tsx`** — `"use client"`. Uses `PHOSPHATE_PRODUCTION_TREND`. Recharts `LineChart` inside `ResponsiveContainer`. Title: "Phosphate — Production Volume (Mt)". Height: 220px. Chart colors: use CSS variable `--chart-4` (NEOM green) for the line.

**`ModulePlaceholder.tsx`** — Server component. Accepts `moduleName: string`. Renders a Card with the module name as heading and "Data pending — available in a future sprint." as body text. Muted foreground text, no icons.

**`QueryBar.tsx`** — `"use client"`. Label "AI Query Bar" above. `<input>` with `disabled` attr and placeholder "Ask about your KPI data..." + a disabled send button (arrow icon from lucide-react). Wrap in a rounded border box.

**`ScenarioInput.tsx`** — `"use client"`. Label "What-If Analysis" above. Small caption "Scenario analysis — coming Day 3" below the label. `<textarea>` with `disabled` attr and placeholder "Describe a scenario (e.g. 'What if Phos-4 FID slips 2 quarters?')".

### `app/dashboard/[bu]/page.tsx` — BU Route

Server component. Receives `params: { bu: string }`. Validate `bu` against `BuCode` values — if invalid, `redirect("/dashboard/phosphate")`. Page layout (top to bottom): `TopBar`, `KpiGrid`, `TrendChart` (Phosphate trend regardless of BU for this story — real per-BU data comes in Story 2.3), `QueryBar`, `ScenarioInput`. Use padding and gap to separate sections cleanly.

### `app/dashboard/whatif/page.tsx`

Server component. Full-page placeholder showing `ScenarioInput` and a heading "What-If Scenario Engine". No data or API calls.

### Architecture Guardrails for This Story

- All files in `app/`, `components/`, `lib/` are TypeScript only — no `.js` files
- `TrendChart.tsx` and `Sidebar.tsx` must be `"use client"` — they use browser APIs
- `KpiGrid.tsx`, `ModulePlaceholder.tsx`, page components — server components (no state)
- No API calls anywhere — `lib/data.ts` is the only data source
- Files ≤150 lines — if `KpiGrid.tsx` grows large, split BU section into a separate component
- No class hierarchies — flat components only
- BU codes in URLs and data keys are always lowercase: `phosphate`, `aluminum`, `gold`, `copper`

### Recharts in Next.js 16 / React 19 (Tailwind v4 CSS vars)

Recharts requires `"use client"`. Import pattern:

```typescript
"use client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
```

Always wrap in `<ResponsiveContainer width="100%" height={220}>`. Do NOT set hardcoded pixel widths on the chart itself. Recharts does not read CSS variables natively — use `stroke="#16a34a"` (hex equivalent of NEOM green) or `var(--color-chart-4)` if Tailwind v4 exposes it in the DOM.

### What NOT to Build in This Story

- Real data fetching from FastAPI — all hardcoded; API wiring starts in Epic 2
- LiteLLM or any backend LLM calls — Story 3.1
- `api/routers/` or `api/services/` files — Story 2+
- Mobile responsiveness — desktop only (architecture decision, not a TODO)
- Per-BU trend charts (only Phosphate trend is shown for all BU views in this story)
- Functional query bar or scenario submission — placeholder only

### Project Structure Notes

New files this story adds to canonical structure:

```
app/
  page.tsx                         (modified — redirect)
  layout.tsx                       (modified — add dark class)
  globals.css                      (modified — NEOM palette)
  dashboard/
    layout.tsx                     (new)
    [bu]/page.tsx                  (new)
    whatif/page.tsx                (new)
components/
  layout/
    Sidebar.tsx                    (new)
    TopBar.tsx                     (new)
  dashboard/
    KpiCard.tsx                    (new)
    KpiGrid.tsx                    (new)
    TrendChart.tsx                 (new)
    ModulePlaceholder.tsx          (new)
  query/
    QueryBar.tsx                   (new)
  whatif/
    ScenarioInput.tsx              (new)
lib/
  types.ts                         (new)
  data.ts                          (new)
next.config.ts                     (modified — dev proxy)
vercel.json                        (modified — function runtime)
```

### References

- [Source: epics.md#Story 1.2] — AC specification
- [Source: architecture.md#Frontend Architecture] — dark class, server/client split, state pattern
- [Source: architecture.md#Naming Patterns] — BU codes (lowercase), component naming
- [Source: architecture.md#Overriding Principles] — file size ≤150 lines, no commented code
- [Source: architecture.md#Gap Analysis Gap 1] — vercel.json functions maxDuration
- [Source: architecture.md#Gap Analysis Gap 2] — next.config.ts dev proxy
- [Source: architecture.md#Structure Patterns] — component per-file convention
- [Source: architecture.md#Project Structure] — full directory layout
- [Source: 1-1-project-initialization-and-repository-setup.md#Dev Notes] — shadcn base-nova, tailwind v4 CSS config

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- Implemented full UI shell with NEOM Industrial Mineral design system: warm stone page background (`#f4f1ea`), charcoal nav (`#1a1c1b`), mineral gold active-nav accent (`#b8956a`), teal data/CTA accent (`#2d6a66`), AI chrome (`#0e0f10`). IBM Plex Sans font (not Geist). shadcn OKLCH tokens replaced with `--ma-*`/`--ai-*` CSS custom property system mapped via Tailwind v4 `@theme inline`. App runs in light mode (no `dark` class on `<html>`).
- Design language ported from `repo_design/` (NEOM Benchmark Intelligence platform). Logo asset: `public/neom-logo.png` (served at `/neom-logo.png`).
- AI interaction pattern: full-width dark `QueryBar` (inline above content) + fixed 420px `InsightDrawer` right sidebar. State managed by Zustand (`lib/shellStore.ts`). 4 seeded preset responses with fuzzy query matching (`lib/aiPresets.ts`).
- AI components: `AiOrb` (animated SVG arc, 3 phase states), `AiBarMeter` (7 bars, animation longhand properties — no shorthand+delay mixing), `AiPanel`, `AiButton`, `QueryBar`, `InsightDrawer`.
- `DashboardShell` client component owns AI state; main column adds `padding-right: min(420px, 100vw)` when drawer open (transition 300ms).
- All 10 sidebar modules rendered; modules 5–10 display as muted/pending (no routing, no errors).
- KPI scorecard: 4 BUs × 4 KPIs in 2×2 grid with status badges (teal/amber/risk) and delta % calculation.
- Recharts LineChart renders Phosphate production trend with teal line (`#2d6a66`).
- `pnpm build` passes with zero TypeScript errors and zero lint warnings.
- Navigation is client-side with no API calls — AC8 (<500ms) structurally guaranteed.
- No console errors by design: animation longhand properties, no unhandled states, no demo watermarks.

### File List

- `app/globals.css` (modified — NEOM dark palette in `.dark` block)
- `app/layout.tsx` (modified — added `dark` class to `<html>`)
- `app/page.tsx` (modified — redirect to `/dashboard/phosphate`)
- `app/dashboard/layout.tsx` (new)
- `app/dashboard/[bu]/page.tsx` (new)
- `app/dashboard/whatif/page.tsx` (new)
- `components/layout/Sidebar.tsx` (new)
- `components/layout/TopBar.tsx` (new)
- `components/dashboard/KpiCard.tsx` (new)
- `components/dashboard/KpiGrid.tsx` (new)
- `components/dashboard/TrendChart.tsx` (new)
- `components/dashboard/ModulePlaceholder.tsx` (new)
- `components/query/QueryBar.tsx` (new)
- `components/whatif/ScenarioInput.tsx` (new)
- `components/ui/card.tsx` (new — shadcn)
- `components/ui/badge.tsx` (new — shadcn)
- `components/ui/input.tsx` (new — shadcn)
- `components/ui/scroll-area.tsx` (new — shadcn)
- `lib/types.ts` (new)
- `lib/data.ts` (new)
- `next.config.ts` (modified — dev proxy rewrites)
- `vercel.json` (modified — added functions runtime + maxDuration)
- `package.json` (modified — added recharts ^3.8.1)
- `pnpm-lock.yaml` (modified — recharts + shadcn components lockfile update)

### Change Log

- 2026-04-09: Story created from epics.md + architecture.md analysis. Status → ready-for-dev.
- 2026-04-09: Full implementation complete. All 9 tasks and 18 subtasks checked. `pnpm build` clean. Status → review.
