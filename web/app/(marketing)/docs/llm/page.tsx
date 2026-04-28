import { DocShell, DocSection } from "@/components/marketing/doc-shell";
import { CodeBlock } from "@/components/marketing/code-block";

export const metadata = { title: "LLM extraction" };

export default function Page() {
  return (
    <DocShell title="LLM schema extraction" current="/docs/llm" description="Claude-powered structured extraction with prompt caching.">
      <DocSection title="When to use it">
        <p>LLM extraction shines when the schema is stable but the source DOM isn't, when you scrape many sites and don't want to write per-site selectors, or when you want partial success — Claude returns nulls for missing fields rather than failing the whole row.</p>
      </DocSection>
      <DocSection title="How it works">
        <ol>
          <li>HTML → Markdown (selectolax, deterministic)</li>
          <li>Markdown + JSON schema → Claude with cacheable system prompt</li>
          <li>Structured JSON parsed and stored</li>
        </ol>
        <p>The system prompt + schema are marked as ephemeral cache; same crawl job amortizes ~90% of input tokens.</p>
      </DocSection>
      <DocSection title="Schema example">
        <CodeBlock label="schema.yaml" lang="yaml" code={`type: object\nproperties:\n  title:    { type: string }\n  price:    { type: number, description: "strip currency symbols" }\n  currency: { type: string, description: "ISO 4217" }\n  in_stock: { type: boolean }\nrequired: [title, price, in_stock]`} />
      </DocSection>
      <DocSection title="Cost">
        <p>Claude Haiku 4.5 with prompt caching runs about <strong>$0.003 / page</strong> for typical product pages (~6k input tokens, ~200 output). At 1M pages that's $3,000 — vs $30k+ without caching.</p>
      </DocSection>
    </DocShell>
  );
}
