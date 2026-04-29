import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/marketing/section";
import { SectionRule } from "@/components/marketing/section-rule";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Pricing",
  description:
    "Free forever for personal projects (10K Tier-0 fetches/mo). Pro at $49/mo for 250K fetches and Tiers 0–1. Enterprise pricing available. Self-host the same code under Apache-2.0.",
  path: "/pricing",
});

const TIERS = [
  {
    n: "00", code: "PROSPECT", name: "Free", price: "$0", period: "forever",
    desc: "Survey work, evaluation, small personal digs.",
    cta: "Begin",
    highlighted: false,
    features: ["10,000 Stratum 0 fetches / mo", "1 concurrent dig", "7-day result retention", "Community support", "All strata usable (BYO keys)", "Apache-2.0 self-host"],
    not: ["No managed proxies", "No managed CAPTCHA", "No SLA"],
  },
  {
    n: "01", code: "FIELD CREW", name: "Pro", price: "$49", period: "/ month",
    desc: "Solo developers and small teams shipping.",
    cta: "Start 14-day trial",
    highlighted: true,
    features: ["250,000 fetches / mo", "Strata 0 + 1 included", "10 concurrent digs", "30-day retention", "Webhooks + SSE", "Email + chat support", "Discounted Tier 2/3 add-ons"],
    not: ["No SSO", "No dedicated cluster"],
  },
  {
    n: "02", code: "EXPEDITION", name: "Scale", price: "$249", period: "/ month",
    desc: "Data teams running production pipelines.",
    cta: "Talk to bureau",
    highlighted: false,
    features: ["2.5M fetches / mo", "All strata included", "Unlimited concurrent digs", "90-day retention", "SSO + audit logs", "Priority support", "Pinned proxy pools", "Custom integrations"],
    not: [],
  },
];

type CompareValue = string | boolean;

const COMPARE: Array<{ section: string; rows: Array<[string, CompareValue, CompareValue, CompareValue]> }> = [
  {
    section: "Crawling",
    rows: [
      ["Monthly fetch quota (Stratum 0)", "10K", "250K", "2.5M"],
      ["Concurrent digs", "1", "10", "Unlimited"],
      ["Browser stratum (01)", "BYO", true, true],
      ["CAPTCHA stratum (02)", "BYO", "Add-on", true],
      ["Managed unblock (03)", "BYO", "Add-on", true],
      ["Per-host rate limiting", true, true, true],
    ],
  },
  {
    section: "Extraction",
    rows: [
      ["CSS selector extraction", true, true, true],
      ["LLM schema extraction", "BYO key", true, true],
      ["Prompt cache savings", true, true, true],
      ["Confidence scoring", true, true, true],
    ],
  },
  {
    section: "Data & integrations",
    rows: [
      ["JSON / CSV / NDJSON export", true, true, true],
      ["Webhooks (HMAC signed)", false, true, true],
      ["Server-Sent Events", true, true, true],
      ["S3 / GCS / R2 destinations", false, true, true],
      ["Postgres mirror", false, "Add-on", true],
    ],
  },
  {
    section: "Security & support",
    rows: [
      ["Email support", false, true, true],
      ["Chat support", false, true, true],
      ["Priority response", false, false, true],
      ["SSO (SAML / OIDC)", false, false, true],
      ["Audit logs", false, false, true],
      ["Dedicated cluster", false, false, "Optional"],
    ],
  },
];

const FAQ = [
  ["What counts as a fetch?", "One HTTP request that reaches the upstream, regardless of whether the body is parsed. Retries that result in successful escalation count as one logical fetch — the highest-stratum attempt is metered."],
  ["Can I really self-host?", "Yes. Every line of code that runs in our managed cloud is in the open-source repo. docker compose up brings the full stack on your own box."],
  ["How do you charge for proxies and CAPTCHA?", "Free tier requires you to bring your own provider keys. Pro/Scale plans include a fair-use bundle and let you top up on a metered basis at provider cost + 10%."],
  ["Do you do enterprise contracts?", "Yes — annual commitment, dedicated cluster, custom IP pools, on-prem deployment, SOC-2-bound DPA. Reach the bureau from the Scale tier."],
];

