import { DocShell, DocSection } from "@/components/marketing/doc-shell";
import { CodeBlock } from "@/components/marketing/code-block";

import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Observability",
  description: "Prometheus metrics, OTel traces, structured logs.",
  path: "/docs/observability",
});
export default function Page() {
  return (
    <DocShell title="Observability" current="/docs/observability" description="Prometheus metrics, OTel traces, structured logs.">
      <DocSection title="Metrics">
        <p>Every fetch increments per-tier counters and observes per-tier latency. Default metrics endpoint is <code>:9090/metrics</code>.</p>
        <CodeBlock label="prometheus" code={`scrape_fetches_total{tier,block_reason,ok}\nscrape_fetch_latency_seconds{tier} (histogram)\nscrape_extracted_total{schema}\nscrape_tier_escalations_total{from_tier,to_tier}\nscrape_queue_size\nscrape_active_browsers`} />
      </DocSection>
      <DocSection title="Logs">
        <p>Structured JSON via structlog. Each log line carries <code>url</code>, <code>tier</code>, <code>block_reason</code>, <code>elapsed_ms</code> where relevant. Pipe to your aggregator of choice.</p>
      </DocSection>
      <DocSection title="Dashboards">
        <p>The included Grafana provisioning loads dashboards for per-domain success rate, tier mix, $/1k pages, and block-rate alerts. Open <code>localhost:3001</code> after <code>docker compose up</code>.</p>
      </DocSection>
    </DocShell>
  );
}
