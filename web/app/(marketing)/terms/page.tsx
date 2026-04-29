import type { Metadata } from "next";
import { Section } from "@/components/marketing/section";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Terms of service",
  description:
    "Terms of service for the Scrape managed platform. Acceptable use, ethics policy, billing terms, IP, liability, and termination.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <>
      <section className="border-b border-line">
        <div className="container mx-auto max-w-6xl px-6 pt-20 pb-12">
          <div className="eyebrow mb-6">/ FILINGS · TERMS</div>
          <h1 className="display text-7xl md:text-9xl leading-[0.85]">Terms.</h1>
          <p className="mt-5 small-caps text-muted">Last revised April 28, 2026</p>
        </div>
      </section>
      <Section className="py-20">
        <div className="max-w-3xl mx-auto space-y-10 text-base leading-relaxed text-muted">
          <Block title="Acceptable use">
            You may not use Scrape to access content behind a login or paywall, scrape personal
            data without lawful basis, conduct DoS-grade traffic against any host, or violate any
            source site's terms in a manner unprotected by applicable law (e.g. CFAA pre-emption).
          </Block>
          <Block title="Rate limits & quotas">
            Plan-tier quotas are enforced per calendar month. Burst above your tier triggers
            throttling, not overage charges, unless you explicitly opted into pay-as-you-go.
          </Block>
          <Block title="Service level">
            Pro and Scale tiers are covered by a 99.9% monthly uptime commitment. Credits per the
            published SLA. Free tier is best-effort.
          </Block>
          <Block title="Termination">
            We may terminate accounts found to violate the acceptable use clause. You may close
            your account at any time from the dashboard.
          </Block>
        </div>
      </Section>
    </>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="display text-3xl text-fg italic mb-3">{title}</h2>
      <p>{children}</p>
    </div>
  );
}
