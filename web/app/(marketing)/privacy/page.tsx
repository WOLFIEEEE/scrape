import type { Metadata } from "next";
import { Section } from "@/components/marketing/section";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Privacy policy",
  description:
    "Privacy policy for the Scrape managed service. What we collect, what we never collect, your rights under GDPR/CCPA, and how to exercise them.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <>
      <section className="border-b border-line">
        <div className="container mx-auto max-w-6xl px-6 pt-20 pb-12">
          <div className="eyebrow mb-6">/ FILINGS · PRIVACY</div>
          <h1 className="display text-7xl md:text-9xl leading-[0.85]">Privacy.</h1>
          <p className="mt-5 small-caps text-muted">Last revised April 28, 2026</p>
        </div>
      </section>
      <Section className="py-20">
        <div className="max-w-3xl mx-auto space-y-10 text-base leading-relaxed text-muted">
          <Block title="What we collect">
            Account data (email, name, hashed password). Job metadata you submit — URLs, schemas,
            results. Operational telemetry — request counts, latencies, error rates. We do not sell
            or share any of it.
          </Block>
          <Block title="What we don't collect">
            We do not log request bodies. We do not store your raw HTML longer than your retention
            tier. We do not use your job content to train models.
          </Block>
          <Block title="Cookies">
            One HttpOnly auth cookie. No tracking pixels, no third-party analytics, no marketing
            cookies. The marketing site uses zero cookies until you log in.
          </Block>
          <Block title="Data residency">
            All managed-tier data is stored in EU or US regions of your choice. Self-hosted users
            control their own residency.
          </Block>
          <Block title="GDPR / CCPA rights">
            You can export or delete your data from the dashboard at any time. For DPA agreements,
            contact privacy@scrape.dev.
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
