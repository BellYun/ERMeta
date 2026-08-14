# Design — ER&GG

A locked design system for the ER&GG multi-page app. Every page redesign reads this file before emitting code. Amend this file before introducing a page-level visual exception.

## Context

- Audience: experienced Eternal Return players who already understand patches, tiers, roles, and team composition.
- Primary job: read the current meta quickly, then choose a character or composition to investigate.
- Tone: technical — measured, compact, and explicit.

## Genre

Modern-minimal and technical, using a custom dual-mode data-hub system tuned for Korean, Japanese, and English Eternal Return interfaces.

## Macrostructure family

- Data overview pages: **Workbench + Index-First** — search and filters lead; compact rankings, patch movement, and supporting lists carry the page.
- Interactive app pages: **Workbench** — controls and live results are the page; no decorative mockups or marketing sections.
- Content hubs and reference pages: **Index-First** — titles, dates, versions, and links form the primary rhythm.

## Theme

- **Mineral Signal** is the identity: a clear mineral blue around `245°` marks active states, rank emphasis, filters, links, and focus signals.
- Light mode is a quiet analysis board: a nearly neutral mineral paper canvas (`oklch(97% 0.008 245)`) with bright surfaces, low-chroma separators, and dark blue-black ink. Its working accent remains deliberately deeper (`oklch(43% 0.15 245)`) for legibility.
- Dark mode is a night tactical screen: a deep blue-black canvas (`oklch(14% 0.018 252)`) with restrained mineral-tinted elevations. Search and form surfaces stay dark instead of flipping bright; the signal accent remains deliberately brighter (`oklch(83% 0.15 245)`).
- Default rules are intentionally quiet during long reading sessions. Strong rules are reserved for controls, focus, selection, and high-information boundaries.
- The two modes are not visual inverses and do not need matching surface relationships. They share the accent hue, component geometry, and information hierarchy.
- The navigation band remains a deep mineral brand strip in both modes so the wordmark and bright signal stay recognizable while the page canvas changes independently.
- Character art and real game data provide visual richness. Success remains green, warnings amber, and losses red so mineral blue never replaces meaning-bearing status colour.

Canonical values live in `tokens.css`.

## Typography

- Display: Pretendard 700, normal.
- Body: Pretendard 400.
- Outlier: JetBrains Mono 500, only for patch/version labels and headline metrics.
- Display tracking: `-0.035em`.
- Body copy uses a compact 15px baseline; supporting UI copy uses 13px.
- Dense data labels, badges, chart annotations, and version markers keep their component-authored scale. Shared labels use an 11px baseline.

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

- Primary: compact Mineral Signal treatment, 6px radius, destination-specific verb.
- Secondary: the current mode's surface with a visible mineral rule; no generic “Continue” or “Click here”.

## Per-page allowances

- App pages use no decorative enrichment; game data and character art carry the interface.
- Content pages are typography-first.
- Existing analytics, ads, data fetching, routing, and localization remain unchanged.
- Redirect and performance-lab routes inherit the shell when rendered; redirect behavior and experiment logic remain unchanged.

## What pages MUST share

- Wordmark treatment, deep mineral navigation band, Mineral Signal placement, type roles, focus treatment, button geometry, rules, and spacing tokens.
- The `245°` point hue and semantic meaning of every status colour.
- Loading, empty, error, disabled, and success state language.
- Dense information geometry, table headers, form controls, and active-tab signals across every route family. Repeated panel and row rules stay subordinate to text and data.

## What pages MAY differ on

- Density and column count according to the page’s data.
- Stat-Led, Workbench, or Index-First structure according to page type.
- Character and item imagery already supplied by the product.
- Surface depth, elevation contrast, and canvas brightness between light and dark modes.

## Exports

### tokens.css

`tokens.css` at the repository root is the source of truth and includes light/dark values, typography, spacing, motion, rules, radii, shadows, and z-index tokens.

### Tailwind v4 `@theme`

