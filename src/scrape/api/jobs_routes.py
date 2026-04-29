"""Jobs CRUD + live status (SSE) + results."""
from __future__ import annotations

import asyncio
import contextlib
import csv
import io
import json
from typing import Any

import aiosqlite
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse

from scrape.api import job_runner
from scrape.api.db import new_job_id, now_iso
from scrape.api.deps import get_current_user, get_db
from scrape.api.schemas import (
    ExtractedOut,
    FetchOut,
    JobCreate,
    JobListItem,
    JobOut,
    JobProgress,
    UserOut,
)
from scrape.api.usage import concurrent_running, current_usage
from scrape.config import get_settings
from scrape.core.url_guard import UnsafeUrlError, validate_public_http_url

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


def _row_to_job_out(row: aiosqlite.Row) -> JobOut:
    try:
        hint = row["captcha_hint"]
    except IndexError:
        hint = None
    return JobOut(
        id=row["id"], name=row["name"], status=row["status"],
        max_tier=row["max_tier"], use_browser=bool(row["use_browser"]),
        use_llm=bool(row["use_llm"]), total=row["total"], completed=row["completed"],
        succeeded=row["succeeded"], error=row["error"],
        created_at=row["created_at"], started_at=row["started_at"],
        finished_at=row["finished_at"],
        captcha_hint=hint if hint in ("turnstile", "recaptcha_v3", "hcaptcha") else None,
    )


async def _validate_job_urls(urls: list[str]) -> None:
    allow_private = get_settings().crawler.allow_private_networks
    sem = asyncio.Semaphore(32)

    async def _check(url: str) -> None:
        async with sem:
            await validate_public_http_url(url, allow_private=allow_private)

    try:
        await asyncio.gather(*(_check(url) for url in sorted(set(urls))))
    except UnsafeUrlError as e:
        raise HTTPException(status_code=400, detail=f"unsafe URL: {e}") from e


@router.get("", response_model=list[JobListItem])
async def list_jobs(
    user: UserOut = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
    limit: int = Query(default=100, ge=1, le=500),
) -> list[JobListItem]:
    cur = await db.execute(
        """SELECT id, name, status, total, completed, succeeded, created_at
           FROM jobs WHERE user_id = ? ORDER BY datetime(created_at) DESC LIMIT ?""",
        (user.id, limit),
    )
    rows = await cur.fetchall()
    return [
        JobListItem(
            id=r["id"], name=r["name"], status=r["status"],
            total=r["total"], completed=r["completed"], succeeded=r["succeeded"],
            created_at=r["created_at"],
        )
        for r in rows
    ]


@router.post("", response_model=JobOut, status_code=status.HTTP_201_CREATED)
async def create_job(
    body: JobCreate,
    user: UserOut = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
) -> JobOut:
    urls = [str(u) for u in body.urls]
    await _validate_job_urls(urls)
    # Quota enforcement at job creation: refuse if this batch would exceed the
    # user's remaining monthly fetch quota.
    snap = await current_usage(db, user.id)
    if snap.over_quota:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Monthly quota of {snap.quota:,} fetches reached. Upgrade your plan.",
        )
    if len(body.urls) > snap.remaining:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Job has {len(body.urls):,} URLs but only {snap.remaining:,} remain in this period.",
        )
    # Concurrent-job cap per plan
    from scrape.api.usage import PLANS
    plan = PLANS.get(snap.plan, PLANS["free"])
    running = await concurrent_running(db, user.id)
    if running >= plan["concurrent_jobs"]:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Plan allows {plan['concurrent_jobs']} concurrent jobs (you have {running} running).",
        )
    job_id = new_job_id()
    urls_json = json.dumps(urls)
    schema_json = json.dumps(body.extraction_schema) if body.extraction_schema else None
    await db.execute(
        """INSERT INTO jobs (
            id, user_id, name, urls_json, max_tier, use_browser, use_llm,
            schema_name, schema_json, captcha_hint, status, total, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)""",
        (
            job_id, user.id, body.name, urls_json, body.max_tier,
            int(body.use_browser), int(body.use_llm),
            body.schema_name, schema_json, body.captcha_hint,
            len(body.urls), now_iso(),
        ),
    )
    await db.commit()
    job_runner.submit(job_id)
    cur = await db.execute("SELECT * FROM jobs WHERE id = ?", (job_id,))
    row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=500, detail="failed to create job")
    return _row_to_job_out(row)


