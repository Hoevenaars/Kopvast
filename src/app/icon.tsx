import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

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
          background: "#121212",
          color: "#F3F0E8",
          fontSize: 34,
          letterSpacing: 1,
          fontWeight: 600,
        }}
      >
        K
      </div>
    ),
    size
  );
}