```css
@theme {
  --color-paper: oklch(98% 0.006 245);
  --color-paper-2: oklch(97% 0.008 245);
  --color-paper-3: oklch(94% 0.015 245);
  --color-ink: oklch(17% 0.025 252);
  --color-ink-2: oklch(25% 0.03 252);
  --color-rule: oklch(88% 0.018 245);
  --color-rule-2: oklch(60% 0.035 245);
  --color-accent: oklch(43% 0.15 245);
  --color-brand-deep: oklch(18% 0.03 252);
  --color-app-canvas: oklch(97% 0.008 245);
  --color-app-surface: oklch(98% 0.006 245);
  --color-app-rule: oklch(74% 0.022 245);
  --color-app-ink: oklch(17% 0.025 252);
  --font-display: "Pretendard", ui-sans-serif, sans-serif;
  --font-body: "Pretendard", ui-sans-serif, sans-serif;
  --font-outlier: "JetBrains Mono", ui-monospace, monospace;
  --text-data-min: 0.6875rem;
  --text-xs: 0.6875rem;
  --text-sm: 0.8125rem;
  --text-base: 0.9375rem;
  --text-md: 1.0625rem;
  --spacing-xs: 0.5rem;
  --spacing-sm: 0.75rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2.5rem;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --radius-card: 0.625rem;
}

[data-theme="dark"] {
  --color-paper: oklch(14% 0.018 252);
  --color-paper-2: oklch(18% 0.02 252);
  --color-paper-3: oklch(22% 0.024 252);
  --color-ink: oklch(96% 0.016 245);
  --color-ink-2: oklch(88% 0.02 245);
  --color-rule: oklch(30% 0.026 250);
  --color-rule-2: oklch(55% 0.04 248);
  --color-accent: oklch(83% 0.15 245);
  --color-brand-deep: oklch(10% 0.028 252);
  --color-app-canvas: oklch(14% 0.018 252);
  --color-app-surface: oklch(18% 0.02 252);
  --color-app-rule: oklch(36% 0.028 250);
  --color-app-ink: oklch(96% 0.016 245);
}
```

### DTCG `tokens.json`

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "light": {
      "paper": { "$value": "oklch(98% 0.006 245)", "$type": "color" },
      "ink": { "$value": "oklch(17% 0.025 252)", "$type": "color" },
      "accent": { "$value": "oklch(43% 0.15 245)", "$type": "color" },
      "brandDeep": { "$value": "oklch(18% 0.03 252)", "$type": "color" },
      "rule": { "$value": "oklch(74% 0.022 245)", "$type": "color" },
      "appCanvas": { "$value": "oklch(97% 0.008 245)", "$type": "color" },
      "appSurface": { "$value": "oklch(98% 0.006 245)", "$type": "color" },
      "appInk": { "$value": "oklch(17% 0.025 252)", "$type": "color" }
    },
    "dark": {
      "paper": { "$value": "oklch(14% 0.018 252)", "$type": "color" },
      "ink": { "$value": "oklch(96% 0.016 245)", "$type": "color" },
      "accent": { "$value": "oklch(83% 0.15 245)", "$type": "color" },
      "brandDeep": { "$value": "oklch(10% 0.028 252)", "$type": "color" },
      "rule": { "$value": "oklch(36% 0.028 250)", "$type": "color" },
      "appCanvas": { "$value": "oklch(14% 0.018 252)", "$type": "color" },
      "appSurface": { "$value": "oklch(18% 0.02 252)", "$type": "color" },
      "appInk": { "$value": "oklch(96% 0.016 245)", "$type": "color" }
    }
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
  "size": {
    "textDataMin": { "$value": "0.6875rem", "$type": "dimension" },
    "textXs": { "$value": "0.6875rem", "$type": "dimension" },
    "textSm": { "$value": "0.8125rem", "$type": "dimension" },
    "textBase": { "$value": "0.9375rem", "$type": "dimension" },
    "textMd": { "$value": "1.0625rem", "$type": "dimension" }
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
  --background: 97% 0.008 245;
  --foreground: 17% 0.025 252;
  --card: 98% 0.006 245;
  --card-foreground: 17% 0.025 252;
  --popover: 98% 0.006 245;
  --popover-foreground: 17% 0.025 252;
  --primary: 43% 0.15 245;
  --primary-foreground: 98% 0.006 245;
  --secondary: 94% 0.015 245;
  --secondary-foreground: 27% 0.03 250;
  --muted: 94% 0.015 245;
  --muted-foreground: 44% 0.035 248;
  --border: 74% 0.022 245;
  --input: 60% 0.035 245;
  --ring: 43% 0.18 245;
  --radius: 0.625rem;
}

.dark {
  --background: 14% 0.018 252;
  --foreground: 96% 0.016 245;
  --card: 18% 0.02 252;
  --card-foreground: 96% 0.016 245;
  --popover: 18% 0.02 252;
  --popover-foreground: 96% 0.016 245;
  --primary: 83% 0.15 245;
  --primary-foreground: 14% 0.018 252;
  --secondary: 22% 0.024 252;
  --secondary-foreground: 88% 0.02 245;
  --muted: 22% 0.024 252;
  --muted-foreground: 74% 0.032 248;
  --border: 36% 0.028 250;
  --input: 55% 0.04 245;
  --ring: 72% 0.18 245;
  --radius: 0.625rem;
}
```