async def _load_job_owned(
    job_id: str, user: UserOut, db: aiosqlite.Connection,
) -> aiosqlite.Row:
    cur = await db.execute("SELECT * FROM jobs WHERE id = ? AND user_id = ?", (job_id, user.id))
    row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="job not found")
    return row


@router.get("/{job_id}", response_model=JobOut)
async def get_job(
    job_id: str,
    user: UserOut = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
) -> JobOut:
    row = await _load_job_owned(job_id, user, db)
    return _row_to_job_out(row)


@router.post("/{job_id}/duplicate", response_model=JobOut, status_code=status.HTTP_201_CREATED)
async def duplicate_job(
    job_id: str,
    user: UserOut = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
) -> JobOut:
    """Re-run an existing job with the same URLs, name (suffixed), and config.
    Quota and concurrency rules apply exactly like a fresh creation."""
    src = await _load_job_owned(job_id, user, db)

    # Apply quota + concurrency the same way create_job does.
    snap = await current_usage(db, user.id)
    if snap.over_quota:
        raise HTTPException(status_code=402, detail=f"Monthly quota of {snap.quota:,} fetches reached.")
    if src["total"] > snap.remaining:
        raise HTTPException(
            status_code=402,
            detail=f"Source dig has {src['total']:,} URLs but only {snap.remaining:,} remain.",
        )
    from scrape.api.usage import PLANS
    plan = PLANS.get(snap.plan, PLANS["free"])
    running = await concurrent_running(db, user.id)
    if running >= plan["concurrent_jobs"]:
        raise HTTPException(
            status_code=429,
            detail=f"Plan allows {plan['concurrent_jobs']} concurrent jobs (you have {running} running).",
        )

    urls = json.loads(src["urls_json"])
    await _validate_job_urls([str(url) for url in urls])

    new_id = new_job_id()
    suffix_name = f"{src['name']} (rerun)"[:120]
    src_hint: str | None = None
    with contextlib.suppress(IndexError, KeyError):
        src_hint = src["captcha_hint"]
    await db.execute(
        """INSERT INTO jobs (
            id, user_id, name, urls_json, max_tier, use_browser, use_llm,
            schema_name, schema_json, captcha_hint, status, total, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)""",
        (
            new_id, user.id, suffix_name, src["urls_json"], src["max_tier"],
            src["use_browser"], src["use_llm"],
            src["schema_name"], src["schema_json"], src_hint,
            src["total"], now_iso(),
        ),
    )
    await db.commit()
    job_runner.submit(new_id)
    cur = await db.execute("SELECT * FROM jobs WHERE id = ?", (new_id,))
    row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=500, detail="failed to duplicate job")
    return _row_to_job_out(row)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: str,
    user: UserOut = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
) -> None:
    await _load_job_owned(job_id, user, db)
    await job_runner.cancel(job_id)
    await db.execute("DELETE FROM jobs WHERE id = ?", (job_id,))
    # Keep the fetch/extracted rows for audit; clear job tag
    await db.execute("UPDATE fetches SET job_id = NULL WHERE job_id = ?", (job_id,))
    await db.execute("UPDATE extracted SET job_id = NULL WHERE job_id = ?", (job_id,))
    await db.commit()


@router.post("/{job_id}/cancel", response_model=JobOut)
async def cancel_job(
    job_id: str,
    user: UserOut = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
) -> JobOut:
    row = await _load_job_owned(job_id, user, db)
    if row["status"] in ("completed", "failed", "cancelled"):
        return _row_to_job_out(row)
    await job_runner.cancel(job_id)
    # The runner will mark it cancelled — re-read after a short wait
    for _ in range(20):
        await asyncio.sleep(0.05)
        cur = await db.execute("SELECT * FROM jobs WHERE id = ?", (job_id,))
        next_row = await cur.fetchone()
        if not next_row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="job not found")
        row = next_row
        if row["status"] != "running":
            break
    return _row_to_job_out(row)


