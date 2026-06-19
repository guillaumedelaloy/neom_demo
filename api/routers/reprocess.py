"""POST /api/reprocess — runs scripts/run_all_preprocessing.sh server-side.

Streams stdout/stderr back in real-time to keep the HTTP connection alive
(prevents Cloud Run's HTTP/2 idle timeout from dropping the connection).
"""
from __future__ import annotations

import logging
import subprocess
from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

router = APIRouter()
_log = logging.getLogger(__name__)

APP_ROOT = Path(__file__).resolve().parent.parent.parent


@router.post("/api/reprocess")
async def reprocess():
    script = APP_ROOT / "scripts" / "run_all_preprocessing.sh"
    _log.info("Starting preprocessing: %s", script)

    def _stream():
        proc = subprocess.Popen(
            ["bash", str(script)],
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, bufsize=1,
        )
        for line in proc.stdout:
            yield line
        proc.wait()
        if proc.returncode != 0:
            yield f"\n!!! FAILED with exit code {proc.returncode}\n"
        else:
            yield "\n=== SUCCESS ===\n"

    return StreamingResponse(_stream(), media_type="text/plain")
