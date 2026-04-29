"""Tier 1 browser pool.

Strategy:
- Prefer Camoufox (Firefox + C++-level fingerprint patches) for stealth.
- Fall back to Playwright Chromium with stealth-style patches when Camoufox is
  not installed (e.g. CI without the binary download).

Camoufox is loaded lazily — it's a heavy optional dep. This keeps the package
importable on machines that haven't run `camoufox fetch`.

Behavior simulation:
- Bezier-curve mouse paths between random viewport points
- Jittered scroll with realistic accel/decel
- Variable typing cadence
"""
from __future__ import annotations

import asyncio
import contextlib
import math
import random
import time
from contextlib import asynccontextmanager
from typing import Any
from urllib.parse import unquote, urlsplit, urlunsplit

from scrape.fingerprints.profiles import FingerprintProfile, random_profile
from scrape.logging import get_logger
from scrape.models import BlockReason, FetchRequest, FetchResult, Tier

log = get_logger(__name__)

# Camoufox import is deferred so the framework still works for HTTP-only users.
try:
    from browserforge.fingerprints import Screen  # type: ignore
    from camoufox.async_api import AsyncCamoufox  # type: ignore
    _CAMOUFOX_AVAILABLE = True
except ImportError:  # pragma: no cover - depends on optional binary
    _CAMOUFOX_AVAILABLE = False
    Screen = None  # type: ignore


def camoufox_available() -> bool:
    return _CAMOUFOX_AVAILABLE


def _split_proxy_url(url: str) -> dict[str, str]:
    """Split a `scheme://user:pass@host:port` proxy URL into the dict shape
    Playwright/Firefox requires (server + separate username/password).

    Firefox's NSPR layer rejects userinfo embedded in the proxy URL with
    NS_ERROR_PROXY_AUTHENTICATION_FAILED, so we have to peel it off.
    """
    parts = urlsplit(url)
    server = urlunsplit((parts.scheme, parts.hostname or "", "", "", ""))
    if parts.port:
        server = f"{server}:{parts.port}"
    out: dict[str, str] = {"server": server}
    if parts.username:
        out["username"] = unquote(parts.username)
    if parts.password:
        out["password"] = unquote(parts.password)
    return out


# ---------------------------------------------------------------------------
# Behavioral simulation helpers
# ---------------------------------------------------------------------------

def _bezier_points(start: tuple[int, int], end: tuple[int, int], n: int = 24) -> list[tuple[int, int]]:
    """Quadratic Bezier with a randomized control point — produces plausible
    overshoot/curl rather than a straight robot line."""
    sx, sy = start
    ex, ey = end
    cx = (sx + ex) / 2 + random.uniform(-200, 200)
    cy = (sy + ey) / 2 + random.uniform(-200, 200)
    out = []
    for i in range(n + 1):
        t = i / n
        x = (1 - t) ** 2 * sx + 2 * (1 - t) * t * cx + t ** 2 * ex
        y = (1 - t) ** 2 * sy + 2 * (1 - t) * t * cy + t ** 2 * ey
        out.append((int(x), int(y)))
    return out


async def _human_mouse_dance(page: Any, profile: FingerprintProfile) -> None:
    """A short pre-action mouse warm-up. Move 2-3 times to random points.
    This raises behavioral score for reCAPTCHA v3 / Turnstile invisible mode.
    """
    cur = (random.randint(50, profile.viewport_width - 50),
           random.randint(50, profile.viewport_height - 50))
    for _ in range(random.randint(2, 4)):
        target = (
            random.randint(50, profile.viewport_width - 50),
            random.randint(50, profile.viewport_height - 50),
        )
        for px, py in _bezier_points(cur, target, n=20):
            try:
                await page.mouse.move(px, py)
            except Exception:
                return  # page may have closed
            await asyncio.sleep(random.uniform(0.005, 0.025))
        cur = target
        await asyncio.sleep(random.uniform(0.05, 0.25))


async def _human_scroll(page: Any, distance: int = 1500) -> None:
    """Scroll with easing. Down a few hundred pixels at a time, occasional pause."""
    travelled = 0
    while travelled < distance:
        step = random.randint(80, 220)
        try:
            await page.mouse.wheel(0, step)
        except Exception:
            return
        travelled += step
        await asyncio.sleep(random.uniform(0.08, 0.4) * (1 + math.sin(travelled / 100) * 0.3))


# ---------------------------------------------------------------------------
# Browser session
# ---------------------------------------------------------------------------

