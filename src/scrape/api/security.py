"""Password hashing + JWT issuance.

We sign with HS256 and a server-side secret. Tokens carry the user id;
the API stores tokens in HttpOnly cookies so the SPA can't leak them via XSS.
"""
from __future__ import annotations

import os
from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
from jose import JWTError, jwt

from scrape.config import get_settings

# bcrypt — work-factor 12 is the 2026 sweet spot (~250ms on a recent CPU).
# bcrypt 5.x enforces the 72-byte limit; we pre-hash long passwords with SHA-256
# (a standard pattern that preserves entropy without truncating).
_BCRYPT_ROUNDS = 12


def _prehash(plain: str) -> bytes:
    raw = plain.encode("utf-8")
    if len(raw) <= 72:
        return raw
    import hashlib
    # Use the hex digest so the result is ASCII (well under 72 bytes)
    return hashlib.sha256(raw).hexdigest().encode("ascii")


def hash_password(plain: str) -> str:
    salt = bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)
    return bcrypt.hashpw(_prehash(plain), salt).decode("ascii")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_prehash(plain), hashed.encode("ascii"))
    except (ValueError, TypeError):
        return False


_DEFAULT_TOKEN_TTL_HOURS = 24 * 7  # one week


def _secret() -> str:
    s = get_settings().jwt_secret or os.environ.get("SCRAPE_JWT_SECRET", "")
    if not s:
        # Dev fallback. In prod the API refuses to start without it (see main.py).
        return "dev-only-change-me-please"
    return s


def issue_token(user_id: int, ttl_hours: int = _DEFAULT_TOKEN_TTL_HOURS) -> str:
    payload = {
        "sub": str(user_id),
        "iat": int(datetime.now(UTC).timestamp()),
        "exp": int((datetime.now(UTC) + timedelta(hours=ttl_hours)).timestamp()),
    }
    return jwt.encode(payload, _secret(), algorithm="HS256")


def decode_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(token, _secret(), algorithms=["HS256"])
    except JWTError:
        return None
