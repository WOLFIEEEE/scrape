import type { MetadataRoute } from "next";

const BASE = process.env.SCRAPE_PUBLIC_URL || "http://localhost:3000";

const STATIC: string[] = [
  "/home", "/features", "/pricing", "/use-cases",
  "/docs", "/docs/quickstart", "/docs/concepts", "/docs/cli",
  "/docs/api", "/docs/api/auth", "/docs/api/webhooks",
  "/docs/tiers", "/docs/proxies", "/docs/captcha",
  "/docs/selectors", "/docs/llm", "/docs/output",
  "/docs/deployment", "/docs/observability", "/docs/scaling",
  "/docs/ethics", "/docs/legal",
  "/changelog", "/blog", "/about", "/contact",
  "/privacy", "/terms", "/security",
  "/login", "/register",
];

const BLOG_POSTS = [
  "tls-fingerprinting-2026",
  "tier-routing",
  "claude-extraction-prompt-cache",
  "ethical-scraping",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    ...STATIC.map((path) => ({
      url: `${BASE}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "/home" ? 1 : 0.7,
    })),
    ...BLOG_POSTS.map((slug) => ({
      url: `${BASE}/blog/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
