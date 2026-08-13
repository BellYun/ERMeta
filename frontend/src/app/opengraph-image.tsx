import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BARS = [
  { h: 180, color: "#dbe4f0", op: 1 },
  { h: 280, color: "#cbd5e1", op: 1 },
  { h: 220, color: "#dbe4f0", op: 1 },
  { h: 360, color: "#94a3b8", op: 1 },
  { h: 300, color: "#cbd5e1", op: 1 },
  { h: 240, color: "#dbe4f0", op: 1 },
  { h: 400, color: "#64748b", op: 1 },
  { h: 320, color: "#94a3b8", op: 1 },
];

const BADGES = ["다이아", "운석", "미스릴", "상위 1000위"];

export default function OGImage() {
  return new ImageResponse(
    <div
      style={{
        background: "#f8fafc",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        border: "1px solid #d5dbe5",
      }}
    >
      <div
        style={{
          display: "flex",
          flex: 1,
          padding: "60px 80px",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                background: "#172033",
                border: "1px solid #7da2f8",
                borderRadius: "10px",
                width: "56px",
                height: "56px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                fontWeight: 800,
                color: "#f1f5ff",
                letterSpacing: "-0.8px",
              }}
            >
              ER&amp;GG
            </div>
            <span
              style={{ fontSize: "40px", fontWeight: 700, color: "#0f172a", letterSpacing: "0" }}
            >
              ER&GG
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div
              style={{
                display: "flex",
                fontSize: "58px",
                fontWeight: 700,
                color: "#0f172a",
                lineHeight: 1.12,
                letterSpacing: "0",
              }}
            >
              이터널리턴
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "58px",
                fontWeight: 700,
                color: "#172033",
                lineHeight: 1.12,
                letterSpacing: "0",
              }}
            >
              메타 분석
            </div>
          </div>

          <div style={{ display: "flex", fontSize: "26px", color: "#475569", lineHeight: 1.5 }}>
            실험체 티어 · 3인 조합 · 승률 · 픽률 · 평균 RP
          </div>

          <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
            {BADGES.map((label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  background: "#ffffff",
                  border: "1px solid #d5dbe5",
                  borderRadius: "8px",
                  padding: "8px 18px",
                  fontSize: "18px",
                  color: "#475569",
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "12px",
            marginLeft: "80px",
            paddingBottom: "20px",
          }}
        >
          {BARS.map((bar, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                width: "36px",
                height: `${bar.h}px`,
                background: bar.color,
                borderRadius: "6px 6px 0 0",
                opacity: bar.op,
              }}
            />
          ))}
        </div>
      </div>
    </div>,
    { ...size }
  );
}
