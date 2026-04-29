import { DocShell, DocSection } from "@/components/marketing/doc-shell";

import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Tier escalation",
  description: "How auto-promotion works and when to override it.",
  path: "/docs/tiers",
});
export default function Page() {
  return (
    <DocShell title="Tier escalation" current="/docs/tiers" description="How auto-promotion works and when to override it.">
      <DocSection title="The default route">
        <p>Every URL starts at <strong>Tier 0</strong>. If the response is clean (2xx, no challenge markers, body looks real), we stop. Otherwise the block detector reports a reason and the router promotes to the next tier.</p>
      </DocSection>
      <DocSection title="Promotion table">
        <table>
          <thead><tr><th>Block reason</th><th>Promotes to</th></tr></thead>
          <tbody>
            <tr><td><code>challenge_page</code></td><td>Tier 1 (browser)</td></tr>
            <tr><td><code>captcha_required</code></td><td>Tier 2 (CAPTCHA solver)</td></tr>
            <tr><td><code>empty_body</code></td><td>Tier 1 (browser)</td></tr>
            <tr><td><code>rate_limited</code></td><td>Tier 3 (unblock API)</td></tr>
            <tr><td><code>status_4xx</code> / <code>status_5xx</code></td><td>Tier 3 (unblock API)</td></tr>
          </tbody>
        </table>
      </DocSection>
      <DocSection title="Capping max tier">
        <p>You can cap promotion per job to control cost. <code>max_tier=0</code> means "fail rather than escalate to a browser." This is useful for cheap, high-volume crawls of friendly targets.</p>
      </DocSection>
      <DocSection title="Forcing a starting tier">
        <p>If you know a target needs a browser, set the request's <code>tier</code> field to skip the wasted Tier 0 attempt. The router still escalates if the browser tier itself blocks.</p>
      </DocSection>

      <DocSection title="Choosing a Tier-3 unblock provider">
        <p>Tier 3 is the last-resort fallback when Tier 0–2 can&apos;t get through. Three providers ship under the same <code>UnblockProvider</code> protocol; pick the one that matches your targets.</p>
        <table>
          <thead>
            <tr><th>Provider</th><th>Cost</th><th>Beats</th><th>Doesn&apos;t beat</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><code>flaresolverr</code></td>
              <td>Free, self-hosted (Docker)</td>
              <td>Plain Cloudflare JS challenges (Managed Challenge, &quot;Just a moment&quot;)</td>
              <td>Behavioral scoring (PerimeterX, advanced Akamai, Kasada)</td>
            </tr>
            <tr>
              <td><code>brightdata</code></td>
              <td>~$3 per 1,000 successful requests</td>
              <td>CF, Akamai, PerimeterX, Kasada — runs a real-browser farm</td>
              <td>Sites that explicitly block Bright Data IP ranges</td>
            </tr>
            <tr>
              <td><code>scrapfly</code></td>
              <td>~$0.001–$0.025 per request (credits)</td>
              <td>CF, Akamai, PerimeterX with ASP enabled</td>
              <td>Same gaps as Bright Data; pricing scales with render mode</td>
            </tr>
          </tbody>
        </table>
        <p>Set the provider via <code>UNBLOCK_PROVIDER=flaresolverr|brightdata|scrapfly</code>. Commercial providers refuse to start without their API key (<code>BRIGHTDATA_API_KEY</code> / <code>SCRAPFLY_API_KEY</code>); the orchestrator logs <code>unblock.brightdata_missing_key</code> and falls back to no Tier 3 rather than silently swallow the request.</p>
      </DocSection>

      <DocSection title="Honest limits">
        <p>Some block patterns can&apos;t be solved by any tier we ship today:</p>
        <ul>
          <li>WAF outright blocks (no challenge served, just 403 + a 2 KB explanation page) — typically need a different IP range; Tier 3 commercial unblockers help here.</li>
          <li>Site-specific JS interstitials with no public sitekey — our regex auto-detector misses these; use <a href="/docs/captcha">the per-target solver hint</a>.</li>
          <li>Fingerprint-pinned APIs that require a paid app token — out of scope; integrate the official API instead.</li>
        </ul>
      </DocSection>
    </DocShell>
  );
}
