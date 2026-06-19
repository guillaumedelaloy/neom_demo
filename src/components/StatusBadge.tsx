type Variant = 'on_track' | 'potential_delay' | 'delayed' | 'not_started' | 'neutral'

const styles: Record<
  Variant,
  { bg: string; border: string; fg: string; label: string }
> = {
  on_track: {
    bg: 'var(--ma-badge-teal-bg)',
    border: 'var(--ma-badge-teal-border)',
    fg: 'var(--ma-teal)',
    label: 'On Track',
  },
  potential_delay: {
    bg: 'var(--ma-surface)',
    border: 'var(--ma-line)',
    fg: 'var(--ma-amber-warn)',
    label: 'At Risk',
  },
  delayed: {
    bg: 'var(--ma-badge-risk-bg)',
    border: 'var(--ma-badge-risk-border)',
    fg: 'var(--ma-risk)',
    label: 'Delayed',
  },
  not_started: {
    bg: 'var(--ma-bg)',
    border: 'var(--ma-line)',
    fg: 'var(--ma-muted)',
    label: 'Not Started',
  },
  neutral: {
    bg: 'var(--ma-badge-accent-bg)',
    border: 'var(--ma-badge-accent-border)',
    fg: 'var(--ma-accent-muted)',
    label: '',
  },
}

type StatusBadgeProps = {
  variant: Variant
  children?: string
  className?: string
}

export function StatusBadge({ variant, children, className = '' }: StatusBadgeProps) {
  const s = styles[variant]
  const text = children ?? s.label
  return (
    <span
      className={`inline-flex h-auto min-h-6 items-center rounded-sm border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${className}`}
      style={{
        backgroundColor: s.bg,
        borderColor: s.border,
        color: s.fg,
      }}
    >
      {text}
    </span>
  )
}
