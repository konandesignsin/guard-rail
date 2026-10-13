import { ImageResponse } from "next/og";

export const alt = "guardrail — security spell-checker for AI-built apps";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          backgroundColor: "#090A0F",
          padding: "80px",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* Logo mark */}
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "14px",
              backgroundColor: "#161922",
              border: "1px solid #222634",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <span style={{ fontSize: "36px", fontWeight: "600", color: "#EDEDF0", lineHeight: 1 }}>
              g
            </span>
            <div
              style={{
                width: "28px",
                height: "3px",
                backgroundColor: "#E5484D",
                borderRadius: "2px",
                marginTop: "4px",
              }}
            />
          </div>
          <span style={{ fontSize: "36px", fontWeight: "600", color: "#EDEDF0", letterSpacing: "-0.03em" }}>
            guardrail
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "900px" }}>
          <h1
            style={{
              fontSize: "64px",
              fontWeight: "400",
              color: "#EDEDF0",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            The spell-checker for app security.
          </h1>
          <p
            style={{
              fontSize: "26px",
              color: "#8B949E",
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            Find leaked secret keys, open database policies, and messy code in your AI-built apps.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              backgroundColor: "#161922",
              borderRadius: "9999px",
              border: "1px solid #222634",
              color: "#8B949E",
              fontSize: "18px",
            }}
          >
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#3DD68C" }} />
            <span>Runs locally &amp; in-browser</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              backgroundColor: "#161922",
              borderRadius: "9999px",
              border: "1px solid #222634",
              color: "#8B949E",
              fontSize: "18px",
            }}
          >
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#E5484D" }} />
            <span>Instant plain-English fixes</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
