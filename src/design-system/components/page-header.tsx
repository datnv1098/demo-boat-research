import * as React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type HeaderAction = {
  label: React.ReactNode
  onClick?: () => void
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'subtle' | 'danger'
}

type PageHeaderProps = {
  title: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  sticky?: boolean
  primaryAction?: HeaderAction
  secondaryAction?: HeaderAction
  actions?: React.ReactNode
}

export function PageHeader({
  title,
  description,
  icon,
  sticky = false,
  primaryAction,
  secondaryAction,
  actions,
}: PageHeaderProps) {
  return (
    <>
      <div
        className={cn(
          'mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between',
          sticky &&
            'sticky top-[var(--app-header-height)] z-30 rounded-b-2xl bg-background/92 pb-4 pt-1 backdrop-blur-sm',
        )}
      >
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            {icon ? (
              <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                {icon}
              </div>
            ) : null}
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
              {description ? (
                <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {secondaryAction ? (
            <Button variant={secondaryAction.variant ?? 'subtle'} onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          ) : null}
          {primaryAction ? (
            <Button variant={primaryAction.variant ?? 'default'} onClick={primaryAction.onClick}>
              {primaryAction.label}
            </Button>
          ) : null}
        </div>
      </div>
      {sticky ? <div className="h-2" /> : null}
    </>
  )
}
