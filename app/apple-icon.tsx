import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function Icon() {
  const filePath = path.join(process.cwd(), "public", "apple-touch-icon.png");
  if (fs.existsSync(filePath)) {
    const buffer = fs.readFileSync(filePath);
    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  // Fallback if needed
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#05060f",
        }}
      >
        <span style={{ color: "#fff", fontSize: "40px", fontWeight: "bold" }}>G</span>
      </div>
    ),
    {
      ...size,
    }
  );
}
