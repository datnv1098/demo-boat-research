import * as React from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type FieldProps = React.HTMLAttributes<HTMLDivElement> & {
  label?: React.ReactNode
  hint?: React.ReactNode
}

export function Field({ label, hint, className, children, ...props }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)} {...props}>
      {label ? <Label className="text-[0.82rem] font-semibold text-foreground/85">{label}</Label> : null}
      {children}
      {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  )
}
