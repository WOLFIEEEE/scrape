"""Per-host concurrency cap + min-delay rate limiter.

Two enforcement layers:
- Semaphore per host (bounds simultaneous in-flight requests)
- Min delay per host (smooths burst traffic)

Both are essential. Concurrent requests with no delay is what trips
rate-based bot heuristics — even if each request looks human.
"""
from __future__ import annotations

import asyncio
import time
from collections import defaultdict
from contextlib import asynccontextmanager

import tldextract


def _host(url: str) -> str:
    parts = tldextract.extract(url)
    if parts.suffix:
        return f"{parts.domain}.{parts.suffix}".lower()
    # Reserved/invalid TLD (e.g. .example, .test, IPs): fall back to FQDN
    # so we still scope correctly instead of collapsing every weird host.
    fqdn = parts.fqdn or f"{parts.subdomain}.{parts.domain}".strip(".")
    return fqdn.lower() or url.lower()


class HostRateLimiter:
    def __init__(self, per_host_concurrency: int = 2, min_delay_ms: int = 500):
        self._cap = per_host_concurrency
        self._delay_s = min_delay_ms / 1000.0
        self._sems: dict[str, asyncio.Semaphore] = defaultdict(
            lambda: asyncio.Semaphore(self._cap)
        )
        self._last_request: dict[str, float] = defaultdict(float)
        self._locks: dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)

    @asynccontextmanager
    async def slot(self, url: str):
        host = _host(url)
        sem = self._sems[host]
        async with sem:
            async with self._locks[host]:
                # Honour min delay since last *start* — prevents thundering herd
                last = self._last_request[host]
                gap = time.monotonic() - last
                if gap < self._delay_s:
                    await asyncio.sleep(self._delay_s - gap)
                self._last_request[host] = time.monotonic()
            yield
