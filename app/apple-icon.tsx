import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#090A0F",
          borderRadius: "36px",
        }}
      >
        <span
          style={{
            fontSize: "108px",
            fontWeight: "600",
            color: "#EDEDF0",
            lineHeight: 1,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          g
        </span>
        <div
          style={{
            width: "56px",
            height: "8px",
            backgroundColor: "#E5484D",
            borderRadius: "4px",
            marginTop: "6px",
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
