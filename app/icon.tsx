import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Brand mark favicon — geometric M as a knowledge map. */
export default function Icon() {
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
          borderRadius: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            color: "#c8f169",
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: -2,
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
