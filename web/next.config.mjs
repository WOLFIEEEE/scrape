import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const API_URL = process.env.SCRAPE_API_URL || "http://127.0.0.1:8000";
const WEB_ROOT = dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: WEB_ROOT,
  // Same-origin proxy: the browser hits /api/* on the Next host, Next forwards
  // to the FastAPI backend. Avoids CORS entirely and keeps cookies first-party.
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_URL}/api/:path*` },
    ];
  },
};

export default nextConfig;
