import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/marketing/section";
import { SectionRule } from "@/components/marketing/section-rule";

export const metadata = { title: "Field guide" };

const CASES = [
  { code: "F-01", name: "E-commerce price intelligence", body: "Track competitor prices, stock, and assortment across millions of SKUs.", strata: ["01", "Schema", "Webhooks"] },
  { code: "F-02", name: "Market research", body: "Build datasets for analyst reports — review counts, ratings, trend signals at scale.", strata: ["00", "CSV"] },
  { code: "F-03", name: "News & media monitoring", body: "Continuous freshness crawling with deduplication, sentiment-ready Markdown output.", strata: ["00", "Markdown"] },
  { code: "F-04", name: "Lead generation", body: "Enrich CRM records from public business profiles — name, address, phone, hours.", strata: ["01", "LLM"] },
  { code: "F-05", name: "Real estate listings", body: "Aggregate listings, photos, and price history across regional portals.", strata: ["01", "Schema"] },
  { code: "F-06", name: "SERP scraping", body: "Capture ranked search results for SEO tracking. Geo-pinned residential exits per locale.", strata: ["02", "Country"] },
  { code: "F-07", name: "Knowledge base ingestion", body: "Crawl entire docs sites into clean Markdown for RAG pipelines.", strata: ["00", "Markdown", "Crawl"] },
  { code: "F-08", name: "Compliance monitoring", body: "Watch terms-of-service, policy, and pricing pages for changes — diff + alert.", strata: ["00", "Diff"] },
];

export default function UseCasesPage() {
  return (
    <>
      <section className="border-b border-line">
        <div className="container mx-auto max-w-6xl px-6 pt-20 pb-16">
          <div className="eyebrow mb-6">/ MANUAL · CHAPTER 04 · FIELD GUIDE</div>
          <h1 className="display text-6xl md:text-8xl leading-[0.9]">
            Built for teams who<br />
            <span className="text-rust">ship data products.</span>
          </h1>
          <p className="mt-8 text-lg text-muted max-w-xl leading-relaxed">
            From price tracking to AI training data — whatever the source page tries,
            the tiered pipeline routes around it.
          </p>
        </div>
      </section>

      <Section className="py-24">
        <SectionRule label="§ CATALOG · 8 ENTRIES" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border border-line">
          {CASES.map((c, i) => (
            <article
              key={c.code}
              className={`p-8 border-line ${i % 3 !== 2 ? "lg:border-r" : ""} ${i % 2 === 0 ? "md:border-r lg:border-r" : ""} border-b`}
            >
              <div className="flex items-baseline justify-between mb-4">
                <span className="eyebrow text-rust">{c.code}</span>
                <span className="eyebrow">/{(i + 1).toString().padStart(2, "0")}</span>
              </div>
              <h3 className="display-up text-2xl">{c.name}</h3>
              <p className="mt-3 text-sm text-muted leading-relaxed">{c.body}</p>
              <div className="mt-5 flex flex-wrap gap-1.5">
                {c.strata.map((t) => (
                  <span key={t} className="tag">{t}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section className="py-24">
        <div className="border border-line p-12 md:p-16">
          <h2 className="display text-5xl md:text-6xl max-w-2xl">Don't see your case?</h2>
          <p className="mt-6 text-muted max-w-md">If it's a webpage, we can probably scrape it. Tell us what you're building.</p>
          <div className="mt-8 flex items-center gap-3 flex-wrap">
            <Button asChild variant="rust" size="lg"><Link href="/contact">Reach the bureau <ArrowUpRight className="ml-2 h-3.5 w-3.5" /></Link></Button>
            <Button asChild variant="outline" size="lg"><Link href="/register">Try it now</Link></Button>
          </div>
        </div>
      </Section>
    </>
  );
}
