# NEOM CEO Cockpit — Data Catalogue
_Last updated: 2026-04-15 (rev 4)_

This catalogue is the authoritative reference for what data exists in this system, which agent should use it, and what is explicitly NOT available. Agents must not fabricate or infer data that is absent here.

NEOM is a Saudi giga-project under Vision 2030 — a clean-sheet region powered by 100% renewable energy — delivered across five sectors: Urban Development & Smart Communities, Special Economic Zone & Investment Platform, Luxury Tourism & Hospitality, Clean Energy & Green Industry, and Digital Infrastructure & AI. Flagship destinations include OXAGON, TROJENA, SINDALAH, ENOWA, and Tonomus, plus the flagship Urban Development programme.

---

## Internal Data-Key Mapping (NEVER expose to users)

The underlying data files predate the current sector naming and still use legacy sector-coded keys on disk for some bundles. When routing schedule and financial queries, map the NEOM sector to its **API** schedule key in the table below (`hospitality`, not legacy mining-era labels). These keys are technical identifiers only — never surface raw file basenames or obsolete mining terminology in any user-facing answer.

| NEOM Sector | Flagship destination(s) | Internal schedule key | Internal financial summary sheet |
|---|---|---|---|
| Urban Development & Smart Communities | Flagship urban programme | `phosphate` | `Phos_Consolidated BU` |
| Special Economic Zone & Investment Platform | OXAGON | `aluminum` | `Alum_Consolidated BU` |
| Luxury Tourism & Hospitality | TROJENA, SINDALAH | `hospitality` | `BMNM_Consol` |
| Clean Energy & Green Industry | ENOWA | `copper` | `Kureem_Consolidated` |
| Digital Infrastructure & AI | Tonomus | `ree` | `ARGOS_Consolidated` |

**Urban Development flagship — Phase 1** is the detailed delivery programme (internal JSON key `phos3_ph1`) tracked separately from the five sector schedules (see Data Source 1). Use this business name in user-facing answers — do not surface legacy asset codenames.

---

## Citation Rules — Original Raw Data Files Only

When citing sources in responses, **always reference the original source document** by its NEOM business name from the table below — **never** cite tool names, function names, internal data keys, raw file basenames, or preprocessed/intermediate file paths (e.g. `schedules.json`, `financial_model.json`, `workbook_index.json`).

Where available, include the specific location within the file: sheet name, page number, milestone ID, slide number, or section.

| Canonical Business Name | Source | Example Citation |
|---|---|---|
| IMP / Integrated Master Plan | Primavera schedules per sector — current (V18) and baseline (V16) | Current fields: "IMP — Urban Development & Smart Communities schedule (V18), milestone UD-M-042"; Baseline fields: "IMP — Urban Development & Smart Communities baseline (V16), task UD-M-042 baseline_finish" |
| Financial Model | `v3.6_Financial Model_FY25-2040_MASTER_v116_Bestcase.xlsx` | "Financial Model (Funding Gap sheet, row 12)" |
| 2040 Strategy | Strategy Offsite deck (Aug 2025) | "2040 Strategy Offsite (Aug 2025), slide 14" |
| Excom Risk Update | April Excom Risk Update deck (Apr 2026) | "Excom Risk Update (Apr 2026), p.3" |
| Strategy Enablers | Strategy Operationalization & Enablers board deck (Nov 2025) | "Strategy Enablers deck (Nov 2025), slide 7" |
| Technology Update | Technology Update (Mar 2026) | "Technology Update (Mar 2026), p.5" |
| Budget & BP 2026–2030 | Budget and BP 2026–2030 board document | "Budget & BP 2026–2030, p.22" |
| QBR Q1 2026 | Quarterly Business Review deck (Q1 2026) | "QBR Q1 2026, slide 8" |
| MSE deck (Feb 2026) | Monthly Strategy Execution deck (Feb 2026) | "MSE deck (Feb 2026), p.4" |
| Annual Report [YYYY] | Corresponding annual report PDF | "Annual Report 2024, p.47" or "Annual Report 2022, p.31" |
| [Period] Earnings Call | Corresponding earnings call PDF | "Q3 FY25 Earnings Call, slide 12" or "FY22 Earnings Call, slide 5" |

