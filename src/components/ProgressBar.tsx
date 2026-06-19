type ProgressBarProps = {
  value: number
  max?: number
  className?: string
}

export function ProgressBar({ value, max = 100, className = '' }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-full bg-ma-surface dark:bg-ma-charcoal/40 ${className}`}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${pct}%`,
          background: 'linear-gradient(90deg, var(--ma-teal-muted), var(--ma-accent))',
        }}
      />
    </div>
  )
}
