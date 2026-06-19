import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'

type SparklineChartProps = {
  data: number[]
  color?: string
  height?: number
  className?: string
}

export function SparklineChart({
  data,
  color = 'var(--ma-accent)',
  height = 40,
  className = '',
}: SparklineChartProps) {
  const chartData = data.map((v, i) => ({ i, v }))
  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <XAxis dataKey="i" hide />
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
