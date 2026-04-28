"""Usage metering + quota enforcement.

Each user has a plan (free / pro / scale). Each plan has a monthly fetch quota.
Counted per calendar month (UTC). Enforced at job creation time and at
each fetch — the runner checks before incurring cost.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

import aiosqlite

PLANS: dict[str, dict[str, int]] = {
    "free": {"monthly_fetches": 10_000, "concurrent_jobs": 1},
    "pro": {"monthly_fetches": 250_000, "concurrent_jobs": 10},
    "scale": {"monthly_fetches": 2_500_000, "concurrent_jobs": 999},
}


def month_key(now: datetime | None = None) -> str:
    n = now or datetime.now(UTC)
    return n.strftime("%Y-%m")


@dataclass
class UsageSnapshot:
    plan: str
    quota: int
    used: int
    remaining: int
    period: str

    @property
    def percent(self) -> float:
        return round((self.used / self.quota) * 100, 1) if self.quota else 0.0

    @property
    def over_quota(self) -> bool:
        return self.used >= self.quota


async def current_usage(db: aiosqlite.Connection, user_id: int, plan: str = "free") -> UsageSnapshot:
    period = month_key()
    cur = await db.execute(
        """SELECT COUNT(*) AS used FROM fetches
           WHERE job_id IN (SELECT id FROM jobs WHERE user_id = ?)
             AND substr(fetched_at, 1, 7) = ?""",
        (user_id, period),
    )
    row = await cur.fetchone()
    used = int(row["used"] or 0) if row else 0
    quota = PLANS.get(plan, PLANS["free"])["monthly_fetches"]
    return UsageSnapshot(
        plan=plan, quota=quota, used=used,
        remaining=max(0, quota - used), period=period,
    )


async def concurrent_running(db: aiosqlite.Connection, user_id: int) -> int:
    cur = await db.execute(
        "SELECT COUNT(*) AS c FROM jobs WHERE user_id = ? AND status IN ('pending','running')",
        (user_id,),
    )
    row = await cur.fetchone()
    return int(row["c"] or 0) if row else 0
