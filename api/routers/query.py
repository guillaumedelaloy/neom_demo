import json
import os
from datetime import date

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from api.services import agent_service, query_gate
from api.services.llm_client import get_resolved_chat_model
from api.services.query_gate import get_resolved_gate_model
from api.services.prompt_loader import (
    PromptConfigError,
    load_prompt_text,
    render_prompt,
)
from api.services.skills_loader import (
    SkillsConfigError,
    get_catalogue_text,
    load_skills_markdown,
)

router = APIRouter()


class ChatRequest(BaseModel):
    messages: list[dict]
    context: dict | None = None


def _clip_messages_for_agent(messages: list[dict]) -> list[dict]:
    """Keep only recent user/assistant turns so long UI threads stay under low TPM ceilings."""
    raw = os.environ.get("AGENT_HISTORY_MAX_MESSAGES", "8").strip()
    try:
        max_m = int(raw)
    except ValueError:
        max_m = 8
    if max_m <= 0:
        return list(messages)
    allowed = [m for m in messages if m.get("role") in ("user", "assistant")]
    if len(allowed) <= max_m:
        return allowed
    return allowed[-max_m:]


def _is_followup(messages: list[dict]) -> bool:
    assistant_msgs = [m for m in messages if m.get("role") == "assistant"]
    user_msgs = [m for m in messages if m.get("role") == "user"]
    if assistant_msgs:
        return True
    return len(user_msgs) > 1


def _sanitize(value: str) -> str:
    """Strip newlines and carriage returns to prevent prompt injection via context fields."""
    return value.replace("\n", " ").replace("\r", " ")


def _build_context_block(context: dict) -> str:
    scope = _sanitize(context.get("scope", "global"))
    # Check whether there is anything worth injecting
    has_page = bool(
        context.get("page")
        or context.get("pageEntities")
        or context.get("reportingPeriod")
    )
    has_entity = bool(
        context.get("bu") or context.get("projectName") or context.get("kpiLabel")
    )
    if scope == "global" and not has_page:
        return ""
    lines = ["DASHBOARD CONTEXT"]
    if context.get("page"):
        lines.append(f"Page: {_sanitize(context['page'])}")
    if context.get("reportingPeriod"):
        lines.append(f"Reporting period: {_sanitize(context['reportingPeriod'])}")
    if scope != "global":
        lines.append(f"Scope: {scope}")
    if context.get("bu"):
        lines.append(f"BU: {_sanitize(context['bu'])}")
    if context.get("projectName"):
        project_id = context.get("projectId")
        project_line = f"Project: {_sanitize(context['projectName'])}"
        if project_id:
            project_line += f" ({_sanitize(project_id)})"
        lines.append(project_line)
    if context.get("kpiLabel"):
        lines.append(f"KPI: {_sanitize(context['kpiLabel'])}")
    if context.get("pageEntities"):
        entities = [_sanitize(e) for e in context["pageEntities"] if isinstance(e, str)]
        if entities:
            lines.append(f"Visible data: {', '.join(entities)}")
    lines.append("")
    if has_entity or scope != "global":
        lines.append(
            "When answering, focus on the above scope unless the user explicitly asks about a broader view."
        )
    else:
        lines.append("Use the page context above to inform your answer where relevant.")
    return "\n".join(lines)


def _build_system_prompt(messages: list[dict], context: dict | None = None) -> str:
    skills_md = load_skills_markdown()
    core = render_prompt("system/core.md", {"today_date": date.today().isoformat()})
    confidence = load_prompt_text("system/confidence.md")
    reasoning_trace = load_prompt_text("system/reasoning_trace.md")
    if _is_followup(messages):
        turn_guidance = load_prompt_text("system/followup.md")
        response_template = load_prompt_text("system/response_template_followup.md")
    else:
        turn_guidance = load_prompt_text("system/initial.md")
        response_template = load_prompt_text("system/response_template_initial.md")
    context_block = _build_context_block(context) if context else ""
    separator = f"\n\n{context_block}\n\n" if context_block else "\n\n"
    return (
        f"{core}{separator}{confidence}\n\n{reasoning_trace}\n\n{turn_guidance}\n\n{response_template}\n\n"
        f"{skills_md}{get_catalogue_text()}"
    )


@router.post("/api/query")
async def query(req: ChatRequest):
    async def _stream():
        yield f"data: {json.dumps({'type': 'meta', 'llm_model': get_resolved_chat_model(), 'gate_model': get_resolved_gate_model()})}\n\n"
        yield f"data: {json.dumps({'type': 'agent', 'agent_id': 'clarification-agent', 'content': 'Evaluating question scope and clarity…'})}\n\n"
        messages = _clip_messages_for_agent(req.messages)
        gate = await query_gate.assess(messages, req.context)
        if gate["outcome"] == "out_of_scope":
            yield f"data: {json.dumps({'type': 'not_supported', 'content': gate['payload']})}\n\n"
            return
        if gate["outcome"] == "needs_clarification":
            yield f"data: {json.dumps({'type': 'clarification', 'content': gate['payload']})}\n\n"
            return
        yield f"data: {json.dumps({'type': 'thinking', 'content': 'Question in scope — routing to analysis'})}\n\n"
        yield f"data: {json.dumps({'type': 'agent', 'agent_id': 'data-extraction', 'content': 'Querying data sources…'})}\n\n"
        try:
            system_prompt = _build_system_prompt(messages, req.context)
        except (SkillsConfigError, PromptConfigError) as e:
            yield f"data: {json.dumps({'type': 'error', 'content': f'Skills configuration error: {e}'})}\n\n"
            return

        async for chunk in agent_service.stream_agent_response(
            messages,
            system_prompt=system_prompt,
        ):
            yield chunk

    return StreamingResponse(
        _stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
