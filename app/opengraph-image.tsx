import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";

export const alt = "guardrail — security spell-checker for AI-built apps";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  const logoData = fs.readFileSync(path.join(process.cwd(), "public", "guardrail-logo-light.png"));
  const logoBase64 = `data:image/png;base64,${logoData.toString("base64")}`;

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
          backgroundColor: "#05060f",
          padding: "80px",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          {/* Logo mark */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoBase64}
            alt="GuardRail"
            width={72}
            height={70}
            style={{ width: "72px", height: "70px", objectFit: "contain" }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "40px", fontWeight: "700", color: "#EDEDF0", letterSpacing: "-0.02em", lineHeight: 1 }}>
              GuardRail
            </span>
            <div
              style={{
                width: "100%",
                height: "3px",
                backgroundColor: "#e5484d",
                borderRadius: "2px",
                marginTop: "6px",
              }}
            />
          </div>
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
