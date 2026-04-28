/** @type {import('next').NextConfig} */
const API_URL = process.env.SCRAPE_API_URL || "http://127.0.0.1:8000";

const nextConfig = {
  reactStrictMode: true,
  // Same-origin proxy: the browser hits /api/* on the Next host, Next forwards
  // to the FastAPI backend. Avoids CORS entirely and keeps cookies first-party.
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_URL}/api/:path*` },
    ];
  },
};

export default nextConfig;
