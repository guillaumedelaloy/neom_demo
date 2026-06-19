import os

from api.bootstrap_env import load_repo_dotenv

load_repo_dotenv()  # repo-root .env — works even if uvicorn cwd is not the project root

import logfire
logfire.configure(send_to_logfire='if-token-present')
logfire.instrument_httpx()  # captures all LiteLLM HTTP calls

from api.services import data_cache
data_cache.load()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(docs_url=None, redoc_url=None)  # OpenAPI disabled in production

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Vercel Access handles auth; CORS open within deployment
    allow_methods=["*"],
    allow_headers=["*"],
)

logfire.instrument_fastapi(app)


@app.middleware("http")
async def check_api_key(request: Request, call_next):
    if request.url.path == "/api/health" or request.method == "OPTIONS":
        return await call_next(request)
    expected = os.environ.get("BACKEND_API_KEY")
    if expected and request.headers.get("x-api-key") != expected:
        return JSONResponse({"detail": "Invalid API key"}, status_code=403)
    return await call_next(request)


@app.get("/api/health")
def health():
    return {"status": "ok"}


from api.routers.query import router as query_router
app.include_router(query_router)

from api.routers.reprocess import router as reprocess_router
app.include_router(reprocess_router)
