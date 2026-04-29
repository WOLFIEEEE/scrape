import Link from "next/link";
import { Section } from "@/components/marketing/section";
import { JsonLd } from "@/components/marketing/json-ld";
import { cn } from "@/lib/utils";

const SITE_URL = process.env.SCRAPE_PUBLIC_URL || "http://localhost:3000";

export const DOC_NAV = [
  {
    title: "Getting started",
    items: [
      { href: "/docs/quickstart", label: "Quickstart" },
      { href: "/docs/concepts", label: "Concepts" },
      { href: "/docs/cli", label: "CLI" },
    ],
  },
  {
    title: "API",
    items: [
      { href: "/docs/api", label: "REST API" },
      { href: "/docs/api/auth", label: "Authentication" },
      { href: "/docs/api/webhooks", label: "Webhooks" },
    ],
  },
  {
    title: "Strata & bypass",
    items: [
      { href: "/docs/tiers", label: "Tier escalation" },
      { href: "/docs/proxies", label: "Proxies" },
      { href: "/docs/captcha", label: "CAPTCHA" },
    ],
  },
  {
    title: "Extraction",
    items: [
      { href: "/docs/selectors", label: "Selectors" },
      { href: "/docs/llm", label: "LLM extraction" },
      { href: "/docs/output", label: "Output formats" },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/docs/deployment", label: "Deployment" },
      { href: "/docs/observability", label: "Observability" },
      { href: "/docs/scaling", label: "Scaling" },
    ],
  },
  {
    title: "Compliance",
    items: [
      { href: "/docs/ethics", label: "Ethical scraping" },
      { href: "/docs/legal", label: "Legal landscape" },
    ],
  },
];

export function DocShell({
  title,
  description,
  current,
  children,
}: {
  title: string;
  description?: string;
  current: string;
  children: React.ReactNode;
}) {
  const flat = DOC_NAV.flatMap((s) => s.items);
  const idx = flat.findIndex((i) => i.href === current);
  const prev = idx > 0 ? flat[idx - 1] : null;
  const next = idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null;

  // BreadcrumbList helps Google show the docs hierarchy in search results,
  // which both improves CTR and surfaces deep doc links for query intent.
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Docs", item: `${SITE_URL}/docs` },
      { "@type": "ListItem", position: 3, name: title, item: `${SITE_URL}${current}` },
    ],
  };

  return (
    <Section className="pt-10 pb-20">
      <JsonLd data={breadcrumbJsonLd} />
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-12">
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-8">
            {DOC_NAV.map((sec) => (
              <div key={sec.title}>
                <h4 className="eyebrow mb-3">{sec.title}</h4>
                <ul className="space-y-1">
                  {sec.items.map((it) => {
                    const active = it.href === current;
                    return (
                      <li key={it.href}>
                        <Link
                          href={it.href}
                          className={cn(
                            "block py-1 text-sm transition-colors",
                            active
                              ? "text-rust"
                              : "text-muted hover:text-fg",
                          )}
                        >
                          {active && <span className="mr-1">›</span>}
                          {it.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </aside>
        <article className="min-w-0 max-w-3xl">
          <nav className="text-xs eyebrow mb-6">
            <Link href="/docs" className="x-link text-muted">Manual</Link>
            <span className="mx-2 opacity-40">/</span>
            <span className="text-rust">{title}</span>
          </nav>
          <header className="mb-10">
            <h1 className="display text-5xl md:text-6xl leading-[0.95]">{title}</h1>
            {description && <p className="mt-5 text-lg text-muted leading-relaxed">{description}</p>}
          </header>
          <div className="prose-doc">{children}</div>
          {(prev || next) && (
            <div className="mt-20 grid grid-cols-2 gap-4 border-t border-line pt-8">
              {prev ? (
                <Link href={prev.href} className="border border-line p-5 hover:border-rust transition-colors group">
                  <div className="eyebrow text-muted">← PREVIOUS</div>
                  <div className="display-up text-xl mt-2 group-hover:text-rust">{prev.label}</div>
                </Link>
              ) : <div />}
              {next ? (
                <Link href={next.href} className="border border-line p-5 hover:border-rust transition-colors text-right group">
                  <div className="eyebrow text-muted">NEXT →</div>
                  <div className="display-up text-xl mt-2 group-hover:text-rust">{next.label}</div>
                </Link>
              ) : <div />}
            </div>
          )}
        </article>
      </div>
    </Section>
  );
}

export function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="display text-3xl italic mb-4">{title}</h2>
      <div className="space-y-4 text-muted leading-relaxed">{children}</div>
    </section>
  );
}
