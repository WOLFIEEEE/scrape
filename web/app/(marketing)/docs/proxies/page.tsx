import { DocShell, DocSection } from "@/components/marketing/doc-shell";
import { CodeBlock } from "@/components/marketing/code-block";

export const metadata = { title: "Proxies" };

export default function Page() {
  return (
    <DocShell title="Proxies" current="/docs/proxies" description="Provider config, sticky sessions, country pinning.">
      <DocSection title="Supported providers">
        <p>Out of the box we support <strong>Decodo</strong>, <strong>IPRoyal</strong>, <strong>Bright Data</strong>, and any provider whose username convention is <code>user-USERNAME-country-XX-session-ID</code>. Custom providers slot in via the <code>ProxyProvider</code> Protocol.</p>
      </DocSection>
      <DocSection title="Configuration">
        <CodeBlock label=".env" code={`PROXY_PROVIDER=decodo\nPROXY_ENDPOINT=gw.dc.decodo.com:7000\nPROXY_USERNAME=your_username\nPROXY_PASSWORD=your_password\nPROXY_COUNTRY=us\nPROXY_STICKY_SESSION_MINUTES=10`} />
      </DocSection>
      <DocSection title="Sticky sessions">
        <p>The same logical user keeps the same exit IP for the configured sticky window (default 10 minutes). The session ID is derived from <code>(host, fingerprint)</code> so two requests against the same host from the same fingerprint reuse the IP — and so cookies don't get cross-IP-leaked.</p>
      </DocSection>
      <DocSection title="Health scoring & cooldown">
        <p>Every proxy session has a rolling 20-request success/failure history. Three consecutive failures put it in a 10-minute cooldown — the next request gets a fresh sticky id automatically.</p>
      </DocSection>
      <DocSection title="Country pinning">
        <p>Set <code>PROXY_COUNTRY</code> to an ISO-2 code to lock all egress to that country. Useful for SERP scraping (results vary by locale) and for compliance with data-localization rules.</p>
      </DocSection>
    </DocShell>
  );
}
