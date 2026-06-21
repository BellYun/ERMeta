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
  background: "#ffffff",
  surface: "#ffffff",
  surface2: "#f8fafc",
  surface3: "#eef2f6",
  surface4: "#f5f7fa",
  border: "#e5e7eb",
  borderLight: "#d1d5db",

  // 텍스트
  foreground: "#172033",
  mutedForeground: "#687386",

  // 액센트
  primary: "#374151",
  primaryHover: "#111827",
  accent: "#2563eb",
  accentMuted: "#dbeafe",
  accentForeground: "#1d4ed8",
  accentGold: "#2563eb",
  accentPurple: "#687386",

  // Semantic
  danger: "#dc2626",
  success: "#15803d",
  warning: "#374151",

  // 스탯
  statUp: "#15803d",
  statDown: "#dc2626",

  // 티어
  tier: {
    S: "#374151",
    A: "#374151",
    B: "#687386",
    C: "#687386",
    D: "#64748b",
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
