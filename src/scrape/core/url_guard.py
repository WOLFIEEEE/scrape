"""Outbound URL safety checks for user-supplied targets.

The API accepts URLs from users and then makes server-side requests to them.
Before any network fetch, resolve the hostname and reject private/internal
addresses to prevent SSRF against cloud metadata, loopback services, or the
container network.
"""
from __future__ import annotations

import asyncio
import ipaddress
import socket
from urllib.parse import urlparse

_ALLOWED_SCHEMES = {"http", "https"}
_BLOCKED_HOSTS = {"localhost"}
_BLOCKED_SUFFIXES = (".localhost", ".local")
_RESOLVE_TIMEOUT_S = 5


class UnsafeUrlError(ValueError):
    """Raised when a URL is not safe for server-side fetching."""


def _is_public_ip(raw: str) -> bool:
    ip = ipaddress.ip_address(raw)
    return ip.is_global and not ip.is_multicast


def _literal_ip(host: str) -> str | None:
    try:
        return str(ipaddress.ip_address(host.strip("[]")))
    except ValueError:
        return None


async def _resolve_host(host: str, port: int | None) -> set[str]:
    def _lookup() -> set[str]:
        infos = socket.getaddrinfo(
            host,
            port or 443,
            type=socket.SOCK_STREAM,
        )
        return {str(info[4][0]) for info in infos}

    return await asyncio.wait_for(asyncio.to_thread(_lookup), timeout=_RESOLVE_TIMEOUT_S)


async def validate_public_http_url(url: str, *, allow_private: bool = False) -> None:
    """Validate that a URL is safe for outbound server-side fetching.

    `allow_private` exists for explicitly trusted self-hosted/intranet installs.
    Public SaaS deployments should keep it disabled.
    """
    parsed = urlparse(url)
    if parsed.scheme.lower() not in _ALLOWED_SCHEMES:
        raise UnsafeUrlError("only http and https URLs are allowed")

    host = parsed.hostname
    if not host:
        raise UnsafeUrlError("URL host is required")

    normalized_host = host.strip("[]").lower()
    if not allow_private and (
        normalized_host in _BLOCKED_HOSTS
        or normalized_host.endswith(_BLOCKED_SUFFIXES)
    ):
        raise UnsafeUrlError("local hostnames are not allowed")

    literal = _literal_ip(normalized_host)
    if literal is not None:
        if not allow_private and not _is_public_ip(literal):
            raise UnsafeUrlError("private or reserved IP addresses are not allowed")
        return

    try:
        resolved = await _resolve_host(normalized_host, parsed.port)
    except (OSError, TimeoutError) as e:
        raise UnsafeUrlError(f"host could not be resolved safely: {normalized_host}") from e

    if not resolved:
        raise UnsafeUrlError(f"host did not resolve: {normalized_host}")

    if allow_private:
        return

    blocked = [ip for ip in resolved if not _is_public_ip(ip)]
    if blocked:
        sample = ", ".join(sorted(blocked)[:3])
        raise UnsafeUrlError(f"host resolves to private or reserved address: {sample}")
