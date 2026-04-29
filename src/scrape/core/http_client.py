"""Tier 0 HTTP client built on curl_cffi for real-browser TLS/HTTP2 fingerprints.

Why curl_cffi: it wraps curl-impersonate, which replays the *exact* TLS ClientHello
(JA3/JA4), HTTP/2 frame ordering, and ALPN sequence of a real Chrome/Firefox/Safari.
Plain httpx/requests reveal a Python TLS fingerprint in the first packet — instant
flag at any modern WAF.
"""
from __future__ import annotations

import random
import time
from collections.abc import Iterable
from typing import Any, cast

from curl_cffi.requests import AsyncSession
from curl_cffi.requests.exceptions import RequestException, Timeout

from scrape.logging import get_logger
from scrape.models import BlockReason, FetchRequest, FetchResult, Tier

log = get_logger(__name__)

# Curated rotation pool — recent stable browsers that curl-impersonate supports
# in 0.15.x. Mixing major versions across requests breaks naive fingerprint
# clustering done by WAFs that bucket by static JA3 hash.
_DEFAULT_IMPERSONATE_POOL: tuple[str, ...] = (
    "chrome131",
    "chrome124",
    "chrome120",
    "edge101",
    "safari17_0",
    "firefox133",
)

# Realistic Accept-* headers per browser family. curl_cffi sets browser-like
# defaults but we override Accept-Language to match a target locale.
_BASE_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}


class HttpClient:
    """Async HTTP client with rotated TLS fingerprints and proxy support.

    One instance per logical "user" (identity = proxy + fingerprint + cookie jar).
    Reuse the instance across requests to keep HTTP/2 connections warm and
    cookies aged — the WAF treats this as a continuous session.
    """

    def __init__(
        self,
        proxy: str | None = None,
        impersonate_pool: Iterable[str] = _DEFAULT_IMPERSONATE_POOL,
        timeout_s: int = 30,
        accept_language: str = "en-US,en;q=0.9",
        extra_headers: dict[str, str] | None = None,
    ) -> None:
        self._proxy = proxy
        self._pool = tuple(impersonate_pool)
        self._timeout_s = timeout_s
        self._headers = dict(_BASE_HEADERS)
        self._headers["Accept-Language"] = accept_language
        if extra_headers:
            self._headers.update(extra_headers)
        # Pin the impersonation per-instance so cookie jar + TLS fp stay coherent.
        # Anti-bots correlate cookies to TLS fp; switching mid-session is a giveaway.
        self._impersonate: str = random.choice(self._pool)
        self._session: AsyncSession | None = None

    @property
    def impersonate(self) -> str:
        return self._impersonate

    @property
    def proxy(self) -> str | None:
        return self._proxy

    async def __aenter__(self) -> HttpClient:
        self._session = AsyncSession(
            impersonate=cast(Any, self._impersonate),
            headers=self._headers,
            timeout=self._timeout_s,
            proxy=self._proxy,
            verify=True,
            allow_redirects=True,
            max_redirects=10,
        )
        return self

    async def __aexit__(self, *exc: Any) -> None:
        if self._session is not None:
            await self._session.close()
            self._session = None

    async def rotate_fingerprint(self) -> None:
        """Cycle to a new browser impersonation.

        Use sparingly — rotating mid-session can itself be a signal.
        Best used between distinct logical "users" or after a hard block.
        """
        old = self._impersonate
        choices = [b for b in self._pool if b != old]
        self._impersonate = random.choice(choices) if choices else old
        if self._session is not None:
            await self._session.close()
            self._session = None

    async def fetch(self, req: FetchRequest) -> FetchResult:
        if self._session is None:
            await self.__aenter__()
        assert self._session is not None
        url = str(req.url)
        merged_headers = {**self._headers, **req.headers}
        start = time.perf_counter()
        try:
            resp = await self._session.request(
                cast(Any, req.method),
                url,
                headers=merged_headers,
                data=req.body,
                cookies=req.cookies or None,
            )
            elapsed_ms = int((time.perf_counter() - start) * 1000)
            body = resp.content or b""
            return FetchResult(
                url=url,
                final_url=str(resp.url),
                status=resp.status_code,
                headers=dict(resp.headers),
                body=body,
                elapsed_ms=elapsed_ms,
                tier_used=Tier.HTTP,
                proxy_used=self._proxy,
                fingerprint_id=self._impersonate,
            )
        except Timeout:
            elapsed_ms = int((time.perf_counter() - start) * 1000)
            log.warning("http.timeout", url=url, elapsed_ms=elapsed_ms)
            return _failure(url, elapsed_ms, BlockReason.TIMEOUT, self._proxy, self._impersonate)
        except RequestException as e:
            elapsed_ms = int((time.perf_counter() - start) * 1000)
            log.warning("http.network_error", url=url, error=str(e))
            return _failure(url, elapsed_ms, BlockReason.NETWORK, self._proxy, self._impersonate)


def _failure(
    url: str, elapsed_ms: int, reason: BlockReason, proxy: str | None, fp: str
) -> FetchResult:
    return FetchResult(
        url=url,
        final_url=url,
        status=0,
        body=b"",
        elapsed_ms=elapsed_ms,
        tier_used=Tier.HTTP,
        proxy_used=proxy,
        fingerprint_id=fp,
        block_reason=reason,
    )
