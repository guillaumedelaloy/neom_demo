import os
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/api/auth/login")
def login(body: LoginRequest):
    expected_user = os.environ.get("VITE_BASIC_AUTH_USER", "").strip()
    expected_pass = os.environ.get("VITE_BASIC_AUTH_PASS", "").strip()

    # Auth disabled — let everyone through
    if not expected_user and not expected_pass:
        return {"enabled": False, "ok": True}

    if body.username.strip() == expected_user and body.password == expected_pass:
        return {"enabled": True, "ok": True}

    return JSONResponse({"enabled": True, "ok": False}, status_code=401)
