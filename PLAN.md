# World-Class Scraper — Build Plan (April 2026)

## The 2026 Reality

Anti-bot has consolidated into 3 walls stacked per request:
1. **TLS/HTTP fingerprint** — JA3, JA4+, HTTP/2 frame order, Akamai hash
2. **Browser fingerprint** — canvas, WebGL, audio, fonts, navigator, CDP leaks
3. **Behavioral + reputation** — mouse entropy, IP ASN history, session timing

You don't beat them with one trick — you build a tiered escalation pipeline using the cheapest tool that works.

---

## Architecture: 4-Tier Escalation

| Tier | Engine | Latency | ~Cost/req |
|------|--------|---------|-----------|
| 0 | HTTP + TLS impersonation (curl_cffi) | ~50ms | $0.001 |
| 1 | Headless stealth browser (Camoufox/Nodriver) | ~3s | $0.005 |
| 2 | Stealth + CAPTCHA solver (+ CapSolver) | ~15s | $0.02 |
| 3 | Managed unblock API (Scrapfly/Bright Data) | ~20s | $0.05 |

Every URL starts at Tier 0. On block detection (403/429/challenge HTML signature), the orchestrator promotes and re-queues. ~80%+ clear at Tier 0–1.

---

## Component Choices (2026 stack)

| Layer | Primary | Fallback | Why |
|---|---|---|---|
| HTTP client | curl_cffi (Chrome 131 impersonate) | tls-client (Go) | Real curl-impersonate TLS + HTTP/2; matches JA4 + Akamai |
| Stealth browser | Camoufox (Firefox, C++-level patches) | Nodriver (Chrome via raw CDP) | 0% headless score on CreepJS |
| Browser pool | Playwright + Camoufox launcher | SeleniumBase UC | Concurrent contexts, persistent fp/session |
| Proxies | Decodo or IPRoyal residential (~$3.50/GB) | Bright Data + 4G mobile | Mobile only when residential burns |
| CAPTCHA | CapSolver (Turnstile + reCAPTCHA v3) | NopeCHA / 2captcha | Token-based, ~5s avg |
| Geo bypass | Proxy `country=` param | WireGuard via Mullvad/IVPN API | VPN only for whole-network egress |
| Behavior sim | Bezier mouse paths, jittered keystrokes | — | Sourced from recorded sessions |
| HTML→data | Crawl4AI (Markdown for LLM) | Selectolax + CSS | LLM only when schema unknown |
| LLM extraction | Claude Haiku 4.5 (structured output) | Claude Sonnet 4.6 | Prompt caching aggressively |
| Orchestration | Crawlee for Python | asyncio + Redis | Built-in dedup, retry, session pool |
| Queue | Redis Streams | RabbitMQ | Tier-promotion routing |
| Storage | Postgres + S3/R2 + DuckDB | — | Replay capability mandatory |
| Observability | OpenTelemetry → Grafana | — | Per-domain success dashboards |

---

## Wall-by-Wall Approach

- **TLS/JA4** — `curl_cffi.Session(impersonate="chrome131")`; rotate target every N requests
- **Browser fingerprint** — Camoufox spawns Firefox per session with coherent fp bundle (UA + screen + timezone + WebGL + fonts from same real-device profile)
- **CDP leaks** — Camoufox patches `Runtime.enable`, `cdc_*`, `webdriver`, iframe proxy at C++ level
- **Cookies/sessions** — Persist `storage_state` per (proxy, fp, target). Warm on Google/Wikipedia before target. Never share cookies across IPs
- **Cloudflare Turnstile** — Detect → CapSolver token → inject `cf-turnstile-response` → resubmit. Interactive mode also needs real browser fp
- **reCAPTCHA v3** — Score-based; don't "solve", earn it. Fresh residential IP + clean cookie + mouse warm-up. < 0.3 → escalate
- **Geo blocking** — Proxy `?country=de&city=berlin&session=abc` solves 99%. WireGuard only for non-HTTP fingerprinting

---

## Project Layout

```
scrape/
├── core/
│   ├── http_client.py      # curl_cffi pool, JA4 rotation
│   ├── browser_pool.py     # Camoufox/Nodriver launchers, fp bundles
│   ├── proxy_manager.py    # provider abstraction, sticky sessions, health
│   ├── captcha.py          # CapSolver + NopeCHA adapters
│   ├── tier_router.py      # escalation + block detection
│   └── session_store.py    # cookie/storage_state per (proxy, fp, host)
├── extractors/
│   ├── markdown.py         # Crawl4AI wrapper
│   ├── llm_schema.py       # Claude structured output + caching
│   └── selectors/          # site-specific fast paths
├── pipelines/
│   ├── crawler.py          # Crawlee entrypoint
│   ├── enrich.py
│   └── sink.py             # Postgres + S3
├── ops/
│   ├── compose.yml         # Redis, Postgres, OTel, Grafana
│   ├── dashboards/
│   └── alerts.yml
├── fingerprints/           # captured real-device profiles
└── tests/
    ├── arena/              # bot.sannysoft.com, creepjs, fingerprint.com
    └── targets/            # per-site smoke tests
```

---

## Phased Build (4 weeks)

**Phase 1 — Skeleton + Tier 0 (week 1)**
curl_cffi wrapper, proxy manager (one provider), Redis queue, Postgres schema, CLI. Validate on 3 unprotected sites.

**Phase 2 — Tier 1 stealth browser (week 2)**
Camoufox + Playwright integration. Fingerprint bundle store. `tier_router` with block detectors. Validate on Cloudflare-Free / DataDome-light.

**Phase 3 — CAPTCHA + behavior (week 3)**
CapSolver for Turnstile + reCAPTCHA v3. Bezier mouse, scroll, keystroke from recorded sessions. Validate on Cloudflare Managed Challenge.

**Phase 4 — Extraction + ops (week 4)**
Crawl4AI pipeline, Claude Haiku schema extractor + prompt caching, OTel + Grafana, alerting. 100k-page benchmark; tune tier thresholds.

---

## Hard Choices

1. **Python over Node** — curl_cffi, Camoufox, Crawl4AI, Crawlee Python all native
2. **Hybrid: self-host Tier 0–2, buy Tier 3** — pure managed is 10–50× cost; pure DIY is a maintenance war
3. **Residential default, mobile only ~5%** — mobile is 4–8× cost
4. **LLM only for unknown schemas** — hand CSS still 100× cheaper for known sites; cache LLM prompts

---

## Legal/Ethical Guardrails

- Honor robots.txt by default; per-target override with audit log
- Rate-limit per origin (start 1 req/sec/IP)
- No PII scraping without lawful basis (GDPR/CCPA enforced in 2026 against scrapers, not just operators)
- Only ethically-sourced proxy providers (Bright Data, Decodo, IPRoyal publish audits)
- Don't bypass paywalls/auth — anti-bot bypass on public content only
- Project licensed under the Apache License, Version 2.0 (see `LICENSE`)

---

## Open Questions (answer before Phase 1)

1. Target profile — sites/categories?
2. Volume — pages/day at steady state?
3. Budget ceiling — sets Tier 3 cap + proxy tier
4. Output shape — raw HTML + Markdown, or structured rows in defined schema?
5. Scale target — single box, or k8s from day one?
