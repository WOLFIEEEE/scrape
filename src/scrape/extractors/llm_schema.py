"""Schema-driven LLM extractor with prompt caching.

Pattern:
  1. HTML -> Markdown (cheap, deterministic)
  2. Send Markdown + JSON schema to Claude with a *cacheable* system prompt
  3. Parse structured JSON output

Why caching: the system prompt + schema are stable per crawl job — caching
slashes per-page cost ~90% with prompt caching enabled.
"""
from __future__ import annotations

import json
from typing import Any

from anthropic import AsyncAnthropic

from scrape.config import get_settings
from scrape.extractors.markdown import html_to_markdown
from scrape.logging import get_logger
from scrape.models import ExtractedRecord

log = get_logger(__name__)


_SYSTEM_PROMPT = """\
You extract structured data from web page Markdown.

Rules:
- Output exactly one JSON object that conforms to the provided schema.
- Use null for missing fields. Never invent data.
- Strings: trim whitespace, decode entities, never include surrounding quotes.
- Numbers: strip currency/units unless the schema asks for the unit.
- Dates: ISO 8601 (YYYY-MM-DD) when possible.
- If the page is not the expected content type, return all-null.
"""


class LLMExtractor:
    def __init__(self, api_key: str | None = None, model: str | None = None):
        cfg = get_settings()
        key = api_key or cfg.llm.api_key
        if not key:
            raise RuntimeError(
                "Anthropic API key not configured (ANTHROPIC_API_KEY). "
                "LLM extraction is disabled until set."
            )
        self._client = AsyncAnthropic(api_key=key)
        self._model = model or cfg.llm.model_fast

    async def extract(
        self,
        html: str | bytes,
        url: str,
        schema_name: str,
        schema: dict[str, Any],
    ) -> ExtractedRecord:
        markdown = html_to_markdown(html, base_url=url)
        # Trim if huge — model context is finite and signal-to-noise drops
        if len(markdown) > 60_000:
            markdown = markdown[:60_000]

        # System prompt + schema marked cacheable: stable across pages of the
        # same crawl job. Per-message content is the only thing we pay for fully.
        msg = await self._client.messages.create(
            model=self._model,
            max_tokens=2048,
            system=[
                {
                    "type": "text",
                    "text": _SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                },
                {
                    "type": "text",
                    "text": f"Schema name: {schema_name}\nJSON Schema:\n{json.dumps(schema, indent=2)}",
                    "cache_control": {"type": "ephemeral"},
                },
            ],
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": f"URL: {url}"},
                        {"type": "text", "text": f"Markdown:\n{markdown}"},
                        {
                            "type": "text",
                            "text": "Return ONLY the JSON object, no prose, no markdown fences.",
                        },
                    ],
                }
            ],
        )

        text = "".join(b.text for b in msg.content if hasattr(b, "text")).strip()
        # Strip optional ```json fences if model wraps despite instructions
        if text.startswith("```"):
            text = text.strip("`")
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()
        try:
            data = json.loads(text)
        except json.JSONDecodeError as e:
            log.warning("llm.parse_failed", url=url, error=str(e), preview=text[:200])
            data = {"_raw": text, "_parse_error": str(e)}

        # Confidence proxy from cache hit ratio (cached calls ≈ stable schema, less variance)
        cached = getattr(msg.usage, "cache_read_input_tokens", 0) or 0
        total_in = msg.usage.input_tokens or 1
        confidence = round(min(1.0, 0.6 + (cached / total_in) * 0.4), 3)

        return ExtractedRecord(
            url=url,
            schema_name=schema_name,
            data=data,
            confidence=confidence,
        )
