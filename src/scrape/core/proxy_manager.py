"""Proxy rotation with sticky sessions and health scoring.

Provider abstraction: every provider returns the same shape — an http(s) URL
formatted as `protocol://user:pass@host:port`. Sticky sessions are encoded
in the username (provider-specific format).

Health scoring: each proxy has a rolling success rate; we exponentially
de-prioritize ones that fail recently. A proxy that hits 3 consecutive
hard blocks goes to a 10-minute cooldown.
"""
from __future__ import annotations

import random
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Protocol

from scrape.config import ProxyConfig
from scrape.logging import get_logger

log = get_logger(__name__)


@dataclass
class ProxyLease:
    """A single proxy URL handed out for a logical session."""

    url: str
    session_id: str
    leased_at: float = field(default_factory=time.time)
    provider: str = ""

    def expired(self, max_age_s: int) -> bool:
        return time.time() - self.leased_at > max_age_s


class ProxyProvider(Protocol):
    name: str

    def lease(self, session_id: str, country: str | None = None) -> ProxyLease: ...


class NoneProvider:
    """No proxy — used for local dev / testing."""

    name = "none"

    def lease(self, session_id: str, country: str | None = None) -> ProxyLease:
        return ProxyLease(url="", session_id=session_id, provider=self.name)


class GenericResidentialProvider:
    """Works for Decodo, IPRoyal, Bright Data, Oxylabs et al.

    Username convention used by most providers in 2026:
        user-<username>-country-<XX>-session-<sticky_id>

    Override `_format_username` for provider-specific quirks.
    """

    name = "residential"

    def __init__(self, endpoint: str, username: str, password: str, default_country: str = ""):
        self.endpoint = endpoint
        self.username = username
        self.password = password
        self.default_country = default_country

    def _format_username(self, session_id: str, country: str | None) -> str:
        country = country or self.default_country
        parts = [f"user-{self.username}"]
        if country:
            parts.append(f"country-{country.lower()}")
        parts.append(f"session-{session_id}")
        return "-".join(parts)

    def lease(self, session_id: str, country: str | None = None) -> ProxyLease:
        user = self._format_username(session_id, country)
        url = f"http://{user}:{self.password}@{self.endpoint}"
        return ProxyLease(url=url, session_id=session_id, provider=self.name)


class BrightDataProvider(GenericResidentialProvider):
    name = "brightdata"

    def _format_username(self, session_id: str, country: str | None) -> str:
        country = country or self.default_country
        parts = [self.username]
        if country:
            parts.append(f"country-{country.lower()}")
        parts.append(f"session-{session_id}")
        return "-".join(parts)


def build_provider(cfg: ProxyConfig) -> ProxyProvider:
    if cfg.provider == "none" or not cfg.endpoint:
        return NoneProvider()
    cls: type[GenericResidentialProvider] = (
        BrightDataProvider if cfg.provider == "brightdata" else GenericResidentialProvider
    )
    return cls(
        endpoint=cfg.endpoint,
        username=cfg.username,
        password=cfg.password,
        default_country=cfg.country,
    )


class ProxyManager:
    """Lease proxies, track health, recycle on block.

    The session_id is the caller's choice — typically a hash of (host, fingerprint)
    so the same logical "user" reuses the same exit IP for the sticky window.
    """

    def __init__(self, provider: ProxyProvider, sticky_minutes: int = 10):
        self._provider = provider
        self._sticky_s = sticky_minutes * 60
        self._leases: dict[str, ProxyLease] = {}
        # session_id -> recent (ok, failed) timestamps for health
        self._history: dict[str, deque[tuple[float, bool]]] = defaultdict(lambda: deque(maxlen=20))
        self._cooldown_until: dict[str, float] = {}

    def lease(self, session_id: str, country: str | None = None) -> ProxyLease:
        now = time.time()
        if (cool := self._cooldown_until.get(session_id)) and now < cool:
            # Burned proxy — rotate to fresh sticky id
            session_id = f"{session_id}-{int(now)}-{random.randint(0, 9999)}"
        existing = self._leases.get(session_id)
        if existing and not existing.expired(self._sticky_s):
            return existing
        lease = self._provider.lease(session_id, country)
        self._leases[session_id] = lease
        log.debug(
            "proxy.leased",
            session_id=session_id,
            provider=lease.provider,
            country=country or "any",
        )
        return lease

    def report(self, session_id: str, ok: bool) -> None:
        self._history[session_id].append((time.time(), ok))
        if not ok:
            recent = list(self._history[session_id])[-3:]
            if len(recent) == 3 and not any(r[1] for r in recent):
                # 3 consecutive failures: cooldown 10 minutes, force re-lease
                self._cooldown_until[session_id] = time.time() + 600
                self._leases.pop(session_id, None)
                log.warning("proxy.cooldown", session_id=session_id, minutes=10)

    def success_rate(self, session_id: str) -> float:
        hist = self._history.get(session_id)
        if not hist:
            return 1.0
        return sum(1 for _, ok in hist if ok) / len(hist)
