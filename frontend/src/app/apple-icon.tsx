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
        background: "#ffffff",
        border: "1px solid #d5dbe5",
        borderRadius: "32px",
      }}
    >
      <div
        style={{
          fontSize: "90px",
          fontWeight: 700,
          color: "#1d4ed8",
          letterSpacing: "0",
          lineHeight: 1,
        }}
      >
        ER
      </div>
    </div>,
    { ...size }
  );
}
