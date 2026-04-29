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
    </DocShell>
  );
}
