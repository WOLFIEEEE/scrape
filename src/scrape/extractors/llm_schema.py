"""Schema-driven LLM extractor.

Three backends behind one interface:
  - OpenRouter (paid, hosted) — OpenAI-compatible gateway over hundreds of
    models. Default backend.
  - Anthropic Claude (paid, hosted) — supports prompt caching for ~90% input
    token savings across a crawl job.
  - Ollama (free, self-hosted) — runs Qwen / Llama / NuExtract / etc. locally
    with a forced JSON output mode. Same `extract()` signature.

Backend selection is config-driven via `LLM_BACKEND=openrouter|anthropic|ollama`.
With `auto`, OpenRouter wins if its key is set, then Anthropic, else Ollama.
"""
from __future__ import annotations

import json
from typing import Any, Protocol

import httpx

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


# ----------------------------------------------------------------------------
# Public protocol
# ----------------------------------------------------------------------------

class SchemaExtractor(Protocol):
    backend: str

    async def extract(
        self,
        html: str | bytes,
        url: str,
        schema_name: str,
        schema: dict[str, Any],
    ) -> ExtractedRecord: ...


# ----------------------------------------------------------------------------
# Anthropic implementation
# ----------------------------------------------------------------------------

class AnthropicExtractor:
    backend = "anthropic"

    def __init__(self, api_key: str | None = None, model: str | None = None):
        from anthropic import AsyncAnthropic  # local import: optional dep
        cfg = get_settings()
        key = api_key or cfg.llm.api_key
        if not key:
            raise RuntimeError(
                "Anthropic API key not configured (ANTHROPIC_API_KEY). "
                "Set LLM_BACKEND=ollama for self-hosted extraction."
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
        if len(markdown) > 60_000:
            markdown = markdown[:60_000]

        msg = await self._client.messages.create(
            model=self._model,
            max_tokens=2048,
            system=[
                {"type": "text", "text": _SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}},
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
                        {"type": "text", "text": "Return ONLY the JSON object, no prose, no fences."},
                    ],
                }
            ],
        )
        text = "".join(b.text for b in msg.content if hasattr(b, "text")).strip()
        data = _parse_json_blob(text, url)

        # Confidence proxy — high cache hit ratio means stable schema.
        cached = getattr(msg.usage, "cache_read_input_tokens", 0) or 0
        total_in = msg.usage.input_tokens or 1
        confidence = round(min(1.0, 0.6 + (cached / total_in) * 0.4), 3)
        return ExtractedRecord(url=url, schema_name=schema_name, data=data, confidence=confidence)


# ----------------------------------------------------------------------------
# OpenRouter implementation (OpenAI-compatible gateway)
# ----------------------------------------------------------------------------

class OpenRouterExtractor:
    """Talks to OpenRouter's OpenAI-compatible chat-completions endpoint.

    Forces JSON output via `response_format={"type": "json_object"}`. Most
    OpenRouter-hosted models (OpenAI, Anthropic, Google, Mistral, …) honor it;
    those that don't will still emit JSON-shaped output most of the time and
    we fall back to lenient parsing.
    """

    backend = "openrouter"

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        base_url: str | None = None,
        timeout_s: int = 120,
    ):
        cfg = get_settings()
        key = api_key or cfg.llm.openrouter_api_key
        if not key:
            raise RuntimeError(
                "OpenRouter API key not configured (OPENROUTER_API_KEY). "
                "Set LLM_BACKEND=ollama for self-hosted extraction."
            )
        self._api_key = key
        self._model = model or cfg.llm.openrouter_model
        self._base = (base_url or cfg.llm.openrouter_base_url).rstrip("/")
        self._referer = cfg.llm.openrouter_referer
        self._title = cfg.llm.openrouter_app_title
        self._timeout = timeout_s

    async def extract(
        self,
        html: str | bytes,
        url: str,
        schema_name: str,
        schema: dict[str, Any],
    ) -> ExtractedRecord:
        markdown = html_to_markdown(html, base_url=url)
        if len(markdown) > 60_000:
            markdown = markdown[:60_000]

        user_prompt = (
            f"URL: {url}\n"
            f"Schema name: {schema_name}\n"
            f"JSON Schema:\n{json.dumps(schema, indent=2)}\n\n"
            f"Page (Markdown):\n{markdown}\n\n"
            "Return ONLY the JSON object, no prose, no fences."
        )

        payload = {
            "model": self._model,
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
        }
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        if self._referer:
            headers["HTTP-Referer"] = self._referer
        if self._title:
            headers["X-Title"] = self._title

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.post(
                    f"{self._base}/chat/completions",
                    json=payload,
                    headers=headers,
                )
                resp.raise_for_status()
                body = resp.json()
        except httpx.HTTPError as e:
            log.warning("openrouter.http_error", url=url, error=str(e))
            return ExtractedRecord(
                url=url, schema_name=schema_name,
                data={"_error": f"openrouter: {e}"}, confidence=0.0,
            )

        choices = body.get("choices") or []
        text = ""
        if choices:
            text = ((choices[0].get("message") or {}).get("content") or "").strip()
        data = _parse_json_blob(text, url)

        # Required-field-completeness as confidence proxy (matches Ollama path).
        required = (schema or {}).get("required") or []
        if required and isinstance(data, dict):
            present = sum(1 for k in required if data.get(k) is not None)
            confidence = round(present / max(len(required), 1), 3)
        else:
            confidence = 0.7

        return ExtractedRecord(url=url, schema_name=schema_name, data=data, confidence=confidence)


