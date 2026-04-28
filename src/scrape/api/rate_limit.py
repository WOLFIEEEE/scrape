"""Sliding-window in-memory rate limiter for auth endpoints.

10 attempts per 5 minutes per (IP, bucket). Process-local — fine for a single
API instance. Swap for Redis when scaling out.
"""
from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status

from scrape.config import get_settings

_WINDOW_S = 300
_MAX = 10
_buckets: dict[tuple[str, str], deque[float]] = defaultdict(deque)


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    if get_settings().trust_proxy_headers and fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def check(request: Request, bucket: str) -> None:
    """Raise 429 if too many recent attempts; otherwise record this one."""
    key = (_client_ip(request), bucket)
    now = time.monotonic()
    q = _buckets[key]
    # Drop expired
    while q and q[0] < now - _WINDOW_S:
        q.popleft()
    if len(q) >= _MAX:
        retry = int(_WINDOW_S - (now - q[0])) if q else _WINDOW_S
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"too many attempts, retry in {retry}s",
            headers={"Retry-After": str(retry)},
        )
    q.append(now)
