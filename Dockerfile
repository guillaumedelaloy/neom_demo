# syntax=docker/dockerfile:1

# --- Vite production bundle ---
FROM node:22-bookworm-slim AS web
WORKDIR /web
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

COPY package.json pnpm-lock.yaml .npmrc ./
COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src

RUN pnpm install --frozen-lockfile
RUN pnpm run build

# --- FastAPI + pre-built SPA ---
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY api/ ./api/
COPY scripts/ ./scripts/
COPY --from=web /web/dist ./dist

# Optional: mount or bake data_extract at runtime (see docs/railway-deploy.md)

ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "exec uvicorn api.index:app --host 0.0.0.0 --port ${PORT:-8080}"]
