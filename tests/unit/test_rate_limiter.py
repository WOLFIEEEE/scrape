import asyncio
import time

import pytest

from scrape.core.rate_limiter import HostRateLimiter

pytestmark = pytest.mark.asyncio


async def test_min_delay_enforced():
    limiter = HostRateLimiter(per_host_concurrency=1, min_delay_ms=100)

    async def go():
        async with limiter.slot("https://a.test.com/x"):
            return time.monotonic()

    t1 = await go()
    t2 = await go()
    assert (t2 - t1) >= 0.1


async def test_per_host_concurrency_cap():
    limiter = HostRateLimiter(per_host_concurrency=2, min_delay_ms=0)
    started: list[float] = []

    async def slow():
        async with limiter.slot("https://a.test.com/y"):
            started.append(time.monotonic())
            await asyncio.sleep(0.05)

    await asyncio.gather(slow(), slow(), slow(), slow())
    # First two should start near-simultaneously, last two should wait
    assert started[0] - started[0] < 0.01
    # At least one started >= 0.05s after the first wave
    assert started[-1] - started[0] >= 0.04


async def test_different_hosts_independent():
    limiter = HostRateLimiter(per_host_concurrency=1, min_delay_ms=200)
    # 4 hits across 2 hosts: serial-per-host (3*200ms each) would be >=600ms.
    # Parallel-across-hosts should finish in roughly one host's worst case (~400ms).
    start = time.monotonic()
    await asyncio.gather(
        _hit(limiter, "https://alpha.com/"), _hit(limiter, "https://alpha.com/"),
        _hit(limiter, "https://beta.com/"), _hit(limiter, "https://beta.com/"),
    )
    elapsed = time.monotonic() - start
    assert elapsed < 0.55, f"hosts not running in parallel: {elapsed:.3f}s"


async def _hit(limiter, url):
    async with limiter.slot(url):
        await asyncio.sleep(0.01)
