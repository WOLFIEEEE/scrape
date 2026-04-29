"""Detect CAPTCHA on a loaded page, solve via external solver, inject token, resubmit.

Currently handles Cloudflare Turnstile and reCAPTCHA v3 — the two that
ship invisible tokens that can be replayed by injection.
hCaptcha visual challenges need the browser to actually click — left as TODO.
"""
from __future__ import annotations

import asyncio
import contextlib
import re
import time
from typing import Any

from scrape.core.captcha import CaptchaSolver, SolveRequest
from scrape.logging import get_logger
from scrape.models import BlockReason, FetchRequest, FetchResult, Tier

log = get_logger(__name__)

_TURNSTILE_SITEKEY = re.compile(r'data-sitekey="([0-9A-Za-z_-]+)"')
_RECAPTCHA_SITEKEY = re.compile(r'data-sitekey="([0-9A-Za-z_-]{30,})"')
# Page <title> patterns that mean "this is still a challenge page". Used as
# the more reliable signal than body substring scans.
_CHALLENGE_TITLE_RE = re.compile(
    r"just a moment|please wait|verification|access (?:to this page )?has been denied|attention required",
    re.IGNORECASE,
)


async def _find_sitekey(page: Any, pattern: re.Pattern[str]) -> str | None:
    html = await page.content()
    m = pattern.search(html)
    return m.group(1) if m else None


# Cloudflare-published test sitekeys. Real solvers refuse these because they
# do not correspond to a customer site — submitting them wastes balance. Skip
# locally so we don't return a misleading "captcha solver failed" result.
_CF_TEST_SITEKEYS = {
    "1x00000000000000000000AA",  # always passes
    "2x00000000000000000000AB",  # always blocks
    "3x00000000000000000000FF",  # always interactive
}


