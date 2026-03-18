import { ImageResponse } from "next/og"

export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const BARS = [
  { h: 180, color: "#38bdf8", op: 0.4 },
  { h: 280, color: "#a78bfa", op: 0.6 },
  { h: 220, color: "#38bdf8", op: 0.7 },
  { h: 360, color: "#a78bfa", op: 0.9 },
  { h: 300, color: "#38bdf8", op: 1.0 },
  { h: 240, color: "#a78bfa", op: 0.7 },
  { h: 400, color: "#38bdf8", op: 1.0 },
  { h: 320, color: "#a78bfa", op: 0.8 },
]

const BADGES = ["다이아", "운석", "미스릴", "상위 1000위"]

export default function OGImage() {
  return new ImageResponse(
    (
      <div style={{ background: "#0f0f14", width: "100%", height: "100%", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
        {/* 상단 그라디언트 라인 */}
        <div style={{ width: "100%", height: "4px", background: "linear-gradient(90deg, #38bdf8, #a78bfa)", flexShrink: 0, display: "flex" }} />

        {/* 메인 콘텐츠 */}
        <div style={{ display: "flex", flex: 1, padding: "60px 80px", alignItems: "center", justifyContent: "space-between" }}>

          {/* 좌측: 텍스트 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px", flex: 1 }}>

            {/* 브랜드 */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ background: "linear-gradient(135deg, #38bdf8, #a78bfa)", borderRadius: "12px", width: "56px", height: "56px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: 900, color: "white" }}>
                ER
              </div>
              <span style={{ fontSize: "40px", fontWeight: 800, color: "#e2e8f0", letterSpacing: "-1px" }}>
                ER&GG
              </span>
            </div>

            {/* 타이틀 2줄 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ display: "flex", fontSize: "64px", fontWeight: 800, color: "#e2e8f0", lineHeight: 1.1, letterSpacing: "-2px" }}>
                이터널리턴
              </div>
              <div style={{ display: "flex", fontSize: "64px", fontWeight: 800, color: "#38bdf8", lineHeight: 1.1, letterSpacing: "-2px" }}>
                메타 분석
              </div>
            </div>

            {/* 설명 */}
            <div style={{ display: "flex", fontSize: "26px", color: "#94a3b8", lineHeight: 1.5 }}>
              캐릭터 티어 · 3인 조합 추천 · 승률 · 픽률 · 평균 RP
            </div>

            {/* 배지들 */}
            <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
              {BADGES.map((label) => (
                <div key={label} style={{ display: "flex", background: "#16161e", border: "1px solid #2d2d3d", borderRadius: "20px", padding: "8px 18px", fontSize: "18px", color: "#94a3b8" }}>
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* 우측: 바 차트 */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: "12px", marginLeft: "80px", paddingBottom: "20px" }}>
            {BARS.map((bar, i) => (
              <div key={i} style={{ display: "flex", width: "36px", height: `${bar.h}px`, background: bar.color, borderRadius: "6px 6px 0 0", opacity: bar.op }} />
            ))}
          </div>
        </div>

        {/* 하단 그라디언트 라인 */}
        <div style={{ display: "flex", height: "3px", background: "linear-gradient(90deg, #38bdf8, #a78bfa)", flexShrink: 0 }} />
      </div>
    ),
    { ...size }
  )
}
