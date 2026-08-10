# Design — ER&GG

A locked design system for the ER&GG multi-page app. Every page redesign reads this file before emitting code. Amend this file before introducing a page-level visual exception.

## Context

- Audience: experienced Eternal Return players who already understand patches, tiers, roles, and team composition.
- Primary job: read the current meta quickly, then choose a character or composition to investigate.
- Tone: technical — measured, compact, and explicit.

## Genre

Modern-minimal, using the Cobalt catalog theme adapted for Korean, Japanese, and English game-stat interfaces.

## Macrostructure family

- Data overview pages: **Stat-Led** — one real patch or sample metric anchors the page; supporting tables qualify it.
- Interactive app pages: **Workbench** — controls and live results are the page; no decorative mockups or marketing sections.
- Content hubs and reference pages: **Index-First** — titles, dates, versions, and links form the primary rhythm.

## Theme

- Cool engineered paper with ruler-drawn boundaries.
- One electric cobalt signal accent, occupying less than 5% of a viewport.
- Light and dark modes retain the same 256° anchor hue.
- Graphite is reserved for one high-information band or proof surface, never used as ambient decoration.

Canonical values live in `tokens.css`.

## Typography

- Display: Space Grotesk 700, normal; Korean and Japanese fall back to Pretendard.
- Body: Pretendard 400.
- Outlier: JetBrains Mono 500, only for patch/version labels and headline metrics.
- Display tracking: `-0.035em`.
- Body copy: 16px minimum; data tables may use 14px with tabular numerals.

## Spacing

Use the named 4-point scale in `tokens.css`. Components consume `var(--space-*)`; new raw spacing values are not introduced.

## Motion

- Motion-cut by default.
- Functional controls use `--dur-micro` or `--dur-short` with `--ease-out`.
- The home Stat-Led metric may reveal once; all other numbers render immediately.
- Reduced motion removes spatial transforms and keeps state feedback at 150ms or less.

## Microinteractions stance

- Silent success; failures explain the next action.
- Focus rings are instant and visible.
- Command navigation opens with click or Cmd/Ctrl+K and supports arrows, Enter, and Escape.
- Touch targets are at least 44px; clickable labels never wrap.

## Navigation and footer

- Navigation: N13 Inline command pill, adapted to preserve the existing product destinations and mobile drawer.
- Footer: Ft2 Inline-rule single line, followed by the required API attribution and legal disclaimer.

## CTA voice

- Primary: compact cobalt fill, 6px radius, destination-specific verb.
- Secondary: paper surface with a visible rule; no generic “Continue” or “Click here”.

## Per-page allowances

- App pages use no decorative enrichment; game data and character art carry the interface.
- Content pages are typography-first.
- Existing analytics, ads, data fetching, routing, and localization remain unchanged.

## What pages MUST share

- Wordmark treatment, Cobalt accent placement, type roles, focus treatment, button geometry, rules, and spacing tokens.
- Light/dark hue identity.
- Loading, empty, error, disabled, and success state language.

## What pages MAY differ on

- Density and column count according to the page’s data.
- Stat-Led, Workbench, or Index-First structure according to page type.
- Character and item imagery already supplied by the product.

## Exports

### tokens.css

`tokens.css` at the repository root is the source of truth and includes light/dark values, typography, spacing, motion, rules, radii, shadows, and z-index tokens.

### Tailwind v4 `@theme`

```css
@theme {
  --color-paper: oklch(98.5% 0.004 250);
  --color-paper-2: oklch(96.5% 0.006 250);
  --color-paper-3: oklch(93.5% 0.008 250);
  --color-ink: oklch(18% 0.018 258);
  --color-ink-2: oklch(27% 0.02 258);
  --color-rule: oklch(88% 0.01 250);
  --color-rule-2: oklch(72% 0.014 250);
  --color-accent: oklch(52% 0.2 256);
  --font-display: "Space Grotesk", "Pretendard", ui-sans-serif, sans-serif;
  --font-body: "Pretendard", ui-sans-serif, sans-serif;
  --font-outlier: "JetBrains Mono", ui-monospace, monospace;
  --spacing-xs: 0.5rem;
  --spacing-sm: 0.75rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2.5rem;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --radius-card: 0.625rem;
}
```

### DTCG `tokens.json`

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "paper": { "$value": "oklch(98.5% 0.004 250)", "$type": "color" },
    "ink": { "$value": "oklch(18% 0.018 258)", "$type": "color" },
    "accent": { "$value": "oklch(52% 0.2 256)", "$type": "color" },
    "rule": { "$value": "oklch(88% 0.01 250)", "$type": "color" }
  },
  "font": {
    "display": {
      "$value": "Space Grotesk, Pretendard, ui-sans-serif",
      "$type": "fontFamily"
    },
    "body": { "$value": "Pretendard, ui-sans-serif", "$type": "fontFamily" },
    "outlier": {
      "$value": "JetBrains Mono, ui-monospace",
      "$type": "fontFamily"
    }
  },
  "space": {
    "md": { "$value": "1rem", "$type": "dimension" },
    "lg": { "$value": "1.5rem", "$type": "dimension" },
    "xl": { "$value": "2.5rem", "$type": "dimension" }
  }
}
```

### shadcn/ui CSS variables

```css
:root {
  --background: 98.5% 0.004 250;
  --foreground: 18% 0.018 258;
  --card: 96.5% 0.006 250;
  --card-foreground: 18% 0.018 258;
  --popover: 98.5% 0.004 250;
  --popover-foreground: 18% 0.018 258;
  --primary: 52% 0.2 256;
  --primary-foreground: 98.5% 0.004 250;
  --secondary: 93.5% 0.008 250;
  --secondary-foreground: 27% 0.02 258;
  --muted: 88% 0.01 250;
  --muted-foreground: 49% 0.018 257;
  --border: 88% 0.01 250;
  --input: 72% 0.014 250;
  --ring: 46% 0.22 256;
  --radius: 0.625rem;
}
```
