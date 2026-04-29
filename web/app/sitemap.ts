import type { MetadataRoute } from "next";
import { POSTS_INDEX } from "@/lib/blog";

const BASE = process.env.SCRAPE_PUBLIC_URL || "http://localhost:3000";

// Page-set tiers, each with a sensible default change-frequency / priority.
// Search engines treat these as hints, not commands — the goal is honesty:
// say what's actually true so we don't get our sitemap rate-limited.
const HIGH_PRIORITY_PAGES = [
  "/home",
  "/features",
  "/pricing",
  "/use-cases",
] as const;

const MEDIUM_PRIORITY_PAGES = [
  "/about",
  "/contact",
  "/security",
  "/changelog",
  "/blog",
  "/docs",
] as const;

const DOC_PAGES = [
  "/docs/quickstart",
  "/docs/concepts",
  "/docs/cli",
  "/docs/api",
  "/docs/api/auth",
  "/docs/api/webhooks",
  "/docs/tiers",
  "/docs/proxies",
  "/docs/captcha",
  "/docs/selectors",
  "/docs/llm",
  "/docs/output",
  "/docs/deployment",
  "/docs/observability",
  "/docs/scaling",
  "/docs/ethics",
  "/docs/legal",
] as const;

// Indexed but not promoted heavily — legal boilerplate + accessibility filings.
const FOOTER_PAGES = ["/privacy", "/terms", "/accessibility", "/vpat"] as const;

// Auth-flow entry points. Useful to surface in search ("scrape login")
// but very low priority and rarely change.
const AUTH_PAGES = ["/login", "/register"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    // Root resolves to /home but is sometimes the URL people share —
    // include it explicitly so search engines see one canonical entry point.
    {
      url: `${BASE}/`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 1.0,
    },
    ...HIGH_PRIORITY_PAGES.map((path) => ({
      url: `${BASE}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "/home" ? 1.0 : 0.9,
    })),
    ...MEDIUM_PRIORITY_PAGES.map((path) => ({
      url: `${BASE}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...DOC_PAGES.map((path) => ({
      url: `${BASE}${path}`,
      lastModified: now,
      // Docs change with releases — be honest with crawlers.
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...FOOTER_PAGES.map((path) => ({
      url: `${BASE}${path}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
    ...AUTH_PAGES.map((path) => ({
      url: `${BASE}${path}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.2,
    })),
    ...POSTS_INDEX.map((p) => ({
      url: `${BASE}/blog/${p.slug}`,
      // Use the post's actual publish date so crawlers can re-crawl smartly.
      lastModified: new Date(p.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
