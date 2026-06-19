import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ChartSpec } from './types'

const COLORS = [
  'var(--ma-accent)',
  'var(--ma-teal)',
  'var(--ma-amber-warn)',
  'var(--ma-risk)',
  'var(--ma-accent-muted)',
]

const TICK = { fill: 'var(--ma-muted)', fontSize: 11 }

export function ChatChart({ spec }: { spec: ChartSpec }) {
  return (
    <div className="my-3">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ma-muted">
        {spec.title}
      </p>
      <div className="rounded-sm border border-ma-line bg-ma-elevated p-2" style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          {spec.type === 'pie' ? (
            <PieChart>
              <Tooltip />
              <Pie
                data={spec.data}
                dataKey={spec.yKeys[0]}
                nameKey={spec.xKey}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={2}
                stroke="transparent"
              >
                {spec.data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          ) : spec.type === 'line' ? (
            <LineChart data={spec.data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ma-line)" vertical={false} />
              <XAxis dataKey={spec.xKey} tick={TICK} />
              <YAxis tick={TICK} />
              <Tooltip />
              {spec.yKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3, fill: COLORS[i % COLORS.length] }}
                />
              ))}
            </LineChart>
          ) : (
            <BarChart data={spec.data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ma-line)" vertical={false} />
              <XAxis dataKey={spec.xKey} tick={TICK} />
              <YAxis tick={TICK} />
              <Tooltip />
              {spec.yKeys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
