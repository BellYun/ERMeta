# Design — ER&GG

A locked design system for the ER&GG multi-page app. Every page redesign reads this file before emitting code. Amend this file before introducing a page-level visual exception.

## Context

- Audience: experienced Eternal Return players who already understand patches, tiers, roles, and team composition.
- Primary job: read the current meta quickly, then choose a character or composition to investigate.
- Tone: calm and editorial — clear hierarchy, generous spacing, explicit evidence.

## Trust and reading hierarchy

- Direction: a precise, quiet analysis room. Let aligned data, visible conditions, and honest limitations build trust.
- Home order: introduce meta and team analysis together, prioritize the composition start action, compare recorded pre-patch and forecast tiers to current ranking tiers with samples and compact performance changes. Distinguish current strength from change. Keep the live workspace on `/synergy-detail` and full rankings on `/rankings`.
- Home spotlight uses the existing trend score leader, not a claim of highest current performance. Current metrics, patch deltas, and both sample counts remain visible.
- Keep the selected patch and tier next to results. Sample counts are character participation records, not unique matches; estimated match counts must say estimated.
- Missing or failed data displays a dash and an explicit state, never a fabricated zero. Comparisons identify their baseline patch.
- Use restrained headings and neutral surfaces. Reserve strong boundaries for controls and selection; use spacing and thin rules for sections.
- Preserve semantic status colors and readable secondary text in both themes.

## Genre

Modern-minimal and technical, using a custom dual-mode data-hub system tuned for Korean, Japanese, and English Eternal Return interfaces.

## Macrostructure family

- Data overview pages: **Workbench + Index-First** — search and filters lead; compact rankings, patch movement, and supporting lists carry the page.
- Interactive app pages: **Workbench** — controls and live results are the page; no decorative mockups or marketing sections.
- Content hubs and reference pages: **Index-First** — titles, dates, versions, and links form the primary rhythm.

## Theme

**Open Studio** replaces the Open Studio visual direction. The interface is bright, spacious and editorial: neutral near-white canvas, white working surfaces, ink typography, and restrained clear blue selection. The header follows the current surface instead of a dark brand strip. Dark mode uses soft charcoal surfaces with the same geometry.

- Major working areas use 16px corners, subtle boundaries and minimal shadow. Nested content uses whitespace and row separators.
- Page introductions are unboxed, with generous space and large, readable headings. Tables remain compact enough for comparison.
- Character portraits provide identity; decorative imagery is unnecessary.
- Home uses an editorial title/search composition followed by a compact context band and a primary ranking surface.
- Character detail uses a larger portrait/name composition and spacious summary metrics.
- Composition uses an open introduction and a horizontal guide, followed by distinct selection and result surfaces.
- Canonical colors, radii and sizes live in the `studio-*` tokens in `tokens.css`. Existing semantic aliases resolve to them.

## Typography

- Display: Pretendard 700, normal.
- Body: Pretendard 400.
- Outlier: JetBrains Mono 500, only for patch/version labels and headline metrics.
- Display tracking: `-0.035em`.
- Body copy uses a compact 16px baseline; supporting UI copy uses 14px.
- Dense data labels, badges, chart annotations, and version markers keep their component-authored scale. Shared labels use a 12px baseline.

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

## Component implementation

- shadcn/ui source-ownership conventions are the implementation baseline; ER&GG owns and adapts every component under `frontend/src/components/ui`.
- `new-york` supplies interaction density and state patterns, not the visual identity. Open Studio tokens, Pretendard, JetBrains Mono, and ER&GG geometry always override shadcn defaults.
- Stateful overlays and menus should use accessible shadcn/Radix primitives when introduced. Data-heavy domain components such as character cards, rankings, composition pickers, and matrices remain custom.
- Cards are reserved for meaningful group boundaries. Related rows inside a section use separators, tables, tabs, or list structure instead of nested cards.
- Use generous spacing between sections and compact rows within data tables, while preserving 44px touch targets.

## Navigation and footer

- Navigation: N1b Open product bar, adapted to preserve the existing destinations and mobile drawer. Promotional copy may sit in a compact announcement row but must collapse after the user starts scrolling so the 64px product bar remains the only sticky chrome. Search becomes the home page's primary workbench action; Cmd/Ctrl+K remains available on deeper routes.
- Footer: Ft4 Compact colophon — one link row followed by the required API attribution and legal disclaimer.

## CTA voice

- Primary: compact Open Studio treatment, 6px radius, destination-specific verb.
- Secondary: the current mode's surface with a visible mineral rule; no generic “Continue” or “Click here”.

## Per-page allowances

- App pages use no decorative enrichment; game data and character art carry the interface.
- Content pages are typography-first.
- Existing analytics, ads, data fetching, routing, and localization remain unchanged.
- Redirect and performance-lab routes inherit the shell when rendered; redirect behavior and experiment logic remain unchanged.

## What pages MUST share

- Wordmark treatment, neutral navigation surface, Open Studio placement, type roles, focus treatment, button geometry, rules, and spacing tokens.
- The `245°` point hue and semantic meaning of every status colour.
- Loading, empty, error, disabled, and success state language.
- Dense information geometry, table headers, form controls, and active-tab signals across every route family. Repeated panel and row rules stay subordinate to text and data.

## What pages MAY differ on

- Density and column count according to the page’s data.
- Stat-Led, Workbench, or Index-First structure according to page type.
- Character and item imagery already supplied by the product.
- Surface depth, elevation contrast, and canvas brightness between light and dark modes.

## Exports

`tokens.css` is the canonical complete export. All `studio-*` values have light and dark definitions; legacy `color-home-*` and `color-app-*` aliases preserve component compatibility.

### Tailwind v4

Existing application `@theme` utilities are remapped through the semantic aliases in the shared stylesheet. New components consume `var(--studio-surface)`, `var(--studio-ink)`, `var(--studio-rule)` and `var(--studio-accent)`.

### DTCG mapping

Studio canvas/surface/ink/rule/accent use the `color` type; studio radius uses `dimension`. Export light and dark modes separately from the corresponding blocks in `tokens.css`.

### shadcn/ui mapping

Map background → studio-canvas, card/popover → studio-surface, foreground → studio-ink, muted → studio-raised, muted foreground → studio-muted, primary/ring → studio-accent, border → studio-rule, radius → studio-radius. Foreground on accent must use the theme's contrasting ink token.
