import { DocShell, DocSection } from "@/components/marketing/doc-shell";

import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Scaling",
  description: "Concurrency tuning, queue partitioning, cost controls.",
  path: "/docs/scaling",
});
export default function Page() {
  return (
    <DocShell title="Scaling" current="/docs/scaling" description="Concurrency tuning, queue partitioning, cost controls.">
      <DocSection title="Concurrency tuning">
        <p>Two knobs matter: <code>CRAWL_MAX_CONCURRENCY</code> (total in-flight requests) and <code>CRAWL_PER_HOST_CONCURRENCY</code> (per-domain cap). Start at 16 / 2; raise the per-host cap only when target sites tolerate it.</p>
      </DocSection>
      <DocSection title="Queue partitioning">
        <p>Redis Streams support consumer groups. Partition by host hash so the same domain always hits the same worker — keeps the per-host limiter accurate and warms HTTP/2 connections.</p>
      </DocSection>
      <DocSection title="Cost controls">
        <ul>
          <li>Cap <strong>max_tier</strong> per job to avoid surprise CAPTCHA spend</li>
          <li>Set <strong>per-host min_delay</strong> to avoid thundering rate-limit walls</li>
          <li>Use <strong>per-site selectors</strong> instead of LLM for known sites — 100× cheaper</li>
          <li>Enable <strong>prompt caching</strong> on Claude — 90% input-token savings</li>
        </ul>
      </DocSection>

      <DocSection title="Measured benchmarks">
        <p>Numbers from the production-shape soak harness against a 15-target mixed-vendor URL list (baselines, Cloudflare, DataDome, Akamai, Reddit interstitial). Single host, 6 concurrent workers. Reproduce with <code>scripts/soak.py</code>. Excludes robots.txt-blocked URLs from the success-rate denominator.</p>
        <table>
          <thead><tr><th>Metric</th><th>8.6-min run</th><th>55-min run</th></tr></thead>
          <tbody>
            <tr><td>Fetches</td><td>75</td><td>450</td></tr>
            <tr><td>Bandwidth</td><td>13.2 MB</td><td>70.8 MB</td></tr>
            <tr><td>Success rate</td><td>85%</td><td>89%</td></tr>
            <tr><td>Tier 0 p50 / p95</td><td>1.9 s / 2.8 s</td><td>2.0 s / 3.0 s</td></tr>
            <tr><td>Tier 1 p50 / p95</td><td>91 s / 102 s</td><td>75 s / 116 s</td></tr>
            <tr><td>RSS peak / median / end</td><td>3.75 / 2.96 / 2.79 GB</td><td>4.35 / 3.20 / 1.60 GB</td></tr>
          </tbody>
        </table>
        <p><strong>What this tells you about scaling:</strong></p>
        <ul>
          <li><strong>No memory leak.</strong> The 55-minute run ended at 1.60 GB — well below the 3.20 GB median during the run — meaning the browser pool actively releases instances when concurrency drops. The 8.6-minute run plateaued at 2.79 GB because it never had enough idle time to recover.</li>
          <li><strong>Tier 0 latency stays flat.</strong> p50 and p95 moved less than 8% across a 6× longer run. p99 did grow (3.1 s → 10.6 s) — under sustained load you see more rare slow proxy hops; budget for that in your timeouts.</li>
          <li><strong>Tier 1 p50 got faster</strong> (-17%) because the browser pool keeps instances warm longer in a sustained run. Tier 1 p95 grows because you cycle through more cold-starts.</li>
          <li><strong>Per-Camoufox memory.</strong> ~700–900 MB resident per warm browser. The pool sizes itself to <code>max_concurrency / 4</code>; cap concurrency to bound total RAM.</li>
        </ul>
      </DocSection>

      <DocSection title="When to add Tier 3">
        <p>If your target list contains sites with behavioral scoring (PerimeterX, advanced Akamai, Kasada), the free FlareSolverr Tier 3 will lose. Switch to <code>UNBLOCK_PROVIDER=brightdata</code> or <code>scrapfly</code> — both run real browser farms purpose-built for this. Cost is per-success only; failed requests aren&apos;t billed by Bright Data.</p>
      </DocSection>
    </DocShell>
  );
}
