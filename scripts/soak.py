"""Validation harness for the Scrape framework.

Runs target lists through the real Orchestrator, captures per-fetch metrics,
and writes structured JSON results so the run is reproducible and inspectable.

Modes:
  diversity   — sequential, one URL per host, full tier escalation
  concurrent  — N parallel jobs, mixed targets, captures throughput + RSS
  failure     — proxy failure injection (mocks proxy at port to time out)
  realistic   — sustained crawl of one site for ~10 min
"""
from __future__ import annotations

import argparse
import asyncio
import gc
import json
import os
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

import psutil

from scrape.config import get_settings
from scrape.models import Tier
from scrape.pipelines.orchestrator import Orchestrator


@dataclass
class FetchRecord:
    url: str
    status: int
    tier_used: int
    block_reason: str
    bytes: int
    elapsed_ms: int
    final_url: str
    ok: bool
    proxy_used: str | None = None
    title: str | None = None
    error: str | None = None


@dataclass
class RunReport:
    mode: str
    started_at: float
    finished_at: float
    fetches: list[FetchRecord] = field(default_factory=list)
    rss_samples_mb: list[float] = field(default_factory=list)
    rss_peak_mb: float = 0.0
    bandwidth_total_bytes: int = 0
    notes: list[str] = field(default_factory=list)


def _extract_title(body: bytes) -> str | None:
    if not body:
        return None
    try:
        txt = body.decode("utf-8", errors="replace")[:65536]
        if "<title>" in txt:
            return txt.split("<title>", 1)[1].split("</title>", 1)[0].strip()[:200]
    except Exception:
        pass
    return None


async def sample_rss(report: RunReport, interval_s: float = 2.0, stop_event: asyncio.Event | None = None) -> None:
    proc = psutil.Process(os.getpid())
    while True:
        if stop_event is not None and stop_event.is_set():
            return
        # Include children (browser processes) — Camoufox is a child Firefox.
        try:
            children = proc.children(recursive=True)
            rss = proc.memory_info().rss + sum(c.memory_info().rss for c in children if c.is_running())
        except psutil.NoSuchProcess:
            rss = proc.memory_info().rss
        rss_mb = rss / 1024 / 1024
        report.rss_samples_mb.append(rss_mb)
        report.rss_peak_mb = max(report.rss_peak_mb, rss_mb)
        await asyncio.sleep(interval_s)


async def run_targets(
    orch: Orchestrator,
    targets: list[str],
    report: RunReport,
    *,
    concurrent: int = 1,
    label: str = "",
) -> None:
    sem = asyncio.Semaphore(concurrent)

    from scrape.pipelines.storage import Storage  # local import
    settings = get_settings()
    async with Storage(settings.storage) as storage:
        async def _one(url: str) -> None:
            async with sem:
                t0 = time.perf_counter()
                try:
                    result = await orch.fetch_one(url, storage)
                except Exception as e:
                    elapsed = int((time.perf_counter() - t0) * 1000)
                    report.fetches.append(FetchRecord(
                        url=url, status=0, tier_used=0, block_reason="error",
                        bytes=0, elapsed_ms=elapsed, final_url=url, ok=False,
                        error=f"{type(e).__name__}: {e}",
                    ))
                    return
                if result is None:
                    report.fetches.append(FetchRecord(
                        url=url, status=0, tier_used=0, block_reason="skipped",
                        bytes=0, elapsed_ms=int((time.perf_counter() - t0) * 1000),
                        final_url=url, ok=False,
                        error="orchestrator returned None (robots/timeout)",
                    ))
                    return
                body = result.body or b""
                report.bandwidth_total_bytes += len(body)
                report.fetches.append(FetchRecord(
                    url=url, status=result.status,
                    tier_used=int(result.tier_used),
                    block_reason=result.block_reason.value,
                    bytes=len(body), elapsed_ms=result.elapsed_ms,
                    final_url=result.final_url, ok=result.ok,
                    proxy_used=("yes" if result.proxy_used else "no"),
                    title=_extract_title(body),
                ))
                tag = f"[{label}] " if label else ""
                print(f"{tag}{url[:60]:60s}  tier={int(result.tier_used)} status={result.status:3d} bytes={len(body):>8d} ok={result.ok}")

        await asyncio.gather(*(_one(u) for u in targets), return_exceptions=True)


