import { DocShell, DocSection } from "@/components/marketing/doc-shell";

export const metadata = { title: "Ethical scraping" };

export default function Page() {
  return (
    <DocShell title="Ethical scraping" current="/docs/ethics" description="Defaults that don't get you sued — or banned at the network level.">
      <DocSection title="Honor robots.txt">
        <p>Enabled by default. Per-host fetched once and cached for 24 hours. To override per-host, ship a per-target manifest in your code that explicitly opts in (and document why).</p>
      </DocSection>
      <DocSection title="Per-host rate limiting">
        <p>Default: 2 concurrent + 500ms minimum delay per host. Honour <code>Crawl-Delay</code> when present. If a site returns 429, back off exponentially before retrying.</p>
      </DocSection>
      <DocSection title="No PII without lawful basis">
        <p>Don't scrape personal data without GDPR / CCPA-grade legal cover. The scraper has no opinion on what you crawl — but a lawyer should before you scrape phone numbers or biometrics.</p>
      </DocSection>
      <DocSection title="No paywall bypass">
        <p>Anti-bot bypass is for <em>public</em> content. Bypassing authentication, paywalls, or terms-protected zones is out of scope and not what we're optimizing for.</p>
      </DocSection>
      <DocSection title="Audited proxies only">
        <p>Use providers that publish ethical-sourcing audits — Bright Data, Decodo, IPRoyal, Oxylabs. Cheap residential pools often run on malware botnets; in many jurisdictions, using them is itself a crime.</p>
      </DocSection>
    </DocShell>
  );
}
