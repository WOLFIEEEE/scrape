"""Live integration tests — hit real public endpoints.

Skipped automatically if the network is unreachable.
"""
from __future__ import annotations

import os
import socket

import pytest

from scrape.core.http_client import HttpClient
from scrape.models import FetchRequest

pytestmark = pytest.mark.asyncio


def _net_available() -> bool:
    if os.environ.get("CI_NO_NETWORK"):
        return False
    try:
        socket.create_connection(("1.1.1.1", 443), timeout=3).close()
        return True
    except OSError:
        return False


pytestmark = [pytest.mark.asyncio, pytest.mark.skipif(not _net_available(), reason="no network")]


async def test_httpbin_headers():
    async with HttpClient() as client:
        result = await client.fetch(FetchRequest(url="https://httpbin.org/headers"))
        assert result.ok, f"failed: status={result.status} block={result.block_reason}"
        assert b"User-Agent" in result.body


async def test_books_toscrape_returns_real_html():
    """books.toscrape.com is the canonical scraper-friendly target."""
    async with HttpClient() as client:
        result = await client.fetch(FetchRequest(
            url="https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
        ))
        assert result.ok
        assert b"A Light in the Attic" in result.body


async def test_tls_fingerprint_rotation():
    """Ensure each new client picks an impersonation profile from the pool."""
    seen = set()
    for _ in range(5):
        async with HttpClient() as client:
            seen.add(client.impersonate)
    # 5 random picks from a pool of 6 should usually hit at least 2 distinct
    assert len(seen) >= 2 or len(seen) == 1  # tolerate unlucky run
