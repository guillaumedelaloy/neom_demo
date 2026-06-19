# Maaden Benchmark Intelligence — UI look & feel

Use this document to align a **new Maaden prototype** with the visual language of the existing app. Copy the **CSS variables**, **Tailwind color map**, **typography**, and **layout rules** into your new project; adapt components to your stack (React + Tailwind is assumed below).

---

## 1. Design intent

- **Warm, editorial neutrals** — paper-like background (`#f4f1ea`), off-white surfaces, soft warm gray borders. Not clinical blue-gray.
- **Brand accents** — **teal** for primary actions, positive / “on track” signals, and links; **gold** for premium / emphasis and active nav affordances; **charcoal** for strong primary buttons and nav depth.
- **Restrained density** — enterprise analytics: clear hierarchy, uppercase micro-labels with letter-spacing, tabular numbers where metrics appear.
- **Dual personality** — main app stays **light-first** (readable dashboards). **AI chrome** is intentionally dark and “instrumented” (teal accent glow, scan-line motion) to feel like a separate precision layer.

---

## 2. Color tokens (canonical)

Define on `:root` and override under `.dark` (Tailwind `darkMode: 'class'` + `classList` on `<html>`).

### 2.1 Light theme (`:root`)

| Token | Hex / value | Role |
|--------|---------------|------|
| `--ma-bg` | `#f4f1ea` | Page background |
| `--ma-surface` | `#faf8f4` | Secondary panels, hover fills |
| `--ma-elevated` | `#ffffff` | Cards, top chrome |
| `--ma-ink` | `#0f1210` | Primary text |
| `--ma-muted` | `#5c5a55` | Secondary text, labels |
| `--ma-line` | `#d9d4ca` | Borders, dividers |
| `--ma-graphite` | `#2a2d2c` | Titles on light cards, dark UI text |
| `--ma-charcoal` | `#1a1c1b` | Primary button fill |
| `--ma-gold` | `#b8956a` | Accent, active nav icon |
| `--ma-gold-dim` | `#8f7354` | Muted gold metrics |
| `--ma-teal` | `#2d6a66` | Links, success / feed OK, teal badges |
| `--ma-teal-muted` | `#3d8580` | Secondary teal |
| `--ma-amber-warn` | `#9a6b2d` | Warnings, stale feeds |
| `--ma-risk` | `#8b3a3a` | Risk / error tone |

**Left navigation (always dark rail on light app):**

| Token | Value |
|--------|--------|
| `--ma-nav-bg` | `#1a1c1b` |
| `--ma-nav-border` | `rgba(255,255,255,0.1)` |
| `--ma-nav-muted` | `rgba(255,255,255,0.7)` |
| `--ma-nav-subtle` | `rgba(255,255,255,0.5)` |
| `--ma-nav-faint` | `rgba(255,255,255,0.4)` |

### 2.2 Dark theme (`.dark` on `<html>`)

Same token **names**; values shift to dark backgrounds, warm ink (`#f4f1ea`), lifted teal (`#4a9e96`), adjusted lines and nav. Mirror the reference implementation rather than inventing new hues.

### 2.3 AI panel tokens (light + dark)

| Token | Light (example) | Role |
|--------|------------------|------|
| `--ai-panel-bg` | `#0e0f10` | AI surfaces |
| `--ai-panel-elevated` | `#151618` | Raised AI blocks |
| `--ai-edge` | `rgba(255,255,255,0.14)` | Borders |
| `--ai-accent` | `#3d9e96` | Accent line / orb (light theme) |
| `--ai-accent-dim` | `#2d6a66` | Dimmer accent |
| `--ai-orb-ring` | `rgba(61,158,150,0.85)` | Focus ring |
| `--ai-text` | `#e8eae9` | Primary AI text |
| `--ai-text-muted` | `rgba(232,234,233,0.55)` | Muted |
| `--ai-scan` | `rgba(61,158,150,0.25)` | Scan / progress tint |

---

## 3. Tailwind mapping

Extend `theme.colors`:

