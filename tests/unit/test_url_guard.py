from __future__ import annotations

import pytest

from scrape.core import url_guard
from scrape.core.url_guard import UnsafeUrlError, validate_public_http_url

pytestmark = pytest.mark.asyncio


@pytest.mark.parametrize(
    "url",
    [
        "http://127.0.0.1/",
        "http://[::1]/",
        "http://10.0.0.4/",
        "http://169.254.169.254/latest/meta-data/",
        "http://localhost:8000/",
        "ftp://example.com/file",
    ],
)
async def test_private_or_unsupported_urls_are_blocked(url: str) -> None:
    with pytest.raises(UnsafeUrlError):
        await validate_public_http_url(url)


async def test_public_literal_ip_is_allowed() -> None:
    await validate_public_http_url("https://93.184.216.34/")


async def test_allow_private_networks_opt_in() -> None:
    await validate_public_http_url("http://127.0.0.1:8000/", allow_private=True)


async def test_dns_resolution_to_private_ip_is_blocked(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_resolve(host: str, port: int | None) -> set[str]:
        assert host == "example.test"
        assert port is None
        return {"10.0.0.9"}

    monkeypatch.setattr(url_guard, "_resolve_host", fake_resolve)

    with pytest.raises(UnsafeUrlError):
        await validate_public_http_url("https://example.test/path")
