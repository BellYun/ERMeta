import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0f0f14",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "40px",
        }}
      >
        {/* L 레터마크 */}
        <div
          style={{
            fontSize: "100px",
            fontWeight: 800,
            color: "#6366f1",
            letterSpacing: "-4px",
            lineHeight: 1,
          }}
        >
          L
        </div>
        {/* 골드 바 3개 */}
        <div
          style={{
            display: "flex",
            gap: "6px",
            alignItems: "flex-end",
            marginTop: "8px",
          }}
        >
          <div style={{ width: "10px", height: "16px", background: "#f59e0b", borderRadius: "3px", opacity: 0.6 }} />
          <div style={{ width: "10px", height: "24px", background: "#f59e0b", borderRadius: "3px", opacity: 0.8 }} />
          <div style={{ width: "10px", height: "20px", background: "#f59e0b", borderRadius: "3px", opacity: 0.7 }} />
        </div>
      </div>
    ),
    { ...size }
  )
}
