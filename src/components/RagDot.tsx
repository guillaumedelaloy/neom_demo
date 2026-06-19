import type { Rag } from '../lib/commodityRag'

const colors: Record<Rag, string> = {
  green: 'var(--ma-teal)',
  amber: 'var(--ma-amber-warn)',
  red: 'var(--ma-risk)',
}

type RagDotProps = {
  color: Rag | 'blue' | 'gray'
  size?: number
  className?: string
}

const extra: Record<string, string> = {
  blue: 'var(--ma-teal-muted)',
  gray: 'var(--ma-muted)',
}

export function RagDot({ color, size = 10, className = '' }: RagDotProps) {
  const fill = colors[color as Rag] ?? extra[color] ?? 'var(--ma-muted)'
  return (
    <span
      className={`inline-block shrink-0 rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: fill,
        boxShadow: `0 0 6px color-mix(in srgb, ${fill} 35%, transparent)`,
      }}
      aria-hidden
    />
  )
}
