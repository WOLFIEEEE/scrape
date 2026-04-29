"""Tests for the commercial Tier-3 adapters (Bright Data, Scrapfly)."""
from __future__ import annotations

import json
from unittest.mock import AsyncMock, patch

import pytest

from scrape.core.unblock import (
    BrightDataUnblock,
    ScrapflyUnblock,
    build_unblock_provider,
)
from scrape.models import FetchRequest


def test_brightdata_requires_api_key():
    with pytest.raises(ValueError):
        BrightDataUnblock(api_key="")


def test_scrapfly_requires_api_key():
    with pytest.raises(ValueError):
        ScrapflyUnblock(api_key="")


def test_build_provider_brightdata_missing_key_returns_none():
    p = build_unblock_provider(provider="brightdata", endpoint="", brightdata_api_key="")
    assert p is None


def test_build_provider_scrapfly_missing_key_returns_none():
    p = build_unblock_provider(provider="scrapfly", endpoint="", scrapfly_api_key="")
    assert p is None


def test_build_provider_brightdata_with_key():
    p = build_unblock_provider(
        provider="brightdata", endpoint="", brightdata_api_key="bd-test-key",
    )
    assert isinstance(p, BrightDataUnblock)


def test_build_provider_scrapfly_with_key():
    p = build_unblock_provider(
        provider="scrapfly", endpoint="", scrapfly_api_key="sp-test-key",
    )
    assert isinstance(p, ScrapflyUnblock)


@pytest.mark.asyncio
async def test_brightdata_fetch_records_solver_cost():
    p = BrightDataUnblock(api_key="bd-test-key")

    class _Resp:
        def __init__(self, status: int, content: bytes, headers: dict):
            self.status_code = status
            self.content = content
            self.headers = headers
            self.text = content.decode()

    mock_resp = _Resp(200, b"<html>real content</html>", {"x-final-url": "https://target/", "x-brd-cost-usd": "0.0042"})
    with patch("scrape.core.unblock.httpx.AsyncClient") as mock_client_cls:
        client = AsyncMock()
        client.__aenter__.return_value = client
        client.__aexit__.return_value = False
        client.post.return_value = mock_resp
        mock_client_cls.return_value = client
        result = await p.fetch(FetchRequest.model_validate({"url": "https://target/"}))
    assert result.status == 200
    assert result.body == b"<html>real content</html>"
    assert result.solver_cost_usd == pytest.approx(0.0042)
    assert result.tier_used.value == 3
    assert result.proxy_used == "brightdata"


@pytest.mark.asyncio
async def test_scrapfly_fetch_unwraps_json_envelope():
    p = ScrapflyUnblock(api_key="sp-test-key")
    envelope = {
        "result": {
            "content": "<html>hello</html>",
            "status_code": 200,
            "url": "https://target/canonical",
            "cost": 12,
        }
    }

    class _Resp:
        def __init__(self):
            self.status_code = 200
            self.text = json.dumps(envelope)
        def json(self):
            return envelope

    with patch("scrape.core.unblock.httpx.AsyncClient") as mock_client_cls:
        client = AsyncMock()
        client.__aenter__.return_value = client
        client.__aexit__.return_value = False
        client.get.return_value = _Resp()
        mock_client_cls.return_value = client
        result = await p.fetch(FetchRequest.model_validate({"url": "https://target/"}))
    assert result.status == 200
    assert result.body == b"<html>hello</html>"
    assert result.final_url == "https://target/canonical"
    assert result.solver_cost_usd > 0
    assert result.proxy_used == "scrapfly"
