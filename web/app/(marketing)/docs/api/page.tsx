import { DocShell, DocSection } from "@/components/marketing/doc-shell";
import { CodeBlock } from "@/components/marketing/code-block";

import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "REST API",
  description: "OpenAPI 3.1 spec served at /openapi.json by the API.",
  path: "/docs/api",
});
export default function Page() {
  return (
    <DocShell title="REST API" current="/docs/api" description="OpenAPI 3.1 spec served at /openapi.json by the API.">
      <DocSection title="Base URL">
        <p>Default <code>http://localhost:8000</code>. The Next.js dashboard proxies <code>/api/*</code> through to the API so cookies stay first-party.</p>
      </DocSection>
      <DocSection title="Authentication">
        <p>Two flows — see the <a href="/docs/api/auth">auth page</a> for details. TL;DR: cookie sessions for browsers, bearer tokens (API keys) for servers.</p>
      </DocSection>
      <DocSection title="Endpoints">
        <CodeBlock label="endpoints" code={`POST   /api/auth/register\nPOST   /api/auth/login\nPOST   /api/auth/logout\nGET    /api/auth/me\n\nGET    /api/jobs                      list\nPOST   /api/jobs                      create\nGET    /api/jobs/{id}                 detail\nDELETE /api/jobs/{id}\nPOST   /api/jobs/{id}/cancel\nGET    /api/jobs/{id}/events          server-sent events\nGET    /api/jobs/{id}/fetches\nGET    /api/jobs/{id}/extracted\nGET    /api/jobs/{id}/export.json\nGET    /api/jobs/{id}/export.csv`} />
      </DocSection>
      <DocSection title="Interactive docs">
        <p>FastAPI ships <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer">Swagger UI at /docs</a> and <a href="http://localhost:8000/redoc" target="_blank" rel="noreferrer">ReDoc at /redoc</a>. Both are live against your local API instance.</p>
      </DocSection>
    </DocShell>
  );
}
