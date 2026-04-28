import pytest

from scrape.core.robots import RobotsCache

pytestmark = pytest.mark.asyncio


async def test_invalid_url_blocked():
    cache = RobotsCache()
    assert await cache.allowed("not a url") is False


async def test_caches_per_origin(monkeypatch):
    # Patch _load to count invocations
    cache = RobotsCache()
    calls = {"n": 0}

    async def fake_load(origin):
        import urllib.robotparser
        calls["n"] += 1
        rp = urllib.robotparser.RobotFileParser()
        rp.parse([])
        return rp

    monkeypatch.setattr(cache, "_load", fake_load)
    await cache.allowed("https://example.com/x")
    await cache.allowed("https://example.com/y")
    assert calls["n"] == 1  # cached on second call
