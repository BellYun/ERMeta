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
  background: "#f8fafc",
  surface: "#ffffff",
  surface2: "#f1f5f9",
  surface3: "#e2e8f0",
  surface4: "#eef2f7",
  border: "#cbd5e1",
  borderLight: "#94a3b8",

  // 텍스트
  foreground: "#172033",
  mutedForeground: "#475569",

  // 액센트
  primary: "#374151",
  primaryHover: "#111827",
  accent: "#1d4ed8",
  accentMuted: "#dbeafe",
  accentForeground: "#1e40af",
  accentGold: "#1d4ed8",
  accentPurple: "#475569",
  traitChaos: "#6d28d9",
  dangerReadable: "#b91c1c",

  // Semantic
  danger: "#b91c1c",
  success: "#116b34",
  warning: "#374151",

  // 스탯
  statUp: "#116b34",
  statDown: "#b91c1c",

  // 티어
  tier: {
    S: "#7c3aed",
    A: "#1d4ed8",
    B: "#047857",
    C: "#b45309",
    D: "#b91c1c",
  },
} as const;

export const darkColors = {
  background: "#0b1220",
  surface: "#111827",
  surface2: "#172033",
  surface3: "#1f2937",
  surface4: "#243244",
  border: "#334155",
  borderLight: "#475569",
  foreground: "#e5e7eb",
  mutedForeground: "#94a3b8",
  primary: "#e5e7eb",
  primaryHover: "#f8fafc",
  accent: "#60a5fa",
  accentMuted: "rgba(37, 99, 235, 0.2)",
  accentForeground: "#93c5fd",
  accentGold: "#60a5fa",
  accentPurple: "#94a3b8",
  traitChaos: "#c4b5fd",
  dangerReadable: "#fca5a5",
  danger: "#f87171",
  success: "#4ade80",
  warning: "#fbbf24",
  statUp: "#4ade80",
  statDown: "#f87171",
  tier: {
    S: "#8b5cf6",
    A: "#2563eb",
    B: "#059669",
    C: "#d97706",
    D: "#dc2626",
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
