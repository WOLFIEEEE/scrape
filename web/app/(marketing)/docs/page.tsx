import Link from "next/link";
import type { Metadata } from "next";
import { Section } from "@/components/marketing/section";
import { SectionRule } from "@/components/marketing/section-rule";
import { CodeBlock } from "@/components/marketing/code-block";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Documentation · The Manual",
  description:
    "Quickstart, concepts, CLI, REST API, deployment, observability, scaling, ethics. The complete operator's manual for the Scrape platform.",
  path: "/docs",
});

const SECTIONS = [
  {
    code: "I", title: "Getting started",
    items: [
      { href: "/docs/quickstart", title: "Quickstart", desc: "From install to first dig in five minutes." },
      { href: "/docs/concepts", title: "Concepts", desc: "Strata, sessions, fingerprints, escalation." },
      { href: "/docs/cli", title: "CLI reference", desc: "Every command, every flag." },
    ],
  },
  {
    code: "II", title: "API",
    items: [
      { href: "/docs/api", title: "REST API", desc: "OpenAPI 3.1 — endpoints, parameters, responses." },
      { href: "/docs/api/auth", title: "Authentication", desc: "Cookie sessions and bearer tokens." },
      { href: "/docs/api/webhooks", title: "Webhooks", desc: "HMAC-signed callbacks on job state changes." },
    ],
  },
  {
    code: "III", title: "Strata & bypass",
    items: [
      { href: "/docs/tiers", title: "Tier escalation", desc: "Auto-promotion logic — and when to override." },
      { href: "/docs/proxies", title: "Proxies", desc: "Provider config, sticky sessions, country pinning." },
      { href: "/docs/captcha", title: "CAPTCHA", desc: "Turnstile, reCAPTCHA, hCaptcha integration." },
    ],
  },
  {
    code: "IV", title: "Extraction",
    items: [
      { href: "/docs/selectors", title: "CSS selectors", desc: "Hand-tuned, fast, deterministic." },
      { href: "/docs/llm", title: "LLM schema", desc: "Define a JSON schema; Claude does the rest." },
      { href: "/docs/output", title: "Output formats", desc: "JSON, CSV, NDJSON, Markdown — sinks." },
    ],
  },
  {
    code: "V", title: "Operations",
    items: [
      { href: "/docs/deployment", title: "Deployment", desc: "Docker compose, k8s, single-box." },
      { href: "/docs/observability", title: "Observability", desc: "Prometheus, OTel, log shape." },
      { href: "/docs/scaling", title: "Scaling", desc: "Concurrency tuning, queue partitioning." },
    ],
  },
  {
    code: "VI", title: "Compliance",
    items: [
      { href: "/docs/ethics", title: "Ethical scraping", desc: "Defaults that don't get you sued." },
      { href: "/docs/legal", title: "Legal landscape", desc: "GDPR, CCPA, CFAA, EU AI Act — what changed." },
    ],
  },
];

export default function DocsPage() {
  return (
    <>
      <section className="border-b border-line">
        <div className="container mx-auto max-w-6xl px-6 pt-20 pb-12">
          <div className="eyebrow mb-6">/ MANUAL</div>
          <h1 className="display text-7xl md:text-9xl leading-[0.85]">
            <span className="text-rust">The</span> Manual.
          </h1>
          <p className="mt-8 text-lg text-muted max-w-xl leading-relaxed">
            Everything you need to take Scrape from "first dig" to running production at scale.
            Six chapters. Twenty entries.
          </p>
        </div>
      </section>

      <Section className="py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border border-line">
          {SECTIONS.map((sec, i) => (
            <div
              key={sec.title}
              className={`p-8 border-line ${i % 3 !== 2 ? "lg:border-r" : ""} ${i % 2 === 0 ? "md:border-r lg:border-r" : ""} border-b`}
            >
              <div className="flex items-baseline justify-between mb-5">
                <span className="display text-3xl text-rust">/{sec.code}</span>
                <span className="eyebrow">{sec.items.length} ENTRIES</span>
              </div>
              <h2 className="display-up text-2xl mb-5">{sec.title}</h2>
              <ul className="space-y-3 text-sm">
                {sec.items.map((it) => (
                  <li key={it.href}>
                    <Link href={it.href} className="x-link block group">
                      <div className="font-medium">{it.title}</div>
                      <div className="text-xs text-muted mt-0.5">{it.desc}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section className="py-24">
        <SectionRule label="§ QUICKSTART · ABRIDGED" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <div>
            <h2 className="display text-5xl">Three commands.</h2>
            <p className="mt-6 text-muted leading-relaxed">
              Install. Crawl. Inspect. The full quickstart lives at{" "}
              <Link href="/docs/quickstart" className="text-rust underline underline-offset-4">
                /docs/quickstart
              </Link>.
            </p>
          </div>
          <CodeBlock
            label="quickstart"
            code={`# Install via uv
uv tool install scrape

# First dig
scrape crawl https://books.toscrape.com/catalogue/sapiens-a-brief-history-of-humankind_996/index.html \\
  --max-tier 0 --no-browser

# Inspect findings
scrape stats`}
          />
        </div>
      </Section>
    </>
  );
}
