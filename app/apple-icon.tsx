import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#090d0a",
          borderRadius: 36,
        }}
      >
        <div
          style={{
            display: "flex",
            color: "#c8f169",
            fontSize: 100,
            fontWeight: 800,
            letterSpacing: -4,
            fontFamily: "Arial, sans-serif",
          }}
        >
          M
        </div>
      </div>
    ),
    size
  );
}
