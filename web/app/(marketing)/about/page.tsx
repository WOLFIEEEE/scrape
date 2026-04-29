import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/marketing/section";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "About · The Bureau",
  description:
    "Scrape is built by people who shipped data pipelines. Tooling for engineers — not for VCs reading decks. Open source, ethical-by-default, and serious about scraping.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-line">
        <div className="container mx-auto max-w-6xl px-6 pt-20 pb-12">
          <div className="eyebrow mb-6">/ THE BUREAU</div>
          <h1 className="display text-7xl md:text-9xl leading-[0.85] max-w-4xl">
            Built by people who<br />
            <span className="text-rust">shipped pipelines.</span>
          </h1>
        </div>
      </section>

      <Section className="py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-3">
            <div className="eyebrow text-rust mb-2">CHARTER</div>
            <p className="display-up text-xl">Tooling for people who actually scrape — not for VCs reading decks.</p>
          </div>
          <div className="lg:col-span-9 space-y-6 text-base md:text-lg leading-relaxed">
            <p>
              <em className="display text-rust not-italic">Web scraping is broken.</em> Not the act of it —
              the tooling. Every team rebuilds the same anti-bot bypass, the same proxy rotator,
              the same CAPTCHA glue, the same "why is the success rate dropping" dashboard.
            </p>
            <p>
              Scrape exists so you don't have to. One pipeline that picks the cheapest stratum
              first and escalates only when it has to. Hand-tuned defaults from years of running
              scrapers in production. An open-source codebase you can audit and fork.
            </p>
            <p>
              We believe scraping is a public-good capability — when it's done ethically. Our
              defaults honor robots.txt, enforce per-host rate limits, and refuse paywall bypass.
              The proxies we vendor are audited. The patterns we ship encourage compliance.
            </p>
            <p>
              We're a small bureau. Mostly remote. We use Scrape ourselves to track competitor
              pricing for our own SaaS bills.
            </p>
          </div>
        </div>
      </Section>

      <Section className="py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 border border-line">
          {[
            ["Founded", "2024"],
            ["Headquartered", "Distributed"],
            ["License", "Apache-2.0"],
          ].map(([k, v], i) => (
            <div key={k} className={`p-8 ${i < 2 ? "md:border-r border-line" : ""}`}>
              <div className="eyebrow">{k}</div>
              <div className="display text-5xl mt-3">{v}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section className="py-24">
        <div className="border border-line p-12 md:p-16">
          <h2 className="display text-5xl md:text-6xl">Want to say hi?</h2>
          <p className="mt-6 text-muted">Email the bureau. We answer everything.</p>
          <div className="mt-8">
            <Button asChild variant="rust" size="lg"><Link href="/contact">Correspondence <ArrowUpRight className="ml-2 h-3.5 w-3.5" /></Link></Button>
          </div>
        </div>
      </Section>
    </>
  );
}
