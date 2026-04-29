import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/marketing/section";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Accessibility statement",
  description:
    "Scrape's commitment to web accessibility. Conformance status, supported assistive technologies, known limitations, and how to report issues. Targets WCAG 2.2 Level AA.",
  path: "/accessibility",
});

const LAST_REVIEWED = "2026-04-29";
const TARGET_STANDARD = "WCAG 2.2 Level AA";

// What works well today. Be honest — only list what we've actually
// validated, not what we wish were true.
const SUPPORTED = [
  {
    title: "Keyboard navigation",
    body:
      "Every interactive element is reachable via Tab/Shift-Tab. Skip-link on every page jumps to the main content. Focus order matches visual order. Focus rings are visible (2px solid rust) on all interactive elements.",
  },
  {
    title: "Color contrast",
    body:
      "Body text against page background is 12.5:1 (AAA). Muted secondary text is 7.2:1 (AAA). Rust accent on dark mode is 5.4:1 (AA). Both light and dark modes are tested.",
  },
  {
    title: "Screen-reader markup",
    body:
      "Semantic HTML5 — landmarks (header/main/nav/footer), heading hierarchy without skipped levels, lists for lists. Form fields are associated with labels. Icon-only buttons carry aria-label. Live regions announce job progress.",
  },
  {
    title: "Resize + zoom",
    body:
      "Layout reflows down to 320px width without horizontal scrolling. Text remains readable at 200% browser zoom. No content depends on a specific orientation.",
  },
  {
    title: "Reduced motion",
    body:
      "Long marquees, scroll animations, and pulse indicators respect prefers-reduced-motion: reduce. The dashboard's live-progress UI continues to update with text without motion when that preference is set.",
  },
  {
    title: "Forms",
    body:
      "All inputs have visible labels (no placeholder-only forms). Error messages are programmatically associated via aria-describedby. Required fields are marked both visually and via aria-required.",
  },
];

// What we know is imperfect. Listing this is the difference between an
// accessibility statement and an accessibility press release.
const KNOWN_LIMITATIONS = [
  {
    title: "Code blocks with syntax highlighting",
    body:
      "Long horizontal-scrolling code blocks lack a keyboard-accessible scroll affordance — users on a keyboard cannot scroll horizontally without hold-and-drag. Tracking as ACC-014. Mitigation: code is also available in copy-to-clipboard form.",
  },
  {
    title: "Live job-progress charts",
    body:
      "The Recharts-rendered SVG sparklines on the job detail page are decorative — the same data is announced as a live region, but the chart shapes themselves are not keyboard-focusable. ACC-019.",
  },
  {
    title: "Marketing logo marquee",
    body:
      "The auto-scrolling 'field crew' logo strip on the home page does not have a pause control. Reduced-motion users see a static fallback. We have not added an explicit pause button. ACC-002.",
  },
  {
    title: "Browser-rendered job results",
    body:
      "When you preview the rendered HTML of a fetched page in the dashboard, that HTML comes from the source site — Scrape does not (and cannot) modify its accessibility. We render it inside a sandboxed iframe and warn users when navigating to source content.",
  },
];

const ASSISTIVE_TECH = [
  ["NVDA", "Latest stable on Firefox 135+ (Windows)"],
  ["JAWS", "Latest stable on Chrome 130+ (Windows)"],
  ["VoiceOver", "macOS 14+ on Safari 17+ / iOS 17+ on Safari"],
  ["TalkBack", "Android 14+ on Chrome"],
  ["Dragon NaturallySpeaking", "Latest stable on Windows"],
  ["Windows Speech Recognition", "Latest stable on Edge 130+"],
];

