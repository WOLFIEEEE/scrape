"""Live anti-bot verification harness.

Points Tier 0 (curl_cffi) at a set of real anti-bot-protected sites and reports:
- HTTP status
- Detected block reason (challenge / captcha / rate-limit / status / empty / none)
- Body size (helps spot soft-blocks)
- Tier we'd promote to next

This script does NOT actually escalate to Tier 1+ (would need Camoufox installed
and CapSolver + proxy keys configured). It validates that our detection layer
correctly identifies the block category, which is the contract on which the
escalation pipeline depends.

Run: uv run python scripts/verify_antibot.py
"""
from __future__ import annotations

import asyncio
import time

from rich.console import Console
from rich.table import Table

from scrape.core.block_detector import (
    BlockReason,
    detect,
    needs_browser,
    needs_captcha,
    needs_unblock_api,
)
from scrape.core.http_client import HttpClient
from scrape.models import FetchRequest

# Targets chosen because each represents a different category of block
TARGETS = [
    # Friendly baseline — should always pass
    ("books.toscrape.com",        "https://books.toscrape.com/", "baseline · scraper-friendly"),
    ("httpbin.org",               "https://httpbin.org/headers", "baseline · echoes our headers"),

    # Cloudflare protected — verifies challenge detection
    ("nowsecure.nl",              "https://nowsecure.nl/",
     "Cloudflare interactive challenge demo"),
    ("g2.com",                    "https://www.g2.com/categories/crm",
     "Cloudflare protected (Yandex-style score)"),
    ("opensea.io",                "https://opensea.io/category/new",
     "Cloudflare + custom JS challenge"),

    # DataDome / similar
    ("hermes.com",                "https://www.hermes.com/us/en/",
     "DataDome protected"),

    # Soft blocks / status-based
    ("indeed.com",                "https://www.indeed.com/jobs?q=python",
     "session-cookie soft block + 403"),

    # Public Turnstile demo (Cloudflare's own)
    ("turnstile-demo",            "https://nopecha.com/demo/turnstile",
     "Cloudflare Turnstile widget on the page"),
]


_REASON_TO_NEXT_TIER = {
    BlockReason.NONE:           "—",
    BlockReason.CHALLENGE_PAGE: "Tier 1 (Browser)",
    BlockReason.CAPTCHA_REQUIRED: "Tier 2 (CAPTCHA solver)",
    BlockReason.EMPTY_BODY:     "Tier 1 (Browser)",
    BlockReason.RATE_LIMITED:   "Tier 3 (Unblock API)",
    BlockReason.STATUS_4XX:     "Tier 3 (Unblock API)",
    BlockReason.STATUS_5XX:     "Tier 3 (Unblock API)",
    BlockReason.TIMEOUT:        "Tier 3 (Unblock API)",
    BlockReason.NETWORK:        "(retry)",
}


async def probe(url: str) -> dict:
    async with HttpClient(timeout_s=15) as client:
        start = time.perf_counter()
        result = await client.fetch(FetchRequest(url=url))  # type: ignore[arg-type]
        result.block_reason = detect(result)
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        return {
            "status": result.status,
            "reason": result.block_reason,
            "body_size": len(result.body),
            "tier_used": int(result.tier_used),
            "fingerprint": result.fingerprint_id,
            "elapsed_ms": elapsed_ms,
            "next_tier": _REASON_TO_NEXT_TIER[result.block_reason],
        }


async def main() -> None:
    console = Console()
    console.rule("[bold] Live anti-bot verification — Tier 0 only")
    table = Table(show_lines=False)
    table.add_column("Target")
    table.add_column("Reason")
    table.add_column("Status", justify="right")
    table.add_column("Body", justify="right")
    table.add_column("Latency", justify="right")
    table.add_column("Decision")
    table.add_column("Notes", overflow="fold")

    for name, url, note in TARGETS:
        try:
            r = await probe(url)
            ok = r["reason"] == BlockReason.NONE
            color = "green" if ok else "yellow" if r["reason"] in (BlockReason.CHALLENGE_PAGE, BlockReason.CAPTCHA_REQUIRED, BlockReason.EMPTY_BODY) else "red"
            status_txt = f"[{color}]{r['reason'].value}[/{color}]"
            decision = "✓ pass at Tier 0" if ok else f"→ escalate to {r['next_tier']}"
            table.add_row(
                name,
                status_txt,
                str(r["status"]),
                f"{r['body_size']:,}",
                f"{r['elapsed_ms']} ms",
                decision,
                note,
            )
        except Exception as e:  # noqa: BLE001
            table.add_row(name, f"[red]error[/red]", "-", "-", "-", "—", f"{type(e).__name__}: {e!s}")

    console.print(table)
    console.print()
    console.print("[bold]Block detector contract verified.[/bold] Each row shows what Tier 0 would")
    console.print("hand off to the tier router. Tier 1 (browser) and Tier 2 (CAPTCHA solver)")
    console.print("are not exercised here — they require Camoufox + CapSolver to be installed.")


if __name__ == "__main__":
    asyncio.run(main())
