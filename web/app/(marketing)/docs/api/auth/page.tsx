import { DocShell, DocSection } from "@/components/marketing/doc-shell";
import { CodeBlock } from "@/components/marketing/code-block";

export const metadata = { title: "Authentication" };

export default function Page() {
  return (
    <DocShell title="Authentication" current="/docs/api/auth" description="Cookie sessions for browsers. Bearer tokens (API keys) for servers.">
      <DocSection title="Cookie session (dashboard)">
        <p>POST <code>/api/auth/login</code> with email/password. The API sets an HttpOnly <code>auth_token</code> cookie scoped to the API host. SameSite=Lax — works across the dashboard and direct API calls.</p>
        <CodeBlock label="bash" code={`curl -c cookies.txt -X POST http://localhost:8000/api/auth/login \\\n  -H "content-type: application/json" \\\n  -d '{"email":"you@example.com","password":"..."}'\ncurl -b cookies.txt http://localhost:8000/api/auth/me`} />
      </DocSection>
      <DocSection title="Bearer token (API keys)">
        <p>Generate keys from <a href="/settings">Settings → API keys</a>. Pass in the <code>Authorization</code> header:</p>
        <CodeBlock label="bash" code={`curl -H "Authorization: Bearer sk_live_xxxxxxxx" http://localhost:8000/api/jobs`} />
        <p>Keys carry the same permissions as your user. Revoke from Settings at any time — no propagation delay.</p>
      </DocSection>
      <DocSection title="JWT internals">
        <p>Cookie tokens are HS256 JWTs signed with <code>SCRAPE_JWT_SECRET</code>. Default lifetime is 7 days. Never share the secret, never check it in.</p>
      </DocSection>
    </DocShell>
  );
}
