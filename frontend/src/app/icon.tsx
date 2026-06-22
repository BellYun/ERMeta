import { ImageResponse } from "next/og";

export const size = { width: 48, height: 48 };
export const contentType = "image/png";

export default function Icon() {
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
        borderRadius: "8px",
      }}
    >
      <div
        style={{
          fontSize: "24px",
          fontWeight: 700,
          color: "#172033",
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
