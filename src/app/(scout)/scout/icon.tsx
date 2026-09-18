import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function ScoutIcon() {
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
          fontSize: 220,
          letterSpacing: 4,
          fontWeight: 600,
        }}
      >
        S
      </div>
    ),
    size
  );
}
