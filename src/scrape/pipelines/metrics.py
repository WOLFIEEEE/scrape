"""Prometheus metrics — exported on a configurable port."""
from __future__ import annotations

from prometheus_client import Counter, Gauge, Histogram, start_http_server

from scrape.logging import get_logger

log = get_logger(__name__)

FETCHES_TOTAL = Counter(
    "scrape_fetches_total",
    "Total fetches",
    labelnames=("tier", "block_reason", "ok"),
)
FETCH_LATENCY = Histogram(
    "scrape_fetch_latency_seconds",
    "Fetch latency",
    labelnames=("tier",),
    buckets=(0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 20.0, 60.0),
)
EXTRACTED_TOTAL = Counter(
    "scrape_extracted_total",
    "Total successful extractions",
    labelnames=("schema",),
)
TIER_ESCALATIONS = Counter(
    "scrape_tier_escalations_total",
    "Times a request was escalated to a higher tier",
    labelnames=("from_tier", "to_tier"),
)
QUEUE_SIZE = Gauge("scrape_queue_size", "Pending URLs in the queue")
ACTIVE_BROWSERS = Gauge("scrape_active_browsers", "Open browser sessions")


def start_metrics_server(port: int) -> None:
    try:
        start_http_server(port)
        log.info("metrics.started", port=port)
    except OSError as e:
        log.warning("metrics.bind_failed", port=port, error=str(e))