Tool outputs contain metadata (e.g. `source_file`, `source`, `page`) that maps back to these documents. The raw metadata values may carry legacy filenames or sector codes — always trace them to the NEOM business name above before citing, and never expose the raw value.

---

## Confidence and Ambiguity Rules

- **High-confidence raw data must be prioritized.** If a high-confidence source answers the question directly, use it ahead of lower-confidence narrative sources.
- **The canonical confidence contract lives outside this catalogue.** Use that contract for output labels, emoji mapping, and formatting; use this catalogue only for authority and raw-confidence inputs.
- **Start from the `Raw confidence` field on the specific data catalogue entries actually used in the answer.** This is an input signal to the unified confidence score, not a separate output label.
- **Audited financial figures from annual reports are HIGH raw confidence.** When the answer cites a specific audited metric (EBITDA, revenue, net income, total assets, etc.) for a specific historical year directly from that year's annual report or a later annual report's restated summary table, treat the raw confidence as HIGH for that data point — on the same footing as the financial model. The LOW default for the investor relations corpus applies only to narrative claims, management commentary, forward-looking statements, and qualitative assertions within those same documents. In practice this means: reading "FY2022 group EBITDA was SAR 19,397M" from an audited annual report table is HIGH confidence; reading "management believes visitor arrivals will accelerate" from the same report is LOW confidence.
- **Confidence reflects the headline answer, not every supplementary detail.** The confidence label scores whether the primary question was answered from a trustworthy source with sound reasoning — it does NOT average across every data point in the response. When the primary data point comes from a HIGH-confidence source and is directly retrieved (not synthesized or inferred), the confidence label MUST be `🟢 high`. If supplementary detail (e.g. sector-level breakdowns, margins, context) comes from lower-confidence sources or is partially missing, note those limitations in `## Assumptions / caveats` — but do NOT let them pull the overall label below green. Example: user asks "What is EBITDA for 2022?" and the audited group total (SAR 19,397M) is read directly from an annual report table → confidence is `🟢 high`, period — even if sector splits are incomplete or sourced from a narrative deck. The sector gaps are a caveat, not a confidence downgrade.
- **Corroboration raises confidence in the claim, not the raw file type.** A PDF or PPT remains low raw confidence, but when two or more sources independently agree on a data point, state the corroboration explicitly in the response and raise effective confidence one notch above what the lowest-confidence source alone would warrant. For example, a low-confidence PDF claim corroborated by a high-confidence structured source yields high confidence in the specific claim. Corroboration is helpful, but it is not required for a green answer when the authoritative high-confidence source answers the question directly.
- **If two raw sources disagree, state the ambiguity explicitly.** Name both raw sources with their conflicting values, identify which source is assumed to be the source of truth (per the Authority Hierarchy below), and explain the basis for that choice. Do not default to the more recent source — use the Authority Hierarchy.
- **Do not smooth over source conflicts.** If the evidence cannot be reconciled safely, say so and keep the answer narrow.

---

## Authority Hierarchy

When sources conflict, defer to the higher authority:

