import { DocShell, DocSection } from "@/components/marketing/doc-shell";

export const metadata = { title: "Legal landscape" };

export default function Page() {
  return (
    <DocShell title="Legal landscape" current="/docs/legal" description="What changed in 2026 — what didn't — and what defaults every scraper should ship with.">
      <DocSection title="hiQ v. LinkedIn (US)">
        <p>The 2022 Ninth Circuit ruling that scraping public pages doesn't trigger CFAA liability remains the controlling precedent. <strong>Public</strong> is the operative word. The moment auth or paywall is involved, you're back in CFAA territory.</p>
      </DocSection>
      <DocSection title="GDPR & CCPA">
        <p>If you scrape personal data of EU or California residents, you need a lawful basis (contract, consent, legitimate interest) and you must let subjects exercise rights — access, rectification, deletion. The "we're a scraper, not a controller" defense doesn't fly post-Clearview.</p>
      </DocSection>
      <DocSection title="EU AI Act">
        <p>Bulk scraping for AI training is expressly addressed. Article 53 requires "sufficiently detailed summary" of training data sources. If your pipeline feeds a model that ends up in EU production, document your sources end-to-end.</p>
      </DocSection>
      <DocSection title="Terms of service">
        <p>Site ToS are contracts. Violating them isn't automatically illegal but can support breach-of-contract or tortious-interference claims. Reading and respecting ToS for sites you crawl heavily is risk-cheap.</p>
      </DocSection>
      <DocSection title="What we ship">
        <p>Defaults that comply by default, knobs that surface when you want to deviate, audit logs of overrides. We're not your lawyer — we're the tool that doesn't make compliance harder.</p>
      </DocSection>
    </DocShell>
  );
}
