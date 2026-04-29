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
    </DocShell>
  );
}