# ---------------------------------------------------------------------------
# Modes
# ---------------------------------------------------------------------------

DIVERSITY_TARGETS = [
    # Baselines — should always pass at Tier 0
    ("baseline", "https://books.toscrape.com/"),
    ("baseline", "https://httpbin.org/headers"),

    # JS-challenge interstitials (just-fixed)
    ("reddit",   "https://www.reddit.com/r/python/"),
    ("reddit",   "https://old.reddit.com/r/python/"),

    # Cloudflare protected — interactive challenges, Turnstile
    ("cf",       "https://www.g2.com/categories/crm"),
    ("cf",       "https://nowsecure.nl/"),

    # DataDome
    ("datadome", "https://www.hermes.com/us/en/"),

    # PerimeterX / HUMAN
    ("perimeterx", "https://www.zillow.com/"),

    # Akamai Bot Manager
    ("akamai",   "https://www.target.com/"),

    # Soft block / status-based
    ("indeed",   "https://www.indeed.com/jobs?q=python"),

    # E-commerce / news / wiki controls
    ("control",  "https://en.wikipedia.org/wiki/Web_scraping"),
    ("control",  "https://news.ycombinator.com/"),
]

CONCURRENT_TARGETS = [
    "https://books.toscrape.com/",
    "https://books.toscrape.com/catalogue/page-2.html",
    "https://books.toscrape.com/catalogue/page-3.html",
    "https://httpbin.org/headers",
    "https://httpbin.org/user-agent",
    "https://en.wikipedia.org/wiki/Python_(programming_language)",
    "https://en.wikipedia.org/wiki/Web_scraping",
    "https://news.ycombinator.com/",
    "https://news.ycombinator.com/news?p=2",
    "https://old.reddit.com/r/programming/",
    "https://old.reddit.com/r/python/",
    "https://www.reddit.com/r/python/",
    "https://www.reddit.com/r/programming/",
    "https://www.g2.com/categories/crm",
    "https://nowsecure.nl/",
]

# Realistic crawl: walk a category on a scraper-friendly site
def realistic_targets() -> list[str]:
    base = "https://books.toscrape.com/catalogue"
    return [f"{base}/page-{i}.html" for i in range(1, 21)]


async def main_diversity(out: Path) -> None:
    report = RunReport(mode="diversity", started_at=time.time(), finished_at=0)
    stop = asyncio.Event()
    sampler = asyncio.create_task(sample_rss(report, 1.0, stop))
    try:
        orch = Orchestrator(max_tier=Tier.BROWSER, use_browser=True, use_llm=False)
        try:
            urls = [u for _, u in DIVERSITY_TARGETS]
            await run_targets(orch, urls, report, concurrent=1, label="div")
        finally:
            await orch.aclose()
    finally:
        stop.set()
        await sampler
        report.finished_at = time.time()
        out.write_text(json.dumps(asdict(report), indent=2, default=str))
        print(f"\nWROTE {out} ({len(report.fetches)} fetches, peak RSS {report.rss_peak_mb:.0f}MB)")


