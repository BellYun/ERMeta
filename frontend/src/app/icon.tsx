import { ImageResponse } from "next/og"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0f0f14",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "6px",
          position: "relative",
        }}
      >
        {/* 배경 그라디언트 원 */}
        <div
          style={{
            position: "absolute",
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            background: "radial-gradient(circle, #6366f120 0%, transparent 70%)",
          }}
        />
        {/* L 레터마크 */}
        <div
          style={{
            fontSize: "20px",
            fontWeight: 800,
            color: "#6366f1",
            letterSpacing: "-1px",
            lineHeight: 1,
            marginBottom: "4px",
          }}
        >
          L
        </div>
        {/* 하단 골드 도트 */}
        <div
          style={{
            position: "absolute",
            bottom: "6px",
            width: "4px",
            height: "4px",
            borderRadius: "50%",
            background: "#f59e0b",
          }}
        />
      </div>
    ),
    { ...size }
  )
}
