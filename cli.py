import json
import os
from urllib.error import URLError, HTTPError
from urllib.request import Request, urlopen

import logfire
from opentelemetry.propagate import inject

from api.bootstrap_env import load_repo_dotenv

load_repo_dotenv()

logfire.configure(send_to_logfire='if-token-present')

API_BASE = os.environ.get("VITE_API_BASE_URL", "http://localhost:8001").rstrip("/")
QUERY_URL = f"{API_BASE}/api/query"


def _stream_query(history: list[dict]) -> tuple[str, str]:
    body = json.dumps({"messages": history}).encode("utf-8")
    # inject traceparent header so CLI span and server spans are linked in Logfire
    headers = {"Content-Type": "application/json"}
    inject(headers)
    req = Request(
        QUERY_URL,
        data=body,
        headers=headers,
        method="POST",
    )

    with urlopen(req) as res:
        accumulated = ""
        final_type = "done"
        for raw in res:
            line = raw.decode("utf-8", errors="replace").strip()
            if not line.startswith("data: "):
                continue

            payload = json.loads(line[6:])
            event_type = payload.get("type", "")
            content = payload.get("content", "")

            if event_type == "token":
                accumulated += content
                print(content, end="", flush=True)
            elif event_type in ("done", "not_supported", "error", "clarification"):
                final_type = event_type
                if event_type != "done":
                    return final_type, content or accumulated
                return final_type, accumulated

    return "done", ""


def chat() -> None:
    print("NEOM strategy chatbot CLI — type 'exit' to quit\n")
    history: list[dict] = []

    while True:
        try:
            user_input = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break

        if not user_input:
            continue
        if user_input.lower() in ("exit", "quit"):
            break

        history.append({"role": "user", "content": user_input})
        try:
            print("Bot: ", end="", flush=True)
            with logfire.span("cli query", query=user_input):
                event_type, content = _stream_query(history)
            if event_type in ("not_supported", "error"):
                print(content, end="", flush=True)
            elif event_type == "clarification":
                print(content, end="", flush=True)
                history.append({"role": "assistant", "content": content})
            else:
                history.append({"role": "assistant", "content": content})
            print("\n")
        except HTTPError as e:
            print(f"[http error] {e.code} {e.reason}\n")
        except URLError:
            print(
                "[connection error] Backend unreachable. "
                f"Set NEXT_PUBLIC_API_URL or start API at {API_BASE}.\n"
            )
        except Exception as e:
            print(f"[unexpected error] {type(e).__name__}\n")


def main() -> None:
    chat()


if __name__ == "__main__":
    main()
