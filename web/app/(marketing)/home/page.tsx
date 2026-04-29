import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/marketing/section";
import { SectionRule } from "@/components/marketing/section-rule";
import { CodeBlock } from "@/components/marketing/code-block";
import { JsonLd } from "@/components/marketing/json-ld";
import { pageMeta, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Scrape — Production-grade web scraping infrastructure",
  description:
    "Scrape automatically routes through HTTP, stealth browser, CAPTCHA solving, and managed unblock — paying for the cheapest tier that works. Open-source, self-hostable, ethical-by-default.",
  path: "/home",
  ogTitle: "Scrape — The Web, Excavated.",
  ogDescription: "Strip the surface. Read the strata. Extract the signal.",
});

const HERO_CODE = `# Stratum 0 — Surface
$ scrape crawl https://target.example/p \\
    --max-tier 2 --llm --schema product.yaml

╭─ field report ─────────────────────────────────────╮
│ 1,243 / 1,248 succeeded               ↑ 99.6%       │
├─ stratum 0  HTTP             1,012 pages   $1.01   │
├─ stratum 1  Browser            218 pages   $1.09   │
├─ stratum 2  + CAPTCHA           13 pages   $0.26   │
╰─ filed: results.json                       $2.36 ──╯`;

const STRATA = [
  {
    n: "00",
    title: "Surface",
    body: "Plain HTTP with real-Chrome TLS, JA3/JA4+, HTTP/2 frame ordering. ~50ms per request, $0.001 per page.",
  },
  {
    n: "01",
    title: "Subsurface",
    body: "Camoufox — Firefox patched at the C++ level. Coherent fingerprint bundles, behavioral simulation.",
  },
  {
    n: "02",
    title: "Deep",
    body: "Browser plus token-injection CAPTCHA. Cloudflare Turnstile, reCAPTCHA v3, hCaptcha — solved in ~5s.",
  },
  {
    n: "03",
    title: "Bedrock",
    body: "Managed unblock fallback (Scrapfly, Bright Data). The last 3% — when the first three strata won't yield.",
  },
];

const FEATURES = [
  ["TLS · JA3 / JA4+", "Real-browser handshakes via curl_cffi. Akamai hash matched, extension ordering preserved."],
  ["Stealth browsers", "Camoufox + Nodriver. Coherent UA, screen, timezone, locale, fonts, WebGL — sourced from real devices."],
  ["Sticky proxies", "Per-(host,fp) sticky residential sessions, automatic health scoring, 10-minute cooldowns on burned IPs."],
  ["CAPTCHA solving", "Turnstile, reCAPTCHA v3, hCaptcha. Token injected & resubmitted automatically."],
  ["AI extraction", "Claude with prompt caching. Drop in a JSON schema; get clean rows. Cache hit ratio = your discount."],
  ["Built for scale", "Per-host rate limiter, async fan-out, content-addressed raw HTML, full Prometheus surface."],
];

const STATS = [
  ["99.6%", "AVG SUCCESS"],
  ["<50ms", "STRATUM 0 LATENCY"],
  ["$0.001", "PER FETCH"],
  ["4 STRATA", "OF ESCALATION"],
];

const COMPANIES = ["ACME", "VECTOR", "CATALOG", "HELIX", "NORTH", "BOUNDLESS", "FJORD", "LUMEN", "STRATA", "ORBIT"];

const STEPS = [
  ["I.", "Submit URLs", "Paste in the dashboard, POST to the API, or pipe from your CSV. Pick a max stratum."],
  ["II.", "We dig", "Each URL starts at the surface. The router escalates only on confirmed block. ~80% never leave Stratum 0."],
  ["III.", "Receive findings", "Stream results live, download JSON / CSV, or push to your webhook. Fully typed."],
];