```js
ma: {
  bg: 'var(--ma-bg)',
  surface: 'var(--ma-surface)',
  elevated: 'var(--ma-elevated)',
  ink: 'var(--ma-ink)',
  muted: 'var(--ma-muted)',
  line: 'var(--ma-line)',
  graphite: 'var(--ma-graphite)',
  charcoal: 'var(--ma-charcoal)',
  gold: 'var(--ma-gold)',
  'gold-dim': 'var(--ma-gold-dim)',
  teal: 'var(--ma-teal)',
  'teal-muted': 'var(--ma-teal-muted)',
  'amber-warn': 'var(--ma-amber-warn)',
  risk: 'var(--ma-risk)',
},
```

Use **`bg-ma-bg`**, **`text-ma-ink`**, **`border-ma-line`**, **`text-ma-teal`**, **`text-ma-muted`** in layouts.

---

## 4. Typography

- **Font:** **IBM Plex Sans** — weights **400, 500, 600** (bundle via `@fontsource/ibm-plex-sans` or Google Fonts).
- **`fontFamily.sans`:** `['IBM Plex Sans', 'ui-sans-serif', 'system-ui', 'sans-serif']`.
- **Body:** default sans; `-webkit-font-smoothing: antialiased` on `body`.
- **RTL:** enable kerning with `font-feature-settings: 'kern' 1` on `[dir='rtl']`.

### Type scale (as used in the prototype)

| Use | Classes / pattern |
|-----|-------------------|
| Page kicker | `text-[10px] font-semibold uppercase tracking-[0.16em] text-ma-muted` |
| Page H2 | `text-[22px] font-semibold tracking-tight text-ma-ink` |
| Card title | `text-[13px] font-semibold uppercase tracking-[0.12em] text-ma-graphite` |
| Card subtitle | `text-[13px] leading-snug text-ma-muted` |
| Top bar app title | `text-[15px] font-semibold tracking-tight text-ma-ink` |
| Meta row labels | `text-[10px] font-semibold uppercase tracking-wide text-ma-muted` (or `/80` opacity) |
| Nav primary label | `text-[13px] font-semibold leading-tight` |
| Nav secondary | `text-[11px]` with nav subtle color |
| Buttons | `text-[13px] font-medium` |
| Badges | `text-[11px] font-medium uppercase tracking-wide` |

Prefer **tabular numerics** (`tabular-nums`) on KPIs and chart axes.

---

## 5. Layout & shell

- **App root:** `flex min-h-screen items-start bg-ma-bg font-sans text-ma-ink`.
- **Left nav:** fixed dark rail `w-[248px] shrink-0`, `sticky top-0`, `h-[100dvh]`, `border-r` using `--ma-nav-border`, `bg-[var(--ma-nav-bg)]`, **white** text. Logo height ~`h-9`; tagline `text-[12px] text-[color:var(--ma-nav-muted)]`.
- **Nav items:** `rounded-sm`, `px-3 py-3`, `gap-3`. **Active:** `border-[color:var(--ma-gold)]/50`, `bg-white/[0.08]`, icon `text-[color:var(--ma-gold)]`. **Inactive:** muted text, hover `hover:bg-white/[0.04]` / `hover:text-white`.
- **Main column:** `flex-1 flex-col`; **content** `main`: `mx-auto w-full max-w-[1440px] flex-1 overflow-y-auto px-6 py-6`.
- **Top bar:** `border-b border-ma-line bg-ma-elevated px-6 py-3`; title + meta rows as above.
- **AI drawer open:** pad main column (e.g. `pr-[min(420px,100vw)]`) so content clears the drawer.

---

## 6. Surfaces & elevation

- **Cards:** `rounded-sm border border-ma-line bg-ma-elevated shadow-[0_1px_0_rgba(15,18,16,0.04)]`.
- **Card header:** `border-b border-ma-line px-5 py-4`; flex `justify-between` for optional **header actions** (filters, selects).
- **Card body:** `px-5 py-4`.
- **Hero / highlight strips:** optional `border-ma-line` + subtle gradient e.g. `bg-gradient-to-br from-ma-elevated to-ma-surface`.
- **Inset AI panel:** `rounded-sm border` using `--ai-edge`, `bg` `--ai-panel-bg`, subtle inner highlight + top **teal gradient hairline** (see AiPanel pattern).

