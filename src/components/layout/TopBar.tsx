import { MessageSquareText, Moon, Sun } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useCeoIntelligence } from '../../intelligence/CeoIntelligenceContext'
import { useTheme } from '../../hooks/useTheme'

const TITLES: Record<string, string> = {
  '/': 'Strategy realization cockpit',
  '/strategy-status': 'Strategy Status',
  '/portfolio': 'Giga-Project Execution',
  '/enablers': 'Enablers',
  '/exploration': 'Development Pipeline',
  '/technology': 'Technology',
  '/people': 'People',
  '/financials': 'Financials',
  '/risks': 'Risks',
  '/safety-esg': 'Sustainability & ESG',
}

export function TopBar() {
  const { pathname } = useLocation()
  const { theme, toggle } = useTheme()
  const { openChat } = useCeoIntelligence()
  const title = TITLES[pathname] ?? 'Cockpit'

  return (
    <header className="shrink-0 border-b border-ma-line bg-ma-elevated px-6 py-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ma-muted">
            NEOM · Strategy activation
          </p>
          <h1 className="text-[15px] font-semibold tracking-tight text-ma-ink">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <p className="hidden text-[12px] text-ma-muted sm:block">
            Reporting · June 2026
          </p>
          <button
            type="button"
            onClick={() => openChat()}
            title="Ask about portfolio health, projects, risks, and financials. Uses the same context as the page you are on."
            className="group inline-flex items-center gap-1.5 rounded-sm border border-ma-line bg-ma-elevated px-3 py-1.5 text-[12px] font-semibold text-ma-ink shadow-[0_1px_0_rgba(0,0,0,0.04)] transition duration-150 hover:border-ma-teal/45 hover:bg-ma-surface hover:shadow-[0_2px_10px_rgba(0,0,0,0.06)] active:translate-y-px active:shadow-none dark:border-white/15 dark:bg-white/[0.06] dark:text-white dark:hover:border-ma-teal/50 dark:hover:bg-white/[0.1]"
          >
            <MessageSquareText
              className="size-3.5 shrink-0 transition-transform duration-200 ease-out group-hover:-rotate-6"
              aria-hidden
            />
            Ask a question
          </button>
          <button
            type="button"
            onClick={toggle}
            className="rounded-sm border border-ma-line bg-ma-surface p-2 text-ma-ink transition-colors hover:border-ma-teal/45 dark:bg-ma-elevated dark:hover:border-ma-teal/50"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>
      </div>
    </header>
  )
}
