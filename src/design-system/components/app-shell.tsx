import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Globe2, Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'

export type AppShellNavItem = {
  id: string
  label: string
  icon: React.ReactNode
}

type AppShellProps = {
  brand: string
  badge?: string
  version?: string
  navLabel?: string
  navFooter?: React.ReactNode
  navItems: AppShellNavItem[]
  activeId: string
  onNavigate: (id: string) => void
  lang: string
  setLang: (lang: any) => void
  pageIntro?: React.ReactNode
  children: React.ReactNode
}

export function AppShell({
  brand,
  badge,
  version,
  navLabel,
  navFooter,
  navItems,
  activeId,
  onNavigate,
  lang,
  setLang,
  pageIntro,
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const shellRef = useRef<HTMLDivElement | null>(null)
  const mainRef = useRef<HTMLElement | null>(null)
  const pageIntroRef = useRef<HTMLDivElement | null>(null)
  const pageContentRef = useRef<HTMLDivElement | null>(null)
  const frameRef = useRef<number | null>(null)

  const sidebarWidth = useMemo(
    () => (collapsed ? 'var(--app-sidebar-width-collapsed)' : 'var(--app-sidebar-width)'),
    [collapsed],
  )

  useEffect(() => {
    const shell = shellRef.current
    const main = mainRef.current
    const pageContent = pageContentRef.current

    if (!shell || !main || !pageContent) return

    const updatePageHeaderTop = () => {
      const mainRect = main.getBoundingClientRect()
      const pageContentRect = pageContent.getBoundingClientRect()
      const naturalTop = Math.max(pageContentRect.top - mainRect.top + main.scrollTop, 0)
      const stickyTop = Math.max(naturalTop - main.scrollTop, 0)

      shell.style.setProperty('--app-page-header-top', `${stickyTop}px`)
      shell.dataset.pageHeaderDocked = stickyTop <= 0.5 ? 'true' : 'false'
    }

    const scheduleUpdate = () => {
      if (frameRef.current != null) return

      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null
        updatePageHeaderTop()
      })
    }

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleUpdate) : null
    resizeObserver?.observe(main)
    resizeObserver?.observe(pageContent)

    if (pageIntroRef.current) {
      resizeObserver?.observe(pageIntroRef.current)
    }

    main.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    scheduleUpdate()

    return () => {
      main.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      resizeObserver?.disconnect()

      if (frameRef.current != null) {
        window.cancelAnimationFrame(frameRef.current)
      }
    }
  }, [activeId, Boolean(pageIntro)])

  const navigation = (
    <div className="flex h-full flex-col rounded-[1.75rem] border border-border/70 bg-card/88 p-3 shadow-shell backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between gap-2 px-2">
        <div className={cn('min-w-0', collapsed && 'lg:hidden')}>
          <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {navLabel}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:inline-flex"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
        {navItems.map((item) => {
          const isActive = item.id === activeId

          return (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id)
                setMobileOpen(false)
              }}
              className={cn(
                'flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left text-sm transition-all',
                isActive
                  ? 'border-primary/25 bg-primary/10 text-primary shadow-sm'
                  : 'border-transparent text-foreground/78 hover:border-border/60 hover:bg-muted/60 hover:text-foreground',
              )}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background/80 shadow-xs">
                {item.icon}
              </span>
              <span className={cn('truncate', collapsed && 'lg:hidden')}>{item.label}</span>
            </button>
          )
        })}
      </nav>
      <div className={cn('mt-4 border-t border-border/60 px-2 pt-3 text-xs text-muted-foreground', collapsed && 'lg:hidden')}>
        {navFooter}
      </div>
    </div>
  )

  return (
    <div
      ref={shellRef}
      className="h-screen overflow-hidden bg-shell-gradient text-foreground"
      style={{ ['--app-page-header-top' as string]: '0px' } as React.CSSProperties}
    >
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/82 backdrop-blur-md">
        <div className="flex h-[var(--app-header-height)] items-center justify-between gap-3 px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
                <Globe2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">{brand}</div>
                <div className="text-xs text-muted-foreground">Design System enabled</div>
              </div>
              {badge ? (
                <Badge variant="info" className="hidden sm:inline-flex">
                  {badge}
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1 rounded-full border border-border/70 bg-card/70 p-1">
              <button
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-semibold transition-colors',
                  lang === 'th' ? 'bg-primary text-primary-foreground shadow-xs' : 'hover:bg-muted',
                )}
                onClick={() => setLang('th')}
              >
                TH
              </button>
              <button
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-semibold transition-colors',
                  lang === 'en' ? 'bg-primary text-primary-foreground shadow-xs' : 'hover:bg-muted',
                )}
                onClick={() => setLang('en')}
              >
                EN
              </button>
            </div>
            {version ? <span className="hidden sm:inline">{version}</span> : null}
          </div>
        </div>
      </header>

      <div className="h-full pt-[var(--app-header-height)]">
        <aside
          className="fixed bottom-0 left-0 top-[var(--app-header-height)] hidden p-4 lg:block"
          style={{ width: sidebarWidth }}
        >
          {navigation}
        </aside>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50 bg-slate-950/45 lg:hidden">
            <div className="absolute inset-y-0 left-0 w-[min(86vw,21rem)] p-3">
              <div className="mb-2 flex justify-end">
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              {navigation}
            </div>
          </div>
        ) : null}

        <main
          ref={mainRef}
          className="h-[calc(100vh-var(--app-header-height))] overflow-y-auto px-4 pb-10 lg:ml-[var(--app-shell-sidebar-width)] lg:px-6"
          style={{ ['--app-shell-sidebar-width' as string]: sidebarWidth }}
        >
          <div className="mx-auto w-full max-w-[var(--page-max-width)] pt-5">
            {pageIntro ? <div ref={pageIntroRef}>{pageIntro}</div> : null}
            {pageIntro ? <div className="h-5" aria-hidden="true" /> : null}
            <div ref={pageContentRef}>{children}</div>
          </div>
        </main>
      </div>
    </div>
  )
}
