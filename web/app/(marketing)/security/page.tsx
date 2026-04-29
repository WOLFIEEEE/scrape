import type { Metadata } from "next";
import { Lock, Shield, FileCheck, Server, Globe } from "lucide-react";
import { Section } from "@/components/marketing/section";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Security",
  description:
    "How Scrape protects customer data: SSRF defense, JWT-secured cookies, audited residential proxies only, no PII storage, and a documented vulnerability disclosure path.",
  path: "/security",
});

const ITEMS = [
  ["Lock", Lock, "Encryption everywhere", "TLS 1.3 in transit. AES-256 at rest. HttpOnly auth cookies, SameSite=Lax, Secure flag in prod."],
  ["Shield", Shield, "Bcrypt password hashing", "12-round bcrypt with SHA-256 pre-hash for long inputs. Passwords never leave the API process unhashed."],
  ["FileCheck", FileCheck, "Audit log for admins", "Every privileged action is logged with actor, target, and timestamp. Exports available via API."],
  ["Server", Server, "Isolated tenant data", "Per-user data scoped at the query layer; FK constraints enforce isolation. Postgres RLS on Scale tier."],
  ["Globe", Globe, "Audited proxy providers", "We only integrate proxy providers that publish ethical-sourcing audits. Cheap-residential botnets never touch your traffic."],
] as const;

export default function SecurityPage() {
  return (
    <>
      <section className="border-b border-line">
        <div className="container mx-auto max-w-6xl px-6 pt-20 pb-12">
          <div className="eyebrow mb-6">/ FILINGS · SECURITY</div>
          <h1 className="display text-7xl md:text-9xl leading-[0.85]">Security.</h1>
          <p className="mt-8 text-lg text-muted max-w-xl leading-relaxed">
            How we keep your data — and the source sites you crawl — safe.
          </p>
        </div>
      </section>

      <Section className="py-20">
        <div className="max-w-3xl mx-auto space-y-px">
          {ITEMS.map(([key, Icon, title, body], i) => (
            <article key={key} className="border border-line p-8 grid grid-cols-12 gap-6">
              <div className="col-span-2 eyebrow text-rust">/{(i + 1).toString().padStart(2, "0")}</div>
              <Icon className="h-6 w-6 text-muted col-span-1" />
              <div className="col-span-9">
                <h2 className="display-up text-2xl">{title}</h2>
                <p className="mt-2 text-sm text-muted leading-relaxed">{body}</p>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section className="py-20">
        <div className="max-w-3xl mx-auto border border-line p-10">
          <h2 className="display text-4xl">Found a vulnerability?</h2>
          <p className="mt-4 text-muted">
            Email <span className="text-rust font-mono">security@scrape.dev</span>. We respond
            within 24 hours and ship fixes within 72.
          </p>
        </div>
      </Section>
    </>
  );
}
