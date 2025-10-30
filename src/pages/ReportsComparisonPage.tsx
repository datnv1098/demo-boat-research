import { useEffect, useMemo, useState } from 'react'
import { BarChart2 } from 'lucide-react'
import { Header, Table, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/common'
import { useI18n } from '../lib/i18n'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts'
import { BarChart, Bar } from 'recharts'

export default function ReportsComparisonPage() {
  const [data, setData] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { t, lang } = useI18n()

  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('quarter')
  const [station, setStation] = useState<string>('all')
  const [metric, setMetric] = useState<'cpue' | 'depth' | 'temp' | 'sal' | 'do' | 'ph' | 'lmean' | 'lfi'>('cpue')

  useEffect(() => {
    fetch(new URL('../../cmdec_mock.json', import.meta.url).href)
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(String(e)))
  }, [])

  const { headerRows, catchRows, waterQlRows } = useMemo(() => {
    if (!data) return { headerRows: [], catchRows: [], waterQlRows: [] }
    const lower: Record<string, any> = {}
    Object.keys(data).forEach((k) => (lower[k.toLowerCase()] = data[k]))
    return {
      headerRows: Array.isArray(lower['header']) ? lower['header'] : [],
      catchRows: Array.isArray(lower['catch']) ? lower['catch'] : [],
      waterQlRows: Array.isArray(lower['water_ql']) ? lower['water_ql'] : [],
    }
  }, [data])

  function toMonthLabel(dateStr?: string) {
    if (!dateStr) return 'N/A'
    const d = new Date(dateStr)
    const m = d.getMonth()
    const year = d.getFullYear()
    const thMonths = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
    const enMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return (lang === 'th' ? thMonths[m] : enMonths[m]) + ' ' + year
  }
  function toQuarterLabel(dateStr?: string) {
    if (!dateStr) return 'N/A'
    const d = new Date(dateStr)
    const q = Math.floor(d.getMonth() / 3) + 1
    const year = d.getFullYear()
    return `Q${q} ${year}`
  }
  function toYearLabel(dateStr?: string) {
    if (!dateStr) return 'N/A'
    const d = new Date(dateStr)
    return String(d.getFullYear())
  }

  // Precompute per-link CPUE and join env
  const records = useMemo(() => {
    if (!headerRows.length) return []
    const linkToCatchWeight: Record<string, number> = {}
    for (const c of catchRows) {
      const link = String(c?.Link)
      const w = Number(c?.total_weight) || 0
      linkToCatchWeight[link] = (linkToCatchWeight[link] || 0) + w
    }
    const waterKeyMap: Record<string, any> = {}
    for (const w of waterQlRows) {
      const key = `${String(w?.station)}_${String(w?.year)}_${String(w?.month)}`
      waterKeyMap[key] = w
    }
    const out: any[] = []
    for (const h of headerRows) {
      const link = String(h?.Link)
      const towMin = Number(h?.Tow)
      const hours = isFinite(towMin) ? towMin / 60 : NaN
      const cpue = isFinite(hours) && hours > 0 ? (linkToCatchWeight[link] || 0) / hours : NaN
      const date = String(h?.Date)
      const station = String(h?.Station || '-')
      const depth = Number(h?.Depth)
      const d = new Date(date)
      const waterKey = `${station}_${d.getFullYear()}_${d.getMonth() + 1}`
      const w = waterKeyMap[waterKey]
      out.push({
        link,
        station,
        date,
        monthLabel: toMonthLabel(date),
        quarterLabel: toQuarterLabel(date),
        yearLabel: toYearLabel(date),
        cpue,
        depth,
        temp: w ? Number(w?.Temp_surface) : NaN,
        sal: w ? Number(w?.Salinity_surface) : NaN,
        do: w ? Number(w?.DO_surface) : NaN,
        ph: w ? Number(w?.pH_surface) : NaN,
      })
    }
    return out.filter((r) => isFinite(r.cpue))
  }, [headerRows, catchRows, waterQlRows, lang])

  const filterOptions = useMemo(() => {
    const stations = Array.from(new Set(records.map((r) => r.station))).sort()
    return { stations }
  }, [records])

  const filtered = useMemo(() => {
    return records.filter((r) => station === 'all' || r.station === station)
  }, [records, station])

  // Aggregate by period
  const series = useMemo(() => {
    const keyOf = (r: any) => (period === 'month' ? r.monthLabel : period === 'quarter' ? r.quarterLabel : r.yearLabel)
    const map: Record<string, { key: string; cpue: number[]; depth: number[]; temp: number[]; sal: number[]; do: number[]; ph: number[] }> = {}
    for (const r of filtered) {
      const k = keyOf(r)
      if (!map[k]) map[k] = { key: k, cpue: [], depth: [], temp: [], sal: [], do: [], ph: [] }
      map[k].cpue.push(r.cpue)
      if (isFinite(r.depth)) map[k].depth.push(r.depth)
      if (isFinite(r.temp)) map[k].temp.push(r.temp)
      if (isFinite(r.sal)) map[k].sal.push(r.sal)
      if (isFinite(r.do)) map[k].do.push(r.do)
      if (isFinite(r.ph)) map[k].ph.push(r.ph)
    }
    const toStats = (arr: number[]) => {
      if (!arr.length) return { mean: 0, min: 0, max: 0, cv: 0 }
      const n = arr.length
      const mean = arr.reduce((a, b) => a + b, 0) / n
      const min = Math.min(...arr)
      const max = Math.max(...arr)
      const sd = Math.sqrt(arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n)
      const cv = mean !== 0 ? sd / mean : 0
      return { mean, min, max, cv }
    }
    const rows = Object.values(map)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((g) => ({
        period: g.key,
        cpue_mean: toStats(g.cpue).mean,
        cpue_min: toStats(g.cpue).min,
        cpue_max: toStats(g.cpue).max,
        cpue_cv: toStats(g.cpue).cv,
        depth_mean: toStats(g.depth).mean,
        temp_mean: toStats(g.temp).mean,
        sal_mean: toStats(g.sal).mean,
        do_mean: toStats(g.do).mean,
        ph_mean: toStats(g.ph).mean,
      }))
    return rows
  }, [filtered, period])

  // Top stations by avg CPUE
  const topStations = useMemo(() => {
    const map = new Map<string, number[]>()
    for (const r of filtered) {
      if (!map.has(r.station)) map.set(r.station, [])
      map.get(r.station)!.push(r.cpue)
    }
    return Array.from(map.entries())
      .map(([station, arr]) => ({ station, cpue: arr.reduce((a, b) => a + b, 0) / (arr.length || 1) }))
      .sort((a, b) => b.cpue - a.cpue)
      .slice(0, 5)
  }, [filtered])

  function exportCSV() {
    const header = ['Period','CPUE mean','CPUE min','CPUE max','CPUE CV','Depth mean','Temp mean','Sal mean','DO mean','pH mean']
    const lines = [header.join(',')].concat(series.map((r) => [r.period, r.cpue_mean, r.cpue_min, r.cpue_max, r.cpue_cv, r.depth_mean, r.temp_mean, r.sal_mean, r.do_mean, r.ph_mean].join(',')))
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'dashboard_summary.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportPDF() {
    const win = window.open('', '_blank', 'width=1024,height=768')
    if (!win) return
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Dashboard</title>
      <style>body{font-family: 'Noto Sans Thai', Arial, sans-serif; padding: 20px;} table{border-collapse:collapse;width:100%;margin-top:16px;} th,td{border:1px solid #ddd;padding:6px;text-align:left;} th{background:#f5f5f5;}</style>
      </head><body>
      <h2>${t('dash.title')}</h2>
      <p>${t('dash.desc')}</p>
      <table>
        <tr><th>Period</th><th>CPUE mean</th><th>CPUE min</th><th>CPUE max</th><th>CPUE CV</th><th>Depth mean</th><th>Temp</th><th>Sal</th><th>DO</th><th>pH</th></tr>
        ${series.map((r) => `<tr><td>${r.period}</td><td>${r.cpue_mean.toFixed(2)}</td><td>${r.cpue_min.toFixed(2)}</td><td>${r.cpue_max.toFixed(2)}</td><td>${r.cpue_cv.toFixed(2)}</td><td>${r.depth_mean.toFixed(1)}</td><td>${r.temp_mean.toFixed(1)}</td><td>${r.sal_mean.toFixed(1)}</td><td>${r.do_mean.toFixed(2)}</td><td>${r.ph_mean.toFixed(2)}</td></tr>`).join('')}
      </table>
      <script>window.print();</script>
      </body></html>`)
    win.document.close()
  }

  function onTopbarExport() {
    // Simple chooser: OK = CSV, Cancel = PDF
    const toCsv = window.confirm('Export CSV? (Cancel to export PDF)')
    if (toCsv) exportCSV()
    else exportPDF()
  }

  return (
    <div>
      <Header title={t('dash.title')} desc={t('dash.desc')} icon={<BarChart2 className="h-6 w-6" />} onExport={onTopbarExport} exportLabel={`${t('header.export')}`} sticky={true} />
      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
      {!data && !error && <div className="text-sm text-muted-foreground">{t('loading.demo')}</div>}
      {data && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Period</Label>
              <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="quarter">Quarter</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Station</Label>
              <Select value={station} onValueChange={setStation}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {filterOptions.stations.map((s: string, idx: number) => (
                    <SelectItem key={idx} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Metric</Label>
              <Select value={metric} onValueChange={(v: any) => setMetric(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpue">CPUE</SelectItem>
                  <SelectItem value="depth">Depth</SelectItem>
                  <SelectItem value="temp">Temp</SelectItem>
                  <SelectItem value="sal">Salinity</SelectItem>
                  <SelectItem value="do">DO</SelectItem>
                  <SelectItem value="ph">pH</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
            <div className="rounded-xl border p-3"><div className="text-muted-foreground">CPUE</div><div className="text-xl font-semibold">{(series.reduce((a,b)=>a+b.cpue_mean,0)/(series.length||1)).toFixed(2)}</div></div>
            <div className="rounded-xl border p-3"><div className="text-muted-foreground">Depth</div><div className="text-xl font-semibold">{(series.reduce((a,b)=>a+b.depth_mean,0)/(series.length||1)).toFixed(1)}</div></div>
            <div className="rounded-xl border p-3"><div className="text-muted-foreground">Temp</div><div className="text-xl font-semibold">{(series.reduce((a,b)=>a+b.temp_mean,0)/(series.length||1)).toFixed(1)}</div></div>
            <div className="rounded-xl border p-3"><div className="text-muted-foreground">Salinity</div><div className="text-xl font-semibold">{(series.reduce((a,b)=>a+b.sal_mean,0)/(series.length||1)).toFixed(1)}</div></div>
            <div className="rounded-xl border p-3"><div className="text-muted-foreground">DO</div><div className="text-xl font-semibold">{(series.reduce((a,b)=>a+b.do_mean,0)/(series.length||1)).toFixed(2)}</div></div>
            <div className="rounded-xl border p-3"><div className="text-muted-foreground">pH</div><div className="text-xl font-semibold">{(series.reduce((a,b)=>a+b.ph_mean,0)/(series.length||1)).toFixed(2)}</div></div>
          </div>

          {/* Environment and Top Stations (moved above Trend) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border bg-background p-3">
              <div className="text-sm font-medium mb-2">{`Env (${metric.toUpperCase()}) by ${period}`}</div>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={series}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey={`${metric}_mean`}
                         name={metric.toUpperCase()}
                         fill={metric === 'temp' ? '#60a5fa' : metric === 'sal' ? '#34d399' : metric === 'do' ? '#f59e0b' : '#9ca3af'} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-xl border bg-background p-3">
              <div className="text-sm font-medium mb-2">Top Stations (Avg CPUE)</div>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topStations}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="station" interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="cpue" name="CPUE" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Trend Chart */}
          <div className="rounded-xl border bg-background p-3">
            <div className="text-sm font-medium mb-2">Trend by {period}</div>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey={`${metric}_mean`} stroke="#ef4444" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Summary Table */}
          <div className="rounded-xl border bg-background p-3">
            <div className="text-sm font-medium mb-2">Summary</div>
            <Table
              columns={["Period","CPUE mean","CPUE min","CPUE max","CV","Depth","Temp","Sal","DO","pH"]}
              rows={series.map((r) => [r.period, r.cpue_mean.toFixed(2), r.cpue_min.toFixed(2), r.cpue_max.toFixed(2), r.cpue_cv.toFixed(2), r.depth_mean.toFixed(1), r.temp_mean.toFixed(1), r.sal_mean.toFixed(1), r.do_mean.toFixed(2), r.ph_mean.toFixed(2)])}
              maxHeight={360}
            />
          </div>
        </div>
      )}
    </div>
  )
}


