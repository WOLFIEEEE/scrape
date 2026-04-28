"""HTML -> clean Markdown using selectolax (fast lexbor backend).

We don't pull crawl4ai as a hard dep — it brings playwright+chromium just for
parsing. Selectolax + a small heuristic gives 90% of the cleanliness for
LLM consumption with zero binary deps.
"""
from __future__ import annotations

import re
from urllib.parse import urljoin

from selectolax.parser import HTMLParser, Node

# Tags that contribute nothing for content extraction
_DROP_TAGS = (
    "script", "style", "noscript", "iframe", "svg", "canvas",
    "header", "footer", "nav", "aside", "form", "button",
)
# Convert these inline tags to whitespace-padded text
_INLINE_BREAK = re.compile(r"\s+")


def _node_text(n: Node) -> str:
    return _INLINE_BREAK.sub(" ", n.text(separator=" ", deep=True, strip=True)).strip()


def _walk(node: Node, base_url: str, out: list[str]) -> None:
    tag = node.tag
    if tag in _DROP_TAGS:
        return

    if tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
        level = int(tag[1])
        text = _node_text(node)
        if text:
            out.append(f"{'#' * level} {text}\n")
        return

    if tag == "li":
        text = _node_text(node)
        if text:
            out.append(f"- {text}")
        return

    if tag in ("p", "blockquote", "pre"):
        text = _node_text(node)
        if text:
            prefix = "> " if tag == "blockquote" else ""
            wrap = "```" if tag == "pre" else ""
            out.append(f"{wrap}\n{prefix}{text}\n{wrap}".strip())
        return

    if tag == "a":
        href = node.attributes.get("href")
        text = _node_text(node)
        if href and text:
            absolute = urljoin(base_url, href)
            out.append(f"[{text}]({absolute})")
        elif text:
            out.append(text)
        return

    if tag == "img":
        src = node.attributes.get("src")
        alt = (node.attributes.get("alt") or "").strip()
        if src:
            out.append(f"![{alt}]({urljoin(base_url, src)})")
        return

    for child in node.iter():
        _walk(child, base_url, out)


def html_to_markdown(html: str | bytes, base_url: str = "") -> str:
    if isinstance(html, bytes):
        html = html.decode("utf-8", errors="replace")
    tree = HTMLParser(html)
    body = tree.body or tree.root
    if body is None:
        return ""
    out: list[str] = []
    _walk(body, base_url, out)
    text = "\n\n".join(s for s in out if s)
    # Collapse 3+ newlines into 2
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def extract_title(html: str | bytes) -> str:
    if isinstance(html, bytes):
        html = html.decode("utf-8", errors="replace")
    tree = HTMLParser(html)
    if tree.head:
        t = tree.head.css_first("title")
        if t:
            return t.text(strip=True)
    return ""


def extract_metadata(html: str | bytes) -> dict[str, str]:
    if isinstance(html, bytes):
        html = html.decode("utf-8", errors="replace")
    tree = HTMLParser(html)
    meta: dict[str, str] = {}
    if not tree.head:
        return meta
    for tag in tree.head.css("meta"):
        name = tag.attributes.get("name") or tag.attributes.get("property")
        content = tag.attributes.get("content")
        if name and content:
            meta[name.lower()] = content
    return meta