1. **IMP (`schedules.json`)** — source of truth for all project status and timing
2. **Financial model XLS** — source of truth for all financial figures; within the model, `Funding Gap` sheet supersedes `CAPEX` sheet for capex totals, funding sources, and gap analysis
3. **2040 Strategy (Offsite Aug 2025)** — authoritative for qualitative strategic direction
4. **Excom Risk Update (Apr 2026)** — authoritative for qualitative risk narrative
5. **Strategy Enablers deck (Nov 2025)** — context on enabler approach and operationalisation
5b. **Technology Update (Mar 2026)** — authoritative for technology status; IMP supersedes on dates, financial model on figures
6. **Budget & BP 2026–2030** — board commitments; useful for quoting stated targets
7. **QBR Q1 2026 / MSE execution decks** — format reference only; not authoritative for data; helpful for qualitative insights when recent; QBR Q1 2026 preferred over MSE decks for recency
8. **Investor relations docs** — authoritative for **external commitments and historical actuals** only (what NEOM has communicated publicly); NOT authoritative for current operational status, project tracking, or internal figures — use IMP and financial model for those

---

## Data Source 1: Integrated Master Plan (IMP)

- **File:** `data_extract/processed/schedules.json`
- **Also known as:** IMP, Integrated Master Plan, V18, the schedule
- **Format:** JSON (pre-processed from Primavera schedule files by `scripts/process_schedule_data.py`)
- **Raw confidence:** HIGH — derived from Primavera source schedule files
- **Source files:** Two schedule files per sector (for the five main sectors) — V18 (current schedule: task status, RAG UDF type 489, planned dates) and V16 (baseline: `baseline_finish` dates and `baseline_rag_status` values, RAG type 487 with literal values Green/Amber/Red). Each sector entry in `schedules.json` carries both `planned_finish` (from V18) and `baseline_finish` (from V16), enabling direct variance computation. *Urban Development flagship — Phase 1 is different — see below: it uses three single-file snapshots; its baseline derives from the Sep 2024 snapshot, not a V16 schedule.*
- **Authority:** HIGHEST — supersedes all other sources on project status and milestone timing
- **Agents:** DELIVERY ENGINE (primary), RISK RADAR, DATA RETRIEVAL
- **Tools:** `get_schedule_overview`, `get_bu_schedule`

**What it contains:**
The IMP is a backwards-framing of the 2040 strategy: starting from each sector's 2040 targets, it works backwards to determine when every milestone must be achieved. It covers both growth projects and enablers (Utilities, Infrastructure, Finance, Government — e.g. when land allocation letters must be secured, when government tariff negotiations must conclude, when engineering must be commissioned).

**Enablers guidance:** When answering questions about enablers, the IMP is the **authoritative source** — it defines which enablers exist, their milestones, tasks, RAG status, and schedule tracking. Use strategy documents (2040 Strategy, Strategy Enablers deck, Technology Update) on top of IMP to add **qualitative context** (rationale, approach, operationalisation narrative) but never as a substitute for IMP data on what exists or how enablers are tracking.

**Coverage — 5 Sectors:**

| Sector | Milestones | Tasks | Key projects |
|----|-----------|-------|-------------|
| Urban Development & Smart Communities | 109 | 379 | Urban flagship phases 1–6, Hidden Marina |
| Special Economic Zone & Investment Platform | 147 | 544 | OXAGON Port, Manufacturing Lines 1–6 |
| Luxury Tourism & Hospitality | 209 | 804 | TROJENA, SINDALAH, Gulf of Aqaba resorts and clusters |
| Clean Energy & Green Industry | 151 | 497 | ENOWA green hydrogen, desalination |
| Digital Infrastructure & AI | 151 | 504 | Tonomus cognitive-city platforms |

**Coverage — Urban Development flagship — Phase 1 (detailed):**
Three programme snapshots comparing execution progress against baseline:
- `baseline_sep24` — data date 2024-09-27, 34.5% complete, 22,763 tasks, 851 milestones
- `jan26` — data date 2026-01-30, 69.9% complete, 29,605 tasks, 1,039 milestones
- `feb26` (latest) — data date 2026-02-27, 71.8% complete, 29,895 tasks, 1,043 milestones
- Change since baseline: 7,500 tasks added, 368 removed. These contractor schedules omit the NEOM RAG indicator field — all milestones show Gray (unclassified).
- **Baseline derivation:** This programme does NOT use a paired V16 schedule. The `baseline_sep24` snapshot itself acts as the baseline — `baseline_finish` for each milestone is taken from `target_end_date` in that Sep 2024 file. Do not apply the five-sector V18/V16 model here.

