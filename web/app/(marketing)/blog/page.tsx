import Link from "next/link";
import { Section } from "@/components/marketing/section";

export const metadata = { title: "Dispatches" };

const POSTS = [
  {
    n: "001", slug: "tls-fingerprinting-2026",
    title: "Why your scraper is still getting flagged at the TCP layer",
    excerpt: "JA4+ killed the static fingerprint hash. Here's what replaced it and how curl-impersonate keeps up.",
    date: "Apr 24, 2026", tag: "ENGINEERING", read: "8 MIN",
  },
  {
    n: "002", slug: "tier-routing",
    title: "Tier routing: the mental model that cuts scraping costs by 80%",
    excerpt: "Stop running every URL through a headless browser. Start with the cheapest stratum.",
    date: "Apr 17, 2026", tag: "PATTERNS", read: "6 MIN",
  },
  {
    n: "003", slug: "claude-extraction-prompt-cache",
    title: "Schema-driven extraction with Claude — and a 90% prompt cache",
    excerpt: "How we cut LLM extraction cost from $30/1k pages to $3 with one Anthropic feature.",
    date: "Apr 10, 2026", tag: "AI", read: "5 MIN",
  },
  {
    n: "004", slug: "ethical-scraping",
    title: "Scraping ethically in 2026 (post-hiQ, post-AI Act)",
    excerpt: "What changed legally, what didn't, and what defaults every scraper should ship with.",
    date: "Apr 3, 2026", tag: "COMPLIANCE", read: "10 MIN",
  },
];

export default function BlogPage() {
  return (
    <>
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
