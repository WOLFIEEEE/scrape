"""FastAPI app — exposes the scraper as a multi-tenant web service."""
from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from scrape.api import job_runner
from scrape.api.account_routes import router as account_router
from scrape.api.auth_routes import router as auth_router
from scrape.api.db import init_db
from scrape.api.jobs_routes import router as jobs_router
from scrape.config import get_settings
from scrape.logging import get_logger, setup_logging

log = get_logger("api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(get_settings().log_level)
    await init_db()
    await job_runner.reset_orphan_running()
    log.info("api.startup", db=str(get_settings().storage.sqlite_path))
    yield
    log.info("api.shutdown")


def create_app() -> FastAPI:
    settings = get_settings()
    # Refuse to start in prod without an explicit secret — defends against
    # the dev-fallback cookie key getting reused in real deployments.
    if settings.env == "prod" and not settings.jwt_secret:
        raise RuntimeError("SCRAPE_JWT_SECRET must be set when SCRAPE_ENV=prod")

    app = FastAPI(
        title="Scrape API",
        description="Tiered escalating web scraper — REST API",
        version="0.1.0",
        lifespan=lifespan,
    )

    # CORS — restrict to the configured frontend origin in prod
    origins = settings.cors_origins.split(",")
    allowed_origins = [o.strip() for o in origins if o.strip()]
    if settings.env == "prod" and "*" in allowed_origins:
        raise RuntimeError("SCRAPE_CORS_ORIGINS cannot include '*' when SCRAPE_ENV=prod")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth_router)
    app.include_router(account_router)
    app.include_router(jobs_router)

    @app.get("/api/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()


def run() -> None:  # entry point for `scrape-api`
    import uvicorn
    uvicorn.run(
        "scrape.api.main:app",
        host=os.environ.get("SCRAPE_API_HOST", "127.0.0.1"),
        port=int(os.environ.get("SCRAPE_API_PORT", "8000")),
        reload=bool(int(os.environ.get("SCRAPE_API_RELOAD", "0"))),
    )


if __name__ == "__main__":  # pragma: no cover
    run()
