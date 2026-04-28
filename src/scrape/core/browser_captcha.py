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


async def _find_sitekey(page: Any, pattern: re.Pattern[str]) -> str | None:
    html = await page.content()
    m = pattern.search(html)
    return m.group(1) if m else None


async def solve_in_browser(
    browser_session: Any,
    req: FetchRequest,
    solver: CaptchaSolver,
) -> FetchResult:
    """Navigate, detect challenge type, fetch token, inject, await success."""
    url = str(req.url)
    page = await browser_session._context.new_page()
    start = time.perf_counter()
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=45_000)
        # Give challenge widgets time to render
        await asyncio.sleep(2)
        html = await page.content()

        token: str | None = None

        if "cf-turnstile" in html or "challenges.cloudflare.com" in html:
            sitekey = await _find_sitekey(page, _TURNSTILE_SITEKEY)
            if sitekey:
                log.info("captcha.found", kind="turnstile", sitekey=sitekey[:8])
                solution = await solver.solve(SolveRequest(
                    kind="turnstile", site_url=url, site_key=sitekey,
                    user_agent=browser_session.profile.user_agent,
                ))
                token = solution.token
                # Inject token into the hidden response field. Multiple frameworks
                # use cf-turnstile-response; sites may also rename it.
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
                # Many sites then auto-submit. Wait briefly for navigation.
                with contextlib.suppress(Exception):
                    await page.wait_for_load_state("networkidle", timeout=8_000)

        elif "g-recaptcha" in html:
            sitekey = await _find_sitekey(page, _RECAPTCHA_SITEKEY)
            if sitekey:
                log.info("captcha.found", kind="recaptcha_v3", sitekey=sitekey[:8])
                solution = await solver.solve(SolveRequest(
                    kind="recaptcha_v3", site_url=url, site_key=sitekey,
                    action="verify", min_score=0.7,
                ))
                token = solution.token
                await page.evaluate(
                    """(token) => {
                        const ta = document.querySelector('textarea[name="g-recaptcha-response"]');
                        if (ta) ta.value = token;
                    }""",
                    token,
                )

        body = (await page.content()).encode("utf-8")
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        return FetchResult(
            url=url,
            final_url=page.url,
            status=200 if token else 403,
            body=body,
            elapsed_ms=elapsed_ms,
            tier_used=Tier.CAPTCHA,
            proxy_used=browser_session._proxy_url,
            fingerprint_id=browser_session.profile.name,
            block_reason=BlockReason.NONE if token else BlockReason.CAPTCHA_REQUIRED,
        )
    finally:
        with contextlib.suppress(Exception):
            await page.close()
