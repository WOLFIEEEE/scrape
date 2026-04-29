"""CAPTCHA solver adapter — CapSolver primary, with a clean interface for swap-out.

CapSolver REST flow (2026):
  POST /createTask  -> taskId
  POST /getTaskResult { taskId }  -> poll until status='ready'

Supported task types we use:
  - AntiTurnstileTaskProxyLess  (Cloudflare Turnstile)
  - ReCaptchaV3TaskProxyLess    (reCAPTCHA v3, score-based)
  - HCaptchaTurboTask           (hCaptcha)
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any, Literal, Protocol

import httpx

from scrape.logging import get_logger

log = get_logger(__name__)

CaptchaKind = Literal["turnstile", "recaptcha_v3", "hcaptcha"]

CAPSOLVER_BASE = "https://api.capsolver.com"

# Approximate CapSolver pricing as of 2026, USD per solve. Used as a fallback
# when the API response doesn't include a price. Update when CapSolver changes
# their rate card; never trust hardcoded numbers as gospel — the per-task cost
# returned by /getTaskResult is authoritative when present.
_DEFAULT_COST_USD: dict[str, float] = {
    "turnstile": 0.0008,
    "recaptcha_v3": 0.0010,
    "hcaptcha": 0.0008,
}


@dataclass
class SolveRequest:
    kind: CaptchaKind
    site_url: str
    site_key: str
    action: str | None = None       # reCAPTCHA v3
    min_score: float | None = None  # reCAPTCHA v3
    user_agent: str | None = None


@dataclass
class SolveResult:
    token: str
    elapsed_s: float
    cost_estimate_usd: float = 0.0


class CaptchaSolver(Protocol):
    async def solve(self, req: SolveRequest) -> SolveResult: ...


class CapSolver:
    def __init__(self, api_key: str, timeout_s: int = 120):
        self._api_key = api_key
        self._timeout_s = timeout_s

    def _payload(self, req: SolveRequest) -> dict[str, Any]:
        if req.kind == "turnstile":
            task: dict[str, Any] = {
                "type": "AntiTurnstileTaskProxyLess",
                "websiteURL": req.site_url,
                "websiteKey": req.site_key,
            }
            if req.user_agent:
                task["userAgent"] = req.user_agent
        elif req.kind == "recaptcha_v3":
            task = {
                "type": "ReCaptchaV3TaskProxyLess",
                "websiteURL": req.site_url,
                "websiteKey": req.site_key,
                "pageAction": req.action or "verify",
                "minScore": req.min_score or 0.7,
            }
        elif req.kind == "hcaptcha":
            task = {
                "type": "HCaptchaTurboTask",
                "websiteURL": req.site_url,
                "websiteKey": req.site_key,
            }
        else:  # pragma: no cover - exhausted by Literal
            raise ValueError(f"unknown captcha kind: {req.kind}")
        return {"clientKey": self._api_key, "task": task}

    async def solve(self, req: SolveRequest) -> SolveResult:
        if not self._api_key:
            raise RuntimeError("CapSolver API key not configured (CAPSOLVER_API_KEY)")
        start = asyncio.get_event_loop().time()
        async with httpx.AsyncClient(base_url=CAPSOLVER_BASE, timeout=30) as client:
            create = await client.post("/createTask", json=self._payload(req))
            create.raise_for_status()
            data = create.json()
            if data.get("errorId"):
                raise RuntimeError(f"CapSolver createTask error: {data.get('errorDescription')}")
            task_id = data["taskId"]
            log.info("captcha.task_created", kind=req.kind, task_id=task_id)
            poll_payload = {"clientKey": self._api_key, "taskId": task_id}
            deadline = start + self._timeout_s
            while True:
                await asyncio.sleep(2)
                if asyncio.get_event_loop().time() > deadline:
                    raise TimeoutError(f"CapSolver timed out after {self._timeout_s}s")
                got = await client.post("/getTaskResult", json=poll_payload)
                got.raise_for_status()
                gd = got.json()
                if gd.get("errorId"):
                    raise RuntimeError(f"CapSolver pollError: {gd.get('errorDescription')}")
                status = gd.get("status")
                if status == "ready":
                    sol = gd["solution"]
                    token = (
                        sol.get("token")
                        or sol.get("gRecaptchaResponse")
                        or sol.get("captchaToken")
                    )
                    if not token:
                        raise RuntimeError(f"CapSolver missing token in solution: {sol}")
                    elapsed = asyncio.get_event_loop().time() - start
                    # CapSolver returns per-task cost when available
                    cost = float(gd.get("price") or sol.get("cost") or _DEFAULT_COST_USD.get(req.kind, 0.001))
                    log.info(
                        "captcha.solved", kind=req.kind,
                        elapsed_s=round(elapsed, 1), cost_usd=cost,
                    )
                    return SolveResult(token=token, elapsed_s=elapsed, cost_estimate_usd=cost)


class NullCaptchaSolver:
    """Used when no API key is configured — fails fast and loud."""

    async def solve(self, req: SolveRequest) -> SolveResult:
        raise RuntimeError(
            "No CAPTCHA solver configured. Set CAPSOLVER_API_KEY or inject a custom solver."
        )
