// Tiny wrapper for emitting application/ld+json structured data. Google's
// crawler reads JSON-LD from script tags in the HTML body, so we render it
// inline rather than going through next/script (which adds runtime overhead
// for what is really a static blob).
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // The data must be JSON-stringified — we own the input shape, no XSS
      // surface here. dangerouslySetInnerHTML is the canonical pattern for
      // structured data in Next.js App Router (per next.js docs).
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
