"""Per-site CSS-based extractors. Used when schema is known and stable.

Define new extractors as `def extract(html: str | bytes, url: str) -> dict[str, Any]`
and register in `SELECTOR_REGISTRY` keyed by host suffix (e.g. 'books.toscrape.com').

The orchestrator prefers a registered selector over LLM extraction — it's
~100× cheaper and more reliable when the DOM structure is stable.
"""
from __future__ import annotations

from collections.abc import Callable
from typing import Any

from selectolax.parser import HTMLParser

ExtractorFn = Callable[[str | bytes, str], dict[str, Any]]


def _book_extractor(html: str | bytes, url: str) -> dict[str, Any]:
    """Demo extractor for books.toscrape.com — used in integration tests."""
    if isinstance(html, bytes):
        html = html.decode("utf-8", errors="replace")
    tree = HTMLParser(html)

    title_el = tree.css_first("div.product_main h1")
    price_el = tree.css_first("p.price_color")
    avail_el = tree.css_first("p.availability")
    desc_el = tree.css_first("#product_description ~ p")

    def _shallow(node) -> str | None:
        # selectolax .text() walks descendants AND prepends "more" link text twice;
        # use deep=False to take only direct text nodes for leaf-y elements.
        if node is None:
            return None
        return node.text(deep=False, strip=True) or node.text(strip=True)

    return {
        "url": url,
        "title": _shallow(title_el),
        "price": _shallow(price_el),
        "availability": _shallow(avail_el),
        "description": _shallow(desc_el),
    }


SELECTOR_REGISTRY: dict[str, ExtractorFn] = {
    "books.toscrape.com": _book_extractor,
}


def find_extractor(host: str) -> ExtractorFn | None:
    """Match by exact host or longest-suffix; lets registry use FQDN keys
    while callers pass either the FQDN or the eTLD+1."""
    h = host.lower()
    direct = SELECTOR_REGISTRY.get(h)
    if direct:
        return direct
    # Suffix match: registry "books.toscrape.com" matches host "toscrape.com"
    # only via the reverse: registry key endswith host. Pick longest match.
    candidates = [(k, v) for k, v in SELECTOR_REGISTRY.items() if k == h or k.endswith("." + h) or h.endswith("." + k)]
    if not candidates:
        return None
    candidates.sort(key=lambda kv: -len(kv[0]))
    return candidates[0][1]
