import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#172033",
        border: "2px solid #7da2f8",
        borderRadius: "32px",
      }}
    >
      <div
        style={{
          fontSize: "40px",
          fontWeight: 800,
          color: "#f1f5ff",
          letterSpacing: "-2.8px",
          lineHeight: 1,
        }}
      >
        ER&amp;GG
      </div>
    </div>,
    { ...size }
  );
}
