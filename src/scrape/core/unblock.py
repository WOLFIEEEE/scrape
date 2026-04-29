"""Tier-3 unblock providers — last-resort managed bypass.

The `UnblockProvider` Protocol is in `tier_router.py`. Concrete adapters live
here so we don't bloat the router file.

Currently shipped:
  - **FlareSolverrUnblock** — open-source self-hosted Cloudflare bypass via
    a `flaresolverr/flaresolverr` Docker container. Free, no API key. Best
    for plain CF JS challenges; cannot beat behavioral scoring (PerimeterX).
  - **BrightDataUnblock** — commercial Web Unlocker. Solves CF / Akamai /
    PerimeterX / Kasada through Bright Data's farm. Pay-per-request.
  - **ScrapflyUnblock** — commercial alternative; same idea, different vendor.
  - **NullUnblock** — explicit no-op when no provider is configured.

The orchestrator builds one of these at startup based on env. Customers who
need to clear behaviorally-scored sites turn on the commercial adapter by
setting UNBLOCK_PROVIDER=brightdata + BRIGHTDATA_API_KEY (or scrapfly).
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


class BrightDataUnblock:
    """Bright Data Web Unlocker — pay-per-request managed bypass.

    Bright Data's Web Unlocker handles CF / Akamai / PerimeterX / Kasada by
    routing the request through their proxy zone with the `wu-` prefix and
    retrying internally with browser fingerprints. Returns the final HTML.

    Pricing (2026): ~$3 per 1,000 successful requests, billed only on success.
    Failed requests are not charged. Costs higher than self-hosted FlareSolverr
    but covers behaviorally-scored sites that FlareSolverr can't.

    Setup:
        UNBLOCK_PROVIDER=brightdata
        BRIGHTDATA_API_KEY=<your zone API key>
        # endpoint defaults to api.brightdata.com/request
    """

    name = "brightdata"

    def __init__(
        self,
        api_key: str,
        zone: str = "web_unlocker1",
        endpoint: str = "https://api.brightdata.com/request",
        timeout_s: int = 90,
    ):
        if not api_key:
            raise ValueError("BrightDataUnblock requires api_key (BRIGHTDATA_API_KEY)")
        self._api_key = api_key
        self._zone = zone
        self._endpoint = endpoint
        self._timeout = timeout_s

    async def fetch(self, req: FetchRequest) -> FetchResult:
        url = str(req.url)
        payload = {
            "zone": self._zone,
            "url": url,
            "format": "raw",  # return rendered HTML
            "method": req.method,
        }
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        start = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.post(self._endpoint, headers=headers, json=payload)
        except httpx.HTTPError as e:
            elapsed_ms = int((time.perf_counter() - start) * 1000)
            log.warning("brightdata.http_error", url=url, error=str(e))
            return FetchResult(
                url=url, final_url=url, status=0, body=b"",
                elapsed_ms=elapsed_ms, tier_used=Tier.UNBLOCK,
                fingerprint_id="brightdata", block_reason=BlockReason.NETWORK,
            )
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        if resp.status_code >= 400:
            log.warning(
                "brightdata.api_error",
                url=url, status=resp.status_code, body=resp.text[:200],
            )
            return FetchResult(
                url=url, final_url=url, status=resp.status_code, body=b"",
                elapsed_ms=elapsed_ms, tier_used=Tier.UNBLOCK,
                fingerprint_id="brightdata", block_reason=BlockReason.STATUS_4XX,
            )
        body = resp.content or b""
        # Bright Data passes through the upstream final URL via x-final-url
        final_url = resp.headers.get("x-final-url", url)
        # Successful Web Unlocker request — pricing is approximately $0.003.
        # Bright Data sometimes echoes the actual cost in headers.
        try:
            cost = float(resp.headers.get("x-brd-cost-usd", "0.003"))
        except ValueError:
            cost = 0.003
        return FetchResult(
            url=url, final_url=final_url, status=resp.status_code,
            body=body, elapsed_ms=elapsed_ms, tier_used=Tier.UNBLOCK,
            proxy_used="brightdata", fingerprint_id="brightdata",
            solver_cost_usd=cost,
        )


class ScrapflyUnblock:
    """Scrapfly — alternative commercial bypass, equivalent to Bright Data.

    Pricing (2026): credits-based, roughly 1-25 credits per request depending
    on whether ASP / browser / JS rendering is needed. ~$0.001-$0.025/request.

    Setup:
        UNBLOCK_PROVIDER=scrapfly
        SCRAPFLY_API_KEY=<your key>
    """

    name = "scrapfly"

    def __init__(
        self,
        api_key: str,
        endpoint: str = "https://api.scrapfly.io/scrape",
        timeout_s: int = 90,
    ):
        if not api_key:
            raise ValueError("ScrapflyUnblock requires api_key (SCRAPFLY_API_KEY)")
        self._api_key = api_key
        self._endpoint = endpoint
        self._timeout = timeout_s

    async def fetch(self, req: FetchRequest) -> FetchResult:
        url = str(req.url)
        params = {
            "key": self._api_key,
            "url": url,
            "asp": "true",        # anti scraping protection bypass
            "render_js": "true",   # full browser render
            "country": "us",
        }
        start = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.get(self._endpoint, params=params)
        except httpx.HTTPError as e:
            elapsed_ms = int((time.perf_counter() - start) * 1000)
            log.warning("scrapfly.http_error", url=url, error=str(e))
            return FetchResult(
                url=url, final_url=url, status=0, body=b"",
                elapsed_ms=elapsed_ms, tier_used=Tier.UNBLOCK,
                fingerprint_id="scrapfly", block_reason=BlockReason.NETWORK,
            )
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        if resp.status_code >= 400:
            log.warning(
                "scrapfly.api_error",
                url=url, status=resp.status_code, body=resp.text[:200],
            )
            return FetchResult(
                url=url, final_url=url, status=resp.status_code, body=b"",
                elapsed_ms=elapsed_ms, tier_used=Tier.UNBLOCK,
                fingerprint_id="scrapfly", block_reason=BlockReason.STATUS_4XX,
            )
        # Scrapfly returns a JSON envelope with the actual response under
        # result.content. We unwrap to match other providers.
        try:
            payload = resp.json()
        except Exception:
            payload = {}
        result = (payload.get("result") or {})
        body_str = result.get("content") or ""
        body = body_str.encode("utf-8") if isinstance(body_str, str) else (body_str or b"")
        upstream_status = int(result.get("status_code") or resp.status_code)
        final_url = result.get("url") or url
        # Scrapfly bills in credits; convert to USD via context cost (defaults
        # to a conservative ~$0.005/req for ASP + render).
        credits_used = float(result.get("cost") or payload.get("cost") or 0)
        cost_usd = credits_used * 0.0001 if credits_used else 0.005
        return FetchResult(
            url=url, final_url=final_url, status=upstream_status,
            body=body, elapsed_ms=elapsed_ms, tier_used=Tier.UNBLOCK,
            proxy_used="scrapfly", fingerprint_id="scrapfly",
            solver_cost_usd=cost_usd,
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


def build_unblock_provider(
    provider: str,
    endpoint: str,
    timeout_s: int = 60,
    *,
    brightdata_api_key: str = "",
    brightdata_zone: str = "web_unlocker1",
    scrapfly_api_key: str = "",
):
    """Factory used by the orchestrator at startup.

    Returns None when the provider is unset or the required API key is missing
    — the orchestrator treats that as "no Tier 3 available" and surfaces a
    block result instead of silently swallowing.
    """
    p = (provider or "none").lower()
    if p == "flaresolverr" and endpoint:
        return FlareSolverrUnblock(endpoint=endpoint, timeout_s=timeout_s)
    if p == "brightdata":
        if not brightdata_api_key:
            log.warning("unblock.brightdata_missing_key")
            return None
        return BrightDataUnblock(
            api_key=brightdata_api_key,
            zone=brightdata_zone,
            timeout_s=timeout_s,
        )
    if p == "scrapfly":
        if not scrapfly_api_key:
            log.warning("unblock.scrapfly_missing_key")
            return None
        return ScrapflyUnblock(api_key=scrapfly_api_key, timeout_s=timeout_s)
    return None