async def main_concurrent(out: Path, parallel: int = 8, rounds: int = 3) -> None:
    report = RunReport(mode="concurrent", started_at=time.time(), finished_at=0)
    stop = asyncio.Event()
    sampler = asyncio.create_task(sample_rss(report, 1.0, stop))
    try:
        orch = Orchestrator(max_tier=Tier.BROWSER, use_browser=True, use_llm=False)
        try:
            for r in range(rounds):
                report.notes.append(f"round-{r+1} of {rounds}")
                await run_targets(
                    orch, CONCURRENT_TARGETS, report,
                    concurrent=parallel, label=f"r{r+1}",
                )
        finally:
            await orch.aclose()
    finally:
        stop.set()
        await sampler
        report.finished_at = time.time()
        out.write_text(json.dumps(asdict(report), indent=2, default=str))
        print(f"\nWROTE {out} ({len(report.fetches)} fetches, peak RSS {report.rss_peak_mb:.0f}MB)")


async def main_failure(out: Path) -> None:
    """Inject a bad proxy password and verify the orchestrator surfaces a
    sane error (and trips the auth circuit-breaker after N failures) rather
    than retrying forever.

    Reads the real PROXY_USERNAME / PROXY_ENDPOINT from the env so we don't
    hardcode a secret — the test only swaps the password to something
    invalid. Run with: PROXY_USERNAME=youruser uv run scripts/soak.py failure
    """
    if not os.environ.get("PROXY_USERNAME"):
        raise SystemExit(
            "soak failure mode needs PROXY_USERNAME set in the env "
            "(its password is then swapped with a deliberately-wrong one)",
        )
    os.environ["PROXY_PROVIDER"] = "iproyal"
    os.environ.setdefault("PROXY_ENDPOINT", "geo.iproyal.com:12321")
    os.environ["PROXY_PASSWORD"] = "WRONG_PASSWORD_FOR_AUTH_FAIL"
    # Force settings reload
    from scrape import config as cfg_mod
    cfg_mod._settings = None

    report = RunReport(mode="failure", started_at=time.time(), finished_at=0)
    stop = asyncio.Event()
    sampler = asyncio.create_task(sample_rss(report, 1.0, stop))
    try:
        orch = Orchestrator(max_tier=Tier.HTTP, use_browser=False, use_llm=False)
        try:
            await run_targets(
                orch,
                [
                    "https://httpbin.org/headers",
                    "https://httpbin.org/headers",
                    "https://httpbin.org/headers",
                    "https://httpbin.org/headers",
                ],
                report, concurrent=1, label="auth-fail",
            )
        finally:
            await orch.aclose()
    finally:
        stop.set()
        await sampler
        report.finished_at = time.time()
        out.write_text(json.dumps(asdict(report), indent=2, default=str))
        print(f"\nWROTE {out} ({len(report.fetches)} fetches)")


async def main_realistic(out: Path) -> None:
    """Sustained crawl of one site (books.toscrape — designed for scraping).
    Validates per-host rate limiting, sticky session, dedup, storage."""
    report = RunReport(mode="realistic", started_at=time.time(), finished_at=0)
    stop = asyncio.Event()
    sampler = asyncio.create_task(sample_rss(report, 1.0, stop))
    try:
        orch = Orchestrator(max_tier=Tier.HTTP, use_browser=False, use_llm=False)
        try:
            await run_targets(
                orch, realistic_targets(), report,
                concurrent=4, label="real",
            )
        finally:
            await orch.aclose()
    finally:
        stop.set()
        await sampler
        report.finished_at = time.time()
        out.write_text(json.dumps(asdict(report), indent=2, default=str))
        print(f"\nWROTE {out}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["diversity", "concurrent", "failure", "realistic"])
    ap.add_argument("--out", required=True)
    ap.add_argument("--parallel", type=int, default=8)
    ap.add_argument("--rounds", type=int, default=2)
    args = ap.parse_args()

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)

    if args.mode == "diversity":
        asyncio.run(main_diversity(out))
    elif args.mode == "concurrent":
        asyncio.run(main_concurrent(out, parallel=args.parallel, rounds=args.rounds))
    elif args.mode == "failure":
        asyncio.run(main_failure(out))
    elif args.mode == "realistic":
        asyncio.run(main_realistic(out))


if __name__ == "__main__":
    main()
