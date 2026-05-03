"""Typer-based CLI."""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path
from typing import Annotated

import typer
import yaml  # type: ignore[import-untyped]
from rich.console import Console
from rich.table import Table

from scrape.config import get_settings
from scrape.logging import get_logger, setup_logging
from scrape.models import Tier
from scrape.pipelines.metrics import start_metrics_server
from scrape.pipelines.orchestrator import Orchestrator

app = typer.Typer(add_completion=False, no_args_is_help=True, help="Scrape — tiered web scraper")
console = Console()
log = get_logger("cli")


def _read_urls(source: str | None, urls: list[str]) -> list[str]:
    out: list[str] = list(urls)
    if source:
        text = Path(source).read_text() if source != "-" else sys.stdin.read()
        out.extend(line.strip() for line in text.splitlines() if line.strip() and not line.startswith("#"))
    seen: set[str] = set()
    deduped: list[str] = []
    for url in out:
        if url not in seen:
            seen.add(url)
            deduped.append(url)
    return deduped


@app.command()
def crawl(
    urls: Annotated[list[str], typer.Argument(help="URL(s) to crawl")] = [],
    file: Annotated[str | None, typer.Option("--file", "-f", help="File of URLs (one per line; '-' for stdin)")] = None,
    max_tier: Annotated[int, typer.Option("--max-tier", help="0=HTTP, 1=Browser, 2=Captcha, 3=Unblock")] = 1,
    schema: Annotated[str | None, typer.Option(help="Path to a YAML/JSON schema for LLM extraction")] = None,
    schema_name: Annotated[str, typer.Option(help="Logical name for the extraction schema")] = "default",
    no_browser: Annotated[bool, typer.Option("--no-browser", help="Disable browser tier even if available")] = False,
    use_llm: Annotated[bool, typer.Option("--llm", help="Enable LLM extraction (default backend: OpenRouter, requires OPENROUTER_API_KEY)")] = False,
    metrics_port: Annotated[int, typer.Option(help="Prometheus metrics port (0 = disabled)")] = 0,
) -> None:
    """Crawl one or more URLs through the escalation pipeline."""
    setup_logging(get_settings().log_level)
    if metrics_port:
        start_metrics_server(metrics_port)

    target_urls = _read_urls(file, urls)
    if not target_urls:
        console.print("[red]No URLs provided[/red]")
        raise typer.Exit(1)

    schema_obj: dict | None = None
    if schema:
        path = Path(schema)
        text = path.read_text()
        schema_obj = yaml.safe_load(text) if path.suffix in (".yml", ".yaml") else json.loads(text)

    orch = Orchestrator(
        max_tier=Tier(max_tier),
        use_browser=not no_browser,
        use_llm=use_llm,
        schema_name=schema_name,
        schema=schema_obj,
    )

    async def _run() -> dict:
        try:
            return await orch.crawl(target_urls)
        finally:
            await orch.aclose()

    stats = asyncio.run(_run())

    table = Table(title="Crawl Stats")
    for k, v in stats.items():
        table.add_row(k, str(v))
    console.print(table)


@app.command()
def stats() -> None:
    """Show aggregate stats from the local SQLite store."""
    from scrape.pipelines.storage import Storage
    setup_logging(get_settings().log_level)

    async def _run() -> dict:
        async with Storage(get_settings().storage) as s:
            return await s.stats()

    s = asyncio.run(_run())
    table = Table(title="Storage Stats")
    for k, v in s.items():
        table.add_row(k, str(v))
    console.print(table)


@app.command()
def selftest() -> None:
    """Quick smoke test — fetches a couple of public, scraper-friendly URLs."""
    setup_logging("INFO")
    targets = [
        "https://httpbin.org/headers",
        "https://httpbin.org/cookies/set/scrape/yes",
        "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
    ]
    orch = Orchestrator(max_tier=Tier.HTTP, use_browser=False, use_llm=False)

    async def _run() -> dict:
        try:
            return await orch.crawl(targets)
        finally:
            await orch.aclose()

    stats = asyncio.run(_run())
    table = Table(title="Selftest Results")
    for k, v in stats.items():
        table.add_row(k, str(v))
    console.print(table)


if __name__ == "__main__":  # pragma: no cover
    app()
