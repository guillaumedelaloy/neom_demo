---
type: reference
status: canonical
lastEdited: '2026-04-10'
editHistory:
  - date: '2026-04-10'
    changes: >
      Created. Captures the design system applied in Epic 1 stories 1.1–1.2, sourced
      from repo_design/ (NEOM Benchmark Intelligence platform). Replaces earlier
      shadcn/OKLCH dark-navy guidance which was superseded by the industrial-mineral
      design language below.
---

# NEOM Design System

## Source of Truth

Design is ported from **`repo_design/`** — the NEOM Benchmark Intelligence platform (external benchmarking tool). This POC extends that design language into the execution dimension. All future UI work must visually match `repo_design/` exactly — same logo, same color tokens, same typography, same component patterns.

Reference implementation files in `repo_design/`:
- `src/index.css` — all CSS custom properties and keyframe animations
- `tailwind.config.js` — Tailwind v3 color mapping (reference only; this app uses v4)
- `src/components/shell/` — layout shell (AppShell, LeftNav, TopBar, QueryBar)
- `src/components/ai/` — AI chrome (InsightDrawer, AiOrb, AiBarMeter, AiPanel, AiButton)
- `src/components/ui/` — base components (Button, Card, Badge, Skeleton)
- `src/components/icons/MaIcons.tsx` — stroke icon set
- `public/neom-logo.png` — primary logo for the shell (referenced as `/neom-logo.png`)

---

## Design Language: Industrial Mineral

**Not** fintech blue. **Not** glassmorphism. The aesthetic is drawn from industrial/mineral extraction: warm stone surfaces, charcoal navigation shell, mineral gold accents, teal reserved exclusively for data and CTAs.

| Element | Color / Description |
|---------|---------------------|
| Page background | Warm stone `#f4f1ea` |
| Card / elevated surface | White `#ffffff` |
| Navigation shell | Charcoal `#1a1c1b` (always dark, regardless of page theme) |
| Primary text | Near-black `#0f1210` |
| Secondary / muted text | `#5c5a55` |
| Active nav accent | Mineral gold `#b8956a` (left border + subtle bg) |
| Data accent / CTAs | Teal `#2d6a66` |
| Warning | Amber `#9a6b2d` |
| Off-track / risk | `#8b3a3a` |
| AI chrome background | Very dark `#0e0f10` |
| AI accent | Teal `#3d9e96` |

---

## CSS Token System

Tokens live in `app/globals.css` as CSS custom properties, mapped into Tailwind v4 via `@theme inline`. **Do not use OKLCH shadcn tokens** — those have been replaced.

```css
/* Light mode (:root) */
--ma-bg: #f4f1ea;
--ma-surface: #faf8f4;
--ma-elevated: #ffffff;
--ma-ink: #0f1210;
--ma-muted: #5c5a55;
--ma-line: #d9d4ca;
--ma-graphite: #2a2d2c;
--ma-charcoal: #1a1c1b;
--ma-gold: #b8956a;
--ma-gold-dim: #8f7354;
--ma-teal: #2d6a66;
--ma-teal-muted: #3d8580;
--ma-amber-warn: #9a6b2d;
--ma-risk: #8b3a3a;

/* Navigation (always dark) */
--ma-nav-bg: #1a1c1b;
--ma-nav-border: rgba(255, 255, 255, 0.1);
--ma-nav-muted: rgba(255, 255, 255, 0.7);
--ma-nav-faint: rgba(255, 255, 255, 0.4);

/* AI chrome */
--ai-panel-bg: #0e0f10;
--ai-panel-elevated: #151618;
--ai-edge: rgba(255, 255, 255, 0.14);
--ai-accent: #3d9e96;
--ai-orb-ring: rgba(61, 158, 150, 0.85);
--ai-text: #e8eae9;
--ai-text-muted: rgba(232, 234, 233, 0.55);
```

