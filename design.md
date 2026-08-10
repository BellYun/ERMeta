# Design — ER&GG

A locked design system for the ER&GG multi-page app. Every page redesign reads this file before emitting code. Amend this file before introducing a page-level visual exception.

## Context

- Audience: experienced Eternal Return players who already understand patches, tiers, roles, and team composition.
- Primary job: read the current meta quickly, then choose a character or composition to investigate.
- Tone: technical — measured, compact, and explicit.

## Genre

Modern-minimal and technical, using a dark data-hub system studied from lol.ps and adapted for Korean, Japanese, and English Eternal Return interfaces.

## Macrostructure family

- Data overview pages: **Workbench + Index-First** — search and filters lead; compact rankings, patch movement, and supporting lists carry the page.
- Interactive app pages: **Workbench** — controls and live results are the page; no decorative mockups or marketing sections.
- Content hubs and reference pages: **Index-First** — titles, dates, versions, and links form the primary rhythm.

## Theme

- Dark neutral-cool paper (`#10131c`) is the canonical data canvas.
- Deep indigo (`#213a96`) owns the navigation band; electric blue (`#3d69ff`) is reserved for active states and short signals.
- Light mode remains available on detail and content routes, while the home workbench stays dark-first in both themes.
- Character art and real game data provide visual richness; decorative gradients stay inside the compact search band.

Canonical values live in `tokens.css`.

## Typography

- Display: Pretendard 700, normal.
- Body: Pretendard 400.
- Outlier: JetBrains Mono 500, only for patch/version labels and headline metrics.
- Display tracking: `-0.035em`.
- Body copy: 16px minimum; data tables may use 14px with tabular numerals.

## Spacing

Use the named 4-point scale in `tokens.css`. Components consume `var(--space-*)`; new raw spacing values are not introduced.

## Motion

- Motion-cut by default.
- Functional controls use `--dur-micro` or `--dur-short` with `--ease-out`.
- Search, filters, and data rows respond immediately; all numbers render without reveal animation.
- Reduced motion removes spatial transforms and keeps state feedback at 150ms or less.

## Microinteractions stance

- Silent success; failures explain the next action.
- Focus rings are instant and visible.
- Command navigation opens with click or Cmd/Ctrl+K and supports arrows, Enter, and Escape.
- Touch targets are at least 44px; clickable labels never wrap.

## Navigation and footer

- Navigation: N1b Dense product bar, adapted to preserve the existing destinations and mobile drawer. Search becomes the home page's primary workbench action; Cmd/Ctrl+K remains available on deeper routes.
- Footer: Ft4 Compact colophon — one link row followed by the required API attribution and legal disclaimer.

## CTA voice

- Primary: compact electric-blue fill, 6px radius, destination-specific verb.
- Secondary: dark paper surface with a visible indigo rule; no generic “Continue” or “Click here”.

## Per-page allowances

- App pages use no decorative enrichment; game data and character art carry the interface.
- Content pages are typography-first.
- Existing analytics, ads, data fetching, routing, and localization remain unchanged.

## What pages MUST share

- Wordmark treatment, indigo navigation band, electric-blue signal placement, type roles, focus treatment, button geometry, rules, and spacing tokens.
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
  --color-paper: #10131c;
  --color-paper-2: #181c2a;
  --color-paper-3: #1f2331;
  --color-ink: #f5f7fb;
  --color-ink-2: #dae0e9;
  --color-rule: #272c3c;
  --color-rule-2: #3a4155;
  --color-accent: #3d69ff;
  --color-brand-deep: #213a96;
  --font-display: "Pretendard", ui-sans-serif, sans-serif;
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
    "paper": { "$value": "#10131c", "$type": "color" },
    "ink": { "$value": "#f5f7fb", "$type": "color" },
    "accent": { "$value": "#3d69ff", "$type": "color" },
    "brandDeep": { "$value": "#213a96", "$type": "color" },
    "rule": { "$value": "#272c3c", "$type": "color" }
  },
  "font": {
    "display": {
      "$value": "Pretendard, ui-sans-serif",
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
  --background: 14% 0.012 258;
  --foreground: 96% 0.006 250;
  --card: 18% 0.014 258;
  --card-foreground: 96% 0.006 250;
  --popover: 18% 0.014 258;
  --popover-foreground: 96% 0.006 250;
  --primary: 68% 0.18 256;
  --primary-foreground: 14% 0.012 258;
  --secondary: 22% 0.016 258;
  --secondary-foreground: 90% 0.008 250;
  --muted: 30% 0.016 258;
  --muted-foreground: 72% 0.014 255;
  --border: 30% 0.016 258;
  --input: 45% 0.018 258;
  --ring: 78% 0.16 256;
  --radius: 0.625rem;
}
```
