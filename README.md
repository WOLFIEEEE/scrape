<div align="center">

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│        s c r a p e ·  the web, excavated.                        │
│                                                                  │
│        Strip the surface. Read the strata. Extract the signal.   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Production-grade web scraping infrastructure.** Tiered escalation through anti-bot, residential proxies, CAPTCHA solving, and AI extraction. Self-hostable, ethical-by-default, built for the 2026 web.

[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-c14a1a.svg)](LICENSE)
[![Python: 3.12+](https://img.shields.io/badge/python-3.12%2B-0a0908.svg)](https://www.python.org/)
[![Next.js: 15](https://img.shields.io/badge/next.js-15-0a0908.svg)](https://nextjs.org/)
[![Tests: 89 passing](https://img.shields.io/badge/tests-89_passing-a3ff12.svg)](#testing--development)
[![Docker compose: ready](https://img.shields.io/badge/docker_compose-ready-a3ff12.svg)](#1-docker-compose-recommended)

[Quickstart](#quickstart) · [Architecture](#architecture) · [API](#rest-api) · [CLI](#cli) · [Configuration](#configuration) · [Self-hosting](#self-hosted-zero-paid-services) · [Production](#production-deployment)

</div>

---

## Table of contents

1. [Why this exists](#why-this-exists)
2. [What's in the box](#whats-in-the-box)
3. [Quickstart](#quickstart)
   - [1. Docker Compose (recommended)](#1-docker-compose-recommended)
   - [2. Local development](#2-local-development)
   - [3. CLI only](#3-cli-only)
4. [Architecture](#architecture)
5. [The four strata](#the-four-strata)
6. [Configuration](#configuration)
7. [CLI](#cli)
8. [REST API](#rest-api)
9. [Self-hosted, zero paid services](#self-hosted-zero-paid-services)
10. [Production deployment](#production-deployment)
11. [Testing & development](#testing--development)
12. [Project layout](#project-layout)
13. [Troubleshooting](#troubleshooting)
14. [How it compares](#how-it-compares)
15. [Ethics](#ethics)
16. [Contributing](#contributing)
17. [License](#license)

---

## Why this exists

Every team building data pipelines rebuilds the same web-scraping stack: TLS impersonation, anti-bot fingerprinting, proxy rotator, CAPTCHA glue, behavioral simulation, an extraction layer, and a "why is the success rate dropping?" dashboard. Scrape ships that stack as one cohesive system so you don't have to.

The thesis is simple: **most pages aren't actually blocked**. A Cloudflare badge in the corner doesn't mean every URL on that domain serves a challenge. So Scrape starts every URL at the cheapest possible tier — plain HTTP with real-Chrome TLS — and only escalates to a headless browser, CAPTCHA solver, or managed unblock service when the response actually fights back.

The result on real targets:

```
   live verification (scripts/verify_antibot.py) — Tier 0 only

   ✓  hermes.com           DataDome-protected → 200, 528 KB body
   ✓  indeed.com           session-cookie soft block → 200, 2 MB body
   ✓  books.toscrape.com   baseline → 200
   ✓  httpbin.org          baseline → 200
   ✓  opensea.io           Cloudflare → 200 (404 path)
   →  nowsecure.nl         Cloudflare challenge → escalate Tier 1
   →  nopecha turnstile    Turnstile widget → escalate Tier 1
   →  g2.com               Cloudflare 403 → escalate Tier 3
```

Five out of eight protected targets pass at the cheapest tier. The other three are correctly classified for escalation. That's the whole pitch.

---

## What's in the box

|     | Component                | Notes                                                           |
|-----|--------------------------|-----------------------------------------------------------------|
| 🛡  | **Anti-bot bypass**      | Real-Chrome TLS (JA3/JA4+) via `curl_cffi`; Camoufox + Nodriver browsers; coherent fingerprint bundles |
| 🕵  | **Block detection**      | Cloudflare · DataDome · PerimeterX · Akamai Bot Manager · Incapsula · Kasada · Reddit interstitial — auto-classified, auto-escalated |
| 🌍  | **Proxy provider**       | Decodo · IPRoyal · Bright Data · Oxylabs · custom — provider-specific username/password formats handled internally; sticky sessions + health scoring; 407 circuit breaker |
| 🔓  | **CAPTCHA / unblock**    | CapSolver (Turnstile · reCAPTCHA · hCaptcha) **or** self-hosted FlareSolverr · per-job `captcha_hint` override |
| 🧠  | **Extraction**           | Per-site CSS selectors **+** pluggable LLM (Anthropic **or** Ollama) with prompt caching |
| 🖥  | **Web app**              | Next.js 15 dashboard — auth, jobs, settings, API keys, webhooks, usage |
| 🌐  | **REST API**             | FastAPI · OpenAPI 3.1 · cookie + bearer auth · SSE live progress · HMAC webhooks |
| 🔐  | **Security hardening**   | SSRF defense (block private/loopback/link-local) · JWT-secured cookies · bcrypt · per-IP auth rate limit |
| 💾  | **Storage**              | SQLite (single-box) → Postgres-ready · content-addressed raw HTML |
| 📊  | **Observability**        | Prometheus metrics — fetches · latency · proxy bytes · solver $ · proxy auth failures · Grafana dashboards · structured JSON logs |
| ⚖   | **Ethical defaults**     | robots.txt enforced · per-host rate limiting · audited proxies only |
| 🐳  | **Container-native**     | One-command `docker compose up` brings the whole stack online   |
| 🧪  | **Tests**                | 89 passing — unit · live integration · API end-to-end           |

---

## Quickstart

### 1. Docker Compose (recommended)

The shipped `docker-compose.yaml` wires every internal service URL. For a local HTTP demo, run in `dev` mode so browser cookies are not marked `Secure`:

```bash
git clone https://github.com/WOLFIEEEE/scrape.git
cd scrape
SCRAPE_ENV=dev SCRAPE_COOKIE_SECURE=0 docker compose up -d
```

That's it. Open **http://localhost:3000** → register the first user (auto-promoted to admin) → click **New job** → paste any URLs → watch live progress in the dashboard.

| URL | What it is |
|---|---|
| http://localhost:3000        | Web dashboard |
| http://localhost:3000/docs   | Marketing docs (browseable) |
| http://localhost:8000/docs   | FastAPI Swagger UI · OpenAPI 3.1 |
| http://localhost:8000/redoc  | FastAPI ReDoc |
| `localhost:6379`             | Redis (rate limiter) |

To enable **self-hosted Ollama + FlareSolverr** (replaces Anthropic + paid CAPTCHA):

```bash
LLM_BACKEND=ollama UNBLOCK_PROVIDER=flaresolverr \
docker compose --profile selfhost up -d
```

The Ollama container auto-pulls `qwen2.5:7b` on first boot (~5 GB).

To add **Prometheus + Grafana**:

```bash
GRAFANA_ADMIN_PASSWORD="$(openssl rand -hex 24)" \
docker compose --profile observability up -d
```

Visit Grafana at http://localhost:3001 with user `admin` and your generated password.

### 2. Local development

If you want to hack on the code:

```bash
git clone https://github.com/WOLFIEEEE/scrape.git
cd scrape

# Backend
uv sync                                   # installs Python deps into .venv
uv run scrape-api &                       # FastAPI on :8000

# Frontend
cd web && pnpm install && pnpm dev        # Next.js on :3000
```

Both auto-reload on file changes.

### 3. CLI only

If you don't need the web app — just the scraper as a Python tool:

```bash
uv tool install scrape

scrape selftest                            # smoke test (~5s)
scrape crawl https://books.toscrape.com/   # one-off crawl
scrape stats                               # query the local SQLite store
```

---

## Architecture

```
                              ┌─────────────────┐
                              │  Web dashboard  │ Next.js 15
                              │  (port 3000)    │
                              └────────┬────────┘
                                       │  /api/* (cookie session)
                                       ▼
   bearer key / SSE  ───────►  ┌─────────────────┐
                               │   FastAPI       │ jobs · auth · keys
                               │   (port 8000)   │ webhooks · usage · SSE
                               └────────┬────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        ▼                               ▼                               ▼
┌──────────────┐              ┌──────────────────┐             ┌────────────────┐
│ Orchestrator │ ─ rate-limit │   Tier router    │             │    Storage     │
│              │ ─ robots.txt │                  │             │  · SQLite      │
└──────────────┘              ├──────────────────┤             │  · raw HTML    │
                              │  Tier 0 · HTTP   │   curl_cffi │     (sha256)   │
                              │  Tier 1 · Browser│   Camoufox  └────────────────┘
                              │  Tier 2 · CAPTCHA│   CapSolver
                              │  Tier 3 · Unblock│   FlareSolverr / Scrapfly
                              └────────┬─────────┘
                                       │
                              ┌────────┴─────────┐
                              │  Block detector  │  reads response,
                              │                  │  decides escalation
                              └────────┬─────────┘
                                       │ result
                              ┌────────┴─────────┐
                              │    Extractor     │  selectors → fallback to
                              │                  │  LLM (Anthropic / Ollama)
                              └──────────────────┘
```

Every URL flows through this in one direction. The router only ever escalates upward; results stream back through the orchestrator into storage and out to the user via SSE.

---

## The four strata

| Stratum | Engine | Latency | ~Cost / page | Fires when… |
|---------|--------|---------|--------------|-------------|
| **0 · Surface**     | `curl_cffi` (real Chrome TLS) | ~50ms | $0.001 | always — every URL starts here |
| **1 · Subsurface**  | Camoufox · stealth Firefox | ~3s   | $0.005 | Tier 0 returns a challenge / empty body |
| **2 · Deep**        | Browser + CapSolver (Turnstile · reCAPTCHA) | ~15s  | $0.02  | Tier 1 sees a CAPTCHA |
| **3 · Bedrock**     | FlareSolverr (free) **or** Scrapfly / Bright Data Web Unlocker | ~20s  | $0–0.05 | Tier 1/2 fail · 4xx · rate limited |

> **Why this matters:** a single headless-browser-only scraper costs roughly **60×** more in CPU + bandwidth than a TLS-impersonation HTTP fetcher. At 1M pages, the difference is **$280 vs $17,000**. Scrape spends Tier-0 dollars on the 80% of pages that don't need a browser.

### Honest limits

We've measured these in production-shape runs. They're worth flagging so the system meets your expectations rather than yours bending to fit it.

- **Behaviorally-scored sites** (PerimeterX, advanced Akamai Bot Manager, Kasada) don't expose a CAPTCHA to solve — they grade your browser fingerprint and behavior. Tier 2 (CapSolver) cannot help; the free FlareSolverr Tier 3 also loses on these. Set `UNBLOCK_PROVIDER=brightdata` (or `scrapfly`) for those targets — the commercial unblockers run real browser farms purpose-built for this and cost ~$3 / 1,000 successes.
- **`robots.txt` is honored by default** (`CRAWL_RESPECT_ROBOTS=true`). For targets like `reddit.com` whose robots disallows scraping, the orchestrator will **skip URLs**. You can opt out with `CRAWL_RESPECT_ROBOTS=false`, but that decision is yours to defend — Scrape is ethical-by-default by design, not by accident.
- **Tier 1 takes 60–90 s per page** (cold browser + challenge solving + humanized behavior). Tier 3 is similar. Plan throughput accordingly: 30 concurrent browser fetches ≈ 30 successful pages per ~75 s.
- **Tier 1 RAM:** each warm Camoufox ≈ 700–900 MB. Cap browsers per worker via `CRAWL_MAX_CONCURRENCY` (the pool sizes itself to ¼ of the concurrency cap).

---

## Configuration

Every setting is an environment variable. Defaults are sensible for local dev. Copy [`.env.example`](.env.example) → `.env` only if you need to override something.

### Core service

| Variable | Default | Purpose |
|---|---|---|
| `SCRAPE_ENV`              | `dev` app / `prod` compose | `dev` or `prod`. Prod refuses to start without a strong `SCRAPE_JWT_SECRET` |
| `SCRAPE_JWT_SECRET`       | dev fallback     | HS256 secret signing auth cookies. Required in prod, minimum 32 characters |
| `SCRAPE_COOKIE_SECURE`    | `0` app / `1` compose | Secure cookies behind HTTPS |
| `SCRAPE_CORS_ORIGINS`     | localhost:3000   | Comma-separated allowed origins |
| `SCRAPE_PUBLIC_URL`       | localhost:3000   | Used by the marketing site for OG / canonical URLs |
| `SCRAPE_TRUST_PROXY_HEADERS` | `1` in compose | Trust `X-Forwarded-For` from a reverse proxy |
| `SCRAPE_API_URL`          | `http://api:8000`| Used by Next.js to proxy `/api/*` to the FastAPI service |
| `SCRAPE_METRICS_PORT`     | `9090`           | Prometheus metrics listener. Set `0` to disable |

### LLM extraction

| Variable | Default | Purpose |
|---|---|---|
| `LLM_BACKEND`             | `none`           | `none` · `anthropic` · `ollama` · `auto` |
| `ANTHROPIC_API_KEY`       | —                | Required when backend is `anthropic` or `auto` |
| `ANTHROPIC_MODEL_FAST`    | `claude-haiku-4-5-20251001` | Fast model for routine extraction |
| `ANTHROPIC_MODEL_SMART`   | `claude-sonnet-4-6`         | Smart model for hard pages |
| `LLM_OLLAMA_URL`          | `http://ollama:11434` | Ollama server endpoint |
| `LLM_OLLAMA_MODEL`        | `qwen2.5:7b`     | Try `llama3.1:8b`, `phi3.5:3.8b`, `numind/nuextract-2:7b` |

### Tier-3 unblock

| Variable | Default | Purpose |
|---|---|---|
| `UNBLOCK_PROVIDER`        | `none`           | `none` · `flaresolverr` · `brightdata` · `scrapfly` |
| `UNBLOCK_ENDPOINT`        | `http://flaresolverr:8191` | FlareSolverr URL (only for `flaresolverr`) |
| `UNBLOCK_TIMEOUT_S`       | `60`             | Browser fetch timeout |
| `BRIGHTDATA_API_KEY`      | —                | Required when `UNBLOCK_PROVIDER=brightdata` |
| `BRIGHTDATA_ZONE`         | `web_unlocker1`  | Bright Data zone name |
| `SCRAPFLY_API_KEY`        | —                | Required when `UNBLOCK_PROVIDER=scrapfly` |

**Picking a Tier-3 provider:**
- **`flaresolverr`** — free, self-hosted Docker container. Beats plain Cloudflare JS challenges. **Cannot beat behavioral-scoring vendors** (PerimeterX, advanced Akamai, Kasada) — they don't expose a challenge to solve, they grade your browser. For those, use a commercial unblocker.
- **`brightdata`** — pay-per-success Web Unlocker (~$3 / 1,000 reqs). Beats CF / Akamai / PerimeterX / Kasada. Failed requests are not billed.
- **`scrapfly`** — credits-based (~$0.001–$0.025 per request depending on level).

### Proxy provider

| Variable | Default | Purpose |
|---|---|---|
| `PROXY_PROVIDER`          | `none`           | `none` · `decodo` · `iproyal` · `brightdata` · `custom` |
| `PROXY_ENDPOINT`          | —                | e.g. `gw.dc.decodo.com:7000` |
| `PROXY_USERNAME` / `PROXY_PASSWORD` | — | Provider credentials |
| `PROXY_COUNTRY`           | —                | ISO-2 country code to pin exit IP |
| `PROXY_STICKY_SESSION_MINUTES` | `10`        | Sticky window before rotating |

### CAPTCHA solver

| Variable | Default | Purpose |
|---|---|---|
| `CAPSOLVER_API_KEY`       | —                | Required for Tier 2 token-injection solving |
| `CAPSOLVER_TIMEOUT_S`     | `120`            | Max wait for a token |

**Per-target override.** Tier 2's HTML-pattern detection misses some embeddings (hCaptcha in shadow DOM, lazy-loaded iframes). When you already know what a target ships, set `captcha_hint` on the job (`turnstile` · `recaptcha_v3` · `hcaptcha`) and we skip auto-detection.

**Cost transparency.** Every fetch records `proxy_bytes` (residential bandwidth used) and `solver_cost_usd` (paid CAPTCHA spend) in storage and as Prometheus counters (`scrape_proxy_bytes_total` / `scrape_solver_cost_usd_total`). The Grafana dashboard shows the running totals so customers see what they're spending per tier.

Typical costs at the time of writing:
- Tier 0 (curl_cffi): ~50 KB–500 KB proxy bandwidth, ~$0.0001 each
- Tier 1 (browser): ~1–10 MB proxy bandwidth, ~$0.002–$0.02 each, **60–90 s wall time**
- Tier 2 (CAPTCHA): solver ~$0.001 (Turnstile) – $0.003 (reCAPTCHA), 3–10 s on top of Tier 1
- Tier 3 (`flaresolverr`): no proxy bandwidth, **60–120 s wall time**, no $ cost
- Tier 3 (`brightdata` / `scrapfly`): no proxy bandwidth, ~$0.003–$0.025 per success, 5–30 s

### Crawler tuning

| Variable | Default | Purpose |
|---|---|---|
| `CRAWL_MAX_CONCURRENCY`        | `16`  | Total in-flight requests |
| `CRAWL_PER_HOST_CONCURRENCY`   | `2`   | Per-domain cap |
| `CRAWL_PER_HOST_MIN_DELAY_MS`  | `500` | Spacing between requests to the same host |
| `CRAWL_REQUEST_TIMEOUT_S`      | `30`  | Per-fetch timeout |
| `CRAWL_RESPECT_ROBOTS`         | `true`| Honor `robots.txt` (24h cache) |
| `CRAWL_ALLOW_PRIVATE_NETWORKS` | `false` | Allow private/loopback/link-local crawl targets. Keep false for public deployments |

### Compose-only port overrides

Set these on the host shell before `docker compose up` to remap ports:

`API_PORT` · `WEB_PORT` · `OLLAMA_PORT` · `FLARESOLVERR_PORT` · `PROMETHEUS_PORT` · `GRAFANA_PORT`

---

## CLI

```
scrape crawl <URL...> [OPTIONS]
  --file PATH                  Read URLs from a file (one per line; '-' for stdin)
  --max-tier {0,1,2,3}         Max escalation tier (default: 1)
  --schema PATH                YAML/JSON extraction schema
  --schema-name NAME           Logical name for the schema
  --no-browser                 Disable Tier 1 browser even if available
  --llm                        Enable LLM extraction
  --metrics-port PORT          Expose Prometheus metrics (0 = disabled)

scrape stats                   Aggregate stats from the local SQLite store
scrape selftest                Quick smoke test against scraper-friendly URLs
scrape-api                     Run the FastAPI multi-tenant service
```

Examples:

```bash
# Cheap survey crawl, no browser allowed
scrape crawl https://books.toscrape.com/ --max-tier 0 --no-browser

# Full pipeline with Anthropic schema extraction
scrape crawl --file urls.txt \
    --max-tier 2 \
    --llm --schema examples/schema_product.yaml --schema-name product

# 10k URLs from stdin, expose metrics
cat catalog.txt | scrape crawl - --metrics-port 9090
```

---

## REST API

Authenticate with the `auth_token` cookie (set on `/api/auth/login`) **or** an `Authorization: Bearer sk_live_…` header (generated in `/settings`).

OpenAPI 3.1 spec at `/openapi.json` · Swagger UI at `/docs` · ReDoc at `/redoc`.

### Authentication

```
POST   /api/auth/register            create account · cookie returned
POST   /api/auth/login               cookie returned
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/forgot              { email } → reset link (or dev_token in dev)
POST   /api/auth/reset               { token, new_password }
```

### Account

```
POST   /api/account/password         { current_password, new_password }
PATCH  /api/account/profile          { name }
DELETE /api/account                  cascading hard delete

GET    /api/keys                     list API keys
POST   /api/keys                     create — full secret returned ONCE
DELETE /api/keys/{id}                revoke

GET    /api/webhooks
POST   /api/webhooks                 { url, events[] }
DELETE /api/webhooks/{id}

GET    /api/usage                    plan · quota · used · remaining · concurrent
```

### Jobs

```
GET    /api/jobs                     list (paginated)
POST   /api/jobs                     create — quota-enforced
GET    /api/jobs/{id}                detail
DELETE /api/jobs/{id}                delete (results stay in DB)
POST   /api/jobs/{id}/cancel
POST   /api/jobs/{id}/duplicate      re-run with same params
GET    /api/jobs/{id}/events         Server-Sent Events live progress
GET    /api/jobs/{id}/fetches        per-URL fetch metadata
GET    /api/jobs/{id}/extracted      extracted rows
GET    /api/jobs/{id}/export.json    download JSON
GET    /api/jobs/{id}/export.csv     download CSV
```

### Webhook signatures

Each delivery includes:

```
X-Scrape-Signature: t=<timestamp>,v1=<hmac_sha256(secret, "<timestamp>." + body)>
```

Constant-time compare both halves to verify.

---

## Self-hosted, zero paid services

Set both env vars to swap the paid tiers for fully local containers:

```bash
LLM_BACKEND=ollama UNBLOCK_PROVIDER=flaresolverr \
docker compose --profile selfhost up -d
```

| Was | Replaced by | License | What it does |
|---|---|---|---|
| Anthropic Claude API   | **Ollama** running locally (Qwen 2.5 / Llama 3.1 / NuExtract) | open-source models | LLM-driven schema extraction |
| CapSolver / 2Captcha   | **FlareSolverr** sidecar              | MIT     | Cloudflare Managed Challenge bypass via Selenium + uc-chromedriver |
| Paid residential proxy | (no clean self-host equivalent — IPs are scarce) | — | Use Tor + WireGuard mesh of cloud VMs as a partial alternative |

The same `extract()` and `unblock()` interfaces are honored, so your code doesn't change — only the env vars.

> **Compute cost:** Ollama with `qwen2.5:7b` runs on ~5 GB VRAM (or CPU at ~10 tok/s on a recent laptop). FlareSolverr is a single Docker container, ~600 MB.

---

## Production deployment

### Minimum production config

```bash
SCRAPE_ENV=prod \
SCRAPE_JWT_SECRET="$(openssl rand -hex 64)" \
SCRAPE_COOKIE_SECURE=1 \
SCRAPE_PUBLIC_URL=https://your-domain.com \
SCRAPE_CORS_ORIGINS=https://your-domain.com \
docker compose up -d
```

The API refuses to start in `prod` mode without a `SCRAPE_JWT_SECRET` of at least 32 characters, so a misconfigured deploy fails loudly rather than silently signing tokens with the dev fallback.

### Reverse proxy (Caddy example)

```caddyfile
your-domain.com {
    reverse_proxy /api/*  localhost:8000
    reverse_proxy /*      localhost:3000
}
```

The Next.js rewrite already maps `/api/*` to the FastAPI host, so a single TLS frontend covers both services.

### Scaling beyond a single box

| Layer | Signal to scale | Path |
|---|---|---|
| API replicas         | API CPU pegged           | Run multiple `api` containers behind the proxy; sessions are JWT-stateless |
| Database             | SQLite bottlenecks       | Set `DATABASE_URL=postgres://…` (planned migration target) |
| Browser tier         | Camoufox CPU pegged      | Run dedicated browser-pool workers; scrape-api submits jobs over Redis |
| Object store         | Disk pressure on raw HTML | Mount S3 / R2 as a volume; same content-addressed paths |

For very large fleets, swap the in-process queue for the shipped Redis instance — the `RedisConfig` already exists and the queue interface is one swap away.

### Observability

Enable the observability profile:

```bash
docker compose --profile observability up -d
```

Then:

- **Prometheus** at http://localhost:9091 scrapes `/metrics` from the API
- **Grafana** at http://localhost:3001 loads the provisioned Scrape dashboard. Set `GRAFANA_ADMIN_PASSWORD` before enabling the profile

The metrics surface is operator-actionable:

```
scrape_fetches_total{tier,block_reason,ok}     fetch counts
scrape_fetch_latency_seconds{tier}             latency histogram
scrape_extracted_total{schema}                 successful extractions
scrape_tier_escalations_total{from_tier,to_tier}
scrape_proxy_bytes_total{tier}                 residential bandwidth (your $$$)
scrape_solver_cost_usd_total{kind}             paid CAPTCHA spend (your $$$)
scrape_proxy_auth_failures_total               407s — alert on rate spikes
scrape_queue_size                              pending URLs
scrape_active_browsers                         warm Camoufox sessions
```

Alert on `scrape_proxy_auth_failures_total` rate to catch revoked proxy plans before they burn a whole crawl. Alert on `scrape_solver_cost_usd_total` to cap runaway CAPTCHA spend.

---

## Testing & development

```bash
# Backend
uv run pytest                  # 89 tests · unit + live + API e2e
uv run ruff check src tests    # lint
uv run scripts/verify_antibot.py   # live anti-bot verification

# Frontend
cd web
pnpm typecheck                 # strict TypeScript
pnpm lint                      # ESLint + Next.js
pnpm build                     # production build
```

The test suite uses [`pytest-asyncio`](https://pytest-asyncio.readthedocs.io/) in auto mode. Live integration tests skip themselves automatically when offline (`CI_NO_NETWORK=1`).

### Repository hygiene at HEAD

```
✓ 89 / 89   Python tests passing  (unit · live integration · full API e2e)
✓ 0         ruff errors
✓ 0         ESLint errors
✓ 0         TypeScript errors
✓ build     Next.js production bundle clean
✓ 38 / 38   routes return correct status codes (200 / 307 / 404)
```

---

## Project layout

```
scrape/
├── docker-compose.yaml         single-command stack — api · web · redis · ollama · flaresolverr
├── Dockerfile                  Python image (FastAPI + crawler)
├── pyproject.toml              backend deps (curl_cffi · fastapi · pydantic · anthropic · …)
├── README.md  · LICENSE · NOTICE · PLAN.md
├── .env.example                full env reference
│
├── src/scrape/
│   ├── api/                    multi-tenant FastAPI service
│   │   ├── auth_routes.py      register · login · forgot · reset · me
│   │   ├── account_routes.py   profile · password · keys · webhooks · usage
│   │   ├── jobs_routes.py      jobs CRUD · SSE · exports · duplicate
│   │   ├── job_runner.py       background task that drives the orchestrator
│   │   ├── webhooks.py         HMAC dispatch with retries
│   │   ├── api_keys.py         bcrypt-hashed bearer tokens
│   │   ├── rate_limit.py       sliding-window per-IP for auth endpoints
│   │   ├── usage.py            plan quota · concurrent-job cap
│   │   ├── security.py         bcrypt + JWT (HS256)
│   │   └── db.py               schema · migrations · connection pool
│   │
│   ├── core/                   crawler internals
│   │   ├── http_client.py      curl_cffi pool · TLS rotation · proxy-byte accounting · 407 surfacing
│   │   ├── browser_pool.py     Camoufox + behavioral simulation
│   │   ├── browser_captcha.py  Turnstile · reCAPTCHA v3 · hCaptcha — token injection
│   │   ├── captcha.py          CapSolver client + protocol · per-solve cost capture
│   │   ├── unblock.py          FlareSolverr · BrightData · Scrapfly + factory
│   │   ├── proxy_manager.py    provider abstraction · sticky sessions · 407 circuit breaker
│   │   ├── session_store.py    cookie / storage_state per (proxy, fp, host)
│   │   ├── rate_limiter.py     per-host concurrency + min-delay
│   │   ├── robots.py           robots.txt cache (24h)
│   │   ├── url_guard.py        SSRF defense — block private/loopback/link-local crawl targets
│   │   ├── block_detector.py   CF · DataDome · PerimeterX · Akamai · Incapsula · Kasada · Reddit
│   │   └── tier_router.py      0 → 1 → 2 → 3 escalation
│   │
│   ├── extractors/
│   │   ├── markdown.py         HTML → Markdown (selectolax)
│   │   ├── llm_schema.py       Anthropic + Ollama backends · build_extractor()
│   │   └── selectors/          per-site CSS extractors
│   │
│   ├── fingerprints/profiles.py  coherent device profiles (UA + screen + tz + locale)
│   ├── pipelines/
│   │   ├── orchestrator.py     concurrent crawl · storage · webhook dispatch
│   │   ├── storage.py          SQLite + content-addressed raw HTML
│   │   └── metrics.py          Prometheus counters / histograms
│   ├── cli.py                  Typer CLI · crawl · stats · selftest
│   └── config.py               typed pydantic-settings env loading
│
├── web/                        Next.js 15 + React 19 + TypeScript
│   ├── app/(marketing)/        landing · features · pricing · use-cases · docs · blog · legal
│   ├── app/dashboard/          stats overview · recent jobs · quota
│   ├── app/jobs/               list · create · live detail (SSE) · re-run
│   ├── app/settings/           profile · password · keys · webhooks · usage · danger zone
│   ├── app/{login,register,forgot,reset}/   auth flows
│   ├── components/             UI primitives · command palette · onboarding
│   └── lib/api.ts              typed API client
│
├── tests/                      89 tests
│   ├── unit/                   block detector (incl. Akamai · Incapsula · Kasada · Reddit interstitials)
│   │                           · proxy manager (Generic · BrightData · IPRoyal) · session store
│   │                           · rate limiter · robots · extractors · storage · LLM backends
│   │                           · unblock providers · URL guard
│   └── integration/            live HTTP + full API end-to-end
│
├── scripts/verify_antibot.py   live verification harness
├── examples/schema_product.yaml  sample LLM schema
└── ops/                        docker-compose extras (Prometheus config · Grafana dashboards)
```

---

## Troubleshooting

<details>
<summary><strong>The API container fails its healthcheck on first start</strong></summary>

The healthcheck runs `curl http://localhost:8000/api/health` inside the container. If you've remapped `SCRAPE_API_PORT`, the healthcheck command in `docker-compose.yaml` won't follow — set `API_PORT` (the host-side port) instead and leave the container-internal port at 8000.
</details>

<details>
<summary><strong>Login works but every page after says 401</strong></summary>

In production set `SCRAPE_COOKIE_SECURE=1` and serve over HTTPS. Browsers refuse to send `SameSite=Lax; Secure` cookies over plain HTTP.
</details>

<details>
<summary><strong>Ollama container is stuck on "pulling manifest"</strong></summary>

First-boot model download is ~5 GB for `qwen2.5:7b`. Watch progress with:
```bash
docker logs -f scrape-ollama
```
Override the default model via `LLM_OLLAMA_MODEL` (e.g. `phi3.5:3.8b` is only ~2 GB).
</details>

<details>
<summary><strong>FlareSolverr returns "Unable to bypass" on every URL</strong></summary>

That's expected for sites with **invisible** Turnstile or behavioral DataDome scoring — they need a real fingerprint, which Tier 1 (Camoufox) handles. FlareSolverr is for the **interactive** Cloudflare Managed Challenge.
</details>

<details>
<summary><strong>Tests pass locally but fail in CI with network errors</strong></summary>

Set `CI_NO_NETWORK=1` to auto-skip the live-integration tests. Unit + API tests are fully offline.
</details>

<details>
<summary><strong>How do I migrate from SQLite to Postgres?</strong></summary>

The interface is `scrape.pipelines.storage.Storage` — replace `aiosqlite` with `asyncpg` and keep the same `_SCHEMA` (Postgres-compatible). The data model is intentionally simple to make this swap mechanical. A migration tool is on the roadmap.
</details>

<details>
<summary><strong>API refuses to start: "SCRAPE_JWT_SECRET must be at least 32 characters"</strong></summary>

In `prod` mode the API enforces a minimum-strength JWT secret. Generate one and re-deploy:
```bash
SCRAPE_JWT_SECRET="$(openssl rand -hex 64)" docker compose up -d
```
For local HTTP demo, run in `dev` mode instead — the dev fallback secret is allowed there:
```bash
SCRAPE_ENV=dev SCRAPE_COOKIE_SECURE=0 docker compose up -d
```
</details>

<details>
<summary><strong>The crawler refuses my URL with "forbidden_host"</strong></summary>

The SSRF guard in `core/url_guard.py` blocks private (RFC 1918), loopback, and link-local addresses by default. This is intentional in a multi-tenant deployment — operators don't want users scraping `http://localhost:8000` and pivoting through the API container. If you need to scrape private targets (testing on `localhost`, internal staging), set `CRAWL_ALLOW_PRIVATE_NETWORKS=true`. Don't enable this on a publicly reachable instance.
</details>

<details>
<summary><strong>Repeated "proxy_auth_failed" warnings even after rotating sessions</strong></summary>

That signals the proxy *credentials themselves* are wrong (revoked plan, mistyped password) — no amount of session rotation will help. Look at `scrape_proxy_auth_failures_total` in Prometheus; the orchestrator surfaces a `ProxyAuthBroken` exception once the threshold is crossed (default: 5 consecutive 407s) so operators get paged instead of the system silently retrying. Fix `PROXY_USERNAME` / `PROXY_PASSWORD` and restart.
</details>

---

## How it compares

| | **Scrape** | Scrapy | Crawl4AI | Bright Data Web Unlocker | Apify |
|---|:-:|:-:|:-:|:-:|:-:|
| Real-Chrome TLS (JA3 / JA4+)            | ✅ | ❌ | ❌ | ✅ | ✅ |
| Stealth headless browser                 | ✅ | manual | ✅ | ✅ | ✅ |
| Auto tier escalation                    | ✅ | ❌ | ❌ | ✅ | ✅ |
| Self-hostable                           | ✅ | ✅ | ✅ | ❌ | partial |
| Per-job extraction schema (LLM)          | ✅ | ❌ | ✅ | ❌ | ❌ |
| Open-source LLM backend (Ollama)         | ✅ | ❌ | partial | ❌ | ❌ |
| Multi-tenant web app + API              | ✅ | ❌ | ❌ | ✅ | ✅ |
| Pluggable proxy providers               | ✅ | manual | ❌ | own pool only | own pool only |
| Live SSE progress + webhooks            | ✅ | ❌ | ❌ | ✅ | ✅ |
| Per-plan quotas + API keys              | ✅ | ❌ | ❌ | ✅ | ✅ |
| Open source (Apache-2.0)                | ✅ | BSD | MIT | proprietary | proprietary |
| Pricing                                 | free | free | free | $$$ | $$ |

> Scrape is the only entry that ships **both** the CLI / library *and* the multi-tenant web app, fully open-source, with first-class self-hosted alternatives to every paid integration.

---

## Ethics

The defaults that ship with this project:

- **`robots.txt` is honored by default** (24h cache; per-host override requires explicit code change with audit log).
- **Per-host rate limit** enforced *before* a request leaves the box. Default: 2 concurrent, 500ms minimum spacing.
- **No paywall / auth bypass.** Anti-bot bypass is for *public* content only.
- **Audited proxy providers only.** Bright Data, Decodo, IPRoyal, and Oxylabs publish ethical-sourcing reports. Cheap residential pools that run on malware botnets are not supported integrations and never will be.
- **No PII scraping without lawful basis.** GDPR · CCPA · EU AI Act all apply.

See [`docs/ethics`](web/app/(marketing)/docs/ethics/page.tsx) and [`docs/legal`](web/app/(marketing)/docs/legal/page.tsx) in the running app for the long form.

---

## Contributing

1. Fork & clone, then:
   ```bash
   uv sync
   cd web && pnpm install && cd ..
   ```
2. Make your change with tests:
   ```bash
   uv run pytest -q
   uv run ruff check src tests
   cd web && pnpm typecheck && pnpm lint && pnpm build
   ```
3. Open a PR — please describe **why**, not just **what**.

The architectural design rationale lives in [`PLAN.md`](PLAN.md). Read it before proposing structural changes.

### Commit style

Single coherent change per commit. Imperative mood. Body explains the *why* and any non-obvious tradeoffs. We don't need an issue link; we do want context.

### Issue / discussion etiquette

If you're reporting a block on a specific site, please include:

- The URL (or category — "competitors of X")
- The output of `scrape crawl --max-tier 0 <URL>` and the resulting block reason
- Whether you've tried higher tiers and what happened

That's enough for us (or another contributor) to reproduce and propose a fix.

---

## License

Copyright 2026 The Scrape authors.

Licensed under the **Apache License, Version 2.0**.
You may obtain a copy at <http://www.apache.org/licenses/LICENSE-2.0>.

See [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE) for the full text and the third-party attributions.

---

<div align="center">

*Strip the surface. Read the strata. Extract the signal.*

</div>
