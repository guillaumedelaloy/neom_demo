# Story 4.7: Agent Loop Reliability

**Story ID:** 4.7
**Story Key:** 4-7-agent-loop-reliability
**Epic:** Epic 4 — Connect Agent to Data Layer
**Workstream:** A — Data Foundation
**Status:** review
**Date Created:** 2026-04-14

---

## Story

As an engineer,
I want the agent loop to degrade gracefully as it approaches or exceeds its tool-call budget,
So that users receive the best grounded answer available before the system falls back to `not_supported`.

---

## Acceptance Criteria

**AC1 — `_MAX_ROUNDS` reduced to 15**

`agent_service.py` uses `_MAX_ROUNDS = 15` with guidance that typical schedule and financial questions should complete in far fewer rounds.

**AC2 — Remaining budget is injected into tool results**

After each tool call, dict-like tool results receive:

```python
tool_result["_meta"] = {"calls_remaining": _MAX_ROUNDS - round_num - 1}
```

This gives the model explicit awareness of the remaining budget.

**AC3 — Pressure escalates in tiers, not just at the very end**

The runtime loads three pressure messages from `api/prompts/runtime/agent_runtime.md`:

- `pressure_soft` — starts at round 9 of 15
- `pressure_medium` — starts at round 13 of 15
- `pressure_hard` — final round

Each pressure message is prepended as a temporary system message for that round only; it is not permanently added to history.

**AC4 — Empty-content recovery uses consolidation**

If the model returns no tool calls and empty content,
the runtime makes one non-streaming consolidation call using `consolidation_prompt` from `api/prompts/runtime/agent_runtime.md`.

If consolidation returns useful content, the response streams that content and completes normally.

**AC5 — Max-round exhaustion consolidates before `not_supported`**

If `_MAX_ROUNDS` is exhausted,
the runtime emits a `thinking` event using `consolidation_thinking`,
then makes one consolidation call with the gathered history.

If consolidation returns useful content, that answer is streamed and followed by `done`.
If consolidation also fails, only then is `not_supported` emitted.

**AC6 — User-facing runtime strings live outside Python code**

The following user-facing runtime strings are loaded from `api/prompts/runtime/agent_runtime.md`, not hardcoded in Python:

- `not_supported`
- `consolidation_prompt`
- `consolidation_thinking`
- `llm_unavailable`
- `bu_schedule_thinking`
- `pressure_soft`
- `pressure_medium`
- `pressure_hard`

---

## Tasks / Subtasks

- [x] T1: Update `api/prompts/runtime/agent_runtime.md`
  - [x] T1.1: Add `consolidation_prompt`
  - [x] T1.2: Add `consolidation_thinking`
  - [x] T1.3: Replace single pressure message with `pressure_soft`, `pressure_medium`, `pressure_hard`
  - [x] T1.4: Make the `not_supported` message more actionable

- [x] T2: Update `api/services/agent_service.py`
  - [x] T2.1: Reduce `_MAX_ROUNDS` to 15
  - [x] T2.2: Inject `_meta.calls_remaining` into dict tool results
  - [x] T2.3: Implement tiered `_pressure_msg()` logic
  - [x] T2.4: Add `_consolidation_call()`
  - [x] T2.5: Use consolidation on empty-content path
  - [x] T2.6: Use consolidation on max-round path

- [x] T3: Remove hardcoded user-facing runtime strings from Python service code
  - [x] T3.1: Load `llm_unavailable` from runtime prompt file
  - [x] T3.2: Load `bu_schedule_thinking` from runtime prompt file
  - [x] T3.3: Keep Python service layer free of long user-facing literals

- [x] T4: Update tests
  - [x] T4.1: `tests/test_agent_service.py` covers consolidation success/failure on max-round exhaustion
  - [x] T4.2: `tests/test_agent_service.py` covers empty-content recovery via consolidation
  - [x] T4.3: `tests/test_prompt_loader.py` covers tiered pressure and consolidation fields

- [x] T5: Verify behaviour end-to-end
  - [x] T5.1: Typical questions complete well under the 15-round cap
  - [x] T5.2: SSE contract remains stable (`thinking`, `token`, `done`, `error`, `not_supported`)
  - [x] T5.3: Consolidation triggers only on failure paths, not on normal answers

---

## Dev Notes

### Consolidation is now the preferred failure-path behaviour

The old behaviour was to hit the budget ceiling and emit a dead-end fallback. The current behaviour is:

1. search with explicit budget awareness
2. apply escalating pressure to consolidate earlier
3. make one consolidation pass with the gathered evidence
4. emit `not_supported` only if consolidation still cannot produce a useful answer

### Empty-content is treated as recoverable

An empty assistant message is no longer treated as a terminal failure. It triggers the same consolidation recovery path used for max-round exhaustion.

### Pressure messages are temporary

Pressure text is injected into `history_for_this_round` only. It is not appended to the persistent history list.

### Runtime strings live in prompt files

This keeps the service layer behaviourally stable while allowing prompt iteration without rewriting Python literals.

### Relevant files

| File | Change |
|---|---|
| `api/prompts/runtime/agent_runtime.md` | Add tiered pressure, consolidation prompt, actionable fallback text |
| `api/services/agent_service.py` | Budget awareness, tiered pressure, consolidation paths |
| `api/services/llm_client.py` | Allow caller-provided streaming error message |
| `api/services/prompt_loader.py` | Parse tiered pressure and consolidation fields |
| `tests/test_agent_service.py` | Add consolidation-path coverage |
| `tests/test_prompt_loader.py` | Assert tiered pressure/consolidation fields are loaded |

### Do not assume `not_supported` means no useful evidence existed

Frontend handling should preserve any already-streamed content. `not_supported` is now the terminal signal only when the runtime cannot safely produce a final answer after consolidation.

---

## Change Log

- 2026-04-14: Story created
- 2026-04-15: Story backfilled to reflect shipped consolidation-first runtime behaviour and tiered pressure messages
