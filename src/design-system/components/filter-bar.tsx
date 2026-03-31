import * as React from 'react'
import { cn } from '@/lib/utils'
import { SurfacePanel } from './panel'

type FilterBarProps = React.HTMLAttributes<HTMLDivElement> & {
  gridClassName?: string
}

export function FilterBar({
  className,
  gridClassName,
  children,
  ...props
}: FilterBarProps) {
  return (
    <SurfacePanel className={cn('overflow-hidden', className)} tone="muted" {...props}>
      <div className={cn('grid grid-cols-1 gap-3 md:grid-cols-4', gridClassName)}>{children}</div>
    </SurfacePanel>
  )
}

export function ActionBar({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-wrap items-center justify-between gap-3', className)}
      {...props}
    />
  )
}
