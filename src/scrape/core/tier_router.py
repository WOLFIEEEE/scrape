"""Tier router — the orchestrator's decision brain.

Given a FetchRequest, run it at the cheapest tier, escalate on block until we
either succeed, hit the request's max_tier, or run out of retries.

Tier 0 -> curl_cffi
Tier 1 -> Camoufox browser
Tier 2 -> browser + CAPTCHA solver injection
Tier 3 -> third-party Web Unlocker (Scrapfly / Bright Data) — left as
          a pluggable interface; provider integration is config-time.
"""
from __future__ import annotations

import hashlib
from typing import Protocol

from scrape.core.block_detector import (
    detect,
    needs_browser,
)
from scrape.core.browser_pool import BrowserPool, camoufox_available
from scrape.core.captcha import CaptchaSolver
from scrape.core.http_client import HttpClient
from scrape.core.proxy_manager import ProxyManager
from scrape.core.session_store import SessionStore, host_key
from scrape.fingerprints.profiles import random_profile
from scrape.logging import get_logger
from scrape.models import BlockReason, FetchRequest, FetchResult, Tier

log = get_logger(__name__)


class UnblockProvider(Protocol):
    name: str
    async def fetch(self, req: FetchRequest) -> FetchResult: ...


class TierRouter:
    def __init__(
        self,
        proxy_manager: ProxyManager,
        session_store: SessionStore,
        captcha_solver: CaptchaSolver | None = None,
        browser_pool: BrowserPool | None = None,
        unblock_provider: UnblockProvider | None = None,
        timeout_s: int = 30,
    ):
        self._proxies = proxy_manager
        self._sessions = session_store
        self._captcha = captcha_solver
        self._browser = browser_pool
        self._unblock = unblock_provider
        self._timeout_s = timeout_s

    def _identity(self, url: str, profile_name: str) -> tuple[str, str]:
        host = host_key(url)
        # Stable per-host session id — same logical user keeps the same exit IP
        sid_raw = f"{host}|{profile_name}".encode()
        sid = hashlib.sha1(sid_raw).hexdigest()[:12]
        return host, sid

    async def fetch(self, req: FetchRequest) -> FetchResult:
        url = str(req.url)
        profile = random_profile(desktop_only=True)
        host, proxy_session = self._identity(url, profile.name)
        lease = self._proxies.lease(proxy_session)
        sess = self._sessions.get_or_create(host, profile.name, proxy_session)

        # --- Tier 0: HTTP + TLS impersonation -------------------------------
        if req.tier <= Tier.HTTP:
            async with HttpClient(
                proxy=lease.url or None,
                timeout_s=self._timeout_s,
                accept_language=profile.accept_language,
                extra_headers={"User-Agent": profile.user_agent},
            ) as client:
                merged_req = req.model_copy(update={"cookies": {**sess.cookies, **req.cookies}})
                result = await client.fetch(merged_req)
                result.block_reason = detect(result)
                self._sessions.update_cookies(sess, _extract_cookies(result.headers))
                self._proxies.report(proxy_session, result.ok)
                if result.ok or req.max_tier == Tier.HTTP:
                    self._sessions.persist(sess)
                    return result
                log.info(
                    "tier.escalate",
                    url=url, from_tier=int(Tier.HTTP),
                    reason=result.block_reason.value,
                )

        # --- Tier 1: Browser -----------------------------------------------
        if req.max_tier >= Tier.BROWSER and (
            req.tier <= Tier.BROWSER or needs_browser(BlockReason.CHALLENGE_PAGE)
        ):
            if self._browser is None or not camoufox_available():
                log.warning("tier1.skipped", reason="browser_pool_unavailable", url=url)
            else:
                key = f"{host}|{profile.name}|{proxy_session}"
                async with self._browser.session(
                    key=key, proxy_url=lease.url or None, profile=profile,
                ) as bsess:
                    result = await bsess.fetch(req)
                    result.block_reason = detect(result)
                    self._proxies.report(proxy_session, result.ok)
                    if result.ok or req.max_tier == Tier.BROWSER:
                        try:
                            self._sessions.update_storage_state(sess, await bsess.storage_state())
                            self._sessions.persist(sess)
                        except Exception as e:
                            log.warning("session.storage_state_failed", error=str(e))
                        return result
                    log.info(
                        "tier.escalate",
                        url=url, from_tier=int(Tier.BROWSER),
                        reason=result.block_reason.value,
                    )

        # --- Tier 2: Browser + CAPTCHA solver ------------------------------
        if (
            req.max_tier >= Tier.CAPTCHA
            and self._captcha is not None
            and self._browser is not None
            and camoufox_available()
        ):
            # CAPTCHA injection requires a browser + sitekey discovery on the page.
            # The current implementation surfaces the reason and falls through to
            # Tier 3; the full inject-and-resubmit flow lives in the
            # browser_captcha helper to keep this router lean.
            from scrape.core.browser_captcha import solve_in_browser  # local import to avoid cycle
            key = f"{host}|{profile.name}|{proxy_session}|captcha"
            async with self._browser.session(
                key=key, proxy_url=lease.url or None, profile=profile,
            ) as bsess:
                result = await solve_in_browser(bsess, req, self._captcha)
                result.block_reason = detect(result)
                self._proxies.report(proxy_session, result.ok)
                if result.ok or req.max_tier == Tier.CAPTCHA:
                    return result
                log.info(
                    "tier.escalate",
                    url=url, from_tier=int(Tier.CAPTCHA),
                    reason=result.block_reason.value,
                )

        # --- Tier 3: Managed unblock fallback ------------------------------
        if req.max_tier >= Tier.UNBLOCK and self._unblock is not None:
            log.info("tier.unblock", url=url, provider=self._unblock.name)
            result = await self._unblock.fetch(req)
            result.block_reason = detect(result)
            self._proxies.report(proxy_session, result.ok)
            return result

        # Out of escalation options
        return FetchResult(
            url=url, final_url=url, status=0, body=b"",
            elapsed_ms=0, tier_used=req.tier,
            proxy_used=lease.url or None, fingerprint_id=profile.name,
            block_reason=BlockReason.STATUS_4XX,
        )


def _extract_cookies(headers: dict[str, str]) -> dict[str, str]:
    """Pull simple Set-Cookie name=value pairs from response headers.
    Loses Domain/Path/Expires — fine for our cache (host-scoped already)."""
    raw = headers.get("set-cookie") or headers.get("Set-Cookie")
    if not raw:
        return {}
    out: dict[str, str] = {}
    # curl_cffi merges multiple Set-Cookie into one header joined with comma+space.
    # Splitting on ", " is wrong for cookies whose Expires contains a comma; we
    # use a conservative regex-free split on "; " then comma-join chunks.
    for chunk in raw.split(", "):
        if "=" not in chunk:
            continue
        cookie_part = chunk.split(";", 1)[0]
        name, _, value = cookie_part.partition("=")
        name = name.strip()
        if name and name.lower() not in ("expires", "path", "domain", "samesite", "secure", "httponly"):
            out[name] = value.strip()
    return out
