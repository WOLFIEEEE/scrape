import type { MetadataRoute } from "next";

const BASE = process.env.SCRAPE_PUBLIC_URL || "http://localhost:3000";

// Anything behind authentication or that's purely backend-only is excluded.
// We deliberately keep /login and /register indexable so users searching
// "scrape login" land on the right page; everything past auth is private.
const PRIVATE_PATHS = [
  "/api/",         // Backend JSON endpoints proxied by Next
  "/dashboard",    // Authenticated user dashboard
  "/jobs",         // Job CRUD pages, gated by auth
  "/settings",     // Account settings
  "/forgot",       // Password recovery flow — short-lived tokens, don't index
  "/reset",        // Password reset confirmation pages
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
      // GPTBot and friends are noisy; leave them allowed for now (we *want*
      // to be indexed in AI-search tools). Add explicit disallows here only
      // if a customer asks us to opt out of LLM training crawlers.
    ],
    sitemap: `${BASE}/sitemap.xml`,
    // `host` is deprecated by Google (2023) — sitemap+canonical tags do the
    // job. Leaving it out keeps robots.txt forward-compatible.
  };
}
