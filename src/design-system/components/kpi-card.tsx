import * as React from 'react'
import { SurfacePanel } from './panel'
import { cn } from '@/lib/utils'

type KpiCardProps = {
  label: React.ReactNode
  value: React.ReactNode
  hint?: React.ReactNode
  icon?: React.ReactNode
  tone?: 'default' | 'accent' | 'muted'
  className?: string
}

export function KpiCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
  className,
}: KpiCardProps) {
  return (
    <SurfacePanel className={cn('h-full', className)} tone={tone}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</div>
          {hint ? <div className="mt-2 text-xs text-muted-foreground">{hint}</div> : null}
        </div>
        {icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {icon}
          </div>
        ) : null}
      </div>
    </SurfacePanel>
  )
}
