// Single source of truth for blog posts. The listing page, the post pages,
// the sitemap, and JSON-LD metadata all read from here so they stay in sync.
//
// Slugs in this file ARE the URL slug. Keep them stable — changing one is a
// silent SEO regression (existing inbound links 404). If you must rename,
// add a redirect in next.config.mjs.

import type { ReactNode } from "react";

export type BlogPost = {
  /** URL slug. Must be stable — see header note. */
  slug: string;
  /** Sequence number shown on listing. Cosmetic. */
  n: string;
  title: string;
  /** ~140-160 chars, first-impression copy + meta description. */
  excerpt: string;
  date: string;          // human-readable, e.g. "Apr 24, 2026"
  publishedAt: string;   // ISO 8601, used in JSON-LD + sitemap lastmod
  tag: string;
  read: string;
  /** Article body — plain JSX. Lazy-loaded by post page. */
  body?: ReactNode;
};

export const POSTS_INDEX: Omit<BlogPost, "body">[] = [
  {
    n: "001",
    slug: "tls-fingerprinting-2026",
    title: "Why your scraper is still getting flagged at the TCP layer",
    excerpt:
      "JA4+ killed the static fingerprint hash. Here's what replaced it and how curl-impersonate keeps up — TLS 1.3, extension permutation, and HTTP/2 frame ordering explained.",
    date: "Apr 24, 2026",
    publishedAt: "2026-04-24",
    tag: "ENGINEERING",
    read: "8 MIN",
  },
  {
    n: "002",
    slug: "tier-routing",
    title: "Tier routing: the mental model that cuts scraping costs by 80%",
    excerpt:
      "Stop running every URL through a headless browser. Tier routing — start cheap, escalate only when blocked — saves 60× on bandwidth and CPU at scale.",
    date: "Apr 17, 2026",
    publishedAt: "2026-04-17",
    tag: "PATTERNS",
    read: "6 MIN",
  },
  {
    n: "003",
    slug: "claude-extraction-prompt-cache",
    title: "Schema-driven extraction with Claude — and a 90% prompt cache",
    excerpt:
      "How we cut LLM extraction cost from $30 per 1k pages to $3 with one Anthropic feature. A practical guide to prompt caching for structured data extraction.",
    date: "Apr 10, 2026",
    publishedAt: "2026-04-10",
    tag: "AI",
    read: "5 MIN",
  },
  {
    n: "004",
    slug: "ethical-scraping",
    title: "Scraping ethically in 2026 (post-hiQ, post-AI Act)",
    excerpt:
      "What changed legally, what didn't, and what defaults every scraper should ship with. A field guide to robots.txt, GDPR, the EU AI Act, and the post-Clearview landscape.",
    date: "Apr 3, 2026",
    publishedAt: "2026-04-03",
    tag: "COMPLIANCE",
    read: "10 MIN",
  },
];

export function getPostMeta(slug: string) {
  return POSTS_INDEX.find((p) => p.slug === slug);
}
