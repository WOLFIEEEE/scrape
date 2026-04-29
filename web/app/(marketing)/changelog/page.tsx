import type { Metadata } from "next";
import { Section } from "@/components/marketing/section";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Changelog · Field logs",
  description:
    "What shipped, when. Tier-2 CAPTCHA solving, SSRF defense, IPRoyal proxy adapter, FlareSolverr Tier-3 unblock, observability stack — release-by-release notes.",
  path: "/changelog",
});

const ENTRIES = [
  {
    date: "2026-04-28", version: "0.5.0", tag: "STRATUM 02",
    items: [
      "Cloudflare Turnstile + reCAPTCHA v3 token injection via CapSolver",
      "Behavioral simulation: Bezier mouse paths, jittered scroll easing",
      "Per-host robots.txt enforcement with 24h cache",
      "Job runner background tasks with SSE live progress",
    ],
  },
  {
    date: "2026-04-21", version: "0.4.0", tag: "WEB APP",
    items: [
      "Multi-tenant FastAPI backend with JWT cookie auth",
      "Next.js 15 dashboard: jobs, fetches, extracted, exports",
      "First admin user auto-promotion",
      "Live job progress over Server-Sent Events",
    ],
  },
  {
    date: "2026-04-14", version: "0.3.0", tag: "EXTRACTION",
    items: [
      "Claude Haiku 4.5 schema extractor with prompt caching",
      "Markdown pipeline (selectolax) — token-efficient output",
      "Per-site CSS selector registry with longest-suffix match",
    ],
  },
  {
    date: "2026-04-07", version: "0.2.0", tag: "STRATUM 01",
    items: [
      "Camoufox integration with coherent fingerprint bundles",
      "Browser session pool keyed by (proxy, fingerprint, host)",
      "Tier router with auto-escalation on block detection",
    ],
  },
  {
    date: "2026-03-31", version: "0.1.0", tag: "GROUNDBREAKING",
    items: [
      "Tier 0 HTTP client with curl_cffi (real Chrome TLS)",
      "Proxy provider abstraction (Decodo / IPRoyal / Bright Data)",
      "SQLite storage with content-addressed raw HTML",
      "Per-host rate limiting + concurrency control",
      "OpenTelemetry / Prometheus metrics",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <>
      <section className="border-b border-line">
        <div className="container mx-auto max-w-6xl px-6 pt-20 pb-12">
          <div className="eyebrow mb-6">/ FIELD LOGS</div>
          <h1 className="display text-7xl md:text-9xl leading-[0.85]">
            Dispatches from<br />
            <span className="text-rust">the dig site.</span>
          </h1>
          <p className="mt-8 text-lg text-muted max-w-xl leading-relaxed">
            New strata, smarter heuristics, faster pipelines — every release we file.
          </p>
        </div>
      </section>

      <Section className="py-20">
        <div className="max-w-3xl mx-auto space-y-12">
          {ENTRIES.map((e) => (
            <article key={e.version} className="grid grid-cols-12 gap-6 border-b border-line pb-12 last:border-b-0">
              <aside className="col-span-12 md:col-span-3">
                <div className="display text-5xl text-rust">v{e.version.split(".").slice(0, 2).join(".")}</div>
                <div className="display text-2xl text-muted">.{e.version.split(".")[2]}</div>
                <div className="eyebrow mt-3">{e.date}</div>
                <span className="tag tag-rust mt-3 inline-block">{e.tag}</span>
              </aside>
              <div className="col-span-12 md:col-span-9">
                <ul className="space-y-3 text-sm">
                  {e.items.map((it) => (
                    <li key={it} className="flex items-start gap-3">
                      <span className="text-rust mt-1.5">→</span>
                      <span className="text-fg">{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </Section>
    </>
  );
}
