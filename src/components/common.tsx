import React from 'react'
import { useI18n } from '../lib/i18n'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'

export function Header({ title, desc, icon, onExport, exportLabel }: { title: string; desc?: string; icon?: React.ReactNode; onExport?: () => void; exportLabel?: string }) {
  const { t } = useI18n()
  return (
    <div className="mb-6 flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          {icon} {title}
        </h1>
        {desc && <p className="text-muted-foreground mt-1 max-w-3xl">{desc}</p>}
      </div>
      <div className="flex gap-2">
        <Button className="bg-gray-100 text-gray-700 hover:bg-gray-200" onClick={onExport}>{exportLabel || t('header.export')}</Button>
        <Button className="bg-blue-600 text-white hover:bg-blue-700">{t('header.quick')}</Button>
      </div>
    </div>
  )
}

export function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      {hint && <CardContent className="pt-0 text-sm text-muted-foreground">{hint}</CardContent>}
    </Card>
  )
}

export function Table({ columns, rows, maxHeight }: { columns: string[]; rows: (string | number | React.ReactNode)[][]; maxHeight?: number | string }) {
  return (
    <div className="overflow-auto rounded-xl border bg-background" style={maxHeight !== undefined ? { maxHeight } : undefined}>
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted/50">
          <tr>
            {columns.map((c) => (
              <th key={c} className="text-left px-3 py-2 font-medium text-muted-foreground border-b">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-muted/20">
              {r.map((cell, j) => (
                <td key={j} className="px-3 py-2 border-b align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export { Button, Input, Badge, Label, Card, CardContent, CardDescription, CardHeader, CardTitle, Select, SelectContent, SelectItem, SelectTrigger, SelectValue }


