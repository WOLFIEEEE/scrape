"""Orchestrator — fan-out crawler with per-host rate limiting and tier escalation.

Inputs: an async iterable of URLs (or seed list + crawl rules).
Outputs: persisted FetchResult + ExtractedRecord rows.

Concurrency model:
- A bounded asyncio worker pool (max_concurrency)
- Per-host limiter (concurrency cap + min delay)
- Tier router decides escalation; storage writes happen out-of-band
"""
from __future__ import annotations

import asyncio
from collections.abc import AsyncIterable, Iterable
from typing import Any

from scrape.config import Settings, get_settings
from scrape.core.block_detector import detect
from scrape.core.browser_pool import BrowserPool, camoufox_available
from scrape.core.captcha import CapSolver, CaptchaSolver, NullCaptchaSolver
from scrape.core.proxy_manager import ProxyManager, build_provider
from scrape.core.rate_limiter import HostRateLimiter
from scrape.core.robots import RobotsCache
from scrape.core.session_store import SessionStore, host_key
from scrape.core.tier_router import TierRouter
from scrape.core.unblock import build_unblock_provider
from scrape.extractors.llm_schema import SchemaExtractor, build_extractor
from scrape.extractors.selectors import find_extractor
from scrape.logging import get_logger
from scrape.models import ExtractedRecord, FetchRequest, FetchResult, Tier
from scrape.pipelines.metrics import EXTRACTED_TOTAL, FETCH_LATENCY, FETCHES_TOTAL, QUEUE_SIZE
from scrape.pipelines.storage import Storage

log = get_logger(__name__)


def _build_captcha_solver(settings: Settings) -> CaptchaSolver:
    if settings.captcha.api_key:
        return CapSolver(settings.captcha.api_key, timeout_s=settings.captcha.timeout_s)
    return NullCaptchaSolver()


class Orchestrator:
    def __init__(
        self,
        settings: Settings | None = None,
        schema_name: str | None = None,
        schema: dict[str, Any] | None = None,
        max_tier: Tier = Tier.BROWSER,
        use_browser: bool = True,
        use_llm: bool = False,
    ):
        self._settings = settings or get_settings()
        self._schema_name = schema_name
        self._schema = schema
        self._max_tier = max_tier
        self._use_llm = use_llm
        proxy_provider = build_provider(self._settings.proxy)
        self._proxies = ProxyManager(
            proxy_provider, sticky_minutes=self._settings.proxy.sticky_session_minutes,
        )
        self._sessions = SessionStore()
        self._captcha: CaptchaSolver = _build_captcha_solver(self._settings)
        self._browser_pool: BrowserPool | None = None
        if use_browser and camoufox_available():
            self._browser_pool = BrowserPool(
                max_browsers=max(1, self._settings.crawler.max_concurrency // 4),
                headless=True, humanize=True,
            )
        elif use_browser:
            log.warning("browser.disabled", reason="camoufox_not_installed")
        self._unblock = build_unblock_provider(
            provider=self._settings.unblock.provider,
            endpoint=self._settings.unblock.endpoint,
            timeout_s=self._settings.unblock.timeout_s,
        )
        if self._unblock is not None:
            log.info("unblock.enabled", provider=self._unblock.name)
        self._router = TierRouter(
            proxy_manager=self._proxies,
            session_store=self._sessions,
            captcha_solver=self._captcha,
            browser_pool=self._browser_pool,
            unblock_provider=self._unblock,
            timeout_s=self._settings.crawler.request_timeout_s,
        )
        self._limiter = HostRateLimiter(
            per_host_concurrency=self._settings.crawler.per_host_concurrency,
            min_delay_ms=self._settings.crawler.per_host_min_delay_ms,
        )
        self._llm: SchemaExtractor | None = None
        if use_llm:
            self._llm = build_extractor()
            if self._llm is not None:
                log.info("llm.enabled", backend=self._llm.backend)
        self._robots: RobotsCache | None = (
            RobotsCache() if self._settings.crawler.respect_robots else None
        )

    async def fetch_one(
        self,
        url: str,
        storage: Storage,
        job_id: str | None = None,
    ) -> FetchResult | None:
        """Fetch a single URL through the tier router and persist the result."""
        if self._robots is not None and not await self._robots.allowed(url):
            log.info("robots.disallowed", url=url)
            return None
        req = FetchRequest(url=url, max_tier=self._max_tier)
        async with self._limiter.slot(url):
            try:
                result = await asyncio.wait_for(
                    self._router.fetch(req),
                    timeout=self._settings.crawler.request_timeout_s * 2,
                )
            except TimeoutError:
                log.warning("orchestrator.timeout", url=url)
                return None
        # Re-evaluate detection (router may not have run it post-escalation)
        result.block_reason = detect(result)
        FETCHES_TOTAL.labels(
            tier=str(int(result.tier_used)),
            block_reason=result.block_reason.value,
            ok=str(result.ok).lower(),
        ).inc()
        FETCH_LATENCY.labels(tier=str(int(result.tier_used))).observe(result.elapsed_ms / 1000)
        await storage.save_fetch(result, job_id=job_id)
        return result

    # Backwards-compat alias kept temporarily; new callers use fetch_one().
    _fetch_one = fetch_one

    async def extract(
        self,
        result: FetchResult,
        storage: Storage,
        job_id: str | None = None,
    ) -> None:
        if not result.ok or not result.body:
            return
        from urllib.parse import urlparse
        # Use the FQDN for selector lookup (subdomains often matter for site-specific
        # selectors); fall back to eTLD+1 inside find_extractor's longest-suffix match.
        fqdn = (urlparse(result.url).hostname or "").lower()
        selector = find_extractor(fqdn) or find_extractor(host_key(result.url))
        host = host_key(result.url)
        if selector is not None:
            data = selector(result.body, result.url)
            record = ExtractedRecord(
                url=result.url,
                schema_name=f"selector:{host}",
                data=data,
                confidence=1.0,
            )
            await storage.save_extracted(record, job_id=job_id)
            EXTRACTED_TOTAL.labels(schema=record.schema_name).inc()
            return
        if self._llm and self._schema and self._schema_name:
            try:
                record = await self._llm.extract(
                    result.body, result.url, self._schema_name, self._schema,
                )
                await storage.save_extracted(record, job_id=job_id)
                EXTRACTED_TOTAL.labels(schema=record.schema_name).inc()
            except Exception as e:
                log.warning("extract.llm_failed", url=result.url, error=str(e))

    async def crawl(self, urls: Iterable[str] | AsyncIterable[str]) -> dict[str, int | float]:
        async with Storage(self._settings.storage) as storage:
            sem = asyncio.Semaphore(self._settings.crawler.max_concurrency)
            queue: list[asyncio.Task[None]] = []

            async def _process(u: str) -> None:
                async with sem:
                    res = await self.fetch_one(u, storage)
                    if res:
                        await self.extract(res, storage)
                    QUEUE_SIZE.dec()

            if isinstance(urls, AsyncIterable):
                async for u in urls:
                    QUEUE_SIZE.inc()
                    queue.append(asyncio.create_task(_process(u)))
            else:
                for u in urls:
                    QUEUE_SIZE.inc()
                    queue.append(asyncio.create_task(_process(u)))

            if queue:
                await asyncio.gather(*queue, return_exceptions=True)

            stats = await storage.stats()
            log.info("crawl.done", **stats)
            return stats

    async def aclose(self) -> None:
        if self._browser_pool is not None:
            await self._browser_pool.close_all()
