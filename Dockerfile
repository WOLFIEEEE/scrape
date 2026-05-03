FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

# System libs Camoufox/Playwright Firefox needs at runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates curl libnss3 libxss1 libgtk-3-0 libgbm1 \
        libdrm2 libxshmfence1 libxcomposite1 libxdamage1 libxrandr2 \
        libasound2 libpangocairo-1.0-0 libatk1.0-0 libatk-bridge2.0-0 \
        fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml uv.lock* ./
RUN uv sync --frozen --no-install-project --no-dev || uv sync --no-install-project --no-dev

# Hatchling needs the readme + license files to build the wheel
# (they're declared in pyproject.toml as `readme` and `license-files`).
COPY README.md LICENSE NOTICE ./
COPY src ./src
RUN uv sync --no-dev

ENV PATH="/app/.venv/bin:${PATH}" \
    PYTHONUNBUFFERED=1 \
    LOG_LEVEL=INFO \
    SCRAPE_API_HOST=0.0.0.0 \
    SCRAPE_API_PORT=8000

EXPOSE 8000 9090

# Two entrypoints: 'scrape' (CLI) and 'scrape-api' (FastAPI server).
# Override CMD to pick:
#   docker run scrape         -> CLI help
#   docker run scrape scrape-api  -> API server
ENTRYPOINT []
CMD ["scrape", "--help"]