# ----------------------------------------------------------------------------
# Ollama implementation (self-hosted)
# ----------------------------------------------------------------------------

class OllamaExtractor:
    """Talks to a local Ollama server (`ollama serve`) over HTTP.

    Uses Ollama's JSON output mode (`format: "json"`) which constrains the
    model to emit valid JSON. Works with any JSON-capable model:
    `qwen2.5:7b`, `llama3.1:8b`, `phi3.5:3.8b`, `numind/nuextract-2:7b`, etc.
    """

    backend = "ollama"

    def __init__(self, base_url: str | None = None, model: str | None = None, timeout_s: int = 120):
        cfg = get_settings()
        self._base = (base_url or cfg.llm.ollama_url).rstrip("/")
        self._model = model or cfg.llm.ollama_model
        self._timeout = timeout_s

    async def extract(
        self,
        html: str | bytes,
        url: str,
        schema_name: str,
        schema: dict[str, Any],
    ) -> ExtractedRecord:
        markdown = html_to_markdown(html, base_url=url)
        # Local models have shorter context; trim more aggressively
        if len(markdown) > 24_000:
            markdown = markdown[:24_000]

        user_prompt = (
            f"URL: {url}\n"
            f"Schema name: {schema_name}\n"
            f"JSON Schema:\n{json.dumps(schema, indent=2)}\n\n"
            f"Page (Markdown):\n{markdown}\n\n"
            "Return ONLY the JSON object."
        )

        payload = {
            "model": self._model,
            "stream": False,
            "format": "json",
            "messages": [
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            "options": {"temperature": 0.1, "num_ctx": 32_000},
        }

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.post(f"{self._base}/api/chat", json=payload)
                resp.raise_for_status()
                body = resp.json()
        except httpx.HTTPError as e:
            log.warning("ollama.http_error", url=url, error=str(e))
            return ExtractedRecord(
                url=url, schema_name=schema_name,
                data={"_error": f"ollama: {e}"}, confidence=0.0,
            )

        text = (body.get("message") or {}).get("content", "").strip()
        data = _parse_json_blob(text, url)

        # Crude confidence — count non-null fields vs schema 'required'
        required = (schema or {}).get("required") or []
        if required and isinstance(data, dict):
            present = sum(1 for k in required if data.get(k) is not None)
            confidence = round(present / max(len(required), 1), 3)
        else:
            confidence = 0.7

        return ExtractedRecord(url=url, schema_name=schema_name, data=data, confidence=confidence)


# ----------------------------------------------------------------------------
# Factory
# ----------------------------------------------------------------------------

def build_extractor() -> SchemaExtractor | None:
    """Return a configured extractor, or None when no backend is set up."""
    cfg = get_settings()
    backend = cfg.llm.backend.lower()

    if backend == "openrouter":
        if not cfg.llm.openrouter_api_key:
            log.warning("llm.skipped", reason="openrouter_key_missing")
            return None
        return OpenRouterExtractor()
    if backend == "ollama":
        return OllamaExtractor()
    if backend == "anthropic":
        if not cfg.llm.api_key:
            log.warning("llm.skipped", reason="anthropic_key_missing")
            return None
        return AnthropicExtractor()
    if backend == "auto":
        if cfg.llm.openrouter_api_key:
            return OpenRouterExtractor()
        if cfg.llm.api_key:
            return AnthropicExtractor()
        return OllamaExtractor()
    return None


# Backwards-compat alias for older callers.
LLMExtractor = AnthropicExtractor


# ----------------------------------------------------------------------------
# JSON parsing helper
# ----------------------------------------------------------------------------

def _parse_json_blob(text: str, url: str) -> dict[str, Any]:
    """Strip ```json fences, parse, fall back gracefully on bad output."""
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        log.warning("llm.parse_failed", url=url, error=str(e), preview=text[:200])
        return {"_raw": text, "_parse_error": str(e)}
