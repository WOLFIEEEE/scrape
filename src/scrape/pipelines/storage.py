"""Storage layer.

- SQLite for fetch metadata + extracted records (single-box default).
- Filesystem for raw HTML, content-addressed by sha256 (deduplicates exact
  duplicates and gives free integrity checks).

Schema is intentionally simple. Migration to Postgres is a connection-string
swap if the project grows.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import aiosqlite

from scrape.config import StorageConfig
from scrape.logging import get_logger
from scrape.models import ExtractedRecord, FetchResult

log = get_logger(__name__)

_SCHEMA = """
CREATE TABLE IF NOT EXISTS fetches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT,
    url TEXT NOT NULL,
    final_url TEXT NOT NULL,
    status INTEGER NOT NULL,
    tier_used INTEGER NOT NULL,
    block_reason TEXT NOT NULL,
    proxy_used TEXT,
    fingerprint_id TEXT,
    elapsed_ms INTEGER NOT NULL,
    body_sha256 TEXT,
    body_size INTEGER,
    fetched_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fetches_job_id ON fetches(job_id);
CREATE INDEX IF NOT EXISTS idx_fetches_url ON fetches(url);
CREATE INDEX IF NOT EXISTS idx_fetches_fetched_at ON fetches(fetched_at);

CREATE TABLE IF NOT EXISTS extracted (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT,
    url TEXT NOT NULL,
    schema_name TEXT NOT NULL,
    data_json TEXT NOT NULL,
    confidence REAL NOT NULL,
    extracted_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_extracted_job_id ON extracted(job_id);
CREATE INDEX IF NOT EXISTS idx_extracted_url ON extracted(url);
CREATE INDEX IF NOT EXISTS idx_extracted_schema ON extracted(schema_name);
"""

_MIGRATIONS = (
    ("fetches.job_id", "ALTER TABLE fetches ADD COLUMN job_id TEXT"),
    ("extracted.job_id", "ALTER TABLE extracted ADD COLUMN job_id TEXT"),
    ("idx_fetches_job_id", "CREATE INDEX IF NOT EXISTS idx_fetches_job_id ON fetches(job_id)"),
    (
        "idx_extracted_job_id",
        "CREATE INDEX IF NOT EXISTS idx_extracted_job_id ON extracted(job_id)",
    ),
)


class Storage:
    def __init__(self, cfg: StorageConfig):
        self._cfg = cfg
        self._db_path = cfg.sqlite_path
        self._raw_dir = cfg.raw_html_dir
        self._raw_dir.mkdir(parents=True, exist_ok=True)
        self._db: aiosqlite.Connection | None = None

    async def __aenter__(self) -> Storage:
        self._db = await aiosqlite.connect(self._db_path)
        await self._db.executescript(_SCHEMA)
        for desc, sql in _MIGRATIONS:
            try:
                await self._db.execute(sql)
            except aiosqlite.OperationalError as e:
                if "duplicate column" not in str(e):
                    log.debug("storage.migration_skip", step=desc, reason=str(e))
        await self._db.commit()
        return self

    async def __aexit__(self, *exc: object) -> None:
        if self._db is not None:
            await self._db.close()
            self._db = None

    def _raw_path(self, sha: str) -> Path:
        # Two-level fanout to keep per-dir file count manageable
        return self._raw_dir / sha[:2] / sha[2:4] / f"{sha}.html"

    async def save_fetch(self, result: FetchResult, job_id: str | None = None) -> str | None:
        assert self._db is not None
        sha: str | None = None
        if result.body:
            sha = hashlib.sha256(result.body).hexdigest()
            path = self._raw_path(sha)
            if not path.exists():
                path.parent.mkdir(parents=True, exist_ok=True)
                # Write as bytes to preserve original encoding
                path.write_bytes(result.body)
        await self._db.execute(
            """
            INSERT INTO fetches (
                job_id, url, final_url, status, tier_used, block_reason,
                proxy_used, fingerprint_id, elapsed_ms, body_sha256,
                body_size, fetched_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                job_id,
                result.url,
                result.final_url,
                result.status,
                int(result.tier_used),
                result.block_reason.value,
                result.proxy_used,
                result.fingerprint_id,
                result.elapsed_ms,
                sha,
                len(result.body),
                result.fetched_at.isoformat(),
            ),
        )
        await self._db.commit()
        return sha

    async def save_extracted(self, record: ExtractedRecord, job_id: str | None = None) -> int:
        assert self._db is not None
        cur = await self._db.execute(
            """
            INSERT INTO extracted (job_id, url, schema_name, data_json, confidence, extracted_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                job_id,
                record.url,
                record.schema_name,
                json.dumps(record.data, default=str),
                record.confidence,
                record.extracted_at.isoformat(),
            ),
        )
        await self._db.commit()
        return cur.lastrowid or 0

    async def stats(self) -> dict[str, int | float]:
        assert self._db is not None
        cur = await self._db.execute(
            """
            SELECT COUNT(*),
                   SUM(CASE WHEN status >= 200 AND status < 400 THEN 1 ELSE 0 END),
                   AVG(elapsed_ms)
            FROM fetches
            """
        )
        row = await cur.fetchone()
        total, ok, avg_ms = row if row else (0, 0, 0)
        return {
            "total_fetches": int(total or 0),
            "successful": int(ok or 0),
            "success_rate": (ok / total) if total else 0.0,
            "avg_elapsed_ms": float(avg_ms or 0.0),
        }
