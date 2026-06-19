type GaugeChartProps = {
  value: number
  min: number
  max: number
  goodPortion?: number
  size?: number
  strokeWidth?: number
  label?: string
  formatValue?: (v: number) => string
  variant?: 'arc' | 'ring'
}

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleInDegrees: number,
) {
  const angleInRadians = ((angleInDegrees - 180) * Math.PI) / 180.0
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  }
}

function describeArc(
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(x, y, radius, endAngle)
  const end = polarToCartesian(x, y, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(
    ' ',
  )
}

export function GaugeChart({
  value,
  min,
  max,
  goodPortion = 0.55,
  size = 120,
  strokeWidth = 10,
  label,
  formatValue = (v) => v.toFixed(2),
  variant = 'arc',
}: GaugeChartProps) {
  const cx = size / 2
  const cy = variant === 'arc' ? size * 0.62 : size / 2
  const r = size * 0.36
  const start = 180
  const end = 0
  const span = start - end
  const t = Math.min(1, Math.max(0, (value - min) / (max - min)))
  const valueAngle = start - t * span
  const goodEnd = start - goodPortion * span

  const trackPath = describeArc(cx, cy, r, end, start)
  const valuePath = describeArc(cx, cy, r, end, valueAngle)

  if (variant === 'ring') {
    const pct = Math.min(1, Math.max(0, (value - min) / (max - min)))
    const circumference = 2 * Math.PI * r
    const dash = pct * circumference
    return (
      <div className="flex flex-col items-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="var(--ma-line)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="var(--ma-accent)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-ma-accent text-lg font-semibold tabular-nums"
          >
            {formatValue(value)}
          </text>
        </svg>
        {label != null && (
          <p className="mt-1 max-w-[10rem] text-center text-[11px] text-ma-muted">{label}</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.72} viewBox={`0 0 ${size} ${size * 0.72}`}>
        <path
          d={trackPath}
          fill="none"
          stroke="var(--ma-line)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <path
          d={describeArc(cx, cy, r, goodEnd, start)}
          fill="none"
          stroke="var(--ma-teal)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity={0.35}
        />
        <path
          d={valuePath}
          fill="none"
          stroke="var(--ma-accent)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <text
          x={cx}
          y={cy - r * 0.15}
          textAnchor="middle"
          className="fill-ma-accent text-lg font-semibold tabular-nums"
        >
          {formatValue(value)}
        </text>
      </svg>
      {label != null && (
        <p className="-mt-1 max-w-[12rem] text-center text-[11px] text-ma-muted">{label}</p>
      )}
    </div>
  )
}
