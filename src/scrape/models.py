"""Shared data models passed between tiers and pipelines."""
from __future__ import annotations

from datetime import UTC, datetime
from enum import IntEnum, StrEnum
from typing import Any

from pydantic import BaseModel, Field, HttpUrl


class Tier(IntEnum):
    HTTP = 0       # curl_cffi
    BROWSER = 1    # Camoufox / Playwright
    CAPTCHA = 2    # Browser + CAPTCHA solver
    UNBLOCK = 3    # Managed third-party fallback


class BlockReason(StrEnum):
    NONE = "none"
    STATUS_4XX = "status_4xx"
    STATUS_5XX = "status_5xx"
    CHALLENGE_PAGE = "challenge_page"
    CAPTCHA_REQUIRED = "captcha_required"
    EMPTY_BODY = "empty_body"
    TIMEOUT = "timeout"
    NETWORK = "network"
    RATE_LIMITED = "rate_limited"
    FORBIDDEN_HOST = "forbidden_host"


class FetchRequest(BaseModel):
    url: HttpUrl
    method: str = "GET"
    headers: dict[str, str] = Field(default_factory=dict)
    body: bytes | None = None
    cookies: dict[str, str] = Field(default_factory=dict)
    tier: Tier = Tier.HTTP
    max_tier: Tier = Tier.UNBLOCK
    metadata: dict[str, Any] = Field(default_factory=dict)


class FetchResult(BaseModel):
    url: str
    final_url: str
    status: int
    headers: dict[str, str] = Field(default_factory=dict)
    body: bytes
    elapsed_ms: int
    tier_used: Tier
    proxy_used: str | None = None
    fingerprint_id: str | None = None
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    block_reason: BlockReason = BlockReason.NONE

    @property
    def text(self) -> str:
        # Best-effort decode; charset detection happens in extractors when needed
        try:
            return self.body.decode("utf-8")
        except UnicodeDecodeError:
            return self.body.decode("utf-8", errors="replace")

    @property
    def ok(self) -> bool:
        return 200 <= self.status < 400 and self.block_reason == BlockReason.NONE


class ExtractedRecord(BaseModel):
    url: str
    extracted_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    schema_name: str
    data: dict[str, Any]
    confidence: float = 1.0
