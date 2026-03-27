/**
 * ER&GG 디자인 토큰
 *
 * CSS 변수(globals.css @theme)와 1:1 대응.
 * 컴포넌트에서 값 참조가 필요할 때 이 파일을 단일 소스로 사용한다.
 */

export const colors = {
  // 배경 계층
  background: "#0d1117",
  surface: "#161b22",
  surface2: "#1c2128",
  surface3: "#242a33",
  border: "#30363d",
  borderLight: "#3d444d",

  // 텍스트
  foreground: "#c9d1d9",
  mutedForeground: "#7d8590",

  // 액센트
  primary: "#58a6ff",
  primaryHover: "#79c0ff",
  accentGold: "#f0b132",
  accentPurple: "#bc8cff",

  // Semantic
  danger: "#f85149",
  success: "#3fb950",
  warning: "#d29922",

  // 스탯
  statUp: "#3fb950",
  statDown: "#f85149",

  // 티어
  tier: {
    S: "#ff6b6b",
    A: "#ff922b",
    B: "#ffd43b",
    C: "#51cf66",
    D: "#7d8590",
  },
} as const

export const spacing = {
  headerHeight: "3rem", // 48px
  containerMaxWidth: "72rem", // max-w-6xl
  containerPadding: "1rem",
} as const

export const borderRadius = {
  sm: "0.375rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
  full: "9999px",
} as const

export const typography = {
  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  size: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
  },
} as const

export type Tier = keyof typeof colors.tier
