import * as React from 'react'
import { cn } from '@/lib/utils'

type SurfacePanelProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: 'default' | 'muted' | 'accent'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const toneClasses: Record<NonNullable<SurfacePanelProps['tone']>, string> = {
  default: 'bg-card/94 border-border/75',
  muted: 'bg-muted/45 border-border/60',
  accent: 'bg-primary/[0.06] border-primary/15',
}

const paddingClasses: Record<NonNullable<SurfacePanelProps['padding']>, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
}

export function SurfacePanel({
  className,
  tone = 'default',
  padding = 'md',
  ...props
}: SurfacePanelProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border shadow-panel backdrop-blur-sm',
        toneClasses[tone],
        paddingClasses[padding],
        className,
      )}
      {...props}
    />
  )
}

export function PanelHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'mb-3 flex items-start justify-between gap-4 border-b border-border/60 pb-3',
        className,
      )}
      {...props}
    />
  )
}

export function PanelTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-sm font-semibold tracking-[0.01em] text-foreground', className)}
      {...props}
    />
  )
}

export function PanelDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('mt-1 text-sm text-muted-foreground', className)} {...props} />
  )
}

type ChartCardProps = React.HTMLAttributes<HTMLDivElement> & {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  bodyClassName?: string
}

export function ChartCard({
  title,
  description,
  action,
  className,
  bodyClassName,
  children,
  ...props
}: ChartCardProps) {
  return (
    <SurfacePanel className={cn('overflow-hidden', className)} {...props}>
      {(title || description || action) && (
        <PanelHeader>
          <div>
            {title ? <PanelTitle>{title}</PanelTitle> : null}
            {description ? <PanelDescription>{description}</PanelDescription> : null}
          </div>
          {action}
        </PanelHeader>
      )}
      <div className={cn(title || description || action ? '' : '', bodyClassName)}>{children}</div>
    </SurfacePanel>
  )
}