**RAG status:** Read directly from the RAG indicator UDF field (type 489) in the V18 schedule — this is the scheduler's manually assigned, authoritative programme-level RAG. Values: Blue = Completed, Green = In Progress on Track, Amber = Minor Delay with Mitigation, Red = Major Delay no Mitigation, Gray = Not Started (no UDF value assigned). A second field `baseline_rag_status` carries the V16 baseline RAG (type 487, literal text Green/Amber/Red) keyed by task_code — use this to detect genuine deteriorations (e.g. V16 Green → V18 Red) vs already-known issues. RAG is NOT computed from schedule variance.

**Note:** `data_extract/processed/schedules.json` is generated from both V18 and V16 schedule files per sector (five main sectors) — V18 supplies current task status, RAG UDF values, and planned dates; V16 supplies baseline finish dates (`baseline_finish`) and baseline RAG values (`baseline_rag_status`). The `source_file` field on milestones and tasks identifies the originating **V18** schedule basename only; V16-derived fields (`baseline_finish`, `baseline_rag_status`) should be cited against the V16 basename available in `sources[bu].baseline`. These raw basenames carry legacy sector codes — map them to the NEOM sector business name when citing (e.g. "IMP — Urban Development & Smart Communities baseline (V16), task UD-M-042 baseline_finish") and never expose the raw basename. The PDF current-activities RAG export in the RAG corpus is a snapshot export of the same V18 IMP data — `schedules.json` is authoritative if they conflict. A top-level `sources` block in `schedules.json` lists `current` (V18) and `baseline` (V16) schedule basenames for each of the five main sectors; the `phos3_ph1_snapshots` key maps snapshot names to individual schedule basenames (no `current`/`baseline` keys).

---

## Data Source 2: Financial Model

- **File:** `data_extract/strategy/financial_model/v3.6_Financial Model_FY25-2040_MASTER_v116_Bestcase.xlsx`
- **Format:** Excel (125 sheets; 116 non-empty; headers are NOT at row 0 — always `preview_sheet` before extraction)
- **Raw confidence:** HIGH — structured Excel model data, source of truth for financial figures
- **Coverage:** FY2021 to FY2040 for Urban Development & Smart Communities, Special Economic Zone & Investment Platform, Luxury Tourism & Hospitality, and Consolidated Group (Group); FY2024 to FY2045 for Clean Energy & Green Industry (ENOWA) and Digital Infrastructure & AI (Tonomus). Best-case scenario.
- **Actuals cutoff:** All figures up to and including Q3 2025 are actuals. Q4 2025 onwards are estimates/projections. Always caveat when crossing this boundary. Note: the financial model's EBITDA methodology may differ from the audited annual report methodology (e.g. the annual report restated 2022 EBITDA to include JV net profit and other income/expense); when both sources are checked and values differ, surface the discrepancy explicitly per the ambiguity rules above.
- **Authority:** SOURCE OF TRUTH for all financial figures (EBITDA, revenue, capex, delivery/output volumes)
- **Agents:** VALUE LENS (primary), GAP FINDER, DATA RETRIEVAL
- **Tools:** `list_sheets`, `preview_sheet`, `run_python`

**Sheet navigation — start here:**

