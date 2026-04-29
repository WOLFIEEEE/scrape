import { DocShell, DocSection } from "@/components/marketing/doc-shell";
import { CodeBlock } from "@/components/marketing/code-block";

import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "CAPTCHA",
  description: "Cloudflare Turnstile, reCAPTCHA v3, hCaptcha — solved automatically.",
  path: "/docs/captcha",
});
export default function Page() {
  return (
    <DocShell title="CAPTCHA solving" current="/docs/captcha" description="Cloudflare Turnstile, reCAPTCHA v3, hCaptcha — solved automatically.">
      <DocSection title="Setup">
        <p>The default solver is <a href="https://www.capsolver.com/" target="_blank" rel="noreferrer">CapSolver</a>. Set your key and you're done:</p>
        <CodeBlock label=".env" code={`CAPSOLVER_API_KEY=cap_xxxxxxxxxxxx\nCAPSOLVER_TIMEOUT_S=120`} />
      </DocSection>
      <DocSection title="Cloudflare Turnstile">
        <p>The browser tier loads the page, the block detector flags Turnstile, the sitekey is extracted from the DOM, the solver returns a token in ~5s, and we inject it into the hidden response field before resubmitting.</p>
      </DocSection>
      <DocSection title="reCAPTCHA v3">
        <p>v3 is score-based — there's no puzzle to solve. The solver simulates a clean session and returns a token with a target score. We inject and continue.</p>
      </DocSection>
      <DocSection title="hCaptcha">
        <p>Visual challenges are solved by the solver's vision model (CapSolver's HCaptchaTurboTask). Token returned, injected, page resubmitted.</p>
      </DocSection>
      <DocSection title="Bring your own solver">
        <p>The <code>CaptchaSolver</code> Protocol is two methods. Implement it for any provider, pass the instance into the Orchestrator, and it slots into the same tier flow.</p>
      </DocSection>

      <DocSection title="Per-target solver hint">
        <p>Auto-detection looks for <code>cf-turnstile</code>, <code>g-recaptcha</code>, and <code>hcaptcha.com</code> markers in the rendered HTML. That misses widgets rendered in shadow DOM, lazy-loaded after our content snapshot, or wrapped in a custom React component. When you already know what a target ships, set <code>captcha_hint</code> on the job:</p>
        <CodeBlock label="job request" lang="json" code={`{
  "name": "fintech-signup-leads",
  "urls": ["https://example-bank.com/open-account"],
  "max_tier": 2,
  "captcha_hint": "hcaptcha"
}`} />
        <p>Accepted values: <code>turnstile</code> · <code>recaptcha_v3</code> · <code>hcaptcha</code>. With a hint set, Tier 2 still extracts the sitekey from the page; the hint only tells the solver which task type to submit.</p>
      </DocSection>

      <DocSection title="Cost transparency">
        <p>Every successful Tier-2 fetch records <code>solver_cost_usd</code> on the result row, sourced from CapSolver&apos;s <code>price</code> field where present. Per-task fallbacks (when the API doesn&apos;t echo the price): Turnstile ~$0.0008, reCAPTCHA v3 ~$0.0010, hCaptcha ~$0.0008. The <code>scrape_solver_cost_usd_total</code> Prometheus counter tracks lifetime spend; the dashboard <code>/jobs/:id</code> view shows it per-fetch.</p>
      </DocSection>

      <DocSection title="Test sitekey safety">
        <p>Cloudflare publishes test sitekeys (<code>1x00…AA</code> always-pass, <code>2x00…AB</code> always-block, <code>3x00…FF</code> always-interactive). Real solvers reject these with HTTP 400 because they don&apos;t correspond to a customer site. Scrape detects them locally and skips with <code>captcha.skipped_test_sitekey</code> so we don&apos;t waste a roundtrip on a never-going-to-solve task.</p>
      </DocSection>
    </DocShell>
  );
}
