"""Tests for the FlareSolverr unblock adapter and the build factory."""
from __future__ import annotations

from unittest.mock import patch

from scrape.core.unblock import FlareSolverrUnblock, build_unblock_provider
from scrape.models import BlockReason, FetchRequest, Tier


def test_factory_returns_none_when_disabled():
    assert build_unblock_provider("none", "http://localhost:8191") is None
    assert build_unblock_provider("flaresolverr", "") is None


def test_factory_builds_flaresolverr():
    p = build_unblock_provider("flaresolverr", "http://localhost:8191")
    assert p is not None
    assert p.name == "flaresolverr"


async def test_flaresolverr_success_returns_rendered_html():
    """A successful FlareSolverr call should produce a clean FetchResult."""
    fake_response = {
        "status": "ok",
        "solution": {
            "url": "https://example.com/",
            "status": 200,
            "response": "<html><body>hi</body></html>",
            "headers": {"Content-Type": "text/html"},
            "userAgent": "Mozilla/5.0 (FlareSolverr)",
        },
    }

    class _Client:
        async def __aenter__(self): return self
        async def __aexit__(self, *_): return False
        async def post(self, *_args, **_kwargs):
            class _Resp:
                def raise_for_status(self): pass
                def json(self): return fake_response
            return _Resp()

    with patch("scrape.core.unblock.httpx.AsyncClient", return_value=_Client()):
        adapter = FlareSolverrUnblock(endpoint="http://flaresolverr:8191")
        result = await adapter.fetch(FetchRequest(url="https://example.com/"))

    assert result.status == 200
    assert result.tier_used == Tier.UNBLOCK
    assert result.body == b"<html><body>hi</body></html>"
    assert result.fingerprint_id.startswith("Mozilla/5.0")
    assert result.block_reason == BlockReason.NONE


async def test_flaresolverr_solver_error_returns_blocked_result():
    fake_response = {"status": "error", "message": "Unable to bypass"}

    class _Client:
        async def __aenter__(self): return self
        async def __aexit__(self, *_): return False
        async def post(self, *_args, **_kwargs):
            class _Resp:
                def raise_for_status(self): pass
                def json(self): return fake_response
            return _Resp()

    with patch("scrape.core.unblock.httpx.AsyncClient", return_value=_Client()):
        adapter = FlareSolverrUnblock(endpoint="http://flaresolverr:8191")
        result = await adapter.fetch(FetchRequest(url="https://example.com/"))

    assert result.status == 0
    assert result.body == b""
    assert result.block_reason == BlockReason.STATUS_4XX


async def test_flaresolverr_network_error_returns_network_block():
    import httpx

    class _Client:
        async def __aenter__(self): return self
        async def __aexit__(self, *_): return False
        async def post(self, *_args, **_kwargs):
            raise httpx.ConnectError("refused")

    with patch("scrape.core.unblock.httpx.AsyncClient", return_value=_Client()):
        adapter = FlareSolverrUnblock(endpoint="http://flaresolverr:8191")
        result = await adapter.fetch(FetchRequest(url="https://example.com/"))

    assert result.block_reason == BlockReason.NETWORK
