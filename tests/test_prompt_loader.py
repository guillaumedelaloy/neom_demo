import pytest

from api.services.prompt_loader import (
    PromptConfigError,
    load_prompt_text,
    load_runtime_messages,
    render_prompt_text,
)
from api.services.skills_loader import get_catalogue_text


def test_load_prompt_text_reads_skills_catalog():
    load_prompt_text.cache_clear()
    text = load_prompt_text("skills/catalog.md")
    assert "## Global Operating Rules" in text
    assert (
        "2030 valuation change if the price of aluminum increased by 1%pt more" in text
    )
    assert "interpret it as a first-order `+1%` move" in text


def test_render_prompt_text_requires_all_variables():
    with pytest.raises(PromptConfigError, match="Missing prompt template variable"):
        render_prompt_text("Hello {name} {city}", {"name": "Henning"})


def test_load_runtime_messages_parses_agent_runtime_block():
    load_runtime_messages.cache_clear()
    messages = load_runtime_messages()

    assert "relevant Maaden evidence" in messages["not_supported"]
    assert "tools" not in messages["not_supported"]
    assert "{calls_remaining}" in messages["pressure_soft"]
    assert "{calls_remaining}" in messages["pressure_medium"]
    assert "FINAL ROUND" in messages["pressure_hard"]
    assert "consolidation_prompt" in messages
    assert "evidence already collected" in messages["consolidation_prompt"]
    assert "best first-order answer" in messages["consolidation_prompt"]
    assert "EBITDA or cash-flow sensitivity" in messages["consolidation_prompt"]
    assert "tool-call budget" not in messages["consolidation_prompt"]
    assert (
        "Before finalizing, count the items in your answer and verify the count matches the user's request."
        in messages["consolidation_prompt"]
    )
    assert (
        "If the evidence only supports fewer than the requested number"
        in messages["consolidation_prompt"]
    )
    assert messages["progress"]["preview_sheet"]


