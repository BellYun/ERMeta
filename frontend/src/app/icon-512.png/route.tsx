import { ImageResponse } from "next/og";

export async function GET() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#172033",
        border: "4px solid #7da2f8",
        borderRadius: "96px",
      }}
    >
      <div
        style={{
          fontSize: "116px",
          fontWeight: 800,
          color: "#f1f5ff",
          letterSpacing: "-8px",
          lineHeight: 1,
        }}
      >
        ER&amp;GG
      </div>
    </div>,
    { width: 512, height: 512 }
  );
}
