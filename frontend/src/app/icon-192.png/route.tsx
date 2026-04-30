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
        background: "linear-gradient(135deg, #38bdf8, #a78bfa)",
        borderRadius: "40px",
      }}
    >
      <div
        style={{
          fontSize: "96px",
          fontWeight: 900,
          color: "#ffffff",
          letterSpacing: "-4px",
          lineHeight: 1,
        }}
      >
        ER
      </div>
    </div>,
    { width: 192, height: 192 }
  );
}