def test_system_prompts_include_grounding_and_tool_boundaries():
    load_prompt_text.cache_clear()
    core = load_prompt_text("system/core.md")
    confidence = load_prompt_text("system/confidence.md")
    initial = load_prompt_text("system/initial.md")
    followup = load_prompt_text("system/followup.md")
    query_gate = load_prompt_text("system/query_gate.md")
    template_initial = load_prompt_text("system/response_template_initial.md")
    template_followup = load_prompt_text("system/response_template_followup.md")
    data_catalogue = get_catalogue_text()

    # core.md: grounding rules and data quality (NOT response style)
    assert "Never invent numbers" in core
    assert "Do not claim capabilities beyond currently available tools" in core
    assert "Do not use emojis in user-facing responses" in core
    assert "strict MECE principle" in core
    assert "apply the canonical confidence contract exactly" in core
    assert "defined only in the canonical confidence contract" in core

    # core.md delegates response style to the canonical template
    assert "single source of truth" in core
    assert "Never use internal platform language" in core
    assert "missing business evidence or missing scope" in core
    assert "single source of truth for confidence formatting" in confidence
    assert "Render confidence as a dedicated `## Confidence` section" in confidence
    assert "Always include a short basis after the label" in confidence
    assert "🟢 for high or medium-high, 🟡 for medium, 🔴 for low" in confidence
    assert (
        "Never output a bare confidence label such as `🟢 high` with no explanation"
        in confidence
    )
    assert "Confidence quick-assign:" in confidence
    assert (
        "Direct schedule-impact answer grounded in the integrated master plan"
        in confidence
    )
    assert "`🟢 medium-high` at best" in confidence
    assert "not a generic multi-source downgrade" in confidence
    assert (
        "Executive priority answers grounded in corroborating execution/status"
        in confidence
    )
    assert "three or more disparate sources or material assumptions" in confidence
    assert "headline label MUST be `🟢 medium-high`" in confidence
    assert "Do not downgrade an executive priority answer to `🟡 medium`" in confidence
    assert "does not apply to the standard executive evidence pack" in confidence
    assert (
        "Use that contract for output labels, emoji mapping, and formatting"
        in data_catalogue
    )

    # initial.md: tool-routing and numeric verification only
    assert "single source of truth" in initial
    assert "Financial model questions" in initial
    assert (
        "2030 valuation change if the price of aluminum increased by 1%pt more"
        in initial
    )
    assert "Treat `1%pt more` as `+1%` in the aluminum price deck" in initial
    assert (
        "standard evidence pack of current execution/status, strategy/board, and risk/enabler sources"
        in initial
    )
    assert "must stay `🟢 medium-high`" in initial
    assert "start with the authoritative source for that question" in initial
    assert "apply the canonical confidence contract exactly" in initial
    assert (
        "assign one confidence score using the canonical confidence contract" in initial
    )
    assert (
        "Use `## Short answer` for the direct answer in one short sentence or paragraph"
        in initial
    )
    assert "follow the canonical confidence contract" in initial
    assert (
        "Before finalizing, count the items in your answer and verify the count matches the user's request."
        in initial
    )
    assert "If the evidence only supports fewer than the requested number" in initial
    assert (
        "Add `## Action plan` before `## More detail` only when the user is asking what to do next"
        in initial
    )
    assert "treat the result as an authoritative green-confidence path" in initial
    assert "re-check with tools" in followup
    assert "single source of truth" in followup
    assert "refines a sensitivity or valuation scenario" in followup
    assert "`1%pt more` style commodity wording as a `+1%` price move" in followup
    assert "single short bullet" in followup
    assert "apply the canonical confidence contract exactly" in followup
    assert "keep lower-confidence supplementary detail in caveats" in followup
    assert "follow the canonical confidence contract" in followup
    assert "the final answer must start with `## Confidence`" in initial
    assert "Otherwise, it must start with `## Short answer`" in initial
    assert "the final answer must start with `## Confidence`" in followup
    assert "Otherwise, it must start with `## Short answer`" in followup
    assert "`## Confidence` or `## Short answer`" not in initial
    assert "`## Confidence` or `## Short answer`" not in followup
    assert (
        "Before finalizing, count the items in your answer and verify the count matches the user's request."
        in followup
    )
    assert "If the evidence only supports fewer than the requested number" in followup
    assert (
        "keep the confidence green when the delay quantum comes directly from the integrated master plan"
        in followup
    )

    # query_gate.md: clarification and rejection copy must stay business-facing
    assert "business-facing assistant" in query_gate
    assert (
        "Do not mention tools, agents, prompts, indexes, models, or internal mechanics"
        in query_gate
    )
    assert "## Known Executive Demo Questions" in query_gate
    assert "Treat close paraphrases" in query_gate
    assert "semantic families" in query_gate
    assert "alu` = `aluminum" in query_gate
    assert (
        "current Iran war / regional conflict / geopolitical disruption" in query_gate
    )
    assert "status, progress, health, delay, or outlook" in query_gate
    assert (
        "changed driver and affected metric or period are already clear" in query_gate
    )
    assert (
        "2030 valuation change if the price of aluminum increased by 1%pt more"
        in query_gate
    )
    assert "KPIs, metrics, or Board-level measures" in query_gate
    assert "multi-year strategy horizon" in query_gate
    assert (
        "This rule does NOT override the executive demo pass-through families below"
        in query_gate
    )
    assert "strategy portfolio, strategy initiatives" in query_gate
    assert (
        "If I had only 3 priorities at Maaden today what would they be to realize the strategy?"
        in query_gate
    )
    assert "Which BU is performing better than others?" in query_gate
    assert "comparison dimension is **missing**" in query_gate
    assert "dashboard context does not already provide one" in query_gate
    assert "period or entity scope is missing" in query_gate
    assert (
        "What is the total capex planned on strategy initiatives this year?"
        in query_gate
    )
    assert (
        "Better in terms of schedule delivery, financial performance, risk, or overall strategy delivery?"
        in query_gate
    )

    assert "answer with the consolidated total first" in initial

    # response_template_initial.md: the single authority for response shape
    assert "## Direct Answer" not in template_initial
    assert "## Short answer" in template_initial
    assert "## Confidence" in template_initial
    assert "## Action plan" in template_initial
    assert "## More detail" in template_initial
    assert "## Sources" in template_initial
    assert "single source of truth" in template_initial
    assert "Keep `## Sources` to 1-2 bullets maximum" in template_initial
    assert (
        "Each `## Action plan` bullet must say who should do what and how urgent it is"
        in template_initial
    )
    assert "Default to the shortest response" in template_initial
    assert "Always use `## Short answer` for the direct answer" in template_initial
    assert "business analyst or executive briefing" in template_initial
    assert "the final answer must start with `## Confidence`" in template_initial
    assert "Otherwise, it must start with `## Short answer`" in template_initial
    assert "`## Confidence` or `## Short answer`" not in template_initial
    assert "Avoid internal/platform phrases" in template_initial
    assert (
        "When evidence is insufficient, explain the business limitation plainly"
        in template_initial
    )
    assert "Follow the canonical confidence contract" in template_initial
    assert (
        "🟢 medium-high — figures corroborated but source dates differ"
        in template_initial
    )
    assert (
        "Example — schedule-impact answer using two authoritative structured sources"
        in template_initial
    )
    assert (
        "delay quantum from the integrated master plan and EBITDA impact from the financial model"
        in template_initial
    )
    assert "{{confidence_label_with_basis}}" in template_initial
    assert "For a single source, use inline `Source: ...`" in template_initial
    assert "{{direct_answer}}" in template_initial
    assert "template_name: response_template_initial" in template_initial
    assert (
        "Before finalizing, count the items in your answer and verify the count matches the user's request."
        in template_initial
    )
    assert (
        "If the evidence only supports fewer than the requested number"
        in template_initial
    )

    assert "## Direct Answer" not in template_followup
    assert "## Short answer" in template_followup
    assert "## Confidence" in template_followup
    assert "## Action plan" in template_followup
    assert "## More detail" in template_followup
    assert "## Sources" in template_followup
    assert "single source of truth" in template_followup
    assert (
        "Include only the minimum number of sources needed to support the answer"
        in template_followup
    )
    assert "Default to the shortest response" in template_followup
    assert "Always use `## Short answer` for the direct answer" in template_followup
    assert "business analyst or executive briefing" in template_followup
    assert "the final answer must start with `## Confidence`" in template_followup
    assert "Otherwise, it must start with `## Short answer`" in template_followup
    assert "`## Confidence` or `## Short answer`" not in template_followup
    assert "Avoid internal/platform phrases" in template_followup
    assert (
        "When evidence is insufficient, explain the business limitation plainly"
        in template_followup
    )
    assert "Follow the canonical confidence contract" in template_followup
    assert "{{confidence_label_with_basis}}" in template_followup
    assert "For a single source, use inline `Source: ...`" in template_followup
    assert "{{direct_answer}}" in template_followup
    assert "template_name: response_template_followup" in template_followup
    assert (
        "Before finalizing, count the items in your answer and verify the count matches the user's request."
        in template_followup
    )
    assert (
        "If the evidence only supports fewer than the requested number"
        in template_followup
    )
