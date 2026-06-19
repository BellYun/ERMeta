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
        background: "#ffffff",
        border: "1px solid #d5dbe5",
        borderRadius: "96px",
      }}
    >
      <div
        style={{
          fontSize: "248px",
          fontWeight: 700,
          color: "#172033",
          letterSpacing: "0",
          lineHeight: 1,
        }}
      >
        ER
      </div>
    </div>,
    { width: 512, height: 512 }
  );
}
