import * as React from 'react'
import { Badge } from '@/components/ui/badge'

type StatusBadgeProps = {
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger'
  children: React.ReactNode
  className?: string
}

export function StatusBadge({
  tone = 'neutral',
  children,
  className,
}: StatusBadgeProps) {
  const variant =
    tone === 'success'
      ? 'success'
      : tone === 'warning'
      ? 'warning'
      : tone === 'danger'
      ? 'danger'
      : tone === 'info'
      ? 'info'
      : 'secondary'

  return (
    <Badge variant={variant as any} className={className}>
      {children}
    </Badge>
  )
}
