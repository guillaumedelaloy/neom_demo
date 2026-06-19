FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY api/ ./api/
COPY scripts/ ./scripts/
# data_extract/ is mounted from GCS at runtime via Cloud Storage FUSE

ENV PORT=8080
EXPOSE 8080

# Railway (and others) set $PORT at runtime — do not hardcode only 8080 in CMD.
CMD ["sh", "-c", "exec uvicorn api.index:app --host 0.0.0.0 --port ${PORT:-8080}"]
