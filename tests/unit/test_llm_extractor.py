"""Tests for the LLM extractor abstraction.

Hits the OllamaExtractor against a mocked HTTP server (no real model needed).
The Anthropic path is exercised end-to-end in the existing API integration tests.
"""
from __future__ import annotations

import json
from unittest.mock import patch

from scrape.extractors.llm_schema import (
    OllamaExtractor,
    OpenRouterExtractor,
    _parse_json_blob,
    build_extractor,
)


def test_factory_none_when_backend_none(monkeypatch):
    monkeypatch.setenv("LLM_BACKEND", "none")
    from scrape import config as cfg_mod
    cfg_mod._settings = None
    assert build_extractor() is None


def test_factory_default_is_openrouter_when_key_set(monkeypatch):
    # No LLM_BACKEND override → should fall through to the openrouter default.
    monkeypatch.delenv("LLM_BACKEND", raising=False)
    monkeypatch.setenv("OPENROUTER_API_KEY", "or-test-key")
    from scrape import config as cfg_mod
    cfg_mod._settings = None
    extractor = build_extractor()
    assert extractor is not None
    assert extractor.backend == "openrouter"


def test_factory_openrouter_skipped_without_key(monkeypatch):
    monkeypatch.setenv("LLM_BACKEND", "openrouter")
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    from scrape import config as cfg_mod
    cfg_mod._settings = None
    assert build_extractor() is None


def test_factory_auto_prefers_openrouter_over_anthropic(monkeypatch):
    monkeypatch.setenv("LLM_BACKEND", "auto")
    monkeypatch.setenv("OPENROUTER_API_KEY", "or-test")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test")
    from scrape import config as cfg_mod
    cfg_mod._settings = None
    extractor = build_extractor()
    assert extractor is not None
    assert extractor.backend == "openrouter"


def test_factory_returns_anthropic_when_configured(monkeypatch):
    monkeypatch.setenv("LLM_BACKEND", "anthropic")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test-key-12345")
    from scrape import config as cfg_mod
    cfg_mod._settings = None
    extractor = build_extractor()
    assert extractor is not None
    assert extractor.backend == "anthropic"


def test_factory_returns_ollama_when_set(monkeypatch):
    monkeypatch.setenv("LLM_BACKEND", "ollama")
    from scrape import config as cfg_mod
    cfg_mod._settings = None
    extractor = build_extractor()
    assert extractor is not None
    assert extractor.backend == "ollama"


def test_parse_json_strips_fences():
    assert _parse_json_blob('```json\n{"a": 1}\n```', "u") == {"a": 1}
    assert _parse_json_blob('```\n{"a": 1}\n```', "u") == {"a": 1}
    assert _parse_json_blob('{"a": 1}', "u") == {"a": 1}


def test_parse_json_falls_back_on_invalid():
    out = _parse_json_blob("not json", "u")
    assert "_raw" in out and "_parse_error" in out


async def test_ollama_extracts_clean_json():
    fake_body = {"message": {"content": json.dumps({"title": "Sapiens", "price": 24.99})}}

    class _Client:
        async def __aenter__(self): return self
        async def __aexit__(self, *_): return False
        async def post(self, *_args, **_kwargs):
            class _Resp:
                def raise_for_status(self): pass
                def json(self): return fake_body
            return _Resp()

    with patch("scrape.extractors.llm_schema.httpx.AsyncClient", return_value=_Client()):
        ex = OllamaExtractor(base_url="http://localhost:11434", model="qwen2.5:7b")
        record = await ex.extract(
            html="<html><body><h1>Sapiens</h1><p>$24.99</p></body></html>",
            url="https://example.com/p",
            schema_name="product",
            schema={"type": "object", "properties": {"title": {}, "price": {}}, "required": ["title", "price"]},
        )

    assert record.data == {"title": "Sapiens", "price": 24.99}
    # Required-field-completeness used as confidence proxy
    assert record.confidence == 1.0
    assert record.schema_name == "product"


async def test_openrouter_extracts_clean_json():
    fake_body = {
        "choices": [
            {"message": {"content": json.dumps({"title": "Sapiens", "price": 24.99})}}
        ]
    }

    class _Client:
        async def __aenter__(self): return self
        async def __aexit__(self, *_): return False
        async def post(self, *_args, **_kwargs):
            class _Resp:
                def raise_for_status(self): pass
                def json(self): return fake_body
            return _Resp()

    with patch("scrape.extractors.llm_schema.httpx.AsyncClient", return_value=_Client()):
        ex = OpenRouterExtractor(api_key="or-test", model="anthropic/claude-haiku-4.5")
        record = await ex.extract(
            html="<html><body><h1>Sapiens</h1><p>$24.99</p></body></html>",
            url="https://example.com/p",
            schema_name="product",
            schema={"type": "object", "properties": {"title": {}, "price": {}}, "required": ["title", "price"]},
        )

    assert record.data == {"title": "Sapiens", "price": 24.99}
    assert record.confidence == 1.0
    assert record.schema_name == "product"


async def test_openrouter_http_error_returns_low_confidence_record():
    import httpx

    class _Client:
        async def __aenter__(self): return self
        async def __aexit__(self, *_): return False
        async def post(self, *_args, **_kwargs):
            raise httpx.ConnectError("openrouter unreachable")

    with patch("scrape.extractors.llm_schema.httpx.AsyncClient", return_value=_Client()):
        ex = OpenRouterExtractor(api_key="or-test")
        record = await ex.extract(
            html="<html></html>", url="https://x", schema_name="product",
            schema={"type": "object"},
        )

    assert record.confidence == 0.0
    assert "_error" in record.data


async def test_ollama_handles_partial_extraction():
    fake_body = {"message": {"content": json.dumps({"title": "Sapiens", "price": None})}}

    class _Client:
        async def __aenter__(self): return self
        async def __aexit__(self, *_): return False
        async def post(self, *_args, **_kwargs):
            class _Resp:
                def raise_for_status(self): pass
                def json(self): return fake_body
            return _Resp()

    with patch("scrape.extractors.llm_schema.httpx.AsyncClient", return_value=_Client()):
        ex = OllamaExtractor()
        record = await ex.extract(
            html="<html></html>",
            url="https://x",
            schema_name="product",
            schema={"type": "object", "required": ["title", "price"]},
        )

    # 1/2 required fields present
    assert record.confidence == 0.5


async def test_ollama_http_error_returns_low_confidence_record():
    import httpx

    class _Client:
        async def __aenter__(self): return self
        async def __aexit__(self, *_): return False
        async def post(self, *_args, **_kwargs):
            raise httpx.ConnectError("ollama unreachable")

    with patch("scrape.extractors.llm_schema.httpx.AsyncClient", return_value=_Client()):
        ex = OllamaExtractor()
        record = await ex.extract(
            html="<html></html>", url="https://x", schema_name="product",
            schema={"type": "object"},
        )

    assert record.confidence == 0.0
    assert "_error" in record.data