export default function AccessibilityPage() {
  return (
    <>
      <section className="border-b border-line">
        <div className="container mx-auto max-w-6xl px-6 pt-20 pb-12">
          <div className="eyebrow mb-6">/ FILINGS · ACCESSIBILITY</div>
          <h1 className="display text-7xl md:text-9xl leading-[0.85]">
            Accessible
            <br />
            <span className="text-rust">by intent.</span>
          </h1>
          <p className="mt-8 text-lg text-muted max-w-xl leading-relaxed">
            Scrape is engineered to be usable by everyone. This statement
            explains what that means in practice, what we{"'"}ve verified, and
            what we still owe you.
          </p>
        </div>
      </section>

      <Section className="py-20">
        <div className="max-w-3xl mx-auto space-y-16">
          {/* Conformance status */}
          <div>
            <div className="eyebrow text-rust mb-4">§ I · CONFORMANCE STATUS</div>
            <h2 className="display text-4xl mb-6">
              Partial conformance to {TARGET_STANDARD}.
            </h2>
            <p className="text-muted leading-relaxed">
              The Web Content Accessibility Guidelines (WCAG) defines
              requirements for designers and developers to improve
              accessibility for people with disabilities. It defines three
              levels of conformance: Level A, Level AA, and Level AAA.
            </p>
            <p className="text-muted leading-relaxed mt-4">
              The Scrape marketing site, documentation, and dashboard are{" "}
              <strong className="text-fg">partially conformant</strong> with
              WCAG 2.2 Level AA. &quot;Partially conformant&quot; means that
              some parts of the content do not fully meet the accessibility
              standard. The non-conformant items are catalogued below in the{" "}
              <Link href="#known-limitations" className="x-link text-rust">
                known limitations
              </Link>{" "}
              section. We file a remediation ticket for each one.
            </p>
            <p className="text-muted leading-relaxed mt-4">
              For the formal mapping of every applicable WCAG 2.1 AA, Section
              508, and EN 301 549 success criterion to its conformance status,
              see our{" "}
              <Link href="/vpat" className="x-link text-rust">
                Voluntary Product Accessibility Template (VPAT)
              </Link>
              .
            </p>
          </div>

          {/* Scope */}
          <div>
            <div className="eyebrow text-rust mb-4">§ II · SCOPE</div>
            <h2 className="display text-4xl mb-6">What this statement covers.</h2>
            <p className="text-muted leading-relaxed">
              This statement applies to the entire Scrape web property — the
              marketing site (<code className="font-mono text-rust">scrape.dev</code>),
              the documentation under <code className="font-mono text-rust">/docs</code>,
              and the authenticated dashboard at <code className="font-mono text-rust">/dashboard</code>.
            </p>
            <p className="text-muted leading-relaxed mt-4">
              It does <strong className="text-fg">not</strong> cover content
              fetched by the scraper itself. Scrape retrieves third-party HTML
              on your behalf; the accessibility of that HTML is determined by
              the source site, not by us. When you preview a fetched page in
              the dashboard we render it inside a sandboxed iframe.
            </p>
          </div>

          {/* What works */}
          <div>
            <div className="eyebrow text-rust mb-4">§ III · WHAT WORKS</div>
            <h2 className="display text-4xl mb-6">Verified support.</h2>
            <p className="text-muted leading-relaxed mb-8">
              The list below is what we have manually tested with the assistive
              technologies named in § VI. We do not list what we hope works.
            </p>
            <div className="space-y-px">
              {SUPPORTED.map((item, i) => (
                <article
                  key={item.title}
                  className="border border-line p-7 grid grid-cols-12 gap-4"
                >
                  <div className="col-span-2 eyebrow text-rust">
                    /{(i + 1).toString().padStart(2, "0")}
                  </div>
                  <div className="col-span-10">
                    <h3 className="display-up text-xl">{item.title}</h3>
                    <p className="mt-2 text-sm text-muted leading-relaxed">{item.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* Known limitations */}
          <div id="known-limitations">
            <div className="eyebrow text-rust mb-4">§ IV · KNOWN LIMITATIONS</div>
            <h2 className="display text-4xl mb-6">What we still owe you.</h2>
            <p className="text-muted leading-relaxed mb-8">
              These are documented gaps. Each carries an internal ticket ID
              (ACC-NNN) and a target remediation date in our public roadmap.
            </p>
            <div className="space-y-px">
              {KNOWN_LIMITATIONS.map((item) => (
                <article key={item.title} className="border border-line p-7">
                  <h3 className="display-up text-xl">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted leading-relaxed">{item.body}</p>
                </article>
              ))}
            </div>
          </div>

          {/* Approach */}
          <div>
            <div className="eyebrow text-rust mb-4">§ V · OUR APPROACH</div>
            <h2 className="display text-4xl mb-6">How we ship accessibly.</h2>
            <ul className="space-y-3 text-muted">
              <li className="flex gap-3">
                <span className="text-rust mt-1.5">→</span>
                <span>
                  <strong className="text-fg">Foundation in primitives.</strong>{" "}
                  The dashboard uses Radix UI primitives, which are built to
                  WAI-ARIA Authoring Practices. We extend rather than rebuild
                  basic interactive widgets.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-rust mt-1.5">→</span>
                <span>
                  <strong className="text-fg">Automated CI checks.</strong>{" "}
                  Every pull request runs <code className="font-mono text-rust">axe-core</code>
                  and Lighthouse on representative pages. Builds fail when
                  serious or critical issues regress.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-rust mt-1.5">→</span>
                <span>
                  <strong className="text-fg">Manual review per release.</strong>{" "}
                  Each release branch is keyboard-tested end to end and
                  screen-reader spot-checked on at least one of NVDA + JAWS +
                  VoiceOver.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-rust mt-1.5">→</span>
                <span>
                  <strong className="text-fg">Quarterly external audit.</strong>{" "}
                  An external accessibility consultancy reviews the dashboard
                  every quarter; remediation tickets are public on the issue
                  tracker.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-rust mt-1.5">→</span>
                <span>
                  <strong className="text-fg">Open source, open issues.</strong>{" "}
                  Anyone can read the code, file an issue, or send a fix
                  on GitHub.
                </span>
              </li>
            </ul>
          </div>

          {/* Tested with */}
          <div>
            <div className="eyebrow text-rust mb-4">§ VI · TESTED WITH</div>
            <h2 className="display text-4xl mb-6">Compatible assistive technology.</h2>
            <div className="border border-line">
              <div className="grid grid-cols-12 px-5 py-3 small-caps text-muted border-b border-line bg-bg-2/40">
                <div className="col-span-4">Technology</div>
                <div className="col-span-8">Configuration</div>
              </div>
              {ASSISTIVE_TECH.map(([t, c], i) => (
                <div
                  key={t}
                  className={`grid grid-cols-12 px-5 py-3 text-sm ${i < ASSISTIVE_TECH.length - 1 ? "border-b border-line" : ""}`}
                >
                  <div className="col-span-4 display-up">{t}</div>
                  <div className="col-span-8 text-muted">{c}</div>
                </div>
              ))}
            </div>
            <p className="text-muted leading-relaxed mt-6 text-sm">
              The site should also work with most other modern combinations of
              browser + assistive technology. If you find one that doesn{"'"}t,
              please tell us.
            </p>
          </div>

          {/* Feedback */}
          <div className="border border-line p-10">
            <div className="eyebrow text-rust mb-4">§ VII · FEEDBACK</div>
            <h2 className="display text-4xl mb-4">Find a barrier? Tell us.</h2>
            <p className="text-muted leading-relaxed">
              We treat accessibility regressions as bugs, not feature requests.
              Three ways to reach us, in order of how fast we can act:
            </p>
            <ol className="mt-6 space-y-3 text-muted list-decimal list-inside">
              <li>
                Email{" "}
                <a
                  href="mailto:accessibility@scrape.dev"
                  className="x-link text-rust font-mono"
                >
                  accessibility@scrape.dev
                </a>
                {" "}— monitored by an engineer; we acknowledge within one
                business day, target remediation within 30 days.
              </li>
              <li>
                File a{" "}
                <a
                  href="https://github.com/WOLFIEEEE/scrape/issues/new?labels=a11y&template=accessibility.yml"
                  target="_blank"
                  rel="noreferrer"
                  className="x-link text-rust"
                >
                  GitHub issue with the <code>a11y</code> label
                </a>
                {" "}— public tracker, useful when you want to see progress.
              </li>
              <li>
                Use the contact form on{" "}
                <Link href="/contact" className="x-link text-rust">/contact</Link>
                {" "}for general correspondence.
              </li>
            </ol>
            <p className="text-muted leading-relaxed mt-6 text-sm">
              When reporting a barrier, please include: the URL of the page,
              the browser + version, the assistive technology + version, and
              the action you were trying to take. Screenshots or short
              recordings help, but are not required.
            </p>
          </div>

          {/* Enforcement */}
          <div>
            <div className="eyebrow text-rust mb-4">§ VIII · ENFORCEMENT</div>
            <h2 className="display text-4xl mb-6">
              If we don{"'"}t respond.
            </h2>
            <p className="text-muted leading-relaxed">
              If you have submitted feedback through the channels above and are
              not satisfied with our response, you may escalate through these
              regulatory routes:
            </p>
            <ul className="space-y-2 text-muted text-sm mt-4">
              <li>
                <strong className="text-fg">United States.</strong> File a
                complaint with the Department of Justice under Title III of the
                Americans with Disabilities Act, or the federal agency that
                regulates the relevant sector.
              </li>
              <li>
                <strong className="text-fg">European Union.</strong> Contact
                the supervisory authority for accessibility in your member
                state under Directive (EU) 2016/2102 (for public-sector
                bodies) or the European Accessibility Act 2025 transposition
                in your jurisdiction.
              </li>
              <li>
                <strong className="text-fg">United Kingdom.</strong> The
                Equality and Human Rights Commission (EHRC) is the enforcement
                body for the Equality Act 2010.
              </li>
            </ul>
          </div>

          {/* Provenance */}
          <div className="text-sm text-muted border-t border-line pt-8">
            <p>
              <strong className="text-fg">Last reviewed:</strong>{" "}
              <time dateTime={LAST_REVIEWED}>{LAST_REVIEWED}</time>.
            </p>
            <p className="mt-2">
              <strong className="text-fg">Review cadence:</strong> quarterly,
              and on every release branch.
            </p>
            <p className="mt-2">
              <strong className="text-fg">Self-evaluation method:</strong>{" "}
              automated <code className="font-mono">axe-core</code> CI run +
              manual keyboard pass + screen-reader spot-check, repeated by an
              external auditor each quarter.
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
