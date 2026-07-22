# AirCase serving API — read-only contracts + POST /run/agent
#
# WHY THIS IS SMALL AND FAST: the 9-agent chain does NOT include ingestion, the
# panel build or fusion training. Those are heavy batch data-engineering and stay
# offline (see intelligence/orchestrator.py). The agents read PRECOMPUTED
# artifacts, so a full chain run is ~15s — which fits an HTTP request, and is why
# this container only needs the panel + fusion field, not the whole data platform.
#
# Deliberately NOT baked in: data/raw/truth.parquet (46 MB). It exists only to
# score the synthetic world in the eval scripts; serving never reads it.

FROM python:3.11-slim

# libgomp1 is LightGBM's OpenMP runtime — it segfaults without it on slim images.
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencies first so code edits don't bust the layer cache.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code
COPY shared/ ./shared/
COPY intelligence/ ./intelligence/
COPY ingestion/ ./ingestion/
COPY app/backend/ ./app/backend/
COPY scripts/ ./scripts/

# Precomputed artifacts the agents read (see .dockerignore for what is excluded)
COPY data/ ./data/

ENV PYTHONPATH=/app \
    PYTHONUNBUFFERED=1 \
    AQ_CITY=delhi

# Cloud Run provides $PORT; default 8080 for local `docker run`.
ENV PORT=8080
EXPOSE 8080

CMD exec uvicorn app.backend.main:app --host 0.0.0.0 --port ${PORT}