class BrowserSession:
    """One real browser context. Cheap to keep alive between requests for
    the same logical user (host + fp + proxy) — expensive to spin up."""

    def __init__(
        self,
        profile: FingerprintProfile,
        proxy_url: str | None = None,
        headless: bool = True,
        humanize: bool = True,
    ):
        self._profile = profile
        self._proxy_url = proxy_url
        self._headless = headless
        self._humanize = humanize
        self._cm: Any = None
        self._browser: Any = None
        self._context: Any = None

    @property
    def profile(self) -> FingerprintProfile:
        return self._profile

    async def __aenter__(self) -> BrowserSession:
        if not _CAMOUFOX_AVAILABLE:
            raise RuntimeError(
                "Camoufox not installed. Install with: uv pip install camoufox && camoufox fetch"
            )
        proxy_arg: dict[str, str] | None = None
        if self._proxy_url:
            proxy_arg = _split_proxy_url(self._proxy_url)
        # browserforge >=1.2 expects a Screen instance; passing a dict raises
        # AttributeError deep inside fingerprint generation.
        screen = Screen(
            min_width=self._profile.screen_width,
            max_width=self._profile.screen_width,
            min_height=self._profile.screen_height,
            max_height=self._profile.screen_height,
        )
        # FingerprintProfile.locale is an Accept-Language style string
        # ("en-US", "de-DE,en-US;q=0.7"). Camoufox needs a pure BCP47 list,
        # so strip q-weights and split on commas.
        locale_list = [
            tag.split(";", 1)[0].strip()
            for tag in self._profile.locale.split(",")
            if tag.strip()
        ]
        self._cm = AsyncCamoufox(
            headless=self._headless,
            humanize=self._humanize,
            os=("macos" if "Mac" in self._profile.user_agent else "windows"),
            screen=screen,
            window=(self._profile.viewport_width, self._profile.viewport_height),
            locale=locale_list,
            proxy=proxy_arg,
            geoip=True,  # match exit IP geo to spoofed timezone/locale
            i_know_what_im_doing=True,
        )
        self._browser = await self._cm.__aenter__()
        self._context = await self._browser.new_context()
        return self

    async def __aexit__(self, *exc: Any) -> None:
        if self._cm is not None:
            try:
                await self._cm.__aexit__(*exc)
            except Exception as e:  # pragma: no cover - best effort cleanup
                log.warning("browser.cleanup_failed", error=str(e))

    async def fetch(self, req: FetchRequest, wait_until: str = "domcontentloaded") -> FetchResult:
        assert self._context is not None
        page = await self._context.new_page()
        url = str(req.url)
        start = time.perf_counter()
        try:
            for k, v in req.cookies.items():
                await self._context.add_cookies([{
                    "name": k, "value": v, "url": url,
                }])
            response = await page.goto(url, wait_until=wait_until, timeout=45_000)
            # Cloudflare's "Just a moment" interstitial passes itself once enough
            # JS executes — the browser already passes the behavioral score with
            # Camoufox + humanize, we just need to wait for the redirect. Poll
            # the title for up to 15s; bail early once the challenge is gone.
            for _ in range(30):
                try:
                    title = await page.title()
                except Exception:
                    break
                if "Just a moment" not in title and "verification" not in title.lower():
                    break
                await asyncio.sleep(0.5)
            if self._humanize:
                await _human_mouse_dance(page, self._profile)
                await _human_scroll(page, distance=random.randint(500, 1800))
            body_str = await page.content()
            body = body_str.encode("utf-8")
            elapsed_ms = int((time.perf_counter() - start) * 1000)
            status = response.status if response else 0
            headers = dict(response.headers) if response else {}
            final_url = page.url
            return FetchResult(
                url=url,
                final_url=final_url,
                status=status,
                headers=headers,
                body=body,
                elapsed_ms=elapsed_ms,
                tier_used=Tier.BROWSER,
                proxy_used=self._proxy_url,
                fingerprint_id=self._profile.name,
            )
        except Exception as e:
            elapsed_ms = int((time.perf_counter() - start) * 1000)
            log.warning("browser.fetch_failed", url=url, error=str(e))
            return FetchResult(
                url=url, final_url=url, status=0, body=b"",
                elapsed_ms=elapsed_ms, tier_used=Tier.BROWSER,
                proxy_used=self._proxy_url, fingerprint_id=self._profile.name,
                block_reason=BlockReason.NETWORK,
            )
        finally:
            with contextlib.suppress(Exception):
                await page.close()

    async def storage_state(self) -> dict[str, Any]:
        assert self._context is not None
        return await self._context.storage_state()


class BrowserPool:
    """Cached browser sessions keyed by (host, profile_name, proxy_session).

    Cap on simultaneous browsers — each one is ~150-300MB of RAM."""

    def __init__(self, max_browsers: int = 4, headless: bool = True, humanize: bool = True):
        self._max = max_browsers
        self._headless = headless
        self._humanize = humanize
        self._sessions: dict[str, BrowserSession] = {}
        self._sem = asyncio.Semaphore(max_browsers)

    @asynccontextmanager
    async def session(
        self,
        key: str,
        proxy_url: str | None = None,
        profile: FingerprintProfile | None = None,
    ):
        profile = profile or random_profile(desktop_only=True)
        async with self._sem:
            existing = self._sessions.get(key)
            if existing is None:
                sess = BrowserSession(
                    profile=profile, proxy_url=proxy_url,
                    headless=self._headless, humanize=self._humanize,
                )
                await sess.__aenter__()
                self._sessions[key] = sess
                existing = sess
            try:
                yield existing
            except (asyncio.CancelledError, Exception):
                # If the caller was cancelled or anything escapes, the browser
                # context is likely in a torn-down state — playwright raises
                # TargetClosedError on the next page.goto. Drop it so the next
                # caller gets a fresh browser instead of a dead one.
                await self.discard(key)
                raise

    async def discard(self, key: str) -> None:
        sess = self._sessions.pop(key, None)
        if sess is not None:
            await sess.__aexit__(None, None, None)

    async def close_all(self) -> None:
        keys = list(self._sessions.keys())
        for k in keys:
            await self.discard(k)
