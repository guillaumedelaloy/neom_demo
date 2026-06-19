# Agent Runtime Messages

Runtime control strings for the tool-calling loop.

```yaml
kind: agent_runtime
not_supported: "I do not have enough relevant NEOM evidence to answer that reliably. Narrowing it to a sector, time period, project, or topic such as schedule, financials, or strategy would help."
consolidation_prompt: "You have reached the end of the evidence-gathering rounds. Based on the evidence already collected, provide the best answer you can in the normal business response format. Set confidence to reflect any remaining evidence gaps. For sensitivity or valuation questions, return the best first-order answer you can from the evidence already gathered; if you have enough evidence for EBITDA or cash-flow sensitivity but not a full valuation bridge, answer with that partial result and state the limitation briefly instead of returning no answer. If the user explicitly asks for a specific number of items, priorities, bullets, action points, examples, or recommendations, return exactly that number when the evidence supports it. Before finalizing, count the items in your answer and verify the count matches the user's request. If the evidence only supports fewer than the requested number, say that explicitly and provide only the supported items instead of silently returning the wrong count. If the evidence is still insufficient, explain what business detail or source is missing and what narrower question would help. Do not return an empty response."
consolidation_thinking: "Consolidating findings…"
llm_unavailable: "Assistant temporarily unavailable — the model call failed (provider error, rate limit, wrong model id, or missing key). If the provider mentions TPM or tokens per minute, try LLM_MODEL=openai/gpt-4o-mini, lower rag_n_results in api/config/config.yml, or increase your OpenAI tier; then restart the API. Otherwise check LLM_MODEL / GATE_MODEL and keys in .env. See README §2."
bu_schedule_thinking: "Loading IMP schedule — {sector_label}…"
pressure_soft: "You are halfway through your evidence-gathering rounds ({calls_remaining} rounds remaining). If you already have enough evidence, begin composing your answer. If not, focus the remaining rounds on the most critical missing business detail."
pressure_medium: "⚠ {calls_remaining} evidence-gathering rounds remaining. Consolidate around what matters most. A partial answer with clear caveats and lower confidence is better than silence."
pressure_hard: "⚠ FINAL ROUND. You must answer now using the evidence already gathered. If support is incomplete, lower confidence and state the limitation briefly. Do not gather more evidence."
progress_messages:
  describe_workbook: "Exploring the financial workbook structure..."
  list_sheets: "Checking available Excel sheets..."
  preview_sheet: "Previewing sheet structure..."
  preview_sheets: "Loading sheet previews..."
  run_python: "Extracting figures from the financial model..."
  search_documents: "Searching strategy and planning documents..."
  get_schedule_overview: "Loading project schedule overview..."
  get_bu_schedule: "Loading IMP schedule for sector…"
  get_phos3_summary: "Loading Urban Development flagship Phase 1 summary..."
  get_phos3_milestones: "Checking Urban Development flagship Phase 1 milestones..."
  get_phos3_changes: "Reviewing Urban Development flagship Phase 1 recent changes..."
  generate_chart: "Preparing chart visualization..."
```
