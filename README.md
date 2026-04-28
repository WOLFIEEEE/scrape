<div align="center">

# Scrape

**The web, excavated.**

Production-grade web scraping infrastructure — tiered escalation through anti-bot, residential proxies, CAPTCHA solving, and AI extraction. Self-hostable, ethical-by-default, built for the 2026 web.

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-c14a1a.svg)](LICENSE)
[![Python: 3.12+](https://img.shields.io/badge/Python-3.12%2B-0a0908.svg)](https://www.python.org/)
[![Next.js: 15](https://img.shields.io/badge/Next.js-15-0a0908.svg)](https://nextjs.org/)
[![Tests: 48 passing](https://img.shields.io/badge/Tests-48_passing-a3ff12.svg)](#testing)

[Features](#features) · [Quickstart](#quickstart) · [Architecture](#architecture) · [API](#rest-api) · [Configuration](#configuration) · [Deployment](#deployment)

</div>

---

## Why this exists

Every team rebuilds the same web-scraping stack: anti-bot bypass, proxy rotator, CAPTCHA glue, "why is the success rate dropping?" dashboard. Scrape ships that stack so you don't have to.

Every URL starts at the **cheapest tier** (~50ms HTTP) and only escalates when blocked. Most pages never leave Tier 0. The expensive pieces — headless browser, CAPTCHA solver, managed unblock — only fire when the page actually fights back.

## Features

### Anti-bot bypass
- **Real-Chrome TLS** (JA3 / JA4+, HTTP/2 frame ordering, Akamai hash) via `curl_cffi`
- **Stealth browsers** — Camoufox (Firefox + C++-level patches) with coherent fingerprint bundles
- **Behavioral simulation** — Bezier mouse paths, jittered scroll, variable typing cadence
- **Session persistence** scoped per `(proxy, fingerprint, host)` — never share cookies across IPs

### Proxies & geography
- Provider abstraction — Decodo, IPRoyal, Bright Data, Oxylabs, custom — switch with one env var
- Sticky residential sessions, health-scored, auto-cooldown after 3 consecutive failures
- ISO-2 country pinning per job

### CAPTCHA solving
- Cloudflare Turnstile, reCAPTCHA v3, hCaptcha — solved in ~5s via CapSolver
- Token injection automated; pluggable solver interface

### Extraction
- Per-site CSS selectors (~100× cheaper than LLM for known schemas)
- **Pluggable LLM backend** — Anthropic Claude (paid, with prompt caching) **or** local **Ollama** (free, self-hosted) via the same `extract()` interface
- Confidence scoring on every row

### Self-hosted alternatives to paid services
- **Ollama** (free, in-container) replaces Anthropic — drop in `qwen2.5:7b`, `llama3.1:8b`, `phi3.5:3.8b`, or `numind/nuextract-2:7b`
- **FlareSolverr** (free, in-container) replaces paid CAPTCHA / unblock services for Cloudflare Managed Challenge as a Tier 3 fallback
- Set `LLM_BACKEND=ollama` and `UNBLOCK_PROVIDER=flaresolverr` to run with **zero paid third-party services**
- Both ship in [`ops/compose.yml`](ops/compose.yml) under the `selfhost` profile: `docker compose -f ops/compose.yml --profile selfhost up`

### Web app
- Multi-tenant FastAPI + Next.js 15 dashboard
- JWT cookie auth + bearer-token API keys
- Webhooks (HMAC-signed), Server-Sent Events for live progress
- Per-plan quotas, usage metering, password reset, settings UI
- ⌘K command palette, custom 404/error pages, live `/api/health` indicator

## Quickstart

```bash
# 1. Install dependencies
uv sync                                # Python
cd web && pnpm install && cd ..        # Frontend

# 2. Run your first crawl from the CLI (no API keys required)
uv run scrape selftest

# 3. Or boot the full web stack
uv run scrape-api &                    # FastAPI on :8000
cd web && pnpm dev                     # Next.js on :3000
```

Open <http://localhost:3000> → register an account (the first user becomes admin) → click **New Job** → paste a few URLs from `books.toscrape.com` and watch live progress stream into the dashboard.

## Architecture

```
URL ─→ HostRateLimiter ─→ TierRouter ─→ ┬── Tier 0: HttpClient (curl_cffi)
                              ▲          ├── Tier 1: BrowserPool (Camoufox)
                              │          ├── Tier 2: Browser + CapSolver
                              │          └── Tier 3: UnblockProvider
                              │                    │
                              ▼                    ▼
                        BlockDetector       SessionStore
                        (challenge HTML,    cookies / storage_state
                         status, headers)   per (proxy, fp, host)
                                                    │
                                                    ▼
                                              Extractor
                                              CSS → fallback to LLM
                                                    │
                                                    ▼
                                              Storage
                                              SQLite + content-addressed raw HTML
```

### The four strata

| Stratum | Engine | Latency | ~Cost / page | When it fires |
|---------|--------|---------|--------------|---------------|
| **0 · Surface**     | `curl_cffi` (real Chrome TLS)         | ~50ms | $0.001 | Default — every URL starts here |
| **1 · Subsurface**  | Camoufox / Playwright (stealth Firefox) | ~3s   | $0.005 | Tier 0 returns a challenge or empty body |
| **2 · Deep**        | Browser + CapSolver (Turnstile / reCAPTCHA) | ~15s  | $0.02  | Tier 1 sees a CAPTCHA |
| **3 · Bedrock**     | Managed unblock fallback (Scrapfly / Bright Data) | ~20s  | $0.05  | Last resort — rate-limited or 4xx/5xx |

## Project layout

```
scrape/
├── src/scrape/
│   ├── api/              FastAPI multi-tenant service (auth, jobs, keys, webhooks)
│   ├── core/             HTTP client · browser pool · CAPTCHA · proxies · router
│   ├── extractors/       Markdown · LLM schema · per-site selectors
│   ├── fingerprints/     Coherent device profiles (UA + screen + timezone + locale)
│   ├── pipelines/        Orchestrator · storage · Prometheus metrics
│   ├── cli.py            Typer CLI: crawl · stats · selftest
│   └── config.py         Typed pydantic-settings env loading
├── web/
│   ├── app/(marketing)/  Landing · features · pricing · use-cases · docs · blog
│   ├── app/dashboard/    Authed app — overview · stats · usage
│   ├── app/jobs/         List · create · live detail with SSE + tabs
│   ├── app/settings/     Profile · password · API keys · webhooks · usage
│   ├── components/       UI primitives + command palette + onboarding
│   └── lib/api.ts        Typed API client
├── tests/                48 passing · unit + live integration + API e2e
├── ops/                  docker-compose · Prometheus · Grafana
├── examples/             Sample LLM extraction schemas
├── PLAN.md               Full design rationale & 2026 stack research
├── LICENSE               Apache-2.0
└── README.md
```

## REST API

The FastAPI service serves OpenAPI 3.1 at `/openapi.json` and Swagger UI at `/docs`.

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/forgot          { email }
POST   /api/auth/reset           { token, new_password }

POST   /api/account/password     { current_password, new_password }
PATCH  /api/account/profile      { name }
DELETE /api/account              hard-delete (cascades)

GET    /api/keys                 list bearer tokens
POST   /api/keys                 create — secret returned once
DELETE /api/keys/{id}            revoke

GET    /api/webhooks
POST   /api/webhooks             { url, events[] }
DELETE /api/webhooks/{id}

GET    /api/usage                plan · quota · used · concurrent

GET    /api/jobs                 list
POST   /api/jobs                 create (quota-enforced)
GET    /api/jobs/{id}
DELETE /api/jobs/{id}
POST   /api/jobs/{id}/cancel
POST   /api/jobs/{id}/duplicate  re-run with same params
GET    /api/jobs/{id}/events     Server-Sent Events
GET    /api/jobs/{id}/fetches
GET    /api/jobs/{id}/extracted
GET    /api/jobs/{id}/export.json
GET    /api/jobs/{id}/export.csv
```

Authenticate with the `auth_token` cookie (set on login) **or** an `Authorization: Bearer sk_live_...` header.

## Configuration

All settings are env vars; copy [`.env.example`](.env.example) → `.env`.

```env
# Service
SCRAPE_ENV=dev
SCRAPE_JWT_SECRET=                 # required when SCRAPE_ENV=prod
SCRAPE_COOKIE_SECURE=0
SCRAPE_CORS_ORIGINS=http://localhost:3000

# Proxy provider — none / decodo / iproyal / brightdata / custom
PROXY_PROVIDER=none
PROXY_ENDPOINT=
PROXY_USERNAME=
PROXY_PASSWORD=
PROXY_COUNTRY=
PROXY_STICKY_SESSION_MINUTES=10

# CAPTCHA solver
CAPSOLVER_API_KEY=

# LLM extraction — pluggable backend
LLM_BACKEND=none                   # none | anthropic | ollama | auto
ANTHROPIC_API_KEY=                 # only for backend=anthropic | auto
ANTHROPIC_MODEL_FAST=claude-haiku-4-5-20251001
ANTHROPIC_MODEL_SMART=claude-sonnet-4-6
LLM_OLLAMA_URL=http://localhost:11434   # backend=ollama
LLM_OLLAMA_MODEL=qwen2.5:7b

# Tier-3 unblock fallback — open-source FlareSolverr or paid managed
UNBLOCK_PROVIDER=none              # none | flaresolverr
UNBLOCK_ENDPOINT=http://localhost:8191
UNBLOCK_TIMEOUT_S=60

# Crawler tuning
CRAWL_MAX_CONCURRENCY=16
CRAWL_PER_HOST_CONCURRENCY=2
CRAWL_PER_HOST_MIN_DELAY_MS=500
CRAWL_REQUEST_TIMEOUT_S=30
CRAWL_RESPECT_ROBOTS=true
```

## CLI

```bash
# Crawl one or more URLs
scrape crawl <URL...> [--max-tier 0..3] [--no-browser] [--llm --schema schema.yaml]

# Aggregate stats from the local SQLite store
scrape stats

# Smoke-test against scraper-friendly public sites (no API keys needed)
scrape selftest

# Run the FastAPI multi-tenant service
scrape-api
```

## Deployment

### Docker Compose

```bash
# Core stack only — API, web, Redis
docker compose -f ops/compose.yml up -d

# + self-hosted Ollama (LLM extraction) and FlareSolverr (Tier-3 unblock)
docker compose -f ops/compose.yml --profile selfhost up -d

# + observability stack (Prometheus + Grafana)
docker compose -f ops/compose.yml --profile observability up -d
```

Set `SCRAPE_JWT_SECRET` first. With `--profile selfhost`, the system runs end-to-end with **zero paid third-party services** — the API talks to in-container Ollama for LLM extraction and to FlareSolverr for Tier-3 unblocks.

### Kubernetes

The container image is the same; deploy two `Deployment`s (api, web). Swap SQLite for Postgres by setting `DATABASE_URL` (planned migration target).

## Testing

```bash
# Backend — unit + live integration + API e2e (48 tests)
uv run pytest

# Lint + format
uv run ruff check src tests

# Frontend
cd web
pnpm typecheck
pnpm lint
pnpm build
```

The full pipeline currently passes:

- **48 / 48** Python tests
- **0** ruff / ESLint errors
- **0** TypeScript errors
- **38 / 38** routes return correct status codes (200 / 307 / 404 fallback)

## Ethics

The defaults that ship with this project:

- **`robots.txt` is honored by default** (24h cache, override per-host with audit log).
- **Per-host rate limit** enforced before a request leaves the box.
- **No paywall / auth bypass.** Anti-bot bypass is for *public* content only.
- **Audited proxy providers only** — Bright Data, Decodo, IPRoyal, Oxylabs publish ethical-sourcing reports. Cheap residential pools that run on malware botnets are not supported integrations.
- **No PII scraping without lawful basis.** GDPR / CCPA / EU AI Act apply.

See [`docs/ethics`](web/app/(marketing)/docs/ethics/page.tsx) and [`docs/legal`](web/app/(marketing)/docs/legal/page.tsx) for the full position.

## Contributing

1. Fork & clone
2. `uv sync` and `cd web && pnpm install`
3. Run the test suite (`uv run pytest && cd web && pnpm typecheck && pnpm lint`)
4. Open a PR — please describe *why*, not just *what*

The architectural design rationale lives in [`PLAN.md`](PLAN.md). Read it before proposing structural changes.

## License

Copyright 2026 The Scrape authors.

Licensed under the **Apache License, Version 2.0** — see [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE).

You may obtain a copy of the license at <http://www.apache.org/licenses/LICENSE-2.0>.

---

<div align="center">

*Strip the surface. Read the strata. Extract the signal.*

</div>
