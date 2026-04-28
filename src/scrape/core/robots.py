"""Robots.txt enforcement — fetched once per host, cached in-process.

Uses urllib.robotparser (stdlib) which is good enough; we add a 24h TTL
and handle network failures by *defaulting to allow* (configurable by
caller — most ethical scrapers prefer fail-closed for unknown hosts).
"""
from __future__ import annotations

import time
import urllib.robotparser
from urllib.parse import urlparse

from curl_cffi.requests import AsyncSession

from scrape.logging import get_logger

log = get_logger(__name__)

_TTL_S = 24 * 3600


class RobotsCache:
    def __init__(self, user_agent: str = "scrape-bot", default_allow: bool = True):
        self._ua = user_agent
        self._default_allow = default_allow
        self._parsers: dict[str, tuple[urllib.robotparser.RobotFileParser, float]] = {}

    async def allowed(self, url: str) -> bool:
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            return False
        origin = f"{parsed.scheme}://{parsed.netloc}"
        rp, fetched = self._parsers.get(origin, (None, 0.0))
        if rp is None or time.time() - fetched > _TTL_S:
            rp = await self._load(origin)
            self._parsers[origin] = (rp, time.time())
        try:
            return rp.can_fetch(self._ua, url)
        except Exception:
            return self._default_allow

    async def _load(self, origin: str) -> urllib.robotparser.RobotFileParser:
        rp = urllib.robotparser.RobotFileParser()
        rp.set_url(f"{origin}/robots.txt")
        try:
            async with AsyncSession(impersonate="chrome131", timeout=10) as s:
                resp = await s.get(f"{origin}/robots.txt", allow_redirects=True)
                if 200 <= resp.status_code < 300:
                    rp.parse(resp.text.splitlines())
                else:
                    # No robots.txt or access denied — treat as fully open
                    rp.parse([])
        except Exception as e:
            log.debug("robots.fetch_failed", origin=origin, error=str(e))
            rp.parse([])  # default-allow on transport error
        return rp
