import sqlite3
from datetime import UTC, datetime

import pytest

from scrape.config import StorageConfig
from scrape.models import BlockReason, ExtractedRecord, FetchResult, Tier
from scrape.pipelines.storage import Storage

pytestmark = pytest.mark.asyncio


async def test_roundtrip_fetch_and_extracted(tmp_data_dir):
    cfg = StorageConfig(sqlite_path=tmp_data_dir / "test.db", raw_html_dir=tmp_data_dir / "raw")
    async with Storage(cfg) as store:
        result = FetchResult(
            url="https://x/y", final_url="https://x/y",
            status=200, body=b"<html>hi</html>", elapsed_ms=42,
            tier_used=Tier.HTTP, block_reason=BlockReason.NONE,
            fetched_at=datetime.now(UTC),
        )
        sha = await store.save_fetch(result)
        assert sha is not None and len(sha) == 64

        record = ExtractedRecord(
            url="https://x/y", schema_name="test",
            data={"k": "v"}, confidence=0.9,
        )
        rid = await store.save_extracted(record)
        assert rid > 0

        s = await store.stats()
        assert s["total_fetches"] == 1
        assert s["successful"] == 1
        assert s["success_rate"] == 1.0

        with sqlite3.connect(cfg.sqlite_path) as db:
            fetch_job_id = db.execute("SELECT job_id FROM fetches").fetchone()[0]
            extracted_job_id = db.execute("SELECT job_id FROM extracted").fetchone()[0]
        assert fetch_job_id is None
        assert extracted_job_id is None


async def test_job_id_is_stored_with_rows(tmp_data_dir):
    cfg = StorageConfig(sqlite_path=tmp_data_dir / "jobs.db", raw_html_dir=tmp_data_dir / "raw")
    async with Storage(cfg) as store:
        result = FetchResult(
            url="https://x/job",
            final_url="https://x/job",
            status=200,
            body=b"<html>job</html>",
            elapsed_ms=12,
            tier_used=Tier.HTTP,
            block_reason=BlockReason.NONE,
            fetched_at=datetime.now(UTC),
        )
        await store.save_fetch(result, job_id="job-123")
        await store.save_extracted(
            ExtractedRecord(url="https://x/job", schema_name="test", data={"ok": True}),
            job_id="job-123",
        )

    with sqlite3.connect(cfg.sqlite_path) as db:
        assert db.execute("SELECT job_id FROM fetches").fetchone()[0] == "job-123"
        assert db.execute("SELECT job_id FROM extracted").fetchone()[0] == "job-123"


async def test_dedupe_raw_html_by_sha(tmp_data_dir):
    cfg = StorageConfig(sqlite_path=tmp_data_dir / "t.db", raw_html_dir=tmp_data_dir / "raw")
    async with Storage(cfg) as store:
        body = b"<html>same</html>"
        for i in range(3):
            r = FetchResult(
                url=f"https://x/{i}", final_url=f"https://x/{i}",
                status=200, body=body, elapsed_ms=10, tier_used=Tier.HTTP,
                block_reason=BlockReason.NONE,
            )
            await store.save_fetch(r)
        # Only one file should exist on disk
        files = list(cfg.raw_html_dir.rglob("*.html"))
        assert len(files) == 1
