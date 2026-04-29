import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/marketing/section";
import { pageMeta } from "@/lib/seo";
import {
  PRODUCT_INFO,
  WCAG_2_1,
  WCAG_2_2_NEW,
  type Criterion,
  type ConformanceLevel,
} from "@/lib/vpat";

export const metadata: Metadata = pageMeta({
  title: "VPAT 2.5 · Voluntary Product Accessibility Template",
  description:
    "Formal accessibility conformance report for Scrape — WCAG 2.1 AA, WCAG 2.2 AA, Revised Section 508, and EN 301 549. Every applicable success criterion mapped to its conformance level.",
  path: "/vpat",
});

// Visual mapping for the conformance level chip. We keep the colors muted
// (rust accent only on the bad outcomes) so the table itself remains readable
// at small sizes and on grayscale screen-reader-only contexts.
const LEVEL_CHIP: Record<ConformanceLevel, { label: string; cls: string }> = {
  Supports: { label: "Supports", cls: "tag tag-rust opacity-90" },
  "Partially Supports": {
    label: "Partially Supports",
    cls: "tag tag-rust opacity-70",
  },
  "Does Not Support": {
    label: "Does Not Support",
    cls: "tag tag-rust opacity-100",
  },
  "Not Applicable": { label: "Not Applicable", cls: "tag opacity-60" },
};

