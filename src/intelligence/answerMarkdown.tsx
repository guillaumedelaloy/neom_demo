import type { ReactNode } from 'react'
import { AlertTriangle, Bookmark, FileText, Zap } from 'lucide-react'
import type { Components } from 'react-markdown'
export { ChatChart } from './ChatChart'

const CHART_RE = /<!--chart:([\w-]+)-->/g

/** Split streamed markdown into text and chart segments */
export function splitChartSegments(text: string): Array<{ type: 'text'; content: string } | { type: 'chart'; id: string }> {
  const parts: Array<{ type: 'text'; content: string } | { type: 'chart'; id: string }> = []
  let lastIndex = 0
  for (const match of text.matchAll(CHART_RE)) {
    if (match.index > lastIndex) parts.push({ type: 'text', content: text.slice(lastIndex, match.index) })
    parts.push({ type: 'chart', id: match[1] })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) parts.push({ type: 'text', content: text.slice(lastIndex) })
  if (parts.length === 0) parts.push({ type: 'text', content: text })
  return parts
}

/* ── helpers ── */

export function childrenToText(children: ReactNode): string {
  if (typeof children === 'string') return children
  if (typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(childrenToText).join('')
  if (children && typeof children === 'object' && 'props' in children) {
    return childrenToText((children as { props: { children?: ReactNode } }).props.children)
  }
  return ''
}

/* ── section icon config ── */

type SectionConfig = {
  Icon: typeof FileText
  border: string
  bg: string
  iconColor: string
}

export const ANSWER_SECTIONS: Record<string, SectionConfig> = {
  'key basis': {
    Icon: FileText,
    border: 'border-l-ma-teal',
    bg: 'bg-ma-teal/[0.04]',
    iconColor: 'text-ma-teal',
  },
  'action': {
    Icon: Zap,
    border: 'border-l-ma-accent',
    bg: 'bg-ma-accent/[0.06]',
    iconColor: 'text-ma-accent',
  },
  'sources': {
    Icon: Bookmark,
    border: 'border-l-ma-muted/40',
    bg: 'bg-ma-surface/60',
    iconColor: 'text-ma-muted',
  },
  'early warning': {
    Icon: AlertTriangle,
    border: 'border-l-ma-amber-warn',
    bg: 'bg-ma-amber-warn/[0.06]',
    iconColor: 'text-ma-amber-warn',
  },
}

const LABEL_RE = /^(Owner|Move|By when|Urgency|Status|Timeline|Priority):?$/i

/* ── factory ── */

type Size = 'compact' | 'normal'

/**
 * Build the ReactMarkdown `components` prop with section-aware
 * heading icons and smart action labels.
 *
 * `compact` — smaller text for the landing-page inline panel.
 * `normal`  — full-size for the CeoChatDrawer.
 */
export function createMarkdownComponents(size: Size = 'normal'): Components {
  const s = size === 'compact'

  return {
    p: ({ children }) => <p className="text-ma-ink">{children}</p>,

    h1: ({ children }) => (
      <h1
        className={`${s ? 'mt-3 text-[13px]' : 'mt-5 text-[15px]'} first:mt-0 font-semibold text-ma-ink border-b border-ma-line pb-1.5`}
      >
        {children}
      </h1>
    ),

    h2: ({ children }) => {
      const text = childrenToText(children).toLowerCase().trim()
      const config = ANSWER_SECTIONS[text]
      if (config) {
        const { Icon, border, bg, iconColor } = config
        return (
          <h2
            className={`${s ? 'mt-4 -mx-4 px-4 py-2 text-[12px]' : 'mt-6 -mx-4 px-4 py-2.5 text-[14px] md:-mx-5 md:px-5'} first:mt-0 flex items-center gap-2.5 border-l-[3px] ${border} ${bg} font-semibold text-ma-ink`}
          >
            <span
              className={`flex ${s ? 'size-5' : 'size-6'} shrink-0 items-center justify-center rounded-full ${bg} ${iconColor}`}
            >
              <Icon className={`${s ? 'size-3' : 'size-3.5'} stroke-[2]`} />
            </span>
            {children}
          </h2>
        )
      }
      return (
        <h2
          className={`${s ? 'mt-3 text-[12px]' : 'mt-5 text-[14px]'} first:mt-0 font-semibold text-ma-ink border-b border-ma-line pb-1.5`}
        >
          {children}
        </h2>
      )
    },

    h3: ({ children }) => (
      <h3
        className={`${s ? 'mt-2 text-[11px]' : 'mt-3 text-[12px]'} first:mt-0 font-semibold uppercase tracking-wide text-ma-muted`}
      >
        {children}
      </h3>
    ),

    ul: ({ children }) => (
      <ul className={`list-none ${s ? 'space-y-1.5' : 'space-y-2'} pl-0`}>{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className={`list-decimal ${s ? 'space-y-1.5 pl-4' : 'space-y-2 pl-5'}`}>{children}</ol>
    ),
    li: ({ children }) => (
      <li className="flex items-start gap-2">
        <span className={`${s ? 'mt-[3px]' : 'mt-[5px]'} shrink-0 text-ma-muted/60`}>–</span>
        <span className="text-ma-ink">{children}</span>
      </li>
    ),

    strong: ({ children }) => {
      const text = childrenToText(children)
      if (LABEL_RE.test(text.trim())) {
        return (
          <strong
            className={`mr-0.5 inline-flex items-center rounded-sm bg-ma-surface px-1.5 py-0.5 ${s ? 'text-[11px]' : 'text-[12px]'} font-semibold text-ma-ink`}
          >
            {children}
          </strong>
        )
      }
      return <strong className="font-semibold text-ma-ink">{children}</strong>
    },

    em: ({ children }) => <em className="italic text-ma-muted">{children}</em>,
    code: ({ children }) => (
      <code
        className={`rounded bg-ma-surface px-1 py-0.5 font-mono ${s ? 'text-[11px]' : 'text-[12px]'} text-ma-teal`}
      >
        {children}
      </code>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-ma-accent/40 pl-3 italic text-ma-muted">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="border-ma-line" />,

    table: ({ children }) => (
      <div className="overflow-x-auto">
        <table className={`w-full border-collapse ${s ? 'text-[11px]' : 'text-[13px]'}`}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => <thead className="border-b border-ma-line">{children}</thead>,
    tbody: ({ children }) => (
      <tbody className="divide-y divide-ma-line/50">{children}</tbody>
    ),
    tr: ({ children }) => (
      <tr className="hover:bg-ma-surface/40 transition-colors">{children}</tr>
    ),
    th: ({ children }) => (
      <th className={`${s ? 'py-1.5' : 'py-2'} pr-4 text-left font-semibold text-ma-muted first:pl-0`}>
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className={`${s ? 'py-1.5' : 'py-2'} pr-4 text-ma-ink first:pl-0`}>{children}</td>
    ),
  }
}
