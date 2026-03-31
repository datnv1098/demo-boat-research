import React from 'react'
import { useI18n } from '../lib/i18n'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Label } from '../components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import {
  ActionBar,
  ChartCard,
  DataTable,
  EmptyState,
  ErrorState,
  Field,
  FilterBar,
  InlineNotice,
  KpiCard,
  LoadingState,
  PageHeader,
  StatusBadge,
  SurfacePanel,
} from '@/design-system'

export function Header({
  title,
  desc,
  icon,
  onExport,
  exportLabel,
  sticky = false,
}: {
  title: string
  desc?: string
  icon?: React.ReactNode
  onExport?: () => void
  exportLabel?: string
  sticky?: boolean
}) {
  const { t } = useI18n()

  return (
    <PageHeader
      title={title}
      description={desc}
      icon={icon}
      sticky={sticky}
      secondaryAction={{
        label: exportLabel || t('header.export'),
        onClick: onExport,
        variant: 'subtle',
      }}
      primaryAction={{
        label: t('header.quick'),
        variant: 'default',
      }}
    />
  )
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint?: string
}) {
  return <KpiCard label={label} value={value} hint={hint} />
}

export function Table({
  columns,
  rows,
  maxHeight,
  minHeight,
}: {
  columns: string[]
  rows: (string | number | React.ReactNode)[][]
  maxHeight?: number | string
  minHeight?: number | string
}) {
  return <DataTable columns={columns} rows={rows} maxHeight={maxHeight} minHeight={minHeight} />
}

export {
  ActionBar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartCard,
  DataTable,
  EmptyState,
  ErrorState,
  Field,
  FilterBar,
  InlineNotice,
  Input,
  KpiCard,
  Label,
  LoadingState,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  SurfacePanel,
}
