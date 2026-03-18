import { ImageResponse } from "next/og"

export const size = { width: 48, height: 48 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #38bdf8, #a78bfa)",
          borderRadius: "10px",
        }}
      >
        <div
          style={{
            fontSize: "24px",
            fontWeight: 900,
            color: "#ffffff",
            letterSpacing: "-1px",
            lineHeight: 1,
          }}
        >
          ER
        </div>
      </div>
    ),
    { ...size }
  )
}
