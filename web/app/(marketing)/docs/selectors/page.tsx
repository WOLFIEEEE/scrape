import { DocShell, DocSection } from "@/components/marketing/doc-shell";
import { CodeBlock } from "@/components/marketing/code-block";

import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Selectors",
  description: "Hand-tuned extractors when the schema is stable.",
  path: "/docs/selectors",
});
export default function Page() {
  return (
    <DocShell title="Per-site CSS selectors" current="/docs/selectors" description="Hand-tuned extractors when the schema is stable.">
      <DocSection title="When to use selectors">
        <p>If you're scraping a known site with a stable structure, a hand-written CSS selector is <strong>~100× cheaper</strong> than LLM extraction and more reliable. Selectors run during extraction; LLM is the fallback.</p>
      </DocSection>
      <DocSection title="Defining one">
        <CodeBlock label="src/scrape/extractors/selectors/__init__.py" lang="python" code={`def my_extractor(html: str | bytes, url: str) -> dict[str, Any]:\n    tree = HTMLParser(html)\n    title = tree.css_first("h1.product-title")\n    price = tree.css_first(".price-now")\n    return {\n        "url": url,\n        "title": title.text(strip=True) if title else None,\n        "price": price.text(strip=True) if price else None,\n    }\n\nSELECTOR_REGISTRY["myshop.com"] = my_extractor`} />
      </DocSection>
      <DocSection title="Lookup rules">
        <p>The orchestrator tries the FQDN first, then falls back to longest-suffix match against eTLD+1. So registering <code>products.example.com</code> works for both <code>products.example.com</code> and <code>example.com</code>.</p>
      </DocSection>
    </DocShell>
  );
}
