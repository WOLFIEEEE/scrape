import { DocShell, DocSection } from "@/components/marketing/doc-shell";
import { CodeBlock } from "@/components/marketing/code-block";

import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "CLI",
  description: "Every command and flag the scrape CLI accepts.",
  path: "/docs/cli",
});
export default function Page() {
  return (
    <DocShell title="CLI reference" current="/docs/cli" description="Every command and flag the scrape CLI accepts.">
      <DocSection title="scrape crawl">
        <p>Crawl one or more URLs through the escalation pipeline.</p>
        <CodeBlock label="bash" code={`scrape crawl <URL...> [OPTIONS]\n\n  --file, -f PATH       File of URLs (one per line; '-' for stdin)\n  --max-tier INT        0=HTTP, 1=Browser, 2=Captcha, 3=Unblock (default: 1)\n  --schema PATH         YAML or JSON schema for LLM extraction\n  --schema-name TEXT    Logical name for the schema (default: 'default')\n  --no-browser          Disable browser tier even if available\n  --llm                 Enable LLM extraction (requires ANTHROPIC_API_KEY)\n  --metrics-port INT    Prometheus metrics port (0 = disabled)`} />
      </DocSection>
      <DocSection title="scrape stats">
        <p>Show aggregate stats from the local SQLite store.</p>
        <CodeBlock label="bash" code={`scrape stats`} />
      </DocSection>
      <DocSection title="scrape selftest">
        <p>Quick smoke test against a couple of public, scraper-friendly URLs. Use this to verify your install.</p>
        <CodeBlock label="bash" code={`scrape selftest`} />
      </DocSection>
      <DocSection title="scrape-api">
        <p>Run the FastAPI HTTP server (multi-tenant web service).</p>
        <CodeBlock label="bash" code={`scrape-api\n\nEnvironment variables:\n  SCRAPE_API_HOST     Bind host (default: 127.0.0.1)\n  SCRAPE_API_PORT     Bind port (default: 8000)\n  SCRAPE_JWT_SECRET   Required in prod; HS256 secret for cookie tokens\n  SCRAPE_CORS_ORIGINS Comma-separated allowed origins`} />
      </DocSection>
    </DocShell>
  );
}
