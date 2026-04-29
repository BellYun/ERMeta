/**
 * ER&GG Analytics Dashboard Design System
 *
 * 리브랜딩 방향:
 * - 게임 UI가 아니라 데이터 제품처럼 보이는 어두운 분석 대시보드
 * - 숫자와 표가 가장 먼저 읽히는 정보 계층
 * - subtle glassmorphism 위에 절제된 블루 액센트
 *
 * CSS 변수(globals.css @theme)와 1:1 대응.
 */

export const colors = {
  // 배경 계층
  background: "#0b0f1a",
  surface: "rgba(15, 23, 42, 0.74)",
  surface2: "rgba(30, 41, 59, 0.58)",
  surface3: "rgba(51, 65, 85, 0.42)",
  surface4: "rgba(96, 165, 250, 0.10)",
  border: "rgba(255, 255, 255, 0.08)",
  borderLight: "rgba(255, 255, 255, 0.14)",

  // 텍스트
  foreground: "#e5e7eb",
  mutedForeground: "#9ca3af",

  // 액센트
  primary: "#60a5fa",
  primaryHover: "#93c5fd",
  accentGold: "#fbbf24",
  accentPurple: "#a78bfa",

  // Semantic
  danger: "#f87171",
  success: "#4ade80",
  warning: "#fbbf24",

  // 스탯
  statUp: "#4ade80",
  statDown: "#f87171",

  // 티어
  tier: {
    S: "#fbbf24",
    A: "#60a5fa",
    B: "#34d399",
    C: "#a78bfa",
    D: "#94a3b8",
  },
} as const;

export const spacing = {
  headerHeight: "4rem",
  containerMaxWidth: "96rem",
  containerPadding: "1.5rem",
  sidebarWidth: "13rem",
} as const;

export const borderRadius = {
  sm: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.5rem",
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
  panel: "0 28px 60px -40px rgba(0, 0, 0, 0.72)",
  soft: "0 20px 40px -32px rgba(0, 0, 0, 0.56)",
} as const;

export type Tier = keyof typeof colors.tier;
