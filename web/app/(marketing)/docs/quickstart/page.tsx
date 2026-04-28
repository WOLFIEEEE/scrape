import { DocShell, DocSection } from "@/components/marketing/doc-shell";
import { CodeBlock } from "@/components/marketing/code-block";

export const metadata = { title: "Quickstart" };

export default function Page() {
  return (
    <DocShell title="Quickstart" current="/docs/quickstart" description="From zero to first crawl in under 5 minutes.">
      <DocSection title="1. Install">
        <p>Scrape ships as a Python package. We recommend installing it through <a href="https://docs.astral.sh/uv/" target="_blank" rel="noreferrer">uv</a>:</p>
        <CodeBlock label="bash" code={`uv tool install scrape\nscrape --help`} />
        <p>Or use pip if you prefer:</p>
        <CodeBlock label="bash" code={`pipx install scrape`} />
      </DocSection>
      <DocSection title="2. Create an account">
        <p>Spin up the API server and dashboard:</p>
        <CodeBlock label="bash" code={`scrape-api &\ncd web && pnpm dev`} />
        <p>Open <code>http://localhost:3000/register</code> and create an account. The first registered user becomes the admin.</p>
      </DocSection>
      <DocSection title="3. Run your first crawl">
        <p>From the dashboard, click <strong>New job</strong>, paste a few URLs, and choose <strong>Tier 0 — HTTP only</strong>. The job will run in the background and stream live progress to the detail page.</p>
        <p>Or use the CLI:</p>
        <CodeBlock label="bash" code={`scrape crawl https://books.toscrape.com/catalogue/sapiens-a-brief-history-of-humankind_996/index.html --max-tier 0 --no-browser`} />
      </DocSection>
      <DocSection title="4. Get your data">
        <p>Once the job finishes:</p>
        <ul>
          <li>The dashboard shows extracted rows in a table</li>
          <li>Hit <strong>JSON</strong> or <strong>CSV</strong> to download a file</li>
          <li>Or query the SQLite store directly: <code>data/scrape.db</code></li>
        </ul>
      </DocSection>
      <DocSection title="Next steps">
        <ul>
          <li>Read about <a href="/docs/concepts">core concepts</a> — tiers, sessions, fingerprints</li>
          <li>Learn how <a href="/docs/tiers">tier escalation</a> picks the right approach automatically</li>
          <li>Plug in <a href="/docs/proxies">residential proxies</a> for high-volume scraping</li>
        </ul>
      </DocSection>
    </DocShell>
  );
}
