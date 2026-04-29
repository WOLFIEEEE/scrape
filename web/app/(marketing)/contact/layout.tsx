// Contact page is a client component (uses form state), so its metadata
// has to live one level up in this layout. This is the App Router pattern
// for "page is interactive but I still need server-side <head> tags".
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Contact",
  description:
    "Reach the Scrape team for sales, support, partnerships, security disclosures, or general questions. GitHub Discussions, email, and a contact form.",
  path: "/contact",
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
