import { DocShell, DocSection } from "@/components/marketing/doc-shell";
import { CodeBlock } from "@/components/marketing/code-block";

import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Output formats",
  description: "JSON, CSV, NDJSON. Sinks: filesystem, Postgres, S3-compatible.",
  path: "/docs/output",
});
export default function Page() {
  return (
    <DocShell title="Output formats" current="/docs/output" description="JSON, CSV, NDJSON. Sinks: filesystem, Postgres, S3-compatible.">
      <DocSection title="From the dashboard">
        <p>Each job has <strong>Download JSON</strong> and <strong>Download CSV</strong> buttons. The CSV builds a column union from all extracted rows so heterogeneous schemas still produce a flat table.</p>
      </DocSection>
      <DocSection title="From the API">
        <CodeBlock label="bash" code={`curl -b cookies.txt http://localhost:8000/api/jobs/JOB_ID/export.json -o results.json\ncurl -b cookies.txt http://localhost:8000/api/jobs/JOB_ID/export.csv -o results.csv`} />
      </DocSection>
      <DocSection title="Streaming with SSE">
        <p>The <code>/api/jobs/JOB_ID/events</code> endpoint emits Server-Sent Events for live progress. Use it to drive UIs or fan out to downstream consumers as rows complete.</p>
      </DocSection>
      <DocSection title="Direct DB access">
        <p>By default everything lives in <code>data/scrape.db</code>. Tables: <code>users</code>, <code>jobs</code>, <code>fetches</code>, <code>extracted</code>. Raw HTML is content-addressed in <code>data/raw/</code>.</p>
      </DocSection>
    </DocShell>
  );
}
