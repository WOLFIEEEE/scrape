// SEO helpers used across marketing pages. Centralizing these means we have
// one place to update brand naming, default OG copy, and canonical URL logic.

import type { Metadata } from "next";

export const SITE_URL = (
  process.env.SCRAPE_PUBLIC_URL || "http://localhost:3000"
).replace(/\/$/, "");

const DEFAULT_OG_DESCRIPTION = "Strip the surface. Read the strata. Extract the signal.";

export type PageMetaInput = {
  /** Page title — gets the global "%s · Scrape" template applied. */
  title: string;
  /** 140-160 char description used for SERP snippet AND OG description. */
  description: string;
  /** Path under SITE_URL, e.g. "/features". Required for canonical + OG URL. */
  path: string;
  /** Override default OG title (default: same as title with brand). */
  ogTitle?: string;
  /** Override OG description if you want a punchier tagline than `description`. */
  ogDescription?: string;
  /** Mark as article (used for blog posts). */
  ogType?: "website" | "article";
  /** Tell crawlers not to index (used by 404 / auth-gated entry points). */
  noindex?: boolean;
};

/** Build a Metadata object with consistent OG / Twitter / canonical wiring. */
export function pageMeta(input: PageMetaInput): Metadata {
  const url = `${SITE_URL}${input.path}`;
  const ogTitle = input.ogTitle ?? `${input.title} · Scrape`;
  const ogDescription = input.ogDescription ?? input.description ?? DEFAULT_OG_DESCRIPTION;

  const meta: Metadata = {
    title: input.title,
    description: input.description,
    alternates: { canonical: input.path },
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url,
      siteName: "Scrape",
      type: input.ogType ?? "website",
      locale: "en_US",
      // Setting an explicit openGraph block on a page replaces the parent
      // layout's auto-injected og:image — so we re-inject it here. The path
      // resolves against metadataBase (configured in the root layout).
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: "Scrape — The Web, Excavated.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: ["/opengraph-image"],
    },
  };
  if (input.noindex) {
    meta.robots = { index: false, follow: false };
  }
  return meta;
}