function ConformanceTable({ rows }: { rows: Criterion[] }) {
  return (
    <div className="border border-line overflow-hidden">
      {/* Table headers — semantic table for screen-reader users. The visual
          form uses CSS grid; underlying markup is still <table> with proper
          row + cell structure. */}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-bg-2/40 small-caps text-muted">
            <th scope="col" className="text-left px-5 py-3 border-b border-line w-20">
              §
            </th>
            <th scope="col" className="text-left px-5 py-3 border-b border-line">
              Criterion
            </th>
            <th scope="col" className="text-left px-5 py-3 border-b border-line w-44">
              Level
            </th>
            <th scope="col" className="text-left px-5 py-3 border-b border-line w-48">
              Conformance
            </th>
            <th scope="col" className="text-left px-5 py-3 border-b border-line">
              Remarks &amp; explanations
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c, i) => (
            <tr
              key={c.id}
              className={i < rows.length - 1 ? "border-b border-line" : ""}
            >
              <td className="px-5 py-4 align-top font-mono text-rust">{c.id}</td>
              <td className="px-5 py-4 align-top">{c.name}</td>
              <td className="px-5 py-4 align-top text-muted">Level {c.level}</td>
              <td className="px-5 py-4 align-top">
                <span className={LEVEL_CHIP[c.conformance].cls}>
                  {LEVEL_CHIP[c.conformance].label}
                </span>
              </td>
              <td className="px-5 py-4 align-top text-muted leading-relaxed">
                {c.remarks}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function VpatPage() {
  // Cohort the WCAG 2.1 entries by chapter so the report reads like the spec.
  const perceivable = WCAG_2_1.filter((c) => c.id.startsWith("1."));
  const operable = WCAG_2_1.filter((c) => c.id.startsWith("2."));
  const understandable = WCAG_2_1.filter((c) => c.id.startsWith("3."));
  const robust = WCAG_2_1.filter((c) => c.id.startsWith("4."));

  // High-level conformance summary used by procurement teams who skim the
  // first page before reading the criterion table.
  const counts = WCAG_2_1.reduce(
    (acc, c) => {
      acc[c.conformance] = (acc[c.conformance] ?? 0) + 1;
      return acc;
    },
    {} as Record<ConformanceLevel, number>,
  );

  return (
    <>
      {/* === Cover === */}
      <section className="border-b border-line">
        <div className="container mx-auto max-w-6xl px-6 pt-20 pb-12">
          <div className="eyebrow mb-6">/ FILINGS · VPAT 2.5</div>
          <h1 className="display text-6xl md:text-8xl leading-[0.9]">
            Voluntary Product
            <br />
            <span className="text-rust">Accessibility Template.</span>
          </h1>
          <p className="mt-8 text-lg text-muted max-w-2xl leading-relaxed">
            A formal conformance report following the ITI VPAT 2.5 format. For
            the friendlier consumer-facing version see our{" "}
            <Link href="/accessibility" className="x-link text-rust">
              accessibility statement
            </Link>
            .
          </p>
        </div>
      </section>

      <Section className="py-20">
        <div className="max-w-5xl mx-auto space-y-16">
          {/* Cover sheet */}
          <div className="border border-line">
            <div className="grid grid-cols-1 md:grid-cols-2">
              {[
                ["Product name", PRODUCT_INFO.name],
                ["Product version", `v${PRODUCT_INFO.version}`],
                ["Report date", PRODUCT_INFO.reportDate],
                ["Contact", PRODUCT_INFO.contact],
              ].map(([k, v], i) => (
                <div
                  key={k}
                  className={`p-6 ${
                    i % 2 === 0 ? "md:border-r border-line" : ""
                  } ${i < 2 ? "border-b border-line" : ""}`}
                >
                  <div className="eyebrow text-rust">{k}</div>
                  <div className="display-up text-xl mt-2">{v}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-line p-6">
              <div className="eyebrow text-rust mb-3">Product description</div>
              <p className="text-muted leading-relaxed">{PRODUCT_INFO.description}</p>
            </div>
            <div className="border-t border-line p-6">
              <div className="eyebrow text-rust mb-3">Notes on the report</div>
              <p className="text-muted leading-relaxed">{PRODUCT_INFO.notesOnTheReport}</p>
            </div>
          </div>

          {/* Applicable standards */}
          <div>
            <div className="eyebrow text-rust mb-4">§ I · APPLICABLE STANDARDS</div>
            <h2 className="display text-4xl mb-6">Standards covered.</h2>
            <ul className="space-y-2 text-muted">
              {PRODUCT_INFO.applicableStandards.map((s) => (
                <li key={s} className="flex gap-3">
                  <span className="text-rust mt-1.5">·</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Terms key */}
          <div>
            <div className="eyebrow text-rust mb-4">§ II · TERMS USED</div>
            <h2 className="display text-4xl mb-6">How to read this report.</h2>
            <p className="text-muted leading-relaxed mb-6">
              Each WCAG success criterion below is mapped to one of four
              conformance levels per the ITI VPAT 2.5 vocabulary:
            </p>
            <dl className="space-y-4 text-sm">
              {(
                [
                  [
                    "Supports",
                    "The functionality of the product has at least one method that meets the criterion without known defects, or meets with equivalent facilitation.",
                  ],
                  [
                    "Partially Supports",
                    "Some functionality of the product does not meet the criterion. The remarks call out which parts and why.",
                  ],
                  [
                    "Does Not Support",
                    "The majority of the product functionality does not meet the criterion.",
                  ],
                  [
                    "Not Applicable",
                    "The criterion is not relevant to the product.",
                  ],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <dt className="md:col-span-3">
                    <span className="display-up text-base">{k}</span>
                  </dt>
                  <dd className="md:col-span-9 text-muted leading-relaxed">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Evaluation methods */}
          <div>
            <div className="eyebrow text-rust mb-4">§ III · EVALUATION METHODS</div>
            <h2 className="display text-4xl mb-6">How conformance was determined.</h2>
            <ul className="space-y-2 text-muted">
              {PRODUCT_INFO.evaluationMethods.map((m) => (
                <li key={m} className="flex gap-3">
                  <span className="text-rust mt-1.5">→</span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Summary */}
          <div>
            <div className="eyebrow text-rust mb-4">§ IV · CONFORMANCE SUMMARY</div>
            <h2 className="display text-4xl mb-6">By the numbers.</h2>
            <p className="text-muted leading-relaxed mb-6">
              Across the {WCAG_2_1.length} applicable WCAG 2.1 Level A and AA
              success criteria:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 border border-line">
              {(
                [
                  ["Supports", counts.Supports ?? 0],
                  ["Partially supports", counts["Partially Supports"] ?? 0],
                  ["Does not support", counts["Does Not Support"] ?? 0],
                  ["Not applicable", counts["Not Applicable"] ?? 0],
                ] as const
              ).map(([k, v], i) => (
                <div
                  key={k}
                  className={`p-6 ${i < 3 ? "md:border-r border-line" : ""} ${i < 2 ? "border-b md:border-b-0 border-line" : ""}`}
                >
                  <div className="display text-5xl text-rust">{v}</div>
                  <div className="eyebrow mt-3">{k}</div>
                </div>
              ))}
            </div>
          </div>

          {/* WCAG 2.1 — Perceivable */}
          <div>
            <div className="eyebrow text-rust mb-4">§ V · WCAG 2.1 REPORT</div>
            <h2 className="display text-4xl mb-6">Chapter 1 — Perceivable.</h2>
            <ConformanceTable rows={perceivable} />
          </div>

          {/* WCAG 2.1 — Operable */}
          <div>
            <h2 className="display text-4xl mb-6">Chapter 2 — Operable.</h2>
            <ConformanceTable rows={operable} />
          </div>

          {/* WCAG 2.1 — Understandable */}
          <div>
            <h2 className="display text-4xl mb-6">Chapter 3 — Understandable.</h2>
            <ConformanceTable rows={understandable} />
          </div>

          {/* WCAG 2.1 — Robust */}
          <div>
            <h2 className="display text-4xl mb-6">Chapter 4 — Robust.</h2>
            <ConformanceTable rows={robust} />
          </div>

          {/* WCAG 2.2 additions */}
          <div>
            <div className="eyebrow text-rust mb-4">§ VI · WCAG 2.2 ADDITIONS</div>
            <h2 className="display text-4xl mb-6">
              Criteria new in WCAG 2.2.
            </h2>
            <p className="text-muted leading-relaxed mb-6">
              These four AA criteria are present in WCAG 2.2 but not in 2.1.
              Customers operating under a WCAG-2.1-only procurement may
              disregard this section.
            </p>
            <ConformanceTable rows={WCAG_2_2_NEW} />
          </div>

          {/* Section 508 */}
          <div>
            <div className="eyebrow text-rust mb-4">§ VII · SECTION 508</div>
            <h2 className="display text-4xl mb-6">
              Revised Section 508 — chapters 4 and 5.
            </h2>
            <p className="text-muted leading-relaxed">
              The US Revised Section 508 standards incorporate WCAG 2.0 Level A
              and AA by reference (36 CFR Part 1194 § 504.2). All applicable
              WCAG criteria above therefore apply to Section 508 conformance.
              The product is purely web-based; chapters 4 (Hardware) and 5
              (Software) are <strong className="text-fg">Not Applicable</strong>{" "}
              except for the following two software-platform criteria that
              cover the keyboard interface in the dashboard:
            </p>
            <div className="mt-6 border border-line">
              {(
                [
                  [
                    "502.3.1",
                    "Object Information",
                    "Supports",
                    "Object information (name, role, state, value) is exposed via standard ARIA attributes; the dashboard relies on Radix primitives that are tested against this criterion.",
                  ],
                  [
                    "503.2",
                    "User Preferences",
                    "Supports",
                    "User-set preferences for color, contrast, and font are honored via prefers-color-scheme, prefers-contrast, and OS-level font scaling.",
                  ],
                ] as const
              ).map(([id, name, level, remarks], i) => (
                <div
                  key={id}
                  className={`p-5 grid grid-cols-12 gap-4 ${i === 0 ? "border-b border-line" : ""}`}
                >
                  <div className="col-span-2 font-mono text-rust">{id}</div>
                  <div className="col-span-3">{name}</div>
                  <div className="col-span-2">
                    <span className="tag tag-rust opacity-90">{level}</span>
                  </div>
                  <div className="col-span-5 text-muted text-sm leading-relaxed">
                    {remarks}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* EN 301 549 */}
          <div>
            <div className="eyebrow text-rust mb-4">§ VIII · EN 301 549</div>
            <h2 className="display text-4xl mb-6">
              EN 301 549 v3.2.1 — relevant clauses.
            </h2>
            <p className="text-muted leading-relaxed">
              EN 301 549 incorporates WCAG 2.1 AA by reference (clause 9). The
              applicable criteria are therefore those listed in §V above.
              Clause 11 (Software) covers the dashboard{"'"}s desktop-style
              widgets via the same Radix-primitives evaluation already noted.
              Clauses 6 (Two-way Voice), 7 (Video), 8 (Hardware), and 13
              (ICT providing real-time text) are{" "}
              <strong className="text-fg">Not Applicable</strong> — the product
              does not provide voice, video, hardware, or real-time text
              functionality.
            </p>
          </div>

          {/* Sign-off */}
          <div className="border-t border-line pt-8 text-sm text-muted">
            <p>
              <strong className="text-fg">Report version:</strong> 1.0
            </p>
            <p className="mt-2">
              <strong className="text-fg">Report author:</strong> Scrape Bureau
              accessibility working group
            </p>
            <p className="mt-2">
              <strong className="text-fg">Contact:</strong>{" "}
              <a href={`mailto:${PRODUCT_INFO.contact}`} className="x-link text-rust font-mono">
                {PRODUCT_INFO.contact}
              </a>
            </p>
            <p className="mt-2">
              <strong className="text-fg">Next scheduled review:</strong> on
              the next minor release branch (quarterly).
            </p>
            <p className="mt-6">
              The VPAT format is owned by the Information Technology Industry
              Council (ITI) and is freely usable. The conformance evaluations
              in this document represent Scrape{"'"}s own honest review of its
              product against the applicable standards.
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