@router.get("/{job_id}/events")
async def job_events(
    job_id: str,
    user: UserOut = Depends(get_current_user),
):
    """Server-Sent Events stream for live progress.
    Polls the DB every 500ms and emits a JobProgress payload until the job
    reaches a terminal state. Then emits one final event and closes.
    """

    async def event_gen():
        last_payload: str | None = None
        while True:
            from scrape.api.db import connect as db_connect
            async with db_connect() as db:
                cur = await db.execute(
                    "SELECT id, status, total, completed, succeeded FROM jobs WHERE id = ? AND user_id = ?",
                    (job_id, user.id),
                )
                row = await cur.fetchone()
            if not row:
                yield {"event": "error", "data": json.dumps({"error": "job not found"})}
                return
            progress = JobProgress(
                job_id=row["id"], status=row["status"],
                total=row["total"], completed=row["completed"], succeeded=row["succeeded"],
            )
            payload = progress.model_dump_json()
            if payload != last_payload:
                yield {"event": "progress", "data": payload}
                last_payload = payload
            if row["status"] in ("completed", "failed", "cancelled"):
                return
            await asyncio.sleep(0.5)

    return EventSourceResponse(event_gen())


@router.get("/{job_id}/fetches", response_model=list[FetchOut])
async def list_job_fetches(
    job_id: str,
    user: UserOut = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
    limit: int = Query(default=200, ge=1, le=2000),
    offset: int = Query(default=0, ge=0),
) -> list[FetchOut]:
    await _load_job_owned(job_id, user, db)
    cur = await db.execute(
        """SELECT id, url, final_url, status, tier_used, block_reason,
                  elapsed_ms, body_size, fetched_at, proxy_bytes, solver_cost_usd
           FROM fetches WHERE job_id = ?
           ORDER BY id DESC LIMIT ? OFFSET ?""",
        (job_id, limit, offset),
    )
    rows = await cur.fetchall()
    return [
        FetchOut(
            id=r["id"], url=r["url"], final_url=r["final_url"], status=r["status"],
            tier_used=r["tier_used"], block_reason=r["block_reason"],
            elapsed_ms=r["elapsed_ms"], body_size=r["body_size"], fetched_at=r["fetched_at"],
            proxy_bytes=r["proxy_bytes"] or 0,
            solver_cost_usd=r["solver_cost_usd"] or 0.0,
        )
        for r in rows
    ]


@router.get("/{job_id}/extracted", response_model=list[ExtractedOut])
async def list_job_extracted(
    job_id: str,
    user: UserOut = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
    limit: int = Query(default=200, ge=1, le=2000),
    offset: int = Query(default=0, ge=0),
) -> list[ExtractedOut]:
    await _load_job_owned(job_id, user, db)
    cur = await db.execute(
        """SELECT id, url, schema_name, data_json, confidence, extracted_at
           FROM extracted WHERE job_id = ?
           ORDER BY id DESC LIMIT ? OFFSET ?""",
        (job_id, limit, offset),
    )
    rows = await cur.fetchall()
    return [
        ExtractedOut(
            id=r["id"], url=r["url"], schema_name=r["schema_name"],
            data=json.loads(r["data_json"]), confidence=r["confidence"],
            extracted_at=r["extracted_at"],
        )
        for r in rows
    ]


@router.get("/{job_id}/export.json")
async def export_json(
    job_id: str,
    user: UserOut = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
) -> Response:
    await _load_job_owned(job_id, user, db)
    cur = await db.execute(
        "SELECT url, data_json, confidence FROM extracted WHERE job_id = ? ORDER BY id",
        (job_id,),
    )
    rows = await cur.fetchall()
    data = [{"url": r["url"], **json.loads(r["data_json"]), "_confidence": r["confidence"]} for r in rows]
    return Response(
        content=json.dumps(data, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=job-{job_id}.json"},
    )


@router.get("/{job_id}/export.csv")
async def export_csv(
    job_id: str,
    user: UserOut = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
) -> StreamingResponse:
    await _load_job_owned(job_id, user, db)
    cur = await db.execute(
        "SELECT url, data_json FROM extracted WHERE job_id = ? ORDER BY id", (job_id,),
    )
    rows = await cur.fetchall()

    # Build column union from all rows
    cols: list[str] = ["url"]
    seen: set[str] = {"url"}
    parsed: list[dict[str, Any]] = []
    for r in rows:
        d = json.loads(r["data_json"])
        d["url"] = r["url"]
        parsed.append(d)
        for k in d:
            if k not in seen:
                cols.append(k)
                seen.add(k)

    def _gen():
        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=cols, extrasaction="ignore")
        writer.writeheader()
        yield buf.getvalue()
        for row_dict in parsed:
            buf.seek(0)
            buf.truncate()
            writer.writerow(row_dict)
            yield buf.getvalue()

    return StreamingResponse(
        _gen(), media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=job-{job_id}.csv"},
    )
