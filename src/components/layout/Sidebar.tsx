import {
  AlertTriangle,
  Building2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Cpu,
  FolderKanban,
  Info,
  Landmark,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'

import neomLogoUrl from '../../assets/neom-logo.png'

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean }

const dashboard: NavItem = {
  to: '/dashboard',
  label: 'Strategy realization cockpit',
  icon: LayoutDashboard,
}

const focusAreaItems: NavItem[] = [
  { to: '/exploration', label: 'Development Pipeline', icon: Compass },
  { to: '/portfolio', label: 'Giga-Project Execution', icon: FolderKanban },
]

const SIDEBAR_DISCLAIMER_FULL =
  'All insights are derived from available data sources and not yet connected to raw live data - responses may be incomplete, outdated, or incorrect.'

const foundationAreaItems: NavItem[] = [
  { to: '/enablers', label: 'Enablers', icon: Building2 },
  { to: '/financials', label: 'Financials', icon: Landmark },
  { to: '/technology', label: 'Technology', icon: Cpu },
  { to: '/people', label: 'People', icon: Users },
  { to: '/safety-esg', label: 'Sustainability & ESG', icon: ShieldCheck },
  { to: '/risks', label: 'Risks', icon: AlertTriangle },
]

function routeActive(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`)
}

function NavRow({
  item,
  pathname,
  collapsed,
}: {
  item: NavItem
  pathname: string
  collapsed: boolean
}) {
  const isActive = routeActive(pathname, item.to)
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end}
      title={collapsed ? item.label : undefined}
      className={[
        'flex items-center gap-3 rounded-sm px-3 py-3 text-[13px] font-semibold leading-tight transition-colors',
        isActive
          ? 'border border-ma-teal/45 bg-white/[0.08] text-white'
          : 'border border-transparent text-[color:var(--ma-nav-muted)] hover:bg-white/[0.04] hover:text-white',
        collapsed ? 'justify-center px-2' : '',
      ].join(' ')}
    >
      <Icon
        className={`size-5 shrink-0 ${isActive ? 'text-ma-teal' : 'text-[color:var(--ma-nav-subtle)]'}`}
        aria-hidden
      />
      {!collapsed && <span className="min-w-0 leading-snug">{item.label}</span>}
    </NavLink>
  )
}

type SidebarProps = {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { pathname } = useLocation()
  const w = collapsed ? 'w-16' : 'w-[248px]'
  return (
    <aside
      className={`${w} sticky top-0 z-20 flex h-[100dvh] shrink-0 flex-col border-r border-[color:var(--ma-nav-border)] bg-[color:var(--ma-nav-bg)] text-white transition-[width] duration-200 ease-out`}
    >
      <div
        className={[
          'flex border-b border-[color:var(--ma-nav-border)]',
          collapsed
            ? 'flex-col items-center gap-2 px-1 py-2.5'
            : 'items-center justify-between gap-2 px-2 py-2',
        ].join(' ')}
      >
        <Link
          to="/"
          className={
            collapsed
              ? 'flex w-full justify-center px-0.5'
              : 'flex min-w-0 flex-1 items-center pr-1'
          }
          aria-label="NEOM — Strategy realization cockpit"
        >
          <img
            src={neomLogoUrl}
            alt=""
            className={
              collapsed
                ? 'h-10 w-auto max-w-[3.25rem] object-contain object-left'
                : 'h-11 w-auto max-w-[9.5rem] object-contain object-left'
            }
            width={159}
            height={201}
            decoding="async"
          />
        </Link>
        <button
          type="button"
          onClick={onToggle}
          className="shrink-0 rounded-sm p-2 text-[color:var(--ma-nav-subtle)] transition hover:bg-white/[0.06] hover:text-white"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-5" />}
        </button>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        <NavRow item={dashboard} pathname={pathname} collapsed={collapsed} />

        {!collapsed && (
          <p className="px-3 pb-0.5 pt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-ma-teal">
            Focus Areas
          </p>
        )}
        {focusAreaItems.map((item) => (
          <NavRow key={item.to} item={item} pathname={pathname} collapsed={collapsed} />
        ))}

        {!collapsed && (
          <p className="px-3 pb-0.5 pt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--ma-nav-faint)]">
            Foundation Areas
          </p>
        )}
        {foundationAreaItems.map((item) => (
          <NavRow key={item.to} item={item} pathname={pathname} collapsed={collapsed} />
        ))}
      </nav>
      <div className="mt-auto border-t border-[color:var(--ma-nav-border)] p-3 sm:p-4">
        <div
          className="group/disclaimer relative rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ma-teal/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ma-nav-bg)]"
          tabIndex={0}
          aria-label="Disclaimer"
          aria-describedby="sidebar-disclaimer-tooltip"
        >
          {collapsed ? (
            <div className="flex justify-center py-0.5">
              <Info
                className="size-[18px] text-[color:var(--ma-nav-subtle)] transition-colors duration-200 group-hover/disclaimer:text-ma-teal group-focus-within/disclaimer:text-ma-teal"
                aria-hidden
              />
              <span className="sr-only">{SIDEBAR_DISCLAIMER_FULL}</span>
            </div>
          ) : (
            <p className="cursor-default py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/45 transition-colors duration-200 group-hover/disclaimer:text-white/70 group-focus-within/disclaimer:text-white/70">
              Disclaimer
            </p>
          )}
          <div
            id="sidebar-disclaimer-tooltip"
            role="tooltip"
            className={[
              'pointer-events-none absolute bottom-full z-[60] mb-1.5 w-[min(calc(100vw-1.5rem),17.5rem)] translate-y-1 opacity-0 shadow-none transition-[opacity,transform] duration-200 ease-out',
              'group-hover/disclaimer:translate-y-0 group-hover/disclaimer:opacity-100',
              'group-focus-within/disclaimer:translate-y-0 group-focus-within/disclaimer:opacity-100',
              collapsed
                ? 'left-1/2 -translate-x-1/2 group-hover/disclaimer:-translate-x-1/2 group-focus-within/disclaimer:-translate-x-1/2'
                : 'left-0 translate-x-0 group-hover/disclaimer:translate-x-0 group-focus-within/disclaimer:translate-x-0',
            ].join(' ')}
          >
            <div className="rounded-md border border-white/[0.12] bg-[color:color-mix(in_srgb,var(--ma-nav-bg)_92%,#0a0c0b)] px-3.5 py-3 text-left text-[11px] font-normal leading-relaxed tracking-tight text-white/[0.92] shadow-[0_10px_36px_rgba(0,0,0,0.55)] ring-1 ring-black/20 backdrop-blur-md">
              {SIDEBAR_DISCLAIMER_FULL}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