export default function PricingPage() {
  return (
    <>
      <section className="border-b border-line">
        <div className="container mx-auto max-w-6xl px-6 pt-20 pb-12">
          <div className="eyebrow mb-6">/ MANUAL · CHAPTER 03</div>
          <h1 className="display text-6xl md:text-8xl leading-[0.9]">
            Pay for what you<br />
            <span className="text-rust">excavate.</span>
          </h1>
          <p className="mt-8 text-lg text-muted max-w-xl leading-relaxed">
            Transparent monthly tiers + metered top-ups. No SaaS-tax-on-top for proxies or
            CAPTCHAs — provider cost passes through with a small operations margin.
          </p>
        </div>
      </section>

      <Section className="py-24">
        <SectionRule label="§ TIERS" />
        <div className="grid grid-cols-1 md:grid-cols-3 border border-line">
          {TIERS.map((t, i) => (
            <div key={t.name} className={`relative p-8 ${i < 2 ? "md:border-r border-line" : ""} ${t.highlighted ? "bg-bg-2/40" : ""}`}>
              {t.highlighted && (
                <div className="absolute -top-px left-0 right-0 h-1 bg-rust"></div>
              )}
              <div className="flex items-baseline justify-between">
                <span className="display text-4xl text-rust">/{t.n}</span>
                <span className="eyebrow">{t.code}</span>
              </div>
              <h3 className="display-up text-3xl mt-4">{t.name}</h3>
              <p className="text-sm text-muted mt-2 leading-relaxed">{t.desc}</p>
              <div className="mt-8 flex items-baseline gap-2">
                <span className="display-up text-5xl">{t.price}</span>
                <span className="eyebrow">{t.period}</span>
              </div>
              <Button asChild className="w-full mt-6" variant={t.highlighted ? "rust" : "outline"}>
                <Link href="/register">{t.cta} <ArrowUpRight className="ml-2 h-3 w-3" /></Link>
              </Button>
              <ul className="mt-8 space-y-3 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check className="h-3.5 w-3.5 text-rust mt-1 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
                {t.not.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-muted">
                    <X className="h-3.5 w-3.5 mt-1 shrink-0 opacity-50" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section className="py-24">
        <SectionRule label="§ COMPARISON · LINE-BY-LINE" />
        <div className="border border-line overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left p-4 w-1/3"></th>
                {TIERS.map((t) => (
                  <th key={t.name} className="p-4 text-center">
                    <div className="display text-2xl text-rust">/{t.n}</div>
                    <div className="display-up text-lg mt-1">{t.name}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((sec) => (
                <>
                  <tr key={sec.section} className="border-b border-line">
                    <td colSpan={4} className="p-3 eyebrow text-rust">{sec.section}</td>
                  </tr>
                  {sec.rows.map(([label, ...vals], i) => (
                    <tr key={`${sec.section}-${i}`} className="border-b border-line">
                      <td className="p-3 text-muted">{label}</td>
                      {vals.map((v, j) => (
                        <td key={j} className="p-3 text-center">
                          {v === true ? <Check className="h-4 w-4 mx-auto text-rust" /> :
                           v === false ? <X className="h-4 w-4 mx-auto text-muted/50" /> :
                           <span className="text-sm">{v}</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section className="py-24">
        <SectionRule label="§ INQUIRIES" />
        <div className="max-w-3xl mx-auto space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group border border-line p-5 bg-bg-2/30">
              <summary className="cursor-pointer list-none flex items-center justify-between">
                <span className="display-up text-lg">{q}</span>
                <span className="text-rust text-2xl leading-none group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-sm text-muted leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </Section>

      <Section className="py-24">
        <div className="border border-line p-12 md:p-16">
          <h2 className="display text-5xl md:text-6xl">Start free. Upgrade when forced.</h2>
          <div className="mt-8 flex items-center gap-3 flex-wrap">
            <Button asChild variant="rust" size="lg"><Link href="/register">Begin <ArrowUpRight className="ml-2 h-3.5 w-3.5" /></Link></Button>
            <Button asChild variant="outline" size="lg"><Link href="/contact">Talk to bureau</Link></Button>
          </div>
        </div>
      </Section>
    </>
  );
}