| Sheet | Use for |
|-------|---------|
| `Consolidated Group` | Portfolio-level financials — authoritative starting point |
| `Corporate` | Same data as Consolidated Group in different format |
| `Phos_Consolidated BU` | Urban Development & Smart Communities sector-level summary |
| `Alum_Consolidated BU` | Special Economic Zone & Investment Platform sector-level summary |
| `BMNM_Consol` | Luxury Tourism & Hospitality sector-level summary |
| `Kureem_Consolidated` | Clean Energy & Green Industry sector-level summary |
| `ARGOS_Consolidated` | Digital Infrastructure & AI sector-level summary |
| `Dashboard` | High-level KPI dashboard view |
| `Funding Gap` | **AUTHORITATIVE for CAPEX and funding** — use this sheet for all capex totals, funding sources, and gap analysis; supersedes `CAPEX` sheet; confirmed non-empty and queryable |
| `CAPEX` | Project-level capex detail — only use when drilling into a specific project's capex; defer to `Funding Gap` for all portfolio-level capex totals, funding sources, and gap analysis |
| `Sensitivity Analysis` | Scenario sensitivity (note: sheet is empty — use `Sensitivity` tab logic instead) |

**Per-project sheets (detailed financials):**
Per-project detail sheets exist for the flagship developments within each sector (e.g. individual urban flagship phases and utility units, OXAGON manufacturing/refinery lines and recycling, TROJENA/SINDALAH and tourism clusters, ENOWA energy and water plants, Tonomus platforms). Use `list_sheets` to discover the exact per-project sheet names; defer to the consolidated sheets above for sector-level figures.

**EMPTY sheets — do not query:** `NPV.IRR`, `Blue Sky`, `KUREEM`, `ARGOS`, `Transactions`, `Sensitivity`, and the single-word legacy sector placeholder tabs. Use `list_sheets` to confirm which sheets are populated.

**Note:** Control sheets (e.g. the per-sector control sheets and `Kureem Control Sheet`) contain model inputs and parameters — generally not useful for answering financial questions. Use consolidated or per-project sheets instead.

**Linked to:** The 2040 Strategy (Offsite Aug 2025) is qualitatively consistent with this model. Where both address the same figure, this model is authoritative.

---

## Data Source 3: Strategy & Execution Document Corpus (ChromaDB)

- **Collection:** `neom_docs` (internal store name; not user-facing)
- **Location:** `data_extract/chroma_db/` (persistent ChromaDB store)
- **Source manifest:** `data_extract/rag_manifest.json`
- **Format:** Vector embeddings (OpenAI `text-embedding-3-small`); requires `OPENAI_API_KEY` — returns empty results if not set
- **Raw confidence:** LOW by default — this corpus is made of human-authored PDF/PPT documents; only treat claims as stronger when corroborated by a higher-confidence source
- **Agents:** RISK RADAR, GAP FINDER, ACTION DESK, DATA RETRIEVAL
- **Tools:** `search_documents`

**Indexed documents and their authority:**

| Document | Category | Raw confidence | Authority / Use |
|----------|----------|----------------|-----------------|
| Current Activities and RAG with Baseline Dates (Apr 2026) | execution | Low | PDF export of V18 IMP — `schedules.json` is authoritative if they conflict |
| QBR Q1 2026 | execution | Low | QBR Q1 2026 — most recent execution review deck; preferred over MSE decks for current status narrative; not authoritative for data (IMP and financial model supersede) |
| MSE deck (Feb 2026) | execution | Low | Monthly Strategy Execution deck (Feb 2026) — format reference; not authoritative for data; defer to QBR Q1 2026 for recency |
| Strategic Execution Update (Mar 2025) | execution | Low | MSE deck (Mar 2025) — format reference only; oldest execution deck; not authoritative for data |
| Budget and BP 2026–2030 (board) | strategy | Low | Board commitments — useful for quoting stated targets; financial model supersedes for figures |
| 2040 Strategy Offsite deck (Aug 2025) | strategy | Low | **Authoritative 2040 strategy** — qualitative direction, narrative, strategic intent; financial model wins on figures |
| Strategy Operationalization & Enablers deck (Nov 2025) | strategy | Low | Context on enabler approach and operationalisation status — not authoritative on timing (IMP is) |
| Technology Update (Mar 2026) | strategy | Low | **Authoritative for technology status** — IMP supersedes on dates; financial model supersedes on figures |
| April Excom Risk Update (Apr 2026) | risk | Low | **Authoritative for qualitative risks** — most recent risk document; use for risk narrative and context |
| Investor relations corpus (annual reports, earnings calls, news announcements) | investor_relations | **HIGH for audited financial figures** from annual reports (EBITDA, revenue, net income, etc.); Low for narrative claims, commentary, and forward-looking statements | External comms; authoritative for **external commitments and historical actuals** (EBITDA, revenue, etc. for past years); NOT authoritative for current operational status, project tracking, or internal figures. See Data Source 4 below for full coverage. |

