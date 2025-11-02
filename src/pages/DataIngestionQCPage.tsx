import { useEffect, useState, useMemo } from 'react'
import { ClipboardCheck } from 'lucide-react'
import { Header, Table, Button } from '../components/common'
import { useI18n } from '../lib/i18n'
import { THAILAND_BOUNDS } from '../data/thailandGeoData'
import Chart from 'react-apexcharts'
import { ApexOptions } from 'apexcharts'

export default function DataIngestionQCPage() {
  const [data, setData] = useState<any | null>(null)
  const [headerRows, setHeaderRows] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const { t } = useI18n()
  const [qcLogs, setQcLogs] = useState<any[]>([])
  const [accepted, setAccepted] = useState<Record<string, boolean>>({})

  const statusData = useMemo(() => {
    const counts: Record<string, number> = { ok: 0, warn: 0, accepted: 0, error: 0 }
    for (const l of qcLogs) counts[l.status] = (counts[l.status] || 0) + 1
    return [
      { type: '✅ OK', value: counts.ok },
      { type: '⚠️ Warn', value: counts.warn },
      { type: '☑️ Accepted', value: counts.accepted },
      { type: '❌ Error', value: counts.error },
    ]
  }, [qcLogs])

  // simple Top Issues removed in favor of zone-stacked version

  // Top Issues by Zone (stacked)
  const issueByZoneData = useMemo(() => {
    // Build link -> zone map from headers
    const linkToZone: Record<string, string> = {}
    for (const h of headerRows) linkToZone[String(h?.Link || '')] = String(h?.Zone || 'Unknown')

    // Count per (issue, zone)
    const pairToCount = new Map<string, number>()
    const issueToTotal = new Map<string, number>()
    for (const l of qcLogs) {
      const z = linkToZone[String(l.tripId)] || 'Unknown'
      for (const msg of l.issues || []) {
        const key = `${msg}__${z}`
        pairToCount.set(key, (pairToCount.get(key) || 0) + 1)
        issueToTotal.set(msg, (issueToTotal.get(msg) || 0) + 1)
      }
    }

    // Keep only top 10 issues overall
    const topIssues = new Set(
      Array.from(issueToTotal.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([i]) => i)
    )

    const rows: { issue: string; zone: string; count: number }[] = []
    for (const [key, count] of pairToCount.entries()) {
      const [issue, zone] = key.split('__')
      if (!topIssues.has(issue)) continue
      rows.push({ issue, zone, count })
    }
    return rows.sort((a, b) => b.count - a.count)
  }, [qcLogs, headerRows])

  // Monthly status: aggregate qcLogs by month (YYYY-MM) from headerRows
  const monthlyStatus = useMemo(() => {
    const linkToMonth: Record<string, string> = {}
    for (const h of headerRows) {
      const link = String(h?.Link || '')
      const d = h?.Date ? new Date(String(h?.Date)) : null
      if (!link || !d || isNaN(d.getTime())) continue
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      linkToMonth[link] = ym
    }
    const map: Record<string, { ok: number; warn: number; accepted: number; error: number }> = {}
    for (const l of qcLogs) {
      const m = linkToMonth[String(l.tripId)] || 'Unknown'
      if (!map[m]) map[m] = { ok: 0, warn: 0, accepted: 0, error: 0 }
      const st: 'ok' | 'warn' | 'accepted' | 'error' = l.status
      map[m][st] = (map[m][st] || 0) + 1
    }
    const rows: { month: string; status: string; count: number }[] = []
    Object.keys(map)
      .sort()
      .forEach((m) => {
        const v = map[m]
        rows.push({ month: m, status: '✅ OK', count: v.ok })
        rows.push({ month: m, status: '⚠️ Warn', count: v.warn })
        rows.push({ month: m, status: '☑️ Accepted', count: v.accepted })
        rows.push({ month: m, status: '❌ Error', count: v.error })
      })
    return rows
  }, [qcLogs, headerRows])

  // Transform data for ApexCharts stacked bar chart - Top Issues by Zone
  const issueByZoneChartData = useMemo(() => {
    const issues = Array.from(new Set(issueByZoneData.map(r => r.issue))).sort()
    const zones = Array.from(new Set(issueByZoneData.map(r => r.zone))).sort()
    const series = zones.map(zone => ({
      name: zone,
      data: issues.map(issue => {
        const item = issueByZoneData.find(r => r.issue === issue && r.zone === zone)
        return item ? item.count : 0
      })
    }))
    return { issues, series }
  }, [issueByZoneData])

  // Transform data for ApexCharts stacked bar chart - Monthly Status
  const monthlyStatusChartData = useMemo(() => {
    const months = Array.from(new Set(monthlyStatus.map(r => r.month))).sort()
    const statuses = ['✅ OK', '⚠️ Warn', '☑️ Accepted', '❌ Error']
    const series = statuses.map(status => ({
      name: status,
      data: months.map(month => {
        const item = monthlyStatus.find(r => r.month === month && r.status === status)
        return item ? item.count : 0
      })
    }))
    return { months, series }
  }, [monthlyStatus])

  useEffect(() => {
    fetch(new URL('../../cmdec_mock.json', import.meta.url).href)
      .then((r) => r.json())
      .then(parseAndSet)
      .catch((e) => setError(String(e)))
  }, [])

  function parseAndSet(d: any) {
    setData(d)
    // load accepted from localStorage
    try {
      const saved = localStorage.getItem('qcAcceptedWarnings')
      if (saved) setAccepted(JSON.parse(saved))
    } catch {}
    const lowerKeys: Record<string, any> = {}
    Object.keys(d || {}).forEach((k) => (lowerKeys[k.toLowerCase()] = d[k]))
    const hdr = Array.isArray(lowerKeys['header']) ? lowerKeys['header'] : []
    const cth = Array.isArray(lowerKeys['catch']) ? lowerKeys['catch'] : []
    const wql = Array.isArray(lowerKeys['water_ql']) ? lowerKeys['water_ql'] : []
    const tss = Array.isArray(lowerKeys['ts_spp']) ? lowerKeys['ts_spp'] : []
    setHeaderRows(hdr)
    const logs = validateSheets(hdr, cth, wql, tss)
    setQcLogs(logs)
  }

  function validateSheets(hdr: any[], cth: any[], wql: any[], tss: any[]) {
    const logs: any[] = []
    const sw = THAILAND_BOUNDS.southwest
    const ne = THAILAND_BOUNDS.northeast
    // index helpers
    const linkToCatchExists = new Set<string>()
    for (const row of cth) if (row?.Link) linkToCatchExists.add(String(row.Link))
    const linkToWater = new Map<string, any>()
    for (const row of wql) if (row?.Link) linkToWater.set(String(row.Link), row)
    const linkToTS = new Set<string>()
    for (const row of tss) if (row?.Link) linkToTS.add(String(row.Link))

    for (const h of hdr) {
      const tripId = String(h?.Link ?? '')
      const latStart = Number(h?.LatStart), lonStart = Number(h?.LongStart)
      const latEnd = Number(h?.LatEnd), lonEnd = Number(h?.LongEnd)
      const depth = Number(h?.Depth)
      const tow = Number(h?.Tow)
      const issues: string[] = []
      let status: 'ok' | 'warn' | 'error' = 'ok'

      // Lat/Lon bounds (start & end)
      const latlonValid = (lat: number, lon: number) => isFinite(lat) && isFinite(lon) && lat >= sw.lat && lat <= ne.lat && lon >= sw.lng && lon <= ne.lng
      if (!isFinite(latStart) || !isFinite(lonStart) || !isFinite(latEnd) || !isFinite(lonEnd)) {
        status = 'error'
        issues.push('พิกัดไม่ถูกต้อง (Lat/Lon)')
      } else if (!(latlonValid(latStart, lonStart) && latlonValid(latEnd, lonEnd))) {
        status = 'warn'
        issues.push('พิกัดอยู่นอกน่านน้ำที่กำหนด')
      }

      // Depth
      if (!isFinite(depth)) {
        issues.push('ไม่มีค่าความลึก (Depth)')
      } else {
        if (!(depth > 0 && depth >= 7 && depth <= 53)) {
          status = status === 'error' ? 'error' : 'warn'
          issues.push('Depth นอกช่วง 7–53 m')
        }
      }

      // Tow default 60 min
      if (isFinite(tow)) {
        if (Math.abs(tow - 60) > 1e-6) {
          status = status === 'error' ? 'error' : 'warn'
          issues.push('Tow != 60 นาที')
        }
      } else {
        issues.push('ไม่มีค่าเวลาลากอวน (Tow)')
      }

      // Speed_est_kn (not enough datapoints) -> informational
      if (!isFinite(Number(h?.Speed_est_kn))) {
        issues.push('Speed_est_kn: ไม่สามารถคำนวณ (ข้อมูลไม่ครบ)')
      }

      // Link Header↔Catch
      if (tripId) {
        if (!linkToCatchExists.has(tripId)) {
          status = status === 'error' ? 'error' : 'warn'
          issues.push('ไม่มีแถว Catch ที่เชื่อมด้วย Link เดียวกัน')
        }
      }

      // freqtext (TS_Spp) presence by Link
      if (tripId && !linkToTS.has(tripId)) issues.push('ไม่มีข้อมูล TS_Spp (freqtext) สำหรับ Link นี้')

      // Environment params
      const env = tripId ? linkToWater.get(tripId) : null
      if (env) {
        if (env.Temp != null && (env.Temp < 0 || env.Temp > 40)) {
          status = status === 'error' ? 'error' : 'warn'
          issues.push('Temp เกินช่วงปกติ')
        }
        if (env.DO != null && (env.DO < 0 || env.DO > 15)) {
          status = status === 'error' ? 'error' : 'warn'
          issues.push('DO เกินช่วงปกติ')
        }
        if (env.pH != null && (env.pH < 7.8 || env.pH > 8.3)) {
          status = status === 'error' ? 'error' : 'warn'
          issues.push('pH เกินช่วงปกติ (7.8–8.3)')
        }
        if (env.Salinity != null && (env.Salinity < 0 || env.Salinity > 40)) {
          status = status === 'error' ? 'error' : 'warn'
          issues.push('Salinity เกินช่วงปกติ')
        }
      } else {
        issues.push('ไม่มีค่าพารามิเตอร์สิ่งแวดล้อม (Temp/DO/pH/Salinity)')
      }

      const acceptedWarning = accepted[tripId] === true
      const finalStatus = acceptedWarning && status === 'warn' ? 'accepted' : status

      logs.push({ tripId, status: finalStatus, rawStatus: status, issues })
    }
    return logs
  }

  function onAcceptWarning(id: string) {
    setAccepted((prev) => ({ ...prev, [id]: true }))
    setQcLogs((prev) => prev.map((l) => (l.tripId === id && l.rawStatus === 'warn' ? { ...l, status: 'accepted' } : l)))
    try {
      const next = { ...accepted, [id]: true }
      localStorage.setItem('qcAcceptedWarnings', JSON.stringify(next))
    } catch {}
  }

  // file upload removed

  function exportCsv() {
    const header = ['Trip','Status','Issues']
    const lines = [header.join(',')]
    for (const l of qcLogs) {
      const status = l.status
      const issues = (l.issues || []).join(' | ').replace(/\n|\r/g, ' ')
      const row = [l.tripId, status, '"' + issues.replace(/"/g, '""') + '"']
      lines.push(row.join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'qc_logs.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportPdf() {
    const win = window.open('', '_blank', 'width=1024,height=768')
    if (!win) return
    const rowsHtml = qcLogs.slice(0, 500).map((l) => {
      const status = l.status === 'ok' ? '✅' : l.status === 'warn' ? '⚠️' : l.status === 'accepted' ? '☑️' : '❌'
      const issues = (l.issues || []).map((i: string) => `<li>${i}</li>`).join('')
      return `<tr><td style="padding:6px;border:1px solid #ddd;">${l.tripId}</td><td style="padding:6px;border:1px solid #ddd;">${status}</td><td style="padding:6px;border:1px solid #ddd;"><ul>${issues}</ul></td></tr>`
    }).join('')
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>QC Logs</title>
      <style>body{font-family: 'Noto Sans Thai', Arial, sans-serif;} table{border-collapse:collapse;width:100%;font-size:12px;} th{background:#f5f5f5;}</style>
      </head><body>
      <h2>QC Logs</h2>
      <table><thead><tr><th style="padding:6px;border:1px solid #ddd;">Trip</th><th style="padding:6px;border:1px solid #ddd;">Status</th><th style="padding:6px;border:1px solid #ddd;">Issues</th></tr></thead>
      <tbody>${rowsHtml}</tbody></table>
      <script>window.print();</script>
      </body></html>`)
    win.document.close()
  }

  function onTopbarExport() {
    // OK -> CSV, Cancel -> PDF
    const toCsv = window.confirm('Export CSV? (Cancel to export PDF)')
    if (toCsv) exportCsv()
    else exportPdf()
  }

  return (
    <div>
      <Header title={t('ing.title')} desc={t('ing.desc')} icon={<ClipboardCheck className="h-6 w-6" />} onExport={onTopbarExport} sticky={true} />
      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
      {!data && !error && <div className="text-sm text-muted-foreground">{t('loading.demo')}</div>}
      {data && (
        <div className="space-y-4">
          {/* Upload and manual demo load removed; page uses preloaded demo data */}

          {/* Charts: Status Pie and Top Issues Column */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border bg-background p-3">
              <div className="text-sm font-medium mb-2">QC Status</div>
              <div style={{ height: 260 }}>
                <Chart
                  type="pie"
                  height={260}
                  series={statusData.map(d => d.value)}
                  options={{
                    chart: {
                      type: 'pie',
                      toolbar: { show: false },
                      fontFamily: 'inherit',
                    },
                    labels: statusData.map(d => d.type),
                    colors: ['#22c55e', '#f59e0b', '#3b82f6', '#ef4444'],
                    legend: {
                      position: 'bottom',
                      fontSize: '12px',
                    },
                    dataLabels: {
                      enabled: true,
                      formatter: (val: number) => Math.round(val).toString(),
                      style: {
                        fontSize: '12px',
                        fontWeight: 'bold',
                      }
                    },
                    tooltip: {
                      theme: 'light',
                      style: {
                        fontSize: '12px',
                      },
                      y: {
                        formatter: (val: number) => Math.round(val).toString()
                      }
                    },
                    plotOptions: {
                      pie: {
                        donut: {
                          size: '0%',
                        }
                      }
                    },
                  } as ApexOptions}
                />
              </div>
            </div>
            <div className="rounded-xl border bg-background p-3">
              <div className="text-sm font-medium mb-2">Top Issues by Zone</div>
              <div style={{ height: 320 }}>
                <Chart
                  type="bar"
                  height={320}
                  series={issueByZoneChartData.series}
                  options={{
                    chart: {
                      type: 'bar',
                      stacked: true,
                      toolbar: { show: false },
                      zoom: { enabled: false },
                      fontFamily: 'inherit',
                    },
                    plotOptions: {
                      bar: {
                        borderRadius: 4,
                        columnWidth: '55%',
                        dataLabels: {
                          position: 'top'
                        }
                      }
                    },
                    dataLabels: {
                      enabled: false
                    },
                    stroke: {
                      show: false
                    },
                    xaxis: {
                      categories: issueByZoneChartData.issues.map(issue => {
                        // Truncate long text and add ellipsis
                        const maxLength = 25
                        if (issue.length > maxLength) {
                          return issue.substring(0, maxLength) + '...'
                        }
                        return issue
                      }),
                      labels: {
                        style: {
                          fontSize: '10px',
                          fontWeight: 500,
                        },
                        rotate: -45,
                        rotateAlways: true,
                        maxHeight: 80,
                        trim: true,
                      },
                      axisTicks: {
                        show: true
                      }
                    },
                    yaxis: {
                      labels: {
                        style: {
                          fontSize: '12px',
                        },
                        formatter: (val: number) => Math.round(val).toString()
                      },
                      title: {
                        text: 'Count',
                        style: {
                          fontSize: '12px',
                          fontWeight: 600,
                        }
                      }
                    },
                    colors: ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'],
                    grid: {
                      strokeDashArray: 3,
                      borderColor: 'rgba(0, 0, 0, 0.06)',
                      xaxis: {
                        lines: {
                          show: true
                        }
                      },
                      yaxis: {
                        lines: {
                          show: true
                        }
                      },
                      padding: {
                        left: 10,
                        right: 10
                      }
                    },
                    legend: {
                      position: 'top',
                      fontSize: '11px',
                      itemMargin: {
                        horizontal: 10,
                        vertical: 5
                      },
                      markers: {
                        width: 10,
                        height: 10,
                        radius: 5
                      }
                    },
                    tooltip: {
                      theme: 'light',
                      style: {
                        fontSize: '12px',
                      },
                      y: {
                        formatter: (val: number) => Math.round(val).toString()
                      },
                      x: {
                        formatter: (val: number) => {
                          // Show full text in tooltip
                          return issueByZoneChartData.issues[val - 1] || ''
                        }
                      }
                    },
                  } as ApexOptions}
                />
              </div>
            </div>
          </div>

          {/* Monthly Status (stacked) */}
          <div className="rounded-xl border bg-background p-3">
            <div className="text-sm font-medium mb-2">สถานะ QC ตามเดือน (Monthly)</div>
            <div style={{ height: 280 }}>
              <Chart
                type="bar"
                height={280}
                series={monthlyStatusChartData.series}
                options={{
                  chart: {
                    type: 'bar',
                    stacked: true,
                    toolbar: { show: false },
                    zoom: { enabled: false },
                    fontFamily: 'inherit',
                  },
                  plotOptions: {
                    bar: {
                      borderRadius: 4,
                      columnWidth: '60%',
                    }
                  },
                  dataLabels: {
                    enabled: false
                  },
                  stroke: {
                    show: false
                  },
                  xaxis: {
                    categories: monthlyStatusChartData.months,
                    labels: {
                      style: {
                        fontSize: '12px',
                      },
                      rotate: -20,
                      rotateAlways: false,
                    }
                  },
                  yaxis: {
                    labels: {
                      style: {
                        fontSize: '12px',
                      },
                      formatter: (val: number) => Math.round(val).toString()
                    }
                  },
                  colors: ['#22c55e', '#f59e0b', '#3b82f6', '#ef4444'],
                  grid: {
                    strokeDashArray: 3,
                    borderColor: 'rgba(0, 0, 0, 0.06)',
                    xaxis: {
                      lines: {
                        show: true
                      }
                    },
                    yaxis: {
                      lines: {
                        show: true
                      }
                    }
                  },
                  legend: {
                    position: 'top',
                    fontSize: '12px',
                  },
                  tooltip: {
                    theme: 'light',
                    style: {
                      fontSize: '12px',
                    },
                    y: {
                      formatter: (val: number) => Math.round(val).toString()
                    }
                  },
                } as ApexOptions}
              />
            </div>
          </div>

          <div className="text-sm font-medium mt-4">บันทึกการตรวจสอบคุณภาพ (QC Logs)</div>
          <div>
          <Table
            columns={["Trip", "สถานะ", "ปัญหา/หมายเหตุ", "การทำงาน"]}
            maxHeight={'calc(100vh - 600px)'}
            minHeight="420px"
            rows={qcLogs.slice(0, 50).map((l) => [
              l.tripId,
              l.status === 'ok' ? '✅ ผ่าน' : l.status === 'warn' ? '⚠️ คำเตือน' : l.status === 'accepted' ? '☑️ ยอมรับเตือน' : '❌ ผิดพลาด',
              <ul className="list-disc pl-4">
                {l.issues.map((msg: string, idx: number) => (<li key={idx}>{msg}</li>))}
              </ul>,
              l.status === 'warn' ? <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => onAcceptWarning(l.tripId)}>Accept Warning</Button> : ''
            ])}
          />
          </div>
        </div>
      )}
    </div>
  )
}


