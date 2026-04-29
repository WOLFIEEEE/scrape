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
        <CodeBlock label="prometheus" code={`scrape_fetches_total{tier,block_reason,ok}
scrape_fetch_latency_seconds{tier}        (histogram)
scrape_extracted_total{schema}
scrape_tier_escalations_total{from_tier,to_tier}
scrape_queue_size
scrape_active_browsers

# Cost telemetry — what each tier is actually costing you
scrape_proxy_bytes_total{tier}            (residential proxy bandwidth)
scrape_solver_cost_usd_total{kind}        (paid CAPTCHA spend)

# Operator-actionable signals
scrape_proxy_auth_failures_total          (proxy 407 — broken creds)`} />
      </DocSection>

      <DocSection title="Per-fetch cost">
        <p>Each fetch row carries <code>proxy_bytes</code> and <code>solver_cost_usd</code> in addition to status / tier / latency. The dashboard <code>/jobs/:id</code> view shows them per row; the orchestrator&apos;s <code>stats()</code> aggregates them as <code>proxy_bytes_total</code> and <code>solver_cost_usd_total</code> so customers see what a job actually spent before billing.</p>
      </DocSection>

      <DocSection title="Proxy auth circuit breaker">
        <p>Repeated proxy auth failures (HTTP 407) are tracked globally rather than per-session. After <code>auth_failure_threshold</code> (default 5) the <code>ProxyManager</code> raises <code>ProxyAuthBroken</code> and the orchestrator surfaces it on the failing URL. <code>scrape_proxy_auth_failures_total</code> is the corresponding counter — alert on a sustained non-zero rate to catch revoked credentials before a job spends an hour retrying nothing.</p>
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
