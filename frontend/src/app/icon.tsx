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
        background: "#172033",
        border: "1px solid #7da2f8",
        borderRadius: "8px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          fontWeight: 800,
          color: "#f1f5ff",
          letterSpacing: "-0.8px",
          lineHeight: 1,
        }}
      >
        ER&amp;GG
      </div>
    </div>,
    { ...size }
  );
}