async def solve_in_browser(
    browser_session: Any,
    req: FetchRequest,
    solver: CaptchaSolver,
) -> FetchResult:
    """Navigate, detect challenge type, fetch token, inject, await success.

    Resilient by design: solver/network failures are surfaced as a non-OK
    FetchResult with block_reason=CAPTCHA_REQUIRED so the orchestrator can
    escalate to Tier 3 instead of crashing the job.
    """
    url = str(req.url)
    page = await browser_session._context.new_page()
    start = time.perf_counter()
    token: str | None = None
    error_note: str | None = None
    solver_cost_usd: float = 0.0
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=45_000)
        # Give challenge widgets time to render
        await asyncio.sleep(2)
        html = await page.content()

        # Operator can pin the kind via FetchRequest.captcha_hint when our
        # auto-detection regex would miss the widget (e.g. hCaptcha rendered
        # via shadow DOM, or a SPA that lazy-loads the iframe).
        hint = req.captcha_hint
        is_turnstile = (hint == "turnstile") or (
            hint is None and ("cf-turnstile" in html or "challenges.cloudflare.com" in html)
        )
        is_recaptcha = (hint == "recaptcha_v3") or (hint is None and "g-recaptcha" in html)
        is_hcaptcha = (hint == "hcaptcha") or (hint is None and "hcaptcha.com" in html)

        if is_turnstile:
            sitekey = await _find_sitekey(page, _TURNSTILE_SITEKEY)
            if sitekey and sitekey in _CF_TEST_SITEKEYS:
                log.info("captcha.skipped_test_sitekey", sitekey=sitekey)
                error_note = f"refused-test-sitekey:{sitekey}"
            elif sitekey:
                log.info("captcha.found", kind="turnstile", sitekey=sitekey[:8])
                try:
                    solution = await solver.solve(SolveRequest(
                        kind="turnstile", site_url=url, site_key=sitekey,
                        user_agent=browser_session.profile.user_agent,
                    ))
                    token = solution.token
                    solver_cost_usd += solution.cost_estimate_usd
                    await page.evaluate(
                        """(token) => {
                            const fields = document.querySelectorAll('[name="cf-turnstile-response"], [name="cfTurnstileResponse"]');
                            fields.forEach(f => { f.value = token; });
                            if (window.turnstile && typeof window.turnstile.getResponse === 'function') {
                                try { window.turnstile.execute(); } catch(e) {}
                            }
                        }""",
                        token,
                    )
                    with contextlib.suppress(Exception):
                        await page.wait_for_load_state("networkidle", timeout=8_000)
                except Exception as e:
                    error_note = f"solver-error:{type(e).__name__}:{str(e)[:120]}"
                    log.warning("captcha.solver_failed", kind="turnstile", error=error_note)

        elif is_recaptcha:
            sitekey = await _find_sitekey(page, _RECAPTCHA_SITEKEY)
            if sitekey:
                log.info("captcha.found", kind="recaptcha_v3", sitekey=sitekey[:8])
                try:
                    solution = await solver.solve(SolveRequest(
                        kind="recaptcha_v3", site_url=url, site_key=sitekey,
                        action="verify", min_score=0.7,
                    ))
                    token = solution.token
                    solver_cost_usd += solution.cost_estimate_usd
                    await page.evaluate(
                        """(token) => {
                            const ta = document.querySelector('textarea[name="g-recaptcha-response"]');
                            if (ta) ta.value = token;
                        }""",
                        token,
                    )
                    with contextlib.suppress(Exception):
                        await page.wait_for_load_state("networkidle", timeout=8_000)
                except Exception as e:
                    error_note = f"solver-error:{type(e).__name__}:{str(e)[:120]}"
                    log.warning("captcha.solver_failed", kind="recaptcha_v3", error=error_note)

        elif is_hcaptcha:
            sitekey = await _find_sitekey(page, _RECAPTCHA_SITEKEY)
            if sitekey:
                log.info("captcha.found", kind="hcaptcha", sitekey=sitekey[:8])
                try:
                    solution = await solver.solve(SolveRequest(
                        kind="hcaptcha", site_url=url, site_key=sitekey,
                    ))
                    token = solution.token
                    solver_cost_usd += solution.cost_estimate_usd
                    await page.evaluate(
                        """(token) => {
                            const fields = document.querySelectorAll('[name="h-captcha-response"], textarea[name="h-captcha-response"]');
                            fields.forEach(f => { f.value = token; });
                        }""",
                        token,
                    )
                    with contextlib.suppress(Exception):
                        await page.wait_for_load_state("networkidle", timeout=8_000)
                except Exception as e:
                    error_note = f"solver-error:{type(e).__name__}:{str(e)[:120]}"
                    log.warning("captcha.solver_failed", kind="hcaptcha", error=error_note)

        # Final body — may be the original challenge page (if we couldn't solve)
        # or the post-redirect content (if the site auto-submitted on injection).
        body = (await page.content()).encode("utf-8")
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        # Use the page <title> as the challenge signal. Body-substring checks
        # for 'cf-turnstile' false-positive on real pages whose JS bundles
        # mention Turnstile in unrelated code (Indeed, several SaaS sites).
        try:
            page_title = (await page.title()) or ""
        except Exception:
            page_title = ""
        still_challenged = bool(_CHALLENGE_TITLE_RE.search(page_title))
        passed = bool(token) and not still_challenged
        return FetchResult(
            url=url,
            final_url=page.url,
            status=200 if passed else 403,
            body=body,
            elapsed_ms=elapsed_ms,
            tier_used=Tier.CAPTCHA,
            proxy_used=browser_session._proxy_url,
            fingerprint_id=browser_session.profile.name,
            block_reason=BlockReason.NONE if passed else BlockReason.CAPTCHA_REQUIRED,
            headers={"x-scrape-captcha-note": error_note} if error_note else {},
            solver_cost_usd=solver_cost_usd,
        )
    except Exception as e:
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        log.warning("captcha.flow_failed", url=url, error=str(e)[:200])
        return FetchResult(
            url=url, final_url=url, status=0, body=b"",
            elapsed_ms=elapsed_ms, tier_used=Tier.CAPTCHA,
            proxy_used=browser_session._proxy_url,
            fingerprint_id=browser_session.profile.name,
            block_reason=BlockReason.NETWORK,
        )
    finally:
        with contextlib.suppress(Exception):
            await page.close()
