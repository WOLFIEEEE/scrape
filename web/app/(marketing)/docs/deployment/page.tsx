import { DocShell, DocSection } from "@/components/marketing/doc-shell";
import { CodeBlock } from "@/components/marketing/code-block";

export const metadata = { title: "Deployment" };

export default function Page() {
  return (
    <DocShell title="Deployment" current="/docs/deployment" description="Single-box, docker-compose, kubernetes — same code.">
      <DocSection title="Local single-box">
        <CodeBlock label="bash" code={`uv sync\nscrape-api &\ncd web && pnpm dev`} />
      </DocSection>
      <DocSection title="Docker compose">
        <p>The full stack — API, web, Redis, Prometheus, Grafana — comes up with one command:</p>
        <CodeBlock label="bash" code={`docker compose -f ops/compose.yml up -d`} />
        <p>Set <code>SCRAPE_JWT_SECRET</code> in your env or compose overrides for production.</p>
      </DocSection>
      <DocSection title="Kubernetes">
        <p>Two Deployments (api, web) + a PVC for the SQLite file (or swap to managed Postgres via <code>DATABASE_URL</code>). We ship a starter Helm chart in <code>ops/helm</code>.</p>
      </DocSection>
      <DocSection title="Storage migration">
        <p>SQLite is fine to ~100k pages/day. Beyond that, set <code>DATABASE_URL=postgres://...</code> and run the migration script. Raw HTML moves from local FS to S3 / GCS / R2 transparently — same content-addressed paths.</p>
      </DocSection>
    </DocShell>
  );
}
