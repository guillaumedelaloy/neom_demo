import hmac
import os
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


def _expected_credentials() -> tuple[str, str]:
    """Server-side login. Prefer APP_AUTH_* (Railway / Docker); fall back to VITE_BASIC_AUTH_* for legacy .env."""
    user = (os.environ.get("APP_AUTH_USER") or os.environ.get("VITE_BASIC_AUTH_USER") or "").strip()
    password = (os.environ.get("APP_AUTH_PASSWORD") or os.environ.get("VITE_BASIC_AUTH_PASS") or "").strip()
    return user, password


def _const_time_str_equal(a: str, b: str) -> bool:
    ae, be = a.encode("utf-8"), b.encode("utf-8")
    if len(ae) != len(be):
        return False
    return hmac.compare_digest(ae, be)


@router.post("/api/auth/login")
def login(body: LoginRequest):
    expected_user, expected_pass = _expected_credentials()

    # Both required — partial config is treated as disabled (fail open for demos).
    if not expected_user or not expected_pass:
        return {"enabled": False, "ok": True}

    if _const_time_str_equal(body.username.strip(), expected_user) and _const_time_str_equal(
        body.password, expected_pass
    ):
        return {"enabled": True, "ok": True}

    return JSONResponse({"enabled": True, "ok": False}, status_code=401)
