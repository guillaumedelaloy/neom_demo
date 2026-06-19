import os
from pathlib import Path

from api.bootstrap_env import DOTENV_LOADED, load_repo_dotenv

load_repo_dotenv()  # repo-root .env — works even if uvicorn cwd is not the project root

import logfire
logfire.configure(send_to_logfire='if-token-present')
logfire.instrument_httpx()  # captures all LiteLLM HTTP calls

from api.services import data_cache
data_cache.load()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.services.llm_client import get_resolved_chat_model
from api.services.query_gate import get_resolved_gate_model

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
def health(request: Request):
    out: dict = {
        "status": "ok",
        "llm_model": get_resolved_chat_model(),
        "gate_model": get_resolved_gate_model(),
    }
    if request.query_params.get("diagnose") == "1":
        repo = Path(__file__).resolve().parents[1]
        out["diagnose"] = {
            "repo_root": str(repo),
            "cwd": os.getcwd(),
            "dotenv_files_loaded": list(DOTENV_LOADED),
            "LLM_MODEL_in_environ": "LLM_MODEL" in os.environ,
            "GATE_MODEL_in_environ": "GATE_MODEL" in os.environ,
            "LLM_MODEL_env": os.environ.get("LLM_MODEL"),
            "GATE_MODEL_env": os.environ.get("GATE_MODEL"),
            "repo_dotenv_exists": (repo / ".env").is_file(),
            "repo_dotenv_local_exists": (repo / ".env.local").is_file(),
        }
    return out


from api.routers.query import router as query_router
app.include_router(query_router)

from api.routers.reprocess import router as reprocess_router
app.include_router(reprocess_router)
