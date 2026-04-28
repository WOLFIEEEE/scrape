import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Section } from "@/components/marketing/section";
import { CodeBlock } from "@/components/marketing/code-block";

const POSTS: Record<string, {
  title: string; date: string; tag: string; read: string;
  body: React.ReactNode;
}> = {
  "tls-fingerprinting-2026": {
    title: "Why your scraper is still getting flagged at the TCP layer",
    date: "Apr 24, 2026", tag: "Engineering", read: "8 min",
    body: (
      <>
        <p>
          For most of the 2010s, the standard advice for "looking like a real browser" topped out at sending the right
          <code>User-Agent</code>. By 2018, JA3 — a fingerprint over the TLS ClientHello — quietly turned that advice
          into a museum piece. By 2024, JA4+ closed every loophole JA3 had.
        </p>
        <h2>The problem with JA3</h2>
        <p>
          JA3 hashes the cipher suites, extensions, and elliptic curves a client offers in its TLS ClientHello. Two clients
          with identical TCP-layer behavior produce the same hash. Cloudflare, Akamai, and every other major WAF use
          this as a stable identifier — they can tell the difference between Chrome 131 and a Python <code>requests</code>
          script before they've parsed a single byte of HTTP.
        </p>
        <h2>What changed in 2024–2026</h2>
        <p>
          TLS 1.3 introduced extension permutation (RFC 8701) — extensions are sent in a randomized order. JA3, which
          hashes the extension list directly, started producing unstable fingerprints. JA4+ fixes this by sorting the
          extension list before hashing. It also adds HTTP/2 frame ordering and ALPN sequence as separate sub-fingerprints.
        </p>
        <h2>How <code>curl-impersonate</code> keeps up</h2>
        <p>
          <code>curl-impersonate</code> patches curl to send the exact ClientHello of a real Chrome / Firefox / Safari build,
          including extension order, cipher suite preferences, and HTTP/2 settings frames. <code>curl_cffi</code> wraps it
          in Python.
        </p>
        <CodeBlock label="curl_cffi" lang="python" code={`from curl_cffi.requests import AsyncSession\n\nasync with AsyncSession(impersonate="chrome131") as s:\n    resp = await s.get("https://target.example.com/")`} />
        <h2>Why it isn't enough alone</h2>
        <p>
          A perfect TLS fingerprint paired with a Python User-Agent is an instant flag. The whole stack — TLS, HTTP/2,
          User-Agent, Accept-Language, header order — has to come from the same browser version. That's why Scrape pins
          impersonation per session and rotates only between sessions, not within them.
        </p>
      </>
    ),
  },
  "tier-routing": {
    title: "Tier routing: the mental model that cuts scraping costs by 80%",
    date: "Apr 17, 2026", tag: "Patterns", read: "6 min",
    body: (
      <>
        <p>
          The default mistake when building a scraper is to start with a headless browser. It works on day one, looks
          smart, and turns out to be a budget bomb at scale.
        </p>
        <p>
          A headless Chrome session is roughly <strong>60×</strong> more expensive than a plain HTTP request — both in
          CPU and in proxy bandwidth. If you're paying $3.50/GB for residential IPs, every browser-rendered page is
          ~5MB instead of ~80KB. A 1M-page crawl is the difference between $280 and $17,000.
        </p>
        <h2>The route</h2>
        <p>
          Scrape's router starts every URL at the cheapest tier and only escalates when the response is actually
          blocked. In practice, ~80% of pages clear at Tier 0 (HTTP). Another ~15% pass Tier 1 (browser). Tier 2 (CAPTCHA)
          and Tier 3 (managed unblock) handle the long tail — usually under 5% combined.
        </p>
        <h2>Why this works</h2>
        <p>
          Most pages aren't actually protected. A Cloudflare badge in the corner doesn't mean every URL on that domain
          serves a challenge — usually only product detail pages, login flows, and pricing endpoints get the heavy
          treatment. Static catalogs, blog posts, and category pages return clean HTML to a real-Chrome TLS handshake.
        </p>
        <h2>Tuning the router</h2>
        <p>
          Cap <code>max_tier</code> per job to control your worst-case spend. If you set <code>max_tier=0</code> the
          scraper will fail rather than escalate; sometimes that's exactly what you want for a cheap survey crawl.
        </p>
      </>
    ),
  },
  "claude-extraction-prompt-cache": {
    title: "Schema-driven extraction with Claude — and a 90% prompt cache",
    date: "Apr 10, 2026", tag: "AI", read: "5 min",
    body: (
      <>
        <p>
          LLM extraction is the right answer when you're crawling many sites with a stable schema. Selectors break
          every time the source DOM changes; Claude reads the page semantically and fills your schema regardless.
        </p>
        <p>The problem: at $3 / 1M input tokens, naive LLM extraction at scale gets expensive fast.</p>
        <h2>The fix: prompt caching</h2>
        <p>
          Anthropic's prompt cache lets you tag stable parts of the prompt — system instructions, JSON schema — as
          ephemeral cache entries. The first call writes the cache (90% surcharge). Subsequent calls within the cache
          window pay 10× less for those tokens.
        </p>
        <CodeBlock lang="python" label="cached extraction" code={`msg = await client.messages.create(\n    model="claude-haiku-4-5-20251001",\n    system=[\n        {"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}},\n        {"type": "text", "text": json.dumps(SCHEMA), "cache_control": {"type": "ephemeral"}},\n    ],\n    messages=[{"role": "user", "content": markdown}],\n)`} />
        <h2>What we measured</h2>
        <p>
          On a 10,000-page product crawl: average input was 6,200 tokens, of which 5,800 were cacheable (system + schema).
          Cache hit rate after the first 50 pages: 99%. Total cost dropped from $186 to $19 — a 90% reduction.
        </p>
      </>
    ),
  },
  "ethical-scraping": {
    title: "Scraping ethically in 2026 (post-hiQ, post-AI Act)",
    date: "Apr 3, 2026", tag: "Compliance", read: "10 min",
    body: (
      <>
        <p>
          The legal landscape for web scraping has shifted twice in the last 18 months — once when the Ninth Circuit
          re-affirmed hiQ in 2025, and again when the EU AI Act's training-data transparency requirements took effect.
        </p>
        <h2>What didn't change</h2>
        <p>
          Public data is still public. The CFAA does not criminalize scraping pages that don't require authentication.
          Honoring robots.txt is still industry best practice but not a legal obligation in the US.
        </p>
        <h2>What did change</h2>
        <p>
          GDPR has been weaponized against scrapers more aggressively post-Clearview. If you collect personal data of
          EU residents — phone numbers, email addresses, social profiles — you need a documented lawful basis and a way
          for subjects to exercise erasure rights. Most scrapers fail this test.
        </p>
        <p>
          The EU AI Act's Article 53 requires "sufficiently detailed summary" of training data sources for general-purpose
          AI models. If your scraper feeds a model that's deployed in the EU, your sourcing has to be auditable end-to-end.
        </p>
        <h2>Defaults that ship the right way</h2>
        <ul>
          <li>Honor robots.txt by default; require explicit per-host opt-out</li>
          <li>Per-host rate limiting in the standard library, not optional</li>
          <li>No scraping behind auth or paywall — refuse the request</li>
          <li>Use only proxy providers with audited ethical sourcing</li>
        </ul>
      </>
    ),
  },
};

export function generateStaticParams() {
  return Object.keys(POSTS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = POSTS[slug];
  return p ? { title: p.title } : { title: "Post" };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = POSTS[slug];
  if (!post) notFound();
  return (
    <Section className="py-20">
      <div className="max-w-2xl mx-auto">
        <Link href="/blog" className="inline-flex items-center gap-2 small-caps text-muted hover:text-rust mb-8 transition-colors">
          <ArrowLeft className="h-3 w-3" /> All dispatches
        </Link>
        <div className="flex items-center gap-3 eyebrow text-muted mb-6">
          <span className="text-rust">{post.tag}</span>
          <span>·</span>
          <span>{post.date}</span>
          <span>·</span>
          <span>{post.read}</span>
        </div>
        <h1 className="display text-5xl md:text-7xl leading-[0.9]">{post.title}</h1>
        <article className="prose-doc mt-12">
          {post.body}
        </article>
        <div className="mt-20 border-t border-line pt-8 small-caps text-muted">
          Found this useful?{" "}
          <Link href="/register" className="text-rust underline underline-offset-4">Begin your dig →</Link>
        </div>
      </div>
    </Section>
  );
}
