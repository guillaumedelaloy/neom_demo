/**
 * Declared POC economics — all “extra” numbers trace here.
 * Fixture EBITDA/CAPEX still come from projects.json / growthProjectDetails.json.
 */

/** Share of modeled annual cluster EBITDA curtailed per slipped quarter (deterministic). */
export const EBITDA_CURTAILMENT_PER_SLIP_Q = 0.1875

/** POC: energy tariff / utilities price shock → EBITDA sensitivity (SAR millions). */
export const ALUMINUM_PRICE_DROP_EBITDA_SAR_M = 180

/** POC: construction materials cost stress (SAR millions). */
export const PHOSPHATE_FEEDSTOCK_STRESS_SAR_M = 95

/** Weeks of downstream float propagated per quarter of gate slip (POC). */
export const WEEKS_PROPAGATED_PER_SLIP_Q = 11