Dark mode overrides exist in `.dark` class (brighter teal, lighter gold, adjusted nav) — see `app/globals.css`.

**Tailwind usage:** All `--ma-*` and `--ai-*` tokens are mapped via `@theme inline` so they work as Tailwind utilities: `bg-ma-bg`, `text-ma-ink`, `border-ma-line`, `bg-ma-nav-bg`, etc.

---

## Typography

**Font:** IBM Plex Sans (loaded via `next/font/google`, variable `--font-ibm-plex`).
**Not Geist.** The font variable is injected into `globals.css` via `--font-sans: var(--font-ibm-plex), "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif`.

| Usage | Size | Weight | Tracking |
|-------|------|--------|----------|
| Page / section heading | 15px | 600 | wide |
| Card title | 13px | 600 | `tracking-[0.12em]` uppercase |
| Body / input | 13–14px | 400–500 | — |
| BU label, nav module | 12px | 500 | — |
| Badge / status label | 10–11px | 600 | `tracking-wide` uppercase |
| Phase label, micro | 9px | 600 | `tracking-[0.16–0.2em]` uppercase |

---

## Layout Shell

```
┌─────────────────────────────────────────────────────────────────┐
│ Sidebar (248px, charcoal)  │ Main column (flex-1)               │
│                            │ ┌─────────────────────────────────┐│
│ [Logo]                     │ │ QueryBar (dark AI chrome)       ││
│ [BU Selector]              │ │─────────────────────────────────││
│ [Module Nav]               │ │ TopBar (white elevated)         ││
│                            │ │─────────────────────────────────││
│                            │ │ Page content                    ││
│                            │ └─────────────────────────────────┘│
│                            │                    ┌───────────────┤
│                            │                    │InsightDrawer  │
│                            │                    │(420px, fixed) │
└────────────────────────────┴────────────────────┴───────────────┘
```

When `InsightDrawer` is open, the main column adds `padding-right: min(420px, 100vw)` to avoid overlap (transition 300ms).

**Key shell files:**
- `components/shell/DashboardShell.tsx` — client component owning Zustand state, renders Sidebar + QueryBar + InsightDrawer
- `app/dashboard/layout.tsx` — server component, delegates to DashboardShell
- `components/layout/Sidebar.tsx` — charcoal nav with logo, BU links, module nav
- `components/layout/TopBar.tsx` — elevated white header per BU page

---

## AI Interaction Pattern

### QueryBar (inline, above page content)

Full-width dark AI panel. Always visible. Components:
- **AiOrb** (40×40 SVG) — animated arc spins when active; 3 states: idle / listening / thinking+speaking
- **AiBarMeter** — 7 animated bars, speed varies by phase
- **Phase label** — "Idle" / "Listening" / "Computing" / "Output ready"
- **Input** — `h-11`, dark `--ai-panel-elevated` bg, teal focus ring
- **AiButton** — teal border, dark bg, embedded AiBarMeter

Phase lifecycle: `idle` → (focus) `listening` → (submit) `thinking` → (response) `speaking`.

### InsightDrawer (fixed right sidebar, 420px)

Slides in from the right when a query response is ready. State managed in `lib/shellStore.ts` (Zustand). Contains:
- Header: AiOrb + prompt text + Close button + Signal strip (AiBarMeter)
- Summary text with `ai-cursor-scan` animation (scanning line traversal)
- Reasoning trace (bulleted list)
- Confidence % badge
- Source lineage (gold badges: ERP, Historian, Capital IQ, etc.)
- Follow-up action buttons (chain to next preset)
- Footer: data provenance note

**State (`lib/shellStore.ts`):**
```typescript
aiDrawerOpen: boolean
aiActivePreset: AiPreset | null
aiPhase: "idle" | "listening" | "thinking" | "speaking"
openAiPreset(preset) // sets drawer open + phase = "speaking"
setAiDrawerOpen(open)
setAiPhase(phase)
```

