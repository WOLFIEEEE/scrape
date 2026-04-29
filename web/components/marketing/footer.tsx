"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Github, Twitter } from "lucide-react";
import { useSystemStatus } from "@/components/system-status";

/**
 * The Bureau Colophon — a footer styled like the imprint / colophon page at
 * the back of a printed book or scholarly journal.
 *
 *   1. Pull-quote band
 *   2. Imprint metadata row (VOL / ISSUE / EDITOR / CARTOGRAPHER)
 *   3. Sitemap as classified-ad columns with dotted leaders
 *   4. "Typeset in" line — credits the actual fonts used
 *   5. Reverse-printed signature strip
 *
 * No big buried wordmark, no strata bands. Just print-ephemera aesthetics
 * pairing with Fraunces.
 */

const COLOPHON_COLS = [
  {
    title: "Excavate",
    links: [
      { href: "/features", label: "Features", num: "010" },
      { href: "/pricing", label: "Pricing", num: "024" },
      { href: "/use-cases", label: "Field guide", num: "036" },
      { href: "/changelog", label: "Field logs", num: "058" },
    ],
  },
  {
    title: "Manual",
    links: [
      { href: "/docs", label: "Documentation", num: "071" },
      { href: "/docs/quickstart", label: "Quickstart", num: "072" },
      { href: "/docs/api", label: "API reference", num: "094" },
      { href: "https://github.com", label: "Source code", num: "↗", external: true },
    ],
  },
  {
    title: "Bureau",
    links: [
      { href: "/about", label: "About", num: "112" },
      { href: "/blog", label: "Dispatches", num: "118" },
      { href: "/contact", label: "Correspondence", num: "131" },
    ],
  },
  {
    title: "Filings",
    links: [
      { href: "/privacy", label: "Privacy", num: "i" },
      { href: "/terms", label: "Terms", num: "ii" },
      { href: "/security", label: "Security", num: "iii" },
      { href: "/accessibility", label: "Accessibility", num: "iv" },
      { href: "/vpat", label: "VPAT 2.5", num: "v" },
    ],
  },
];

const IMPRINT = [
  ["VOL.", "04"],
  ["ISSUE", "No. 047"],
  ["EDITOR", "THE BUREAU"],
  ["CARTOGRAPHER", "DISTRIBUTED"],
];

export function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-32 border-t border-line bg-bg">
      {/* === Pull quote === */}
      <PullQuote />

      {/* === Imprint metadata === */}
      <section className="border-y border-line">
        <div className="container mx-auto max-w-6xl px-6 grid grid-cols-2 md:grid-cols-4">
          {IMPRINT.map(([k, v], i) => (
            <div
              key={k}
              className={`py-6 px-2 ${i < IMPRINT.length - 1 ? "md:border-r border-line" : ""} ${i === 0 || i === 2 ? "md:border-r" : ""}`}
            >
              <div className="text-rust eyebrow">{k}</div>
              <div className="display text-3xl mt-2 num">{v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* === Classified-ad sitemap === */}
      <section className="container mx-auto max-w-6xl px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Drop-cap colophon intro */}
          <aside className="md:col-span-3">
            <div className="eyebrow text-rust mb-4">/ COLOPHON</div>
            <p className="text-sm text-muted leading-relaxed">
              <DropCap>T</DropCap>his volume was assembled at the Bureau of Excavation by
              hand, with attention paid to the strata of the modern web. Sitemap follows;
              entries are ordered by the day they entered the index.
            </p>
          </aside>

          <div className="md:col-span-9 grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-10">
            {COLOPHON_COLS.map((col) => (
              <div key={col.title}>
                <h4 className="display-up text-xl mb-3 pb-2 border-b border-fg">{col.title}</h4>
                <ul className="space-y-1.5">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <LeaderLink href={l.href} label={l.label} num={l.num} external={"external" in l && !!l.external} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === Typeset-in attribution === */}
      <section className="border-t border-line">
        <div className="container mx-auto max-w-6xl px-6 py-6 grid grid-cols-1 md:grid-cols-3 gap-3 small-caps text-muted">
          <span>
            Typeset in <span className="display-up text-fg text-lg">Fraunces</span>
            <span className="mx-2">+</span>
            <span className="text-fg">JetBrains Mono</span>
          </span>
          <span className="md:text-center">
            Compiled by hand · open source · Apache-2.0
          </span>
          <span className="md:text-right inline-flex md:justify-end items-center gap-3">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="x-link inline-flex items-center gap-1.5 hover:text-rust">
              <Github className="h-3 w-3" /> Source
            </a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="x-link inline-flex items-center gap-1.5 hover:text-rust">
              <Twitter className="h-3 w-3" /> Dispatches
            </a>
          </span>
        </div>
      </section>

      {/* === Reverse-printed signature strip === */}
      <SignatureStrip year={year} />
    </footer>
  );
}

// ---------------------------------------------------------------------------
// Reverse-printed signature strip with live status indicator
// ---------------------------------------------------------------------------
function SignatureStrip({ year }: { year: number }) {
  const status = useSystemStatus();
  const label = status === "nominal" ? "All systems nominal" : status === "degraded" ? "Bureau is degraded" : "Bureau offline";
  return (
    <section className="bg-rust text-paper">
      <div className="container mx-auto max-w-6xl px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 small-caps">
        <span className="opacity-90">© {year} · Scrape Bureau · Established MMXXIV</span>
        <span className="display-it text-base opacity-90">"Strip the surface. Read the strata."</span>
        <span className="opacity-90 inline-flex items-center gap-2">
          <span className={`inline-flex h-2 w-2 bg-paper ${status === "nominal" ? "animate-pulse-dot" : ""}`}></span>
          {label}
        </span>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Pull quote band — large italic Fraunces, like a chapter close-out flourish
// ---------------------------------------------------------------------------
function PullQuote() {
  return (
    <section className="container mx-auto max-w-5xl px-6 py-20 text-center">
      <span className="display text-5xl md:text-7xl text-rust opacity-60 leading-none select-none">"</span>
      <p className="display-it text-3xl md:text-5xl leading-[1.1] mt-2 max-w-3xl mx-auto">
        Strip the surface. Read the strata.
        <br />
        <span className="text-rust">Extract the signal.</span>
      </p>
      <div className="eyebrow text-muted mt-6">— THE BUREAU MANIFESTO, § 01</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Drop cap — first letter rendered like a chapter opening
// ---------------------------------------------------------------------------
function DropCap({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="display float-left text-6xl mr-2 -mt-1 leading-none text-rust select-none"
      style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 700' }}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Sitemap link with dotted leader to a "page number" on the right
// ---------------------------------------------------------------------------
function LeaderLink({
  href,
  label,
  num,
  external,
}: {
  href: string;
  label: string;
  num: string;
  external?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group flex items-end text-sm transition-colors text-muted hover:text-fg"
    >
      <span className={hovered ? "text-rust" : ""}>{label}</span>
      <span
        className="flex-1 mx-2 mb-[5px] h-px"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 0.5px, transparent 0.5px)",
          backgroundSize: "4px 1px",
          backgroundRepeat: "repeat-x",
          opacity: hovered ? 0.7 : 0.3,
        }}
        aria-hidden
      />
      <span className={`num text-xs ${hovered ? "text-rust" : "text-muted"}`}>
        {num}
      </span>
      {external && <ArrowUpRight className="h-2.5 w-2.5 ml-1 mb-1" />}
    </Link>
  );
}