**Note:** The full investor relations corpus — annual reports (2011–2024), earnings calls (2018–2025), and news announcements (2022–2026) — is indexed in ChromaDB and searchable via `search_documents`. The manifest (`data_extract/rag_manifest.json`) is the source of truth for which documents are currently indexed. The `source` metadata returned for these documents may contain legacy filenames — map them to the NEOM business name from the Citation Rules table and never expose the raw value. When answering questions about historical financials (e.g. EBITDA for a past year), always search the document corpus — it contains audited actuals from annual reports and earnings presentations going back to 2011.

---

## Data Source 4: Investor Relations Corpus

- **Path:** `data_extract/investor_relations/`
- **Format:** PDF (indexed into ChromaDB collection `neom_docs` — query via `search_documents`)
- **Raw confidence:** **HIGH for audited financial figures** (EBITDA, revenue, net income, total assets, etc.) read directly from annual report financial tables or restated summary tables; LOW for narrative claims, management commentary, forward-looking statements, and qualitative assertions. When the answer reads a specific audited metric for a specific year from an annual report, that data point carries the same confidence as the financial model.
- **Contents:** Annual reports (2011–2024), earnings call presentations (2018–2025), and news announcements (2022–2026); external-facing financial communications; authoritative for **external commitments and historical actuals** only — NOT authoritative for current operational status, project tracking, or internal figures
- **Coverage:** Annual reports 2011–2024; earnings calls 2018–2025 (Q2 FY25 and Q3 FY25 are the most recent); news announcements 2022–2026. All documents are indexed in ChromaDB and searchable via `search_documents`.
- **Agents:** RISK RADAR, GAP FINDER, ACTION DESK, DATA RETRIEVAL (all RAG agents via `search_documents`)
- **Historical financials guidance:** For questions about historical financial data (e.g. EBITDA, revenue, net income for years before FY2025), the **financial model is the primary structured source** for FY2021+ (FY2024+ for Clean Energy & Green Industry and Digital Infrastructure & AI) — use `preview_sheet` or `run_python` to extract historical actuals from the relevant sector consolidated sheet. Use `search_documents` to query investor relations documents (annual reports, earnings calls) as a **corroborative or supplementary source**, or as the **sole source for years before FY2021** (annual reports go back to 2011). When the financial model and an annual report both provide a figure for the same metric and year, surface any discrepancy explicitly per the ambiguity rules — the financial model's EBITDA methodology may differ from the audited annual report methodology. If a search returns no results for a specific year, state that the data was not found rather than claiming it does not exist — the manifest (`data_extract/rag_manifest.json`) is the source of truth for indexed documents.

---

## NOT Available

The following data does NOT exist in this system. Do not fabricate, infer, or claim access to these:

- **Live ERP data** — no SAP or ERP connection; all data is point-in-time snapshots
- **Action registers** — no structured list of open actions or owners
- **Cost actuals** — no detailed actual-spend data beyond the financial model's historical summary rows (FY2021–Q3 2025 actuals are high-level P&L metrics like EBITDA and revenue, not granular cost breakdowns)
- **Real-time KPI feeds** — no live operational metrics
- **Contractor or workforce data** — no headcount, contractor rates, or HR data
- **Board resolutions** — board documents may be referenced in strategy PDFs but are not structured data
