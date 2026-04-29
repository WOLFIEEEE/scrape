"""Background job runner — drives the existing Orchestrator and updates job rows.

One asyncio Task per job. Tasks live in-process for the API; on startup, pending
jobs are resubmitted and jobs that were mid-flight are marked failed.
"""
from __future__ import annotations

import asyncio
import json
from typing import Any

import aiosqlite

from scrape.api.db import connect, now_iso
from scrape.config import get_settings
from scrape.logging import get_logger
from scrape.models import Tier
from scrape.pipelines.orchestrator import Orchestrator

log = get_logger(__name__)


# In-memory registry: job_id -> asyncio.Task. Used for cancellation.
_running: dict[str, asyncio.Task[None]] = {}


def is_running(job_id: str) -> bool:
    t = _running.get(job_id)
    return t is not None and not t.done()


async def cancel(job_id: str) -> bool:
    t = _running.get(job_id)
    if t and not t.done():
        t.cancel()
        return True
    return False


async def _update_status(db: aiosqlite.Connection, job_id: str, **fields: Any) -> None:
    if not fields:
        return
    cols = ", ".join(f"{k} = ?" for k in fields)
    vals = [*list(fields.values()), job_id]
    await db.execute(f"UPDATE jobs SET {cols} WHERE id = ?", vals)
    await db.commit()


async def _bump_progress(db: aiosqlite.Connection, job_id: str, ok: bool) -> None:
    if ok:
        await db.execute(
            "UPDATE jobs SET completed = completed + 1, succeeded = succeeded + 1 WHERE id = ?",
            (job_id,),
        )
    else:
        await db.execute(
            "UPDATE jobs SET completed = completed + 1 WHERE id = ?", (job_id,),
        )
    await db.commit()


async def _execute(job_id: str) -> None:
    """The actual job loop."""
    settings = get_settings()
    async with connect() as db:
        cur = await db.execute(
            "SELECT urls_json, max_tier, use_browser, use_llm, schema_name, schema_json FROM jobs WHERE id = ?",
            (job_id,),
        )
        row = await cur.fetchone()
        if not row:
            log.warning("job.not_found", job_id=job_id)
            return
        urls: list[str] = json.loads(row["urls_json"])
        max_tier = Tier(int(row["max_tier"]))
        use_browser = bool(row["use_browser"])
        use_llm = bool(row["use_llm"])
        schema_name = row["schema_name"]
        schema = json.loads(row["schema_json"]) if row["schema_json"] else None

        await _update_status(db, job_id, status="running", started_at=now_iso(), total=len(urls))

    orch = Orchestrator(
        settings=settings,
        max_tier=max_tier,
        use_browser=use_browser,
        use_llm=use_llm,
        schema_name=schema_name,
        schema=schema,
    )

    try:
        # We use orch.fetch_one + orch.extract directly so we can tag stored
        # rows with job_id and stream live per-URL progress to the DB.
        from scrape.pipelines.storage import Storage

        async with Storage(settings.storage) as storage:
            sem = asyncio.Semaphore(settings.crawler.max_concurrency)

            async def _process(u: str) -> None:
                async with sem:
                    res = await orch.fetch_one(u, storage, job_id=job_id)
                    ok = res is not None and res.ok
                    if res is not None:
                        await orch.extract(res, storage, job_id=job_id)
                    async with connect() as prog_db:
                        await _bump_progress(prog_db, job_id, ok)

            await asyncio.gather(*(_process(u) for u in urls), return_exceptions=False)

        async with connect() as db:
            await _update_status(db, job_id, status="completed", finished_at=now_iso())
        log.info("job.completed", job_id=job_id, total=len(urls))
        # Fire any registered webhooks for this user
        await _emit_webhook(job_id, "job.completed")
    except asyncio.CancelledError:
        async with connect() as db:
            await _update_status(db, job_id, status="cancelled", finished_at=now_iso())
        log.info("job.cancelled", job_id=job_id)
        await _emit_webhook(job_id, "job.cancelled")
        raise
    except Exception as e:
        async with connect() as db:
            await _update_status(
                db, job_id, status="failed", finished_at=now_iso(), error=str(e)[:500],
            )
        log.exception("job.failed", job_id=job_id)
        await _emit_webhook(job_id, "job.failed")
    finally:
        await orch.aclose()
        _running.pop(job_id, None)


def submit(job_id: str) -> None:
    """Schedule a job to run on the API's event loop."""
    if job_id in _running and not _running[job_id].done():
        log.warning("job.already_running", job_id=job_id)
        return
    task = asyncio.create_task(_execute(job_id), name=f"job-{job_id}")
    _running[job_id] = task


async def _emit_webhook(job_id: str, event: str) -> None:
    """Look up the job's owner and fire the webhook event."""
    try:
        from scrape.api import webhooks
        async with connect() as db:
            cur = await db.execute(
                "SELECT user_id, name, status, total, completed, succeeded FROM jobs WHERE id = ?",
                (job_id,),
            )
            row = await cur.fetchone()
        if not row:
            return
        await webhooks.fire(
            event,
            int(row["user_id"]),
            {
                "event": event,
                "job_id": job_id,
                "name": row["name"],
                "status": row["status"],
                "total": row["total"],
                "completed": row["completed"],
                "succeeded": row["succeeded"],
            },
        )
    except Exception as e:
        log.warning("webhook.dispatch_failed", job_id=job_id, error=str(e))


async def recover_interrupted_jobs() -> None:
    """Recover DB-backed jobs after an API restart.

    Pending jobs have not started yet, so resubmit them. Running jobs died with
    the previous process and may have partial fetch rows, so mark them failed
    instead of replaying side effects silently.
    """
    async with connect() as db:
        await db.execute(
            "UPDATE jobs SET status = 'failed', error = 'process restart',"
            " finished_at = ? WHERE status = 'running'",
            (now_iso(),),
        )
        cur = await db.execute("SELECT id FROM jobs WHERE status = 'pending'")
        pending = [str(row["id"]) for row in await cur.fetchall()]
        await db.commit()

    for job_id in pending:
        submit(job_id)


# Backwards-compatible alias for older imports.
reset_orphan_running = recover_interrupted_jobs
