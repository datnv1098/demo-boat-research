import * as React from 'react'
import { cn } from '@/lib/utils'
import { SurfacePanel } from './panel'

type TableCell = string | number | React.ReactNode

type DataTableProps = {
  columns: string[]
  rows: TableCell[][]
  maxHeight?: number | string
  minHeight?: number | string
  className?: string
  dense?: boolean
}

export function DataTable({
  columns,
  rows,
  maxHeight,
  minHeight,
  className,
  dense = false,
}: DataTableProps) {
  const style = {
    ...(maxHeight !== undefined ? { maxHeight } : {}),
    ...(minHeight !== undefined ? { minHeight } : {}),
  }

  return (
    <SurfacePanel className={cn('overflow-hidden p-0', className)}>
      <div className="overflow-auto" style={Object.keys(style).length ? style : undefined}>
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-muted/88 backdrop-blur-sm">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className={cn(
                    'border-b border-border/70 px-3 text-left align-middle font-semibold text-muted-foreground',
                    dense ? 'py-2 text-xs' : 'py-3 text-[0.82rem]',
                  )}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-border/50 bg-background/20 transition-colors odd:bg-muted/[0.26] hover:bg-primary/[0.045]"
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={cn(
                      'px-3 align-top text-foreground/90',
                      dense ? 'py-2 text-xs' : 'py-3',
                    )}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SurfacePanel>
  )
}
