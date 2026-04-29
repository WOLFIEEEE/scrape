import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/marketing/section";
import { SectionRule } from "@/components/marketing/section-rule";
import { CodeBlock } from "@/components/marketing/code-block";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Features",
  description:
    "Real-Chrome TLS, stealth Camoufox browsers, sticky residential proxies, CAPTCHA injection, AI extraction, observability — every layer of a production scraping pipeline in one project.",
  path: "/features",
});

const PILLARS = [
  {
    n: "I", title: "Anti-bot bypass", subtitle: "TLS, fingerprint, behavior",
    items: [
      ["Real-Chrome TLS", "JA3 / JA4+ matched, HTTP/2 frame ordering preserved, Akamai hash. curl-impersonate under the hood."],
      ["Stealth browsers", "Camoufox (Firefox, C++-level patches) and Nodriver (raw CDP) with coherent fingerprint bundles."],
      ["Session persistence", "Per (proxy, fingerprint, host) cookie + storage_state. No cross-IP cookie sharing — the canonical ban signal."],
      ["Behavioral simulation", "Bezier mouse paths, jittered scroll with easing, variable typing cadence — sourced from real session recordings."],
    ],
  },
  {
    n: "II", title: "Proxies & geography", subtitle: "Sticky sessions with health scoring",
    items: [
      ["Provider abstraction", "Decodo, IPRoyal, Bright Data, Oxylabs, custom — switch with one env var."],
      ["Sticky sessions", "Same logical user keeps the same exit IP for the configurable sticky window. Health-scored per session."],
      ["Country pinning", "ISO-2 country code per job. WireGuard egress for non-HTTP fingerprinting."],
      ["Auto cooldowns", "Three consecutive blocks → 10-minute cooldown, fresh sticky id. No ban-list maintenance."],
    ],
  },
  {
    n: "III", title: "CAPTCHA solving", subtitle: "Token injection at the browser",
    items: [
      ["Cloudflare Turnstile", "Detected on-page, sitekey extracted, token injected via CapSolver in ~5s."],
      ["reCAPTCHA v3", "Score-based — clean residential IP + behavioral warm-up earns a passing score."],
      ["hCaptcha", "Image-puzzle solving via vision-AI providers."],
      ["Pluggable solvers", "Swap CapSolver for any provider via the CaptchaSolver interface."],
    ],
  },
  {
    n: "IV", title: "Extraction", subtitle: "Selectors & schema-driven AI",
    items: [
      ["Per-site selectors", "Hand-tuned CSS extractors when the schema is stable — 100× cheaper than LLM extraction."],
      ["Claude schema", "Drop in a JSON schema, get structured rows. System + schema cached for ~90% input-token savings."],
      ["Markdown pipeline", "Selectolax-based HTML→Markdown, designed for token-efficient LLM consumption."],
      ["Confidence scoring", "Each row carries a confidence proxy from the LLM's cache hit ratio + structural agreement."],
    ],
  },
  {
    n: "V", title: "Orchestration & ops", subtitle: "Concurrency, queues, observability",
    items: [
      ["Tiered escalation", "00=HTTP, 01=Browser, 02=+CAPTCHA, 03=Unblock API. Auto-promotes on block detection."],
      ["Per-host rate limit", "Concurrency cap + min delay enforced before a request leaves the box. Honors robots.txt."],
      ["SSE + Webhooks", "Live progress over Server-Sent Events. HMAC-signed webhooks on completion."],
      ["Storage", "SQLite for single-box, Postgres for scale. Content-addressed raw HTML for replay."],
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0 dig-grid dig-fade opacity-30 pointer-events-none"></div>
        <div className="container mx-auto max-w-6xl px-6 pt-20 pb-16 relative">
          <div className="eyebrow mb-6">/ MANUAL · CHAPTER 02</div>
          <h1 className="display text-6xl md:text-8xl leading-[0.9]">
            One pipeline.<br />
            <span className="text-rust">Every wall, beaten.</span>
          </h1>
          <p className="mt-8 text-lg text-muted max-w-xl leading-relaxed">
            From the TCP handshake to the structured row in your database — every layer of
            the modern anti-bot stack has a counter built in.
          </p>
        </div>
      </section>

      {PILLARS.map((p) => (
        <Section key={p.title} className="py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-10">
            <div className="lg:col-span-4">
              <div className="display text-7xl text-rust">{p.n}</div>
              <h2 className="display-up text-4xl mt-4">{p.title}</h2>
              <p className="eyebrow mt-3">{p.subtitle}</p>
            </div>
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 border border-line">
              {p.items.map(([title, body], i) => (
                <div
                  key={title}
                  className={`p-6 border-line ${i % 2 === 0 ? "md:border-r" : ""} ${i < p.items.length - 2 ? "border-b" : ""}`}
                >
                  <div className="display-up text-xl">{title}</div>
                  <p className="mt-2 text-sm text-muted leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>
      ))}

      <Section className="py-24">
        <SectionRule label="§ APPENDIX · OBSERVABILITY" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <div>
            <h2 className="display text-5xl md:text-6xl">Observability you can trust.</h2>
            <p className="mt-6 text-muted leading-relaxed max-w-md">
              Prometheus metrics out of the box. Per-domain success-rate dashboards. Tier mix
              and cost per 1k pages. Block-rate alerts that page you when something starts
              failing — not after the data lake is half-empty.
            </p>
          </div>
          <CodeBlock
            label="prometheus"
            code={`# HELP scrape_fetches_total Total fetches
# TYPE scrape_fetches_total counter
scrape_fetches_total{tier="0",block="none",ok="true"} 12384
scrape_fetches_total{tier="1",block="none",ok="true"}  2401
scrape_fetches_total{tier="0",block="challenge"} 312
scrape_fetches_total{tier="2",block="none",ok="true"}    47

# HELP scrape_fetch_latency_seconds
# TYPE scrape_fetch_latency_seconds histogram
scrape_fetch_latency_seconds_bucket{tier="0",le="0.5"}  11890
scrape_fetch_latency_seconds_bucket{tier="1",le="5.0"}   2390`}
          />
        </div>
      </Section>

      <Section className="py-24">
        <div className="border border-line p-12 md:p-16">
          <h2 className="display text-5xl md:text-6xl max-w-2xl">Ready to ditch the babysitter?</h2>
          <p className="mt-6 text-muted">Spin up your first dig in under sixty seconds.</p>
          <div className="mt-8 flex items-center gap-3 flex-wrap">
            <Button asChild variant="rust" size="lg"><Link href="/register">Get access <ArrowUpRight className="ml-2 h-3.5 w-3.5" /></Link></Button>
            <Button asChild variant="outline" size="lg"><Link href="/pricing">See pricing</Link></Button>
          </div>
        </div>
      </Section>
    </>
  );
}
