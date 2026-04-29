import { DocShell, DocSection } from "@/components/marketing/doc-shell";
import { CodeBlock } from "@/components/marketing/code-block";

import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Webhooks",
  description: "HMAC-signed callbacks on job state changes.",
  path: "/docs/api/webhooks",
});
export default function Page() {
  return (
    <DocShell title="Webhooks" current="/docs/api/webhooks" description="HMAC-signed callbacks on job state changes.">
      <DocSection title="Setup">
        <p>Register an endpoint from <a href="/settings">Settings → Webhooks</a>. We'll generate a signing secret and POST a JSON body to your URL whenever a subscribed event fires.</p>
      </DocSection>
      <DocSection title="Events">
        <table>
          <thead><tr><th>Event</th><th>Fires</th></tr></thead>
          <tbody>
            <tr><td><code>job.completed</code></td><td>All URLs in a job have been processed</td></tr>
            <tr><td><code>job.failed</code></td><td>Job exited with an error</td></tr>
            <tr><td><code>job.cancelled</code></td><td>Job was manually cancelled</td></tr>
          </tbody>
        </table>
      </DocSection>
      <DocSection title="Signature verification">
        <p>Each delivery includes <code>X-Scrape-Signature: t=TIMESTAMP,v1=HEX</code>. Compute HMAC-SHA256(secret, "TIMESTAMP." + body) and constant-time compare:</p>
        <CodeBlock label="python" lang="python" code={`import hmac, hashlib\n\ndef verify(secret: str, signature_header: str, body: bytes) -> bool:\n    parts = dict(p.split("=", 1) for p in signature_header.split(","))\n    ts, sig = parts["t"], parts["v1"]\n    expected = hmac.new(secret.encode(), f"{ts}.".encode() + body, hashlib.sha256).hexdigest()\n    return hmac.compare_digest(sig, expected)`} />
      </DocSection>
      <DocSection title="Retries">
        <p>Failed deliveries (non-2xx, timeout) retry with exponential backoff up to 5 times over ~30 minutes. Permanent failures show in Settings → Webhooks → Recent deliveries.</p>
      </DocSection>
    </DocShell>
  );
}