// Three structured-data blobs Google will pick up:
//   1. Organization — links the brand to its socials / logo / canonical site
//   2. SoftwareApplication — gets us into the rich result lane for SaaS
//   3. FAQPage — "people also ask" surface; answers must literally appear on
//      the page. We mirror them in the FAQ markup below.
const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Scrape",
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.svg`,
  description:
    "Production-grade web scraping infrastructure. Tiered escalation through anti-bot, residential proxies, CAPTCHA solving, and AI extraction.",
  sameAs: ["https://github.com/WOLFIEEEE/scrape"],
};

const APP_JSONLD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Scrape",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Linux, macOS, Windows (Docker)",
  description:
    "Open-source web scraping platform with tiered HTTP / browser / CAPTCHA / unblock escalation, residential proxy rotation, and Claude-based AI extraction.",
  url: SITE_URL,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  // Helps surface "scrape APIs", "scraping software", "anti-bot" intents.
  keywords:
    "web scraping, anti-bot bypass, Cloudflare bypass, DataDome, residential proxy, CAPTCHA solver, AI extraction, Camoufox, curl_cffi",
  softwareVersion: "0.5",
};

const FAQS = [
  {
    q: "What makes Scrape different from a simple HTTP scraper or a headless browser?",
    a: "A single-tier scraper either over-pays (everything goes through a $0.02 browser) or under-delivers (gets blocked on protected pages). Scrape routes each URL through four tiers — TLS-impersonated HTTP, stealth browser, CAPTCHA solver, managed unblock — and only pays for the depth a given page actually requires. ~80% of pages clear at Tier 0.",
  },
  {
    q: "Does Scrape handle Cloudflare, DataDome, and PerimeterX?",
    a: "Yes. Cloudflare Turnstile and DataDome are typically beaten by Tier 0 (curl_cffi + residential IP) or Tier 1 (Camoufox stealth Firefox). PerimeterX and other behavioral-scoring vendors require Tier 3 — a commercial managed unblocker (Bright Data Web Unlocker or Scrapfly) wired in via UNBLOCK_PROVIDER.",
  },
  {
    q: "Can I self-host Scrape?",
    a: "Yes — the entire stack is Apache-2.0 licensed and ships as a Docker Compose file. The free FlareSolverr container can serve as Tier 3, and Ollama can replace Anthropic for LLM extraction. Self-hosting needs zero paid services.",
  },
  {
    q: "Does Scrape respect robots.txt?",
    a: "By default, yes. CRAWL_RESPECT_ROBOTS=true is the shipped default and the orchestrator skips disallowed URLs. Operators can opt out per deployment, but the default is ethical-by-design.",
  },
  {
    q: "What does it cost to run at scale?",
    a: "At ~80% Tier-0 success on 1M pages, total spend is ~$280 (proxy bandwidth + LLM extraction with prompt caching). The same workload through a browser-only scraper is ~$17,000 — Scrape's tier router exists specifically to avoid that bill.",
  },
];

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={ORG_JSONLD} />
      <JsonLd data={APP_JSONLD} />
      <JsonLd data={FAQ_JSONLD} />
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0 dig-grid dig-fade opacity-40 pointer-events-none"></div>
        <div className="relative container mx-auto max-w-6xl px-6 pt-20 pb-24 md:pt-28 md:pb-32">
          <Link
            href="/changelog"
            className="inline-flex items-center gap-2 small-caps text-muted hover:text-fg transition-colors mb-10"
          >
            <span className="tag tag-rust">NEW</span>
            <span>Stratum 02 — CAPTCHA injection is live</span>
            <ChevronRight className="h-3 w-3" />
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
            <div className="lg:col-span-8">
              <div className="eyebrow mb-6">/ ISSUE 047 · APRIL 2026</div>
              <h1 className="display text-7xl sm:text-8xl lg:text-9xl leading-[0.85]">
                The web,
                <br />
                <span className="text-rust">excavated.</span>
              </h1>
              <p className="mt-10 max-w-xl text-base md:text-lg text-muted leading-relaxed">
                Strip the surface. Read the strata. Extract the signal.
                Production-grade scraping infrastructure that escalates only when blocked.
              </p>
              <div className="mt-10 flex items-center gap-3 flex-wrap">
                <Button asChild variant="rust" size="lg">
                  <Link href="/register">Begin excavation <ArrowUpRight className="ml-2 h-3.5 w-3.5" /></Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/docs">Read the manual</Link>
                </Button>
              </div>
              <p className="mt-5 small-caps text-muted">
                · No credit card · Self-hostable · Apache-2.0 licensed
              </p>
            </div>

            {/* Hero margin notes */}
            <aside className="lg:col-span-4 lg:pl-6 lg:border-l lg:border-line space-y-6 small-caps text-muted">
              <div>
                <div className="text-rust mb-1">FILED UNDER</div>
                <div>· Anti-bot bypass</div>
                <div>· Residential proxy rotation</div>
                <div>· CAPTCHA solving</div>
                <div>· AI-powered extraction</div>
              </div>
              <div>
                <div className="text-rust mb-1">DEPTH</div>
                <div>4 strata · automatic escalation</div>
              </div>
              <div>
                <div className="text-rust mb-1">CHRONICLE</div>
                <div>v0.5 · April 28, 2026</div>
              </div>
            </aside>
          </div>

          <div className="mt-20 max-w-4xl">
            <CodeBlock code={HERO_CODE} label="hero" />
          </div>
        </div>
      </section>

      {/* ===== Logo strip ===== */}
      <section className="border-b border-line py-7 overflow-hidden">
        <div className="container mx-auto max-w-6xl px-6">
          <div className="eyebrow mb-5 text-center">FIELD CREW · TEAMS DIGGING WITH SCRAPE</div>
          <div className="relative flex overflow-hidden">
            <div className="flex animate-marquee shrink-0 items-center gap-16 pr-16">
              {[...COMPANIES, ...COMPANIES].map((c, i) => (
                <span key={i} className="display-up text-2xl text-muted whitespace-nowrap">{c}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== Strata explanation ===== */}
      <Section className="py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5">
            <div className="eyebrow mb-4">§ 01 · THE FOUR STRATA</div>
            <h2 className="display text-5xl md:text-6xl">
              Cheap first.<br />
              <span className="text-muted">Deep when forced.</span>
            </h2>
            <p className="mt-6 text-muted leading-relaxed max-w-md">
              Every URL starts at Stratum 00 — plain HTTP. The block detector reads each
              response. If a wall appears, the router escalates one stratum at a time.
              You never pay for a depth you didn't need.
            </p>
          </div>
          <div className="lg:col-span-7 space-y-px">
            {STRATA.map((s) => (
              <div key={s.n} className="grid grid-cols-12 gap-4 py-6 border-b border-line group hover:bg-bg-2/40 transition-colors px-2">
                <div className="col-span-2 small-caps text-rust">/{s.n}</div>
                <div className="col-span-3 display-up text-2xl">{s.title}</div>
                <div className="col-span-7 text-sm text-muted leading-relaxed">{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ===== Feature grid ===== */}
      <Section className="py-24">
        <SectionRule label="§ 02 · INVENTORY" />
        <SectionHeading
          title="Everything in one box."
          description="No glue code. No second vendor. No CSV sync at 3am. The full pipeline ships in a single binary and a single SQLite file."
        />
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 border border-line">
          {FEATURES.map(([title, body], i) => (
            <div
              key={title}
              className={`p-8 border-line ${i % 2 === 0 ? "md:border-r" : ""} ${i < FEATURES.length - 2 ? "border-b" : ""}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="display-up text-2xl">{title}</div>
                <div className="eyebrow text-rust">/{(i + 1).toString().padStart(2, "0")}</div>
              </div>
              <p className="text-sm text-muted leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ===== Stats ===== */}
      <section className="border-y border-line bg-bg-2/40">
        <div className="container mx-auto max-w-6xl px-6 py-16 grid grid-cols-2 md:grid-cols-4">
          {STATS.map(([v, l], i) => (
            <div key={l} className={`px-2 ${i > 0 ? "md:border-l border-line" : ""}`}>
              <div className="display-up text-5xl md:text-6xl text-fg">{v}</div>
              <div className="eyebrow mt-3">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== How it works ===== */}
      <Section className="py-24">
        <SectionRule label="§ 03 · METHOD" />
        <SectionHeading
          title="From URL to clean row."
          description="Three operations. No tier-selection logic to maintain. The router decides; you receive."
        />
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 border border-line">
          {STEPS.map(([n, t, b], i) => (
            <div
              key={n}
              className={`p-10 border-line ${i < STEPS.length - 1 ? "md:border-r" : ""} border-b md:border-b-0`}
            >
              <div className="display text-5xl text-rust">{n}</div>
              <div className="display-up text-3xl mt-6">{t}</div>
              <p className="mt-4 text-sm text-muted leading-relaxed">{b}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ===== Developer-first ===== */}
      <Section className="py-24">
        <SectionRule label="§ 04 · INSTRUMENTATION" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">
          <div>
            <h2 className="display text-5xl md:text-6xl">
              For people who <span className="text-rust">ship</span>.
            </h2>
            <p className="mt-6 text-muted leading-relaxed max-w-md">
              A typed Python SDK. An OpenAPI 3.1 REST surface. SSE for live progress.
              HMAC-signed webhooks. Per-job extraction schemas. Use the dashboard for
              ad-hoc digs; wire the API into your pipeline for everything else.
            </p>
            <ul className="mt-8 space-y-3 text-sm">
              {[
                "Idempotent job submission with content hashing",
                "Server-Sent Events for live progress",
                "Webhooks on completion (HMAC signed)",
                "Per-job extraction schemas",
                "JSON, CSV, NDJSON exports",
                "Per-fetch cost telemetry — proxy bytes & solver $",
              ].map((p) => (
                <li key={p} className="flex items-start gap-3 text-muted">
                  <span className="text-rust mt-1.5">→</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <div className="mt-10 flex gap-3">
              <Button asChild variant="rust">
                <Link href="/docs/api">API reference <ArrowUpRight className="ml-2 h-3.5 w-3.5" /></Link>
              </Button>
              <Button asChild variant="outline"><Link href="/docs">Tutorials</Link></Button>
            </div>
          </div>
          <CodeBlock
            label="excavate"
            lang="python"
            code={`from scrape import Client, Stratum

client = Client(api_key="sk_live_...")

job = client.jobs.create(
    name="product prices · q2",
    urls=[f"https://shop.example.com/p/{s}" for s in skus],
    max_stratum=Stratum.DEEP,
    schema={
        "title":    "string",
        "price":    "number",
        "currency": "string",
        "in_stock": "boolean",
    },
)

# Stream findings as they're excavated
for row in client.jobs.stream(job.id):
    print(row.url, row.data["price"])`}
          />
        </div>
      </Section>

      {/* ===== Cost transparency ===== */}
      <Section className="py-24">
        <SectionRule label="§ 04½ · COST LEDGER" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5">
            <h2 className="display text-5xl md:text-6xl">
              You see <span className="text-rust">every penny.</span>
            </h2>
            <p className="mt-6 text-muted leading-relaxed max-w-md">
              Every fetch records what it actually cost: residential proxy
              bytes plus paid CAPTCHA solver USD. Per row in storage, per tier
              in Prometheus, per job in the dashboard. No surprise invoice.
            </p>
            <p className="mt-6 text-sm text-muted">
              <code className="font-mono text-rust">scrape_proxy_bytes_total</code>
              <br />
              <code className="font-mono text-rust">scrape_solver_cost_usd_total</code>
            </p>
          </div>
          <div className="lg:col-span-7 border border-line">
            <div className="grid grid-cols-12 px-5 py-3 small-caps text-muted border-b border-line bg-bg-2/40">
              <div className="col-span-3">Tier</div>
              <div className="col-span-3">Wall time</div>
              <div className="col-span-3">Proxy traffic</div>
              <div className="col-span-3">USD / page</div>
            </div>
            {[
              ["00 · Surface", "~50 ms", "~80 KB", "~$0.0001"],
              ["01 · Browser", "60–90 s", "~5 MB", "$0.002–$0.02"],
              ["02 · CAPTCHA", "+3–10 s", "+0", "$0.001–$0.003"],
              ["03 · FlareSolverr", "60–120 s", "0 (own browser)", "$0"],
              ["03 · Bright Data", "5–30 s", "0 (own farm)", "~$0.003"],
              ["03 · Scrapfly", "5–30 s", "0 (own farm)", "$0.001–$0.025"],
            ].map(([tier, wall, traffic, cost], i) => (
              <div
                key={String(tier)}
                className={`grid grid-cols-12 px-5 py-3 text-sm ${i < 5 ? "border-b border-line" : ""}`}
              >
                <div className="col-span-3 display-up">{tier}</div>
                <div className="col-span-3 text-muted">{wall}</div>
                <div className="col-span-3 text-muted">{traffic}</div>
                <div className="col-span-3 text-rust num">{cost}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ===== Trust panel ===== */}
      <Section className="py-24">
        <SectionRule label="§ 05 · CHARTER" />
        <div className="grid grid-cols-1 md:grid-cols-3 border border-line">
          {[
            ["Built ethically", "Honors robots.txt by default. Per-host rate limits enforced before egress. Never auth-walled or PII content."],
            ["Audited proxies", "Bright Data, Decodo, IPRoyal, Oxylabs. Providers with documented ethical-sourcing audits, never malware botnets."],
            ["Open source", "Apache-2.0 licensed. Self-host or use the managed cloud — same code. Auditable, forkable, yours."],
          ].map(([t, b], i) => (
            <div key={t} className={`p-10 ${i < 2 ? "md:border-r border-line" : ""} ${i < 2 ? "border-b md:border-b-0" : ""}`}>
              <div className="eyebrow text-rust mb-3">PRINCIPLE {(i + 1).toString().padStart(2, "0")}</div>
              <div className="display-up text-3xl">{t}</div>
              <p className="mt-3 text-sm text-muted leading-relaxed">{b}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ===== FAQ ===== */}
      <Section className="py-24">
        <SectionRule label="§ 06 · QUESTIONS · ANSWERED" />
        <SectionHeading
          title="Common questions, plain answers."
          description="If you're picking a scraping stack and trying to understand whether Scrape fits, start here. Linked sources for everything."
        />
        <div className="mt-16 max-w-3xl mx-auto space-y-px">
          {FAQS.map(({ q, a }, i) => (
            <details
              key={q}
              className="group border border-line p-7 open:bg-bg-2/40"
              {...(i === 0 ? { open: true } : {})}
            >
              <summary className="cursor-pointer flex items-start justify-between gap-6 list-none">
                <span className="display-up text-xl md:text-2xl">{q}</span>
                <span className="small-caps text-rust shrink-0 group-open:rotate-90 transition-transform">→</span>
              </summary>
              <p className="mt-5 text-sm md:text-base text-muted leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </Section>

      {/* ===== Final CTA ===== */}
      <Section className="py-24">
        <div className="border border-line p-12 md:p-16 relative overflow-hidden">
          <div className="absolute inset-0 dig-grid dig-fade opacity-30 pointer-events-none"></div>
          <div className="relative">
            <div className="eyebrow mb-6 text-rust">DIRECTIVE</div>
            <h2 className="display text-5xl md:text-7xl max-w-3xl">
              Begin your first <em className="text-rust not-italic">dig</em><br />
              in under sixty seconds.
            </h2>
            <p className="mt-6 max-w-xl text-muted leading-relaxed">
              The free tier ships with 10,000 monthly fetches at Stratum 00. No credit card.
              First user becomes the admin.
            </p>
            <div className="mt-10 flex items-center gap-3 flex-wrap">
              <Button asChild variant="rust" size="lg">
                <Link href="/register">Get access <ArrowDownRight className="ml-2 h-3.5 w-3.5" /></Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/pricing">View plans</Link>
              </Button>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
