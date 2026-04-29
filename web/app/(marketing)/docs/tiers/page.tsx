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
    </DocShell>
  );
}
