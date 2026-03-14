import { useEffect, useState, useMemo } from 'react'
import { ClipboardCheck } from 'lucide-react'
import { Header, Table, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/common'
import { useI18n } from '../lib/i18n'
import Chart from 'react-apexcharts'
import { ApexOptions } from 'apexcharts'

// --- API helpers ---
const API_BASE = 'http://localhost:3000'

async function fetchAllPages(path: string, maxLimit = 500): Promise<any[]> {
  const rows: any[] = []
  let page = 1
  while (true) {
    const sep = path.includes('?') ? '&' : '?'
    const res = await fetch(`${API_BASE}${path}${sep}page=${page}&limit=${maxLimit}`)
    if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
    const json = await res.json()
    const data: any[] = json.data ?? []
    rows.push(...data)
    if (data.length < maxLimit) break
    if (json.total != null && rows.length >= json.total) break
    page++
  }
  return rows
}

// --- Normalize main_area to ADM / GOT ---
function normalizeRegion(mainArea: string): 'ADM' | 'GOT' | null {
  if (!mainArea) return null
  const u = mainArea.toUpperCase().trim()
  if (u === 'ADM' || u.includes('ANDAMAN')) return 'ADM'
  if (u === 'GOT' || u.includes('GULF') || u.includes('GOT')) return 'GOT'
  return null
}

// --- QC interfaces and engine ---
type QcStatus = 'ok' | 'warn' | 'accepted' | 'error'

interface QcLog {
  sampleId: string
  rvId: number
  status: QcStatus
  mainArea: string
  sampleDateEng: string
  remark: string
  issues: string[]
}

interface IssueByZoneRow {
  issue: string
  zone: string
  count: number
}

interface MonthlyStatusRow {
  month: string
  status: string
  count: number
}

function parseSampleDateParts(sampleDateEng: string): { year: number; month: number; quarter: number } | null {
  if (!sampleDateEng) return null
  const d = new Date(sampleDateEng)
  if (isNaN(d.getTime())) return null
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const quarter = Math.floor((month - 1) / 3) + 1
  return { year, month, quarter }
}

// ERROR-level rule codes (structural integrity failures)
const ERROR_PREFIXES = ['REQUIRED_FIELD_MISSING', 'CATCH_MISSING']
function isErrorIssue(msg: string) {
  return ERROR_PREFIXES.some(p => msg.startsWith(p))
}

function runQcEngine(
  effort: any[],
  catchRows: any[],
  tsSppSet: Set<number>,
  envIndex: Map<string, boolean>
): QcLog[] {
  // Index catch by sample_id
  const catchBySample = new Map<string, any[]>()
  for (const row of catchRows) {
    const sid = String(row.sample_id ?? '')
    if (!catchBySample.has(sid)) catchBySample.set(sid, [])
    catchBySample.get(sid)!.push(row)
  }

  // Compute per-sample total_weight for outlier detection
  const sampleWeights: number[] = []
  for (const rows of catchBySample.values()) {
    const sum = rows.reduce((acc: number, r: any) => acc + (Number(r.total_weight) || 0), 0)
    if (sum > 0) sampleWeights.push(sum)
  }
  const meanWeight =
    sampleWeights.length > 0
      ? sampleWeights.reduce((a, b) => a + b, 0) / sampleWeights.length
      : 0

  const logs: QcLog[] = []

  for (const sample of effort) {
    const sampleId = String(sample.sample_id ?? '')
    const mainArea = String(sample.main_area ?? '')
    const sampleDate = String(sample.sample_date_eng ?? '')
    const remark = String(sample.remark ?? '').trim()
    const issues: string[] = []

    // --- ERROR-level rules ---

    // E02: invalid date
    if (!sampleDate || isNaN(new Date(sampleDate).getTime())) {
      issues.push('REQUIRED_FIELD_MISSING: sample_date_eng ไม่ถูกต้อง')
    }

    // E03: missing start coordinates
    if (!sample.lat_start || !sample.long_start) {
      issues.push('REQUIRED_FIELD_MISSING: ขาดพิกัด lat_start/long_start')
    }

    // E04: main_area not in ADM/GOT
    const region = normalizeRegion(mainArea)
    if (!region) {
      issues.push(`REQUIRED_FIELD_MISSING: main_area="${mainArea}" ไม่ใช่ ADM หรือ GOT`)
    }

    // C03: no catch rows for this sample
    const sampleCatch = catchBySample.get(sampleId) ?? []
    if (sampleCatch.length === 0) {
      issues.push('CATCH_MISSING: ไม่มีข้อมูล catch2 สำหรับ sample_id นี้')
    }

    // --- WARN-level rules ---

    // E01: depth out of 7–53 m
    const depth = Number(sample.depth)
    if (depth && (depth < 7 || depth > 53)) {
      issues.push(`DEPTH_OUT_OF_RANGE: depth=${depth} m (range 7–53 m)`)
    }

    // E05: tow_time below operational minimum
    const towTime = Number(sample.tow_time)
    if (towTime && towTime < 50) {
      issues.push(`SHORT_TOW: tow_time=${towTime} min (< 50)`)
    }

    if (sampleCatch.length > 0) {
      // C01: species_id not found in ts_spp (exclude -888 placeholder)
      const unknownSpp = sampleCatch.filter((r: any) => {
        const sid = Number(r.species_id)
        return sid !== -888 && !tsSppSet.has(sid)
      })
      if (unknownSpp.length > 0) {
        issues.push(`TS_SPP_NOT_FOUND: ${unknownSpp.length} รายการ species_id ไม่อยู่ใน ts_spp`)
      }

      // C02: total_weight <= 0
      const zeroWeight = sampleCatch.filter((r: any) => (Number(r.total_weight) || 0) <= 0)
      if (zeroWeight.length > 0) {
        issues.push(`ZERO_WEIGHT: ${zeroWeight.length} รายการ total_weight ≤ 0`)
      }

      // C04: high catch outlier > 3× mean
      const totalW = sampleCatch.reduce(
        (acc: number, r: any) => acc + (Number(r.total_weight) || 0),
        0
      )
      if (meanWeight > 0 && totalW > meanWeight * 3) {
        issues.push(
          `HIGH_CATCH: total_weight=${totalW.toFixed(1)} kg (> 3× mean ${meanWeight.toFixed(1)} kg)`
        )
      }

      // C05: few species (< 5 unique)
      const uniqueSpp = new Set(sampleCatch.map((r: any) => r.species_id))
      if (uniqueSpp.size > 0 && uniqueSpp.size < 5) {
        issues.push(`FEW_SPECIES: ${uniqueSpp.size} ชนิด (< 5)`)
      }
    }

    // ENV05: cannot join env_daily by sample_date_eng + normalized region
    if (region && sampleDate && !isNaN(new Date(sampleDate).getTime())) {
      const envKey = sampleDate.slice(0, 10) + '|' + region
      if (!envIndex.has(envKey)) {
        issues.push(
          `ENV_NOT_FOUND_BY_DATE_REGION: ไม่พบ env_daily สำหรับ ${sampleDate.slice(0, 10)} / ${region}`
        )
      }
    }

    // --- Derive 4-tier status ---
    // error  → any ERROR-level issue present
    // accepted → only WARN issues, but researcher annotated (remark not empty)
    // warn   → only WARN issues, no annotation
    // ok     → no issues
    const hasError = issues.some(isErrorIssue)
    const hasWarn = issues.length > 0 && !hasError
    let status: QcStatus
    if (hasError) {
      status = 'error'
    } else if (hasWarn && remark !== '') {
      status = 'accepted'
    } else if (hasWarn) {
      status = 'warn'
    } else {
      status = 'ok'
    }

    logs.push({ sampleId, rvId: Number(sample.rv_id ?? 0), status, mainArea, sampleDateEng: sampleDate, remark, issues })
  }

  return logs
}

export default function DataIngestionQCPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { t } = useI18n()
  const [qcLogs, setQcLogs] = useState<QcLog[]>([])
  const [accepting, setAccepting] = useState<Set<string>>(new Set())
  const [acceptError, setAcceptError] = useState<string | null>(null)
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<'previous' | 'month'>('previous')
  const [valueFilter, setValueFilter] = useState<string>('all')

  async function acceptWarning(log: QcLog) {
    if (accepting.has(log.sampleId)) return
    setAccepting((prev: Set<string>) => new Set(prev).add(log.sampleId))
    setAcceptError(null)
    const remarkText = `Accepted by reviewer on ${new Date().toISOString().slice(0, 10)}`
    try {
      const res = await fetch(`${API_BASE}/api/tables/effort2/${log.rvId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remark: remarkText }),
      })
      if (!res.ok) throw new Error(`PUT /effort2/${log.rvId} failed: ${res.status}`)
      setQcLogs((prev: QcLog[]) =>
        prev.map((l: QcLog) =>
          l.sampleId === log.sampleId
            ? { ...l, status: 'accepted' as QcStatus, remark: remarkText }
            : l
        )
      )
    } catch (err: any) {
      setAcceptError(String(err))
    } finally {
      setAccepting((prev: Set<string>) => {
        const s = new Set(prev)
        s.delete(log.sampleId)
        return s
      })
    }
  }

  const filterOptions = useMemo(() => {
    const years = Array.from(
      new Set(
        qcLogs
          .map((l: QcLog) => parseSampleDateParts(l.sampleDateEng)?.year)
          .filter((y): y is number => typeof y === 'number')
          .map((y: number) => String(y))
      )
    ).sort()
    return { years }
  }, [qcLogs])

  const valueOptions = useMemo(() => {
    if (typeFilter === 'previous') return ['1', '2', '3', '4']
    return ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
  }, [typeFilter])

  useEffect(() => {
    setValueFilter('all')
  }, [typeFilter])

  const filteredQcLogs = useMemo(() => {
    return qcLogs.filter((l: QcLog) => {
      const parts = parseSampleDateParts(l.sampleDateEng)
      if (!parts) return false
      const passYear = yearFilter === 'all' || String(parts.year) === yearFilter
      const passTypeValue =
        valueFilter === 'all'
          ? true
          : typeFilter === 'previous'
          ? parts.quarter === Number(valueFilter)
          : parts.month === Number(valueFilter)
      return passYear && passTypeValue
    })
  }, [qcLogs, yearFilter, typeFilter, valueFilter])

  const statusData = useMemo(() => {
    const counts = { ok: 0, warn: 0, accepted: 0, error: 0 }
    for (const l of filteredQcLogs) {
      const st: QcStatus = l.status
      counts[st] = (counts[st] || 0) + 1
    }
    return [
      { type: '✅ OK', value: counts.ok },
      { type: '⚠️ Warn', value: counts.warn },
      { type: '✔️ Accepted', value: counts.accepted },
      { type: '❌ Error', value: counts.error },
    ]
  }, [filteredQcLogs])

  // Normalize issue code to Thai display category
  function issueCategory(msg: string): string {
    if (msg.startsWith('CATCH_MISSING')) return 'ไม่มีข้อมูล Catch'
    if (msg.startsWith('SHORT_TOW')) return 'ระยะเวลาลากสั้น'
    if (msg.startsWith('HIGH_CATCH')) return 'ปริมาณจับสูงผิดปกติ'
    if (msg.startsWith('FEW_SPECIES')) return 'จำนวนชนิดสัตว์น้ำน้อย'
    if (msg.startsWith('DEPTH_OUT_OF_RANGE')) return 'ความลึกนอกเกณฑ์'
    if (msg.startsWith('TS_SPP_NOT_FOUND')) return 'Species ไม่อยู่ใน ts_spp'
    if (msg.startsWith('ZERO_WEIGHT')) return 'น้ำหนักสัตว์น้ำ = 0'
    if (msg.startsWith('ENV_NOT_FOUND')) return 'ไม่พบข้อมูลสิ่งแวดล้อม'
    if (msg.startsWith('REQUIRED_FIELD_MISSING')) return 'ข้อมูลจำเป็นขาดหาย'
    return msg.length > 30 ? msg.slice(0, 30) + '…' : msg
  }

  // Short display label per main_area (ADM / GOT)
  function shortArea(mainArea: string): string {
    const r = normalizeRegion(mainArea)
    if (r === 'ADM') return 'Andaman (ADM)'
    if (r === 'GOT') return 'Gulf of Thailand (GOT)'
    return mainArea || 'Unknown'
  }

  // Top Issues by Zone (stacked)
  const issueByZoneData = useMemo(() => {
    // Count per (category, zone) using API main_area field
    const pairToCount = new Map<string, number>()
    const catToTotal = new Map<string, number>()
    for (const l of filteredQcLogs) {
      const zone = shortArea(l.mainArea)
      for (const msg of l.issues ?? []) {
        const cat = issueCategory(msg)
        const key = cat + '\0' + zone
        pairToCount.set(key, (pairToCount.get(key) || 0) + 1)
        catToTotal.set(cat, (catToTotal.get(cat) || 0) + 1)
      }
    }

    // Keep only top 10 categories
    const topCats = new Set(
      Array.from(catToTotal.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([c]) => c)
    )

    const rows: IssueByZoneRow[] = []
    for (const [key, count] of pairToCount.entries()) {
      const [issue, zone] = key.split('\0')
      if (!topCats.has(issue)) continue
      rows.push({ issue, zone, count })
    }
    return rows.sort((a, b) => b.count - a.count)
  }, [filteredQcLogs])

  // Monthly status: aggregate qcLogs by month (YYYY-MM) from sampleDateEng
  const monthlyStatus = useMemo(() => {
    const map: Record<string, { ok: number; warn: number; accepted: number; error: number }> = {}
    for (const l of filteredQcLogs) {
      const m =
        l.sampleDateEng && !isNaN(new Date(l.sampleDateEng).getTime())
          ? l.sampleDateEng.slice(0, 7)
          : 'Unknown'
      if (!map[m]) map[m] = { ok: 0, warn: 0, accepted: 0, error: 0 }
      const st: QcStatus = l.status
      map[m][st] = (map[m][st] || 0) + 1
    }
    const rows: MonthlyStatusRow[] = []
    Object.keys(map)
      .sort()
      .forEach((m) => {
        rows.push({ month: m, status: '✅ OK', count: map[m].ok })
        rows.push({ month: m, status: '⚠️ Warn', count: map[m].warn })
        rows.push({ month: m, status: '✔️ Accepted', count: map[m].accepted })
        rows.push({ month: m, status: '❌ Error', count: map[m].error })
      })
    return rows
  }, [filteredQcLogs])

  // Transform data for ApexCharts stacked bar chart - Top Issues by Zone
  const issueByZoneChartData = useMemo(() => {
    const issues = Array.from(new Set<string>(issueByZoneData.map((r: IssueByZoneRow) => r.issue))).sort()
    const zones = Array.from(new Set<string>(issueByZoneData.map((r: IssueByZoneRow) => r.zone))).sort()
    const series = zones.map((zone) => ({
      name: zone,
      data: issues.map((issue) => {
        const item = issueByZoneData.find((r: IssueByZoneRow) => r.issue === issue && r.zone === zone)
        return item ? item.count : 0
      })
    }))
    return { issues, series }
  }, [issueByZoneData])

  // Transform data for ApexCharts stacked bar chart - Monthly Status
  const monthlyStatusChartData = useMemo(() => {
    const months = Array.from(new Set<string>(monthlyStatus.map((r: MonthlyStatusRow) => r.month))).sort()
    const statuses = ['✅ OK', '⚠️ Warn', '✔️ Accepted', '❌ Error']
    const series = statuses.map((status) => ({
      name: status,
      data: months.map((month) => {
        const item = monthlyStatus.find((r: MonthlyStatusRow) => r.month === month && r.status === status)
        return item ? item.count : 0
      })
    }))
    return { months, series }
  }, [monthlyStatus])

  // --- Fetch all data from API and run QC on mount ---
  useEffect(() => {
    let cancelled = false
    async function loadAndQc() {
      setLoading(true)
      setError(null)
      try {
        // Health check before loading
        const healthRes = await fetch(`${API_BASE}/health`)
        const health = await healthRes.json()
        if (health.db !== 'connected') throw new Error('Database ยังไม่พร้อม: ' + (health.error ?? ''))

        // Fetch all datasets in parallel
        const [effort, catchRows, tsSppRows, envRows] = await Promise.all([
          fetchAllPages('/api/tables/effort2'),
          fetchAllPages('/api/tables/catch2'),
          fetchAllPages('/api/tables/ts_spp'),
          fetchAllPages('/api/environment/daily?start_date=2022-01-01&end_date=2023-12-31', 1000),
        ])

        if (cancelled) return

        // Build lookup indexes
        const tsSppSet = new Set<number>(tsSppRows.map((r: any) => Number(r.idspp)))
        const envIndex = new Map<string, boolean>()
        for (const e of envRows) {
          const dateKey = String(e.date ?? '').slice(0, 10)
          const regionKey = String(e.region_code ?? '')
          if (dateKey && regionKey) envIndex.set(dateKey + '|' + regionKey, true)
        }

        const logs = runQcEngine(effort, catchRows, tsSppSet, envIndex)
        if (!cancelled) setQcLogs(logs)
      } catch (err: any) {
        if (!cancelled) setError(String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadAndQc()
    return () => { cancelled = true }
  }, [])

  function exportCsv() {
    const header = ['SampleID', 'MainArea', 'Date', 'Status', 'Issues']
    const lines = [header.join(',')]
    for (const l of filteredQcLogs) {
      const issues = (l.issues ?? []).join(' | ').replace(/\n|\r/g, ' ')
      lines.push(
        [l.sampleId, l.mainArea, l.sampleDateEng.slice(0, 10), l.status.toUpperCase(),
          '"' + issues.replace(/"/g, '""') + '"'].join(',')
      )
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
    const rowsHtml = filteredQcLogs.slice(0, 500).map((l: QcLog) => {
      const statusIcon = l.status === 'ok' ? '✅' : '❌'
      const issues = (l.issues ?? []).map((i: string) => `<li>${i}</li>`).join('')
      return `<tr><td style="padding:6px;border:1px solid #ddd;">${l.sampleId}</td><td style="padding:6px;border:1px solid #ddd;">${l.mainArea}</td><td style="padding:6px;border:1px solid #ddd;">${statusIcon}</td><td style="padding:6px;border:1px solid #ddd;"><ul>${issues}</ul></td></tr>`
    }).join('')
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>QC Logs</title>
      <style>body{font-family:'Noto Sans Thai',Arial,sans-serif;}table{border-collapse:collapse;width:100%;font-size:12px;}th{background:#f5f5f5;}</style>
      </head><body>
      <h2>QC Logs</h2>
      <table><thead><tr>
        <th style="padding:6px;border:1px solid #ddd;">Sample ID</th>
        <th style="padding:6px;border:1px solid #ddd;">Main Area</th>
        <th style="padding:6px;border:1px solid #ddd;">Status</th>
        <th style="padding:6px;border:1px solid #ddd;">Issues</th>
      </tr></thead>
      <tbody>${rowsHtml}</tbody></table>
      <script>window.print();</script>
      </body></html>`)
    win.document.close()
  }

  function onTopbarExport() {
    const toCsv = window.confirm('Export CSV? (Cancel to export PDF)')
    if (toCsv) exportCsv()
    else exportPdf()
  }

  return (
    <div>
      <Header title={t('ing.title')} desc={t('ing.desc')} icon={<ClipboardCheck className="h-6 w-6" />} onExport={onTopbarExport} sticky={true} />
      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
      {loading && !error && <div className="text-sm text-muted-foreground">{t('loading.api')}</div>}
      {!loading && !error && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>{t('filter.year')}</Label>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {filterOptions.years.map((y: string) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('filter.type')}</Label>
              <Select value={typeFilter} onValueChange={(v: 'previous' | 'month') => setTypeFilter(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="previous">{t('filter.type.previous')}</SelectItem>
                  <SelectItem value="month">{t('filter.type.month')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('filter.value')}</Label>
              <Select value={valueFilter} onValueChange={setValueFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {valueOptions.map((v: string) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Charts: Status Pie and Top Issues Column */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border bg-background p-3">
              <div className="text-sm font-medium mb-2">{t('ing.chart.status')}</div>
              <div style={{ height: 260 }}>
                <Chart
                  type="pie"
                  height={260}
                  series={statusData.map((d: { type: string; value: number }) => d.value)}
                  options={{
                    chart: {
                      type: 'pie',
                      toolbar: { show: false },
                      fontFamily: 'inherit',
                    },
                    labels: statusData.map((d: { type: string; value: number }) => d.type),
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
              <div className="text-sm font-medium mb-2">{t('ing.chart.topIssues')}</div>
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
                      categories: issueByZoneChartData.issues.map((issue: string) => {
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
          {acceptError && (
            <div className="text-red-600 text-xs mb-2">{acceptError}</div>
          )}
          <div>
            <Table
              columns={['Sample ID', 'Area', 'สถานะ', 'ปัญหา/หมายเหตุ', 'การทำงาน']}
              maxHeight={'calc(100vh - 600px)'}
              minHeight="420px"
              rows={[...filteredQcLogs]
                .sort((a, b) => (b.issues?.length || 0) - (a.issues?.length || 0))
                .slice(0, 50)
                .map((l) => [
                  l.sampleId,
                  l.mainArea || '—',
                  l.status === 'ok' ? '✅ ผ่าน'
                    : l.status === 'warn' ? '⚠️ คำเตือน'
                    : l.status === 'accepted' ? '✔️ Accepted'
                    : '❌ Error',
                  l.issues.length > 0 ? (
                    <ul className="list-disc pl-4">
                      {l.issues.map((msg: string, idx: number) => (<li key={idx}>{msg}</li>))}
                    </ul>
                  ) : (
                    <span className="text-muted-foreground">ไม่พบปัญหา</span>
                  ),
                  l.status === 'warn' ? (
                    <button
                      onClick={() => acceptWarning(l)}
                      disabled={accepting.has(l.sampleId)}
                      className="px-3 py-1 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {accepting.has(l.sampleId) ? 'กำลังบันทึก...' : 'Accept Warning'}
                    </button>
                  ) : null,
                ])}
            />
          </div>
        </div>
      )}
    </div>
  )
}


