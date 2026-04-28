"""Tier-3 unblock providers — last-resort managed bypass.

The `UnblockProvider` Protocol is in `tier_router.py`. Concrete adapters live
here so we don't bloat the router file.

Currently shipped:
  - **FlareSolverrUnblock** — open-source self-hosted Cloudflare bypass via
    a `flaresolverr/flaresolverr` Docker container. Free, no API key.
  - **NullUnblock** — explicit no-op when no provider is configured.

Add managed-cloud adapters (Scrapfly, Bright Data Web Unlocker, ZenRows, etc.)
behind the same protocol when needed.
"""
from __future__ import annotations

import time
from typing import Any

import httpx

from scrape.logging import get_logger
from scrape.models import BlockReason, FetchRequest, FetchResult, Tier

log = get_logger(__name__)


class FlareSolverrUnblock:
    """Hits a self-hosted FlareSolverr instance to fetch a URL through Selenium
    + undetected-chromedriver. FlareSolverr handles Cloudflare interactive
    challenges and returns the rendered HTML + the issued `cf_clearance` cookie.

    Run alongside the API:

        docker run -d -p 8191:8191 --name flaresolverr \\
            ghcr.io/flaresolverr/flaresolverr:latest

    FlareSolverr is open source (MIT). It's a real-browser fetcher; not a
    token-injection CAPTCHA solver. For invisible Turnstile / reCAPTCHA v3
    you still want our Tier 1 (Camoufox) path — this is the third-tier
    fallback for stubborn Cloudflare Managed Challenge pages.
    """

    name = "flaresolverr"

    def __init__(self, endpoint: str, timeout_s: int = 60):
        self._endpoint = endpoint.rstrip("/")
        self._timeout = timeout_s

    async def fetch(self, req: FetchRequest) -> FetchResult:
        url = str(req.url)
        body: dict[str, Any] = {
            "cmd": "request.get",
            "url": url,
            "maxTimeout": self._timeout * 1000,
        }
        # FlareSolverr supports HTTP proxies but expects them as a separate object.
        # We don't pass our session-rotated proxy here because FlareSolverr keeps
        # its own browser session — mixing them undermines the cf_clearance flow.

        start = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=self._timeout + 5) as client:
                resp = await client.post(f"{self._endpoint}/v1", json=body)
                resp.raise_for_status()
                data = resp.json()
        except httpx.HTTPError as e:
            elapsed_ms = int((time.perf_counter() - start) * 1000)
            log.warning("flaresolverr.http_error", url=url, error=str(e))
            return FetchResult(
                url=url, final_url=url, status=0, body=b"",
                elapsed_ms=elapsed_ms, tier_used=Tier.UNBLOCK,
                proxy_used=None, fingerprint_id="flaresolverr",
                block_reason=BlockReason.NETWORK,
            )

        elapsed_ms = int((time.perf_counter() - start) * 1000)
        if data.get("status") != "ok":
            log.warning("flaresolverr.solver_error", url=url, message=data.get("message"))
            return FetchResult(
                url=url, final_url=url, status=0, body=b"",
                elapsed_ms=elapsed_ms, tier_used=Tier.UNBLOCK,
                proxy_used=None, fingerprint_id="flaresolverr",
                block_reason=BlockReason.STATUS_4XX,
            )

        sol = data.get("solution") or {}
        final_url = sol.get("url") or url
        status = int(sol.get("status") or 0)
        rendered = (sol.get("response") or "").encode("utf-8")
        headers: dict[str, str] = {
            k.lower(): v for k, v in (sol.get("headers") or {}).items() if isinstance(v, str)
        }
        # Surface the user-agent FlareSolverr used so downstream log lines have it
        ua = sol.get("userAgent") or "flaresolverr"

        return FetchResult(
            url=url,
            final_url=final_url,
            status=status,
            headers=headers,
            body=rendered,
            elapsed_ms=elapsed_ms,
            tier_used=Tier.UNBLOCK,
            proxy_used=None,
            fingerprint_id=ua[:80],
        )


class NullUnblock:
    """Used when no Tier-3 provider is configured. Always returns a 0/blocked
    result — the orchestrator will surface this rather than silently swallow."""

    name = "none"

    async def fetch(self, req: FetchRequest) -> FetchResult:
        return FetchResult(
            url=str(req.url), final_url=str(req.url),
            status=0, body=b"", elapsed_ms=0, tier_used=Tier.UNBLOCK,
            block_reason=BlockReason.NETWORK,
        )


def build_unblock_provider(provider: str, endpoint: str, timeout_s: int = 60):
    """Factory used by the orchestrator at startup."""
    p = (provider or "none").lower()
    if p == "flaresolverr" and endpoint:
        return FlareSolverrUnblock(endpoint=endpoint, timeout_s=timeout_s)
    return None