---

## 7. Components (reference behavior)

### Buttons

- **Primary:** `bg-ma-charcoal text-white border-ma-charcoal hover:bg-ma-graphite`.
- **Secondary:** `bg-ma-elevated text-ma-ink border-ma-line hover:border-ma-gold/50`.
- **Ghost:** `bg-transparent text-ma-teal border-transparent hover:bg-ma-surface`.
- Shared: `rounded-sm border px-3 py-1.5 text-[13px] font-medium transition-colors`.

### Badges

- `rounded-sm border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide`.
- **Tones (light app):** neutral on `ma-surface`; teal tint `#e8f2f1` / border `#c5dedb`; gold tint `#f3ebe0` / border `#e5d5c4`; risk tint `#f6e8e8` / border `#e8cfcf`; muted on `ma-bg`.

### Form controls (filters)

Native selects: `h-9 min-w-[200px] rounded-sm border border-ma-line bg-ma-elevated px-2 text-[13px] font-medium text-ma-ink`; micro-label above: `text-[10px] font-semibold uppercase tracking-wide text-ma-muted`, `items-end` for right-aligned filter groups.

---

## 8. Data visualization

- Tooltips (Recharts): `border-radius: 2px`, `border: 1px solid var(--ma-line)`, `background: var(--ma-elevated)`, subtle shadow; respect `.dark` for deeper shadow.
- Chart containers: `min-h-[240px] min-w-0 w-full` pattern for responsive charts.
- **Semantic colors in charts:** teal = Maaden / positive band; gold stroke for Maaden emphasis; amber dashed = benchmark / warning line; red / risk for merit-order envelope where used.

---

## 9. Motion (AI)

Keep AI motion **short and purposeful** — bar meter pulse, scan line, orb rotation. Use easing like `cubic-bezier(0.22, 1, 0.36, 1)` for scan; linear for continuous orb. Do not over-animate dashboard tiles.

---

## 10. Theme switching

- Storage key pattern: e.g. `maaden-theme` with values `light` | `dark`.
- Apply by toggling class **`dark`** on `document.documentElement`.
- Initialize from storage, else `prefers-color-scheme`.
- `color-scheme: light` / `dark` on `:root` / `.dark` for native scrollbars and form controls.

---

## 11. `index.html` fallback

Before CSS loads, set inline `body { background-color: #f4f1ea; color: #0f1210; }` so embedded browsers never flash blank.

---

## 12. New project checklist

1. Copy **all `--ma-*`**, **`--ma-nav-*`**, and **`--ai-*`** variables into global CSS (`:root` + `.dark`).
2. Configure Tailwind **`colors.ma.*`** as above; **`darkMode: 'class'`**.
3. Install **IBM Plex Sans** (400/500/600) and set **`fontFamily.sans`**.
4. Apply **body** background `var(--ma-bg)` and text `var(--ma-ink)`.
5. Build **Card**, **Button**, **Badge** to the patterns above.
6. Keep **nav rail dark** even in light theme for brand contrast (optional but matches prototype).
7. Align **AI surfaces** to `--ai-*` tokens, not `ma-elevated`.

---

## 13. Reference files (this repository)

| Area | Path |
|------|------|
| Tokens + animations + Recharts | `src/index.css` |
| Tailwind theme | `tailwind.config.js` |
| Shell layout | `src/components/shell/AppShell.tsx` |
| Nav | `src/components/shell/LeftNav.tsx` |
| Top bar | `src/components/shell/TopBar.tsx` |
| Card | `src/components/ui/Card.tsx` |
| Button | `src/components/ui/Button.tsx` |
| Badge | `src/components/ui/Badge.tsx` |
| AI panel chrome | `src/components/ai/AiPanel.tsx` |
| Theme hook | `src/hooks/useTheme.ts` |
| Font entry | `src/main.tsx` |

---

*Generated from the Maaden Benchmark Intelligence prototype UI system.*