**Preset system (`lib/aiPresets.ts`):** 4 seeded NEOM-specific responses for stakeholder demo:
- `phosphate-production-risk`
- `capex-overrun`
- `ebitda-gap`
- `leverage-outlook`

Fuzzy word-match routes queries to the closest preset. Follow-up buttons chain between presets.

---

## Component Conventions

### Cards
```
bg: var(--ma-elevated) | border: var(--ma-line)
shadow: 0 1px 0 rgba(15,18,16,0.04)
border-radius: rounded-sm (2–4px)
padding: p-4
```

### Status Badges (KPI)
| Status | bg | text | border |
|--------|----|----|--------|
| on_track | `#e8f2f1` | `#2d6a66` | `#c5dedb` |
| at_risk | `#f5ede0` | `#9a6b2d` | `#e5d5c4` |
| off_track | `#f6e8e8` | `#8b3a3a` | `#e8cfcf` |

### Navigation Active State
Left border `border-ma-gold` (2px) + `bg: rgba(255,255,255,0.06)` + text white.
Hover: `border-white/20`.

### AI Chrome
All AI-surface components use `--ai-panel-bg` / `--ai-edge` / `--ai-accent` — never the `--ma-*` tokens.
AiPanel adds a gradient top-line: `via-ai-accent` from transparent to transparent.

---

## Animations (defined in `app/globals.css`)

| Name | Usage |
|------|-------|
| `ai-orb-tick` (2.8s linear ∞) | `.ai-orb-spin` on AiOrb arc |
| `ai-bar-meter` | AiBarMeter bars — speed/opacity varies by phase |
| `ai-cursor-scan` (3.6s cubic-bezier ∞) | `.ai-cursor-scan` scan line in InsightDrawer summary |

**Animation property note:** Never mix `animation` shorthand with `animationDelay` — use individual longhand properties (`animationName`, `animationDuration`, `animationTimingFunction`, `animationIterationCount`, `animationDelay`).

---

## What to Avoid

- Do not use generic shadcn OKLCH tokens (`--background`, `--primary`, etc.) — they have been removed
- Do not use `dark` class on `<html>` for page background — the app runs in light mode (stone `#f4f1ea`); only the nav is always dark via `--ma-nav-bg`
- Do not use Geist font — IBM Plex Sans only
- Do not use `rounded-lg` — use `rounded-sm` for the sharp industrial feel
- Do not hardcode dark hex values (`#1a1f2e`, `#9ca3af`) in chart/component styles — use CSS vars (`var(--ma-muted)`, etc.)
- Do not add `animation` shorthand when `animationDelay` is also set — React will warn

---

## File Map

```
public/
  neom-logo.png           ← logo (`public/neom-logo.png`, URL `/neom-logo.png`)
  favicon.svg               ← copied from repo_design

app/
  globals.css               ← ma-* + ai-* token system, keyframes, @theme inline

components/
  icons/MaIcons.tsx         ← stroke SVG icons (copied from repo_design)
  layout/
    Sidebar.tsx             ← charcoal nav, logo, BU links, module nav
    TopBar.tsx              ← white elevated header
  ai/
    AiOrb.tsx               ← animated SVG arc status indicator
    AiBarMeter.tsx          ← 7 animated bars
    AiPanel.tsx             ← dark container with gradient top-line
    AiButton.tsx            ← teal-bordered dark button with embedded meter
    QueryBar.tsx            ← full-width query bar (client component)
    InsightDrawer.tsx       ← fixed right sidebar (client component)
  shell/
    DashboardShell.tsx      ← client wrapper: Sidebar + QueryBar + InsightDrawer

lib/
  shellStore.ts             ← Zustand: AI phase, drawer state, active preset
  aiPresets.ts              ← 4 seeded NEOM responses + fuzzy matcher
  types.ts                  ← AiPhase, AiPreset, AiResponse, AiFollowUp types
```
