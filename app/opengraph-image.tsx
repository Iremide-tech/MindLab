import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "MindLab AI — Think. Connect. Learn.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px 88px",
          background:
            "radial-gradient(circle at 82% 8%, #1a2e1c 0%, #0d120e 45%, #090d0a 100%)",
          color: "#f3f7ed",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* Mark approximation with flex circles */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#090d0a",
              border: "1px solid #c8f16955",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#c8f169",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: -1,
            }}
          >
            M
          </div>
          <div style={{ display: "flex", alignItems: "baseline", fontSize: 36, fontWeight: 700 }}>
            MindLab<span style={{ color: "#c8f169" }}>AI</span>
          </div>
        </div>
        <div
          style={{
            marginTop: 48,
            fontSize: 72,
            lineHeight: 1.08,
            fontWeight: 700,
            letterSpacing: -2.5,
          }}
        >
          Think. Connect.
          <br />
          Learn.
        </div>
        <div style={{ marginTop: 24, fontSize: 26, color: "#c5d0bf" }}>
          Your AI-powered workspace for learning and research.
        </div>
        <div style={{ marginTop: 52, fontSize: 20, color: "#c8f169" }}>
          usemindlab.com
        </div>
      </div>
    ),
    size
  );
}
