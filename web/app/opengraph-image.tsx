// Dynamic OG image for social shares. Next.js renders this on demand at
// build time and serves it as /opengraph-image. Placing it at the app root
// means every page gets it as the default share preview unless a more
// specific route segment overrides.
//
// We avoid loading custom fonts here — the ImageResponse runtime can pull
// them from Google Fonts, but doing so adds ~400ms to the build per route
// segment that has its own opengraph-image. Stick to the system stack.

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Scrape — The Web, Excavated.";
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
          background: "#0a0908",
          color: "#f7f4ed",
          padding: "80px",
          position: "relative",
          fontFamily: "ui-serif, Georgia, serif",
        }}
      >
        {/* Subtle grid backdrop, no images required */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(#27241e 1px, transparent 1px), linear-gradient(90deg, #27241e 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            opacity: 0.35,
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "20px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#c14a1a",
              fontFamily: "ui-monospace, Menlo, monospace",
            }}
          >
            <span style={{ display: "block", width: "32px", height: "1px", background: "#c14a1a" }} />
            <span>Scrape · Issue 047 · April 2026</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: "150px",
                lineHeight: 0.92,
                letterSpacing: "-0.02em",
                fontWeight: 400,
              }}
            >
              The web,
            </div>
            <div
              style={{
                fontSize: "150px",
                lineHeight: 0.92,
                letterSpacing: "-0.02em",
                color: "#c14a1a",
                fontStyle: "italic",
                fontWeight: 400,
              }}
            >
              excavated.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              fontSize: "20px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#a89e8a",
              fontFamily: "ui-monospace, Menlo, monospace",
            }}
          >
            <span>Production-grade scraping infrastructure</span>
            <span>scrape.dev</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
