import Link from "next/link";
import type { Metadata } from "next";
import { Section } from "@/components/marketing/section";
import { POSTS_INDEX } from "@/lib/blog";
import { JsonLd } from "@/components/marketing/json-ld";
import { pageMeta, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Dispatches",
  description:
    "Long-form posts on anti-bot bypass, scraping at scale, and shipping data pipelines. Engineering, AI, ethics, and patterns from the trenches.",
  path: "/blog",
});

const POSTS = POSTS_INDEX;

export default function BlogPage() {
  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Scrape · Dispatches",
    url: `${SITE_URL}/blog`,
    description:
      "Engineering posts on anti-bot bypass, tier routing, LLM extraction, and ethical scraping.",
    blogPost: POSTS.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      datePublished: p.publishedAt,
      url: `${SITE_URL}/blog/${p.slug}`,
      description: p.excerpt,
    })),
  };
  return (
    <>
      <JsonLd data={blogJsonLd} />
      <section className="border-b border-line">
        <div className="container mx-auto max-w-6xl px-6 pt-20 pb-12">
          <div className="eyebrow mb-6">/ DISPATCHES</div>
          <h1 className="display text-7xl md:text-9xl leading-[0.85]">
            Notes from<br />
            <span className="text-rust">the trenches.</span>
          </h1>
          <p className="mt-8 text-lg text-muted max-w-xl leading-relaxed">
            Long-form posts on anti-bot bypass, scraping at scale, and shipping data pipelines.
          </p>
        </div>
      </section>

      <Section className="py-20">
        <div className="border border-line">
          {POSTS.map((p, i) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className={`group grid grid-cols-12 gap-6 p-8 ${i < POSTS.length - 1 ? "border-b border-line" : ""} hover:bg-bg-2/40 transition-colors`}
            >
              <div className="col-span-12 md:col-span-2">
                <div className="display text-5xl text-rust">{p.n}</div>
              </div>
              <div className="col-span-12 md:col-span-7">
                <div className="flex items-center gap-3 eyebrow text-muted">
                  <span className="text-rust">{p.tag}</span>
                  <span>·</span>
                  <span>{p.date}</span>
                  <span>·</span>
                  <span>{p.read}</span>
                </div>
                <h2 className="display-up text-2xl md:text-3xl mt-3 group-hover:text-rust transition-colors">{p.title}</h2>
                <p className="mt-3 text-sm text-muted leading-relaxed">{p.excerpt}</p>
              </div>
              <div className="col-span-12 md:col-span-3 md:text-right text-muted small-caps self-end">
                Read dispatch →
              </div>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
