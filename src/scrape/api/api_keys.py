"""API keys: issue, store hashed, verify on bearer auth."""
from __future__ import annotations

import secrets

import aiosqlite

from scrape.api.security import hash_password, verify_password

_PREFIX = "sk_live_"


def _generate_secret() -> tuple[str, str, str]:
    """Returns (full_token, prefix, suffix)."""
    body = secrets.token_urlsafe(24)
    full = f"{_PREFIX}{body}"
    prefix = full[: len(_PREFIX) + 8]  # e.g. sk_live_abcd1234
    return full, prefix, body


async def create_api_key(db: aiosqlite.Connection, user_id: int, name: str, now_iso: str) -> tuple[int, str, str]:
    full, prefix, _ = _generate_secret()
    cur = await db.execute(
        """INSERT INTO api_keys (user_id, name, prefix, secret_hash, created_at)
           VALUES (?, ?, ?, ?, ?)""",
        (user_id, name, prefix, hash_password(full), now_iso),
    )
    await db.commit()
    return cur.lastrowid or 0, prefix, full


async def verify_api_key(db: aiosqlite.Connection, token: str) -> int | None:
    """Returns user_id if the token matches a non-revoked key."""
    if not token.startswith(_PREFIX) or len(token) < len(_PREFIX) + 16:
        return None
    prefix = token[: len(_PREFIX) + 8]
    cur = await db.execute(
        """SELECT id, user_id, secret_hash FROM api_keys
           WHERE prefix = ? AND revoked_at IS NULL""",
        (prefix,),
    )
    rows = await cur.fetchall()
    for row in rows:
        if verify_password(token, row["secret_hash"]):
            from scrape.api.db import now_iso as _now
            await db.execute(
                "UPDATE api_keys SET last_used_at = ? WHERE id = ?", (_now(), row["id"]),
            )
            await db.commit()
            return int(row["user_id"])
    return None
