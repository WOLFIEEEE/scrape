import { DocShell, DocSection } from "@/components/marketing/doc-shell";

import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Concepts",
  description: "The mental model: tiers, sessions, fingerprints, escalation.",
  path: "/docs/concepts",
});
export default function Page() {
  return (
    <DocShell title="Core concepts" current="/docs/concepts" description="The mental model: tiers, sessions, fingerprints, escalation.">
      <DocSection title="Tier">
        <p>A <strong>tier</strong> is a transport strategy with a cost / capability tradeoff. Lower tiers are cheaper and faster but bypass less. Higher tiers handle harder targets.</p>
        <ul>
          <li><strong>Tier 0 — HTTP</strong>: real-Chrome TLS via curl_cffi. ~50ms.</li>
          <li><strong>Tier 1 — Browser</strong>: Camoufox (Firefox + C++ patches). ~3s.</li>
          <li><strong>Tier 2 — CAPTCHA</strong>: browser + token-injection solver. ~15s.</li>
          <li><strong>Tier 3 — Unblock</strong>: managed third-party fallback. ~20s.</li>
        </ul>
      </DocSection>
      <DocSection title="Session">
        <p>A <strong>session</strong> is the identity tuple <code>(host, fingerprint, proxy_id)</code>. Cookies and storage state are scoped to a session — never shared across tuples. Crossing IPs with the same cookie jar is the canonical "shared account" signal that gets you flagged.</p>
      </DocSection>
      <DocSection title="Fingerprint bundle">
        <p>A coherent set of identifiers that mimic a real device: User-Agent, screen size, timezone, locale, WebGL vendor, fonts, hardware concurrency. They're sourced from real devices — mixing fields across bundles (macOS UA + Windows screen) is the #1 fingerprint mistake.</p>
      </DocSection>
      <DocSection title="Escalation">
        <p>The router runs every URL at the cheapest tier first. If a block is detected (status code, challenge HTML signature, soft-200 with empty body), it promotes the URL to the next tier and re-queues. ~80% of requests clear at Tier 0–1.</p>
      </DocSection>
      <DocSection title="Block detection">
        <p>Every response passes through a cheap regex/header pipeline that flags Cloudflare challenges, DataDome, PerimeterX, hCaptcha/reCAPTCHA presence, 4xx/5xx, rate limiting, and undersized HTML bodies. The signal determines the escalation target.</p>
      </DocSection>
    </DocShell>
  );
}
