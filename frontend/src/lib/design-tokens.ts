/**
 * ERMeta 디자인 토큰
 *
 * CSS 변수(globals.css @theme)와 1:1 대응.
 * 컴포넌트에서 값 참조가 필요할 때 이 파일을 단일 소스로 사용한다.
 */

export const colors = {
  // 배경 계층
  background: "#0f0f14",
  surface: "#16161e",
  surface2: "#1e1e2a",
  border: "#2a2a3a",

  // 텍스트
  foreground: "#e2e8f0",
  mutedForeground: "#94a3b8",

  // 액센트
  primary: "#6366f1",
  primaryHover: "#4f46e5",
  accentGold: "#f59e0b",
  danger: "#ef4444",

  // 티어
  tier: {
    S: "#ef4444",
    A: "#f97316",
    B: "#eab308",
    C: "#22c55e",
    D: "#94a3b8",
  },
} as const

export const spacing = {
  headerHeight: "3.5rem", // 56px
  containerMaxWidth: "72rem", // max-w-6xl
  containerPadding: "1rem",
} as const

export const borderRadius = {
  sm: "0.375rem",
  md: "0.5rem",
  lg: "0.75rem",
  full: "9999px",
} as const

export const typography = {
  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  size: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
  },
} as const

export type Tier = keyof typeof colors.tier
