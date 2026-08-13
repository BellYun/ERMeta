/**
 * ER&GG interface tokens
 *
 * 방향:
 * - 게임 UI가 아니라 데이터 제품처럼 보이는 절제된 통계 화면
 * - 숫자와 표가 가장 먼저 읽히는 정보 계층
 * - 과한 장식보다 테두리, 여백, 명확한 대비 우선
 *
 * CSS 변수(globals.css @theme)와 1:1 대응.
 */

export const colors = {
  // 배경 계층
  background: "oklch(98% 0.006 245)",
  surface: "oklch(98% 0.006 245)",
  surface2: "oklch(97% 0.008 245)",
  surface3: "oklch(94% 0.015 245)",
  surface4: "oklch(94% 0.015 245)",
  border: "oklch(88% 0.018 245)",
  borderLight: "oklch(60% 0.035 245)",

  // 텍스트
  foreground: "oklch(17% 0.025 252)",
  mutedForeground: "oklch(34% 0.032 250)",

  // 액센트
  primary: "oklch(17% 0.025 252)",
  primaryHover: "oklch(25% 0.03 252)",
  accent: "oklch(43% 0.15 245)",
  accentMuted: "oklch(92% 0.035 245)",
  accentForeground: "oklch(37% 0.16 245)",
  accentGold: "oklch(37% 0.16 245)",
  accentPurple: "oklch(34% 0.032 250)",
  traitChaos: "oklch(50% 0.19 294)",
  dangerReadable: "oklch(45% 0.19 25)",

  // Semantic
  danger: "oklch(49% 0.19 25)",
  success: "oklch(40% 0.13 150)",
  warning: "oklch(50% 0.12 80)",

  // 스탯
  statUp: "oklch(40% 0.13 150)",
  statDown: "oklch(49% 0.19 25)",

  // 티어
  tier: {
    S: "oklch(52% 0.2 294)",
    A: "oklch(43% 0.15 245)",
    B: "oklch(40% 0.13 150)",
    C: "oklch(50% 0.12 80)",
    D: "oklch(49% 0.19 25)",
  },
} as const;

export const darkColors = {
  background: "oklch(14% 0.018 252)",
  surface: "oklch(14% 0.018 252)",
  surface2: "oklch(18% 0.02 252)",
  surface3: "oklch(22% 0.024 252)",
  surface4: "oklch(22% 0.024 252)",
  border: "oklch(30% 0.026 250)",
  borderLight: "oklch(55% 0.04 248)",
  foreground: "oklch(96% 0.016 245)",
  mutedForeground: "oklch(82% 0.024 245)",
  primary: "oklch(96% 0.016 245)",
  primaryHover: "oklch(88% 0.02 245)",
  accent: "oklch(83% 0.15 245)",
  accentMuted: "oklch(27% 0.045 245)",
  accentForeground: "oklch(88% 0.13 245)",
  accentGold: "oklch(88% 0.13 245)",
  accentPurple: "oklch(82% 0.024 245)",
  traitChaos: "oklch(76% 0.13 294)",
  dangerReadable: "oklch(82% 0.14 25)",
  danger: "oklch(78% 0.16 25)",
  success: "oklch(81% 0.14 150)",
  warning: "oklch(84% 0.13 80)",
  statUp: "oklch(81% 0.14 150)",
  statDown: "oklch(78% 0.16 25)",
  tier: {
    S: "oklch(72% 0.14 294)",
    A: "oklch(83% 0.15 245)",
    B: "oklch(81% 0.14 150)",
    C: "oklch(84% 0.13 80)",
    D: "oklch(78% 0.16 25)",
  },
} as const;

export const spacing = {
  headerHeight: "4rem",
  containerMaxWidth: "96rem",
  containerPadding: "1.5rem",
  sidebarWidth: "13rem",
} as const;

export const borderRadius = {
  sm: "0.25rem",
  md: "0.375rem",
  lg: "0.5rem",
  xl: "0.5rem",
  full: "9999px",
} as const;

export const typography = {
  fontFamily: "var(--font-plex-sans-kr), sans-serif",
  monoFamily: "var(--font-plex-mono), monospace",
  size: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
  },
} as const;

export const elevation = {
  panel: "none",
  soft: "none",
} as const;

export type Tier = keyof typeof colors.tier;
