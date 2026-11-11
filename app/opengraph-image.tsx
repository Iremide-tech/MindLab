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
          padding: "88px",
          background: "radial-gradient(circle at 80% 15%, #263d2c 0%, #111710 42%, #090d0a 100%)",
          color: "#f3f7ed",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 38, fontWeight: 700 }}>
          MindLab<span style={{ color: "#c8f169" }}>AI</span>
        </div>
        <div style={{ marginTop: 54, fontSize: 76, lineHeight: 1.08, fontWeight: 700, letterSpacing: -3 }}>
          Think. Connect.
          <br />
          Learn.
        </div>
        <div style={{ marginTop: 28, fontSize: 28, color: "#c5d0bf" }}>
          Your AI-powered workspace for learning and research.
        </div>
        <div style={{ marginTop: 58, fontSize: 20, color: "#c8f169" }}>
          usemindlab.com
        </div>
      </div>
    ),
    size
  );
}
