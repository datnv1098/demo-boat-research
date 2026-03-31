import * as React from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SurfacePanel } from './panel'

type Tone = 'info' | 'success' | 'warning' | 'danger'

const toneMap: Record<Tone, { icon: React.ReactNode; className: string }> = {
  info: {
    icon: <Info className="h-4 w-4" />,
    className: 'border-info/25 bg-info/10 text-info',
  },
  success: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    className: 'border-success/25 bg-success/10 text-success',
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4" />,
    className: 'border-warning/25 bg-warning/12 text-warning',
  },
  danger: {
    icon: <AlertCircle className="h-4 w-4" />,
    className: 'border-danger/25 bg-danger/10 text-danger',
  },
}

type InlineNoticeProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: Tone
  title?: React.ReactNode
}

export function InlineNotice({
  tone = 'info',
  title,
  className,
  children,
  ...props
}: InlineNoticeProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-xl border px-3 py-2 text-sm',
        toneMap[tone].className,
        className,
      )}
      {...props}
    >
      <span className="mt-0.5">{toneMap[tone].icon}</span>
      <div className="min-w-0">
        {title ? <div className="font-semibold">{title}</div> : null}
        {children ? <div className={cn(title ? 'mt-1' : '')}>{children}</div> : null}
      </div>
    </div>
  )
}

export function LoadingState({
  label,
  className,
}: {
  label: React.ReactNode
  className?: string
}) {
  return (
    <SurfacePanel className={cn('flex items-center gap-3', className)} tone="muted">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      <div className="text-sm text-muted-foreground">{label}</div>
    </SurfacePanel>
  )
}

export function ErrorState({
  message,
  className,
}: {
  message: React.ReactNode
  className?: string
}) {
  return (
    <InlineNotice tone="danger" className={className} title="Error">
      {message}
    </InlineNotice>
  )
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <SurfacePanel className={cn('text-center', className)} tone="muted">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Info className="h-5 w-5" />
      </div>
      <div className="text-sm font-semibold text-foreground">{title}</div>
      {description ? <div className="mt-1 text-sm text-muted-foreground">{description}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </SurfacePanel>
  )
}
