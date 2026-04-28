"""Webhook dispatcher with HMAC signing + bounded retries."""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import time
from typing import Any

import httpx

from scrape.api.db import connect, now_iso
from scrape.logging import get_logger

log = get_logger(__name__)

_RETRY_DELAYS_S = (0, 30, 120, 600, 1800)  # 0, 30s, 2m, 10m, 30m
_TIMEOUT_S = 10
_delivery_tasks: set[asyncio.Task[None]] = set()


def _sign(secret: str, ts: int, body: bytes) -> str:
    msg = f"{ts}.".encode() + body
    return hmac.new(secret.encode(), msg, hashlib.sha256).hexdigest()


def _schedule_delivery(delivery_id: int, url: str, secret: str, body: bytes, webhook_id: int) -> None:
    task = asyncio.create_task(_deliver(delivery_id, url, secret, body, webhook_id))
    _delivery_tasks.add(task)
    task.add_done_callback(_delivery_tasks.discard)


async def fire(event: str, user_id: int, payload: dict[str, Any]) -> None:
    """Find matching active webhooks for the user, schedule deliveries."""
    body = json.dumps(payload, default=str).encode()
    async with connect() as db:
        cur = await db.execute(
            "SELECT id, url, secret, events_json FROM webhooks WHERE user_id = ? AND active = 1",
            (user_id,),
        )
        rows = await cur.fetchall()
    targets = [r for r in rows if event in json.loads(r["events_json"])]
    for t in targets:
        async with connect() as db:
            cur = await db.execute(
                """INSERT INTO webhook_deliveries (webhook_id, event, payload_json, created_at)
                   VALUES (?, ?, ?, ?)""",
                (t["id"], event, body.decode(), now_iso()),
            )
            await db.commit()
            delivery_id = cur.lastrowid
        _schedule_delivery(delivery_id, t["url"], t["secret"], body, t["id"])


async def _deliver(delivery_id: int, url: str, secret: str, body: bytes, webhook_id: int) -> None:
    last_status: int | None = None
    last_error: str | None = None
    for attempt, delay in enumerate(_RETRY_DELAYS_S):
        if delay:
            await asyncio.sleep(delay)
        ts = int(time.time())
        sig = _sign(secret, ts, body)
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "scrape-webhook/1.0",
            "X-Scrape-Signature": f"t={ts},v1={sig}",
        }
        try:
            async with httpx.AsyncClient(timeout=_TIMEOUT_S) as client:
                resp = await client.post(url, content=body, headers=headers)
            last_status = resp.status_code
            if 200 <= resp.status_code < 300:
                async with connect() as db:
                    await db.execute(
                        """UPDATE webhook_deliveries
                           SET status = ?, attempts = ?, delivered_at = ? WHERE id = ?""",
                        (last_status, attempt + 1, now_iso(), delivery_id),
                    )
                    await db.execute(
                        "UPDATE webhooks SET last_status = ?, last_attempt_at = ? WHERE id = ?",
                        (last_status, now_iso(), webhook_id),
                    )
                    await db.commit()
                log.info("webhook.delivered", id=delivery_id, status=last_status, attempt=attempt + 1)
                return
            last_error = f"HTTP {resp.status_code}"
        except Exception as e:
            last_error = str(e)[:200]
        async with connect() as db:
            await db.execute(
                """UPDATE webhook_deliveries
                   SET status = ?, error = ?, attempts = ? WHERE id = ?""",
                (last_status, last_error, attempt + 1, delivery_id),
            )
            await db.commit()
    async with connect() as db:
        await db.execute(
            "UPDATE webhooks SET last_status = ?, last_attempt_at = ? WHERE id = ?",
            (last_status, now_iso(), webhook_id),
        )
        await db.commit()
    log.warning("webhook.failed", id=delivery_id, attempts=len(_RETRY_DELAYS_S), error=last_error)
