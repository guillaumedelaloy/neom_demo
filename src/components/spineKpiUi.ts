/**
 * Shared surface + accent for Business KPI spine list items and sibling content blocks
 * (MSE panels, trajectory table) so they read as one system.
 */

export const spineKpiBlockSurface =
  'relative overflow-hidden rounded-md border border-ma-line/90 bg-[color-mix(in_srgb,var(--ma-surface)_65%,var(--ma-elevated))] px-3 py-2.5 transition-colors duration-200 ease-out hover:border-ma-accent/35 motion-reduce:transition-none dark:bg-[color-mix(in_srgb,var(--ma-charcoal)_40%,var(--ma-elevated))]'

export const spineKpiBlockAccent =
  'pointer-events-none absolute inset-y-0 left-0 z-0 w-1 bg-gradient-to-b from-ma-teal/35 to-ma-accent/25 opacity-80'

/** Content column after the left accent bar (matches KPI row inner offset). */
export const spineKpiBlockBody = 'relative z-[1] pl-2'
