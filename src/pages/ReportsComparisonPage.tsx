import { useEffect, useMemo, useState } from 'react'
import { BarChart2 } from 'lucide-react'
import { Header, Table, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/common'
import { useI18n } from '../lib/i18n'
import Chart from 'react-apexcharts'
import { ApexOptions } from 'apexcharts'
import { GaugeChart } from '../components/GaugeChart'

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
      // Normalize station: convert both "001" and "1" to number for matching
      const stationNum = String(w?.station).replace(/^0+/, '') || String(w?.station)
      const key = `${stationNum}_${String(w?.year)}_${String(w?.month)}`
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
      // Normalize station: remove leading zeros for matching
      const stationNum = station.replace(/^0+/, '') || station
      const depth = Number(h?.Depth)
      const d = new Date(date)
      const waterKey = `${stationNum}_${d.getFullYear()}_${d.getMonth() + 1}`
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
    
    // Sort chronologically based on period type
    const getSortKey = (key: string) => {
      if (period === 'quarter') {
        // Extract Q and year for sorting: "Q1 2024" -> "2024-1"
        const match = key.match(/Q(\d+)\s+(\d{4})/)
        return match ? `${match[2]}-${match[1]}` : key
      } else if (period === 'month') {
        // Extract month and year for sorting
        const dateMatch = key.match(/(\d{4})/)
        const year = dateMatch ? dateMatch[1] : '0000'
        const monthNames = lang === 'th' 
          ? ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
          : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
        const monthIndex = monthNames.findIndex(m => key.includes(m))
        return `${year}-${String(monthIndex + 1).padStart(2, '0')}`
      } else {
        // Year - just return as is
        return key
      }
    }
    
    const rows = Object.values(map)
      .sort((a, b) => getSortKey(a.key).localeCompare(getSortKey(b.key)))
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
  }, [filtered, period, lang])

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

  // Filter series for Trend by quarter - show 3 years (12 quarters max)
  const trendSeriesForQuarter = useMemo(() => {
    if (period !== 'quarter') return series
    
    // Extract year from quarter labels (format: "Q1 2024", "Q2 2024", etc.)
    const yearMap = new Map<string, number>()
    series.forEach(r => {
      const match = r.period.match(/Q\d+\s+(\d+)/)
      if (match) {
        const year = match[1]
        yearMap.set(year, (yearMap.get(year) || 0) + 1)
      }
    })
    
    // Get top 3 years (sorted by year descending to get latest years)
    const sortedYears = Array.from(yearMap.entries())
      .sort((a, b) => {
        // Sort by year descending - latest first
        if (b[0] !== a[0]) return parseInt(b[0]) - parseInt(a[0])
        // Then by count of quarters
        return b[1] - a[1]
      })
      .slice(0, 3)
      .map(([year]) => year)
    
    // Filter to only quarters from selected 3 years
    const filtered = series.filter(r => {
      const match = r.period.match(/Q\d+\s+(\d+)/)
      return match && sortedYears.includes(match[1])
    })
    
    // Sort chronologically: oldest first, newest last (Q1 2022, Q2 2022, ..., Q3 2024, Q4 2024)
    return filtered.sort((a, b) => {
      const matchA = a.period.match(/Q(\d+)\s+(\d+)/)
      const matchB = b.period.match(/Q(\d+)\s+(\d+)/)
      if (!matchA || !matchB) return 0
      
      const yearA = parseInt(matchA[2])
      const yearB = parseInt(matchB[2])
      const quarterA = parseInt(matchA[1])
      const quarterB = parseInt(matchB[1])
      
      // Sort by year ascending (oldest first), then by quarter ascending
      if (yearA !== yearB) return yearA - yearB
      return quarterA - quarterB
    })
    .slice(0, 12) // Ensure maximum 12 quarters (3 years × 4 quarters)
  }, [series, period])

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
        ${series.map((r) => `<tr><td>${r.period}</td><td>${r.cpue_mean.toFixed(2)}</td><td>${r.cpue_min.toFixed(2)}</td><td>${r.cpue_max.toFixed(2)}</td><td>${r.cpue_cv.toFixed(2)}</td><td>${r.depth_mean.toFixed(2)}</td><td>${r.temp_mean.toFixed(2)}</td><td>${r.sal_mean.toFixed(2)}</td><td>${r.do_mean.toFixed(2)}</td><td>${r.ph_mean.toFixed(2)}</td></tr>`).join('')}
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

          {/* KPIs with Gauge Charts */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="rounded-xl border bg-background p-3">
              <GaugeChart
                value={series.reduce((a,b)=>a+b.cpue_mean,0)/(series.length||1)}
                min={0}
                max={500}
                label="CPUE"
                unit="kg/hr"
              />
            </div>
            <div className="rounded-xl border bg-background p-3">
              <GaugeChart
                value={series.reduce((a,b)=>a+b.depth_mean,0)/(series.length||1)}
                min={0}
                max={100}
                label="Depth"
                unit="m"
              />
            </div>
            <div className="rounded-xl border bg-background p-3">
              <GaugeChart
                value={series.reduce((a,b)=>a+b.temp_mean,0)/(series.length||1)}
                min={20}
                max={35}
                label="Temp"
                unit="°C"
              />
            </div>
            <div className="rounded-xl border bg-background p-3">
              <GaugeChart
                value={series.reduce((a,b)=>a+b.sal_mean,0)/(series.length||1)}
                min={25}
                max={35}
                label="Salinity"
                unit="ppt"
              />
            </div>
            <div className="rounded-xl border bg-background p-3">
              <GaugeChart
                value={series.reduce((a,b)=>a+b.do_mean,0)/(series.length||1)}
                min={0}
                max={10}
                label="DO"
                unit="mg/L"
              />
            </div>
            <div className="rounded-xl border bg-background p-3">
              <GaugeChart
                value={series.reduce((a,b)=>a+b.ph_mean,0)/(series.length||1)}
                min={6}
                max={9}
                label="pH"
                unit=""
              />
            </div>
          </div>

          {/* Environment and Top Stations (moved above Trend) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border bg-background p-3">
              <div className="text-sm font-medium mb-2">{`Env (${metric.toUpperCase()}) by ${period}`}</div>
              <div style={{ height: 280 }}>
                <Chart
                  type="bar"
                  height={280}
                  series={[{
                    name: metric.toUpperCase(),
                    data: series.map(r => r[`${metric}_mean` as keyof typeof r] as number)
                  }]}
                  options={{
                    chart: {
                      type: 'bar',
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
                      categories: series.map(r => r.period),
                      labels: {
                        style: {
                          fontSize: '12px',
                        }
                      }
                    },
                    yaxis: {
                      labels: {
                        style: {
                          fontSize: '12px',
                        },
                        formatter: (val: number) => val.toFixed(2)
                      }
                    },
                    fill: {
                      type: 'gradient',
                      gradient: {
                        shade: 'light',
                        type: 'vertical',
                        shadeIntensity: 0.5,
                        gradientToColors: [metric === 'temp' ? '#93c5fd' : metric === 'sal' ? '#6ee7b7' : metric === 'do' ? '#fbbf24' : '#d1d5db'],
                        inverseColors: false,
                        opacityFrom: 0.9,
                        opacityTo: 0.7,
                        stops: [0, 100],
                      },
                      colors: [metric === 'temp' ? '#60a5fa' : metric === 'sal' ? '#34d399' : metric === 'do' ? '#f59e0b' : '#9ca3af']
                    },
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
                    tooltip: {
                      theme: 'light',
                      style: {
                        fontSize: '12px',
                      },
                      y: {
                        formatter: (val: number) => val.toFixed(2)
                      }
                    },
                  } as ApexOptions}
                />
              </div>
            </div>
            <div className="rounded-xl border bg-background p-3">
              <div className="text-sm font-medium mb-2">Top Stations (Avg CPUE)</div>
              <div style={{ height: 280 }}>
                <Chart
                  type="bar"
                  height={280}
                  series={[{
                    name: 'CPUE',
                    data: topStations.map(r => r.cpue)
                  }]}
                  options={{
                    chart: {
                      type: 'bar',
                      toolbar: { show: false },
                      zoom: { enabled: false },
                      fontFamily: 'inherit',
                    },
                    plotOptions: {
                      bar: {
                        borderRadius: 4,
                        columnWidth: '60%',
                        horizontal: false,
                      }
                    },
                    dataLabels: {
                      enabled: false
                    },
                    stroke: {
                      show: false
                    },
                    xaxis: {
                      categories: topStations.map(r => r.station),
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
                        formatter: (val: number) => val.toFixed(2)
                      }
                    },
                    fill: {
                      type: 'gradient',
                      gradient: {
                        shade: 'light',
                        type: 'vertical',
                        shadeIntensity: 0.5,
                        gradientToColors: ['#f87171'],
                        inverseColors: false,
                        opacityFrom: 0.9,
                        opacityTo: 0.7,
                        stops: [0, 100],
                      },
                      colors: ['#ef4444']
                    },
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
                    tooltip: {
                      theme: 'light',
                      style: {
                        fontSize: '12px',
                      },
                      y: {
                        formatter: (val: number) => val.toFixed(2)
                      }
                    },
                  } as ApexOptions}
                />
              </div>
            </div>
          </div>

          {/* Multi-Metric Comparison Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border bg-background p-3">
              <div className="text-sm font-medium mb-2">CPUE Range (Min-Max) by {period}</div>
              <div style={{ height: 280 }}>
                <Chart
                  type="area"
                  height={280}
                  series={[
                    {
                      name: 'CPUE Max',
                      data: series.map(r => r.cpue_max)
                    },
                    {
                      name: 'CPUE Mean',
                      data: series.map(r => r.cpue_mean)
                    },
                    {
                      name: 'CPUE Min',
                      data: series.map(r => r.cpue_min)
                    }
                  ]}
                  options={{
                    chart: {
                      type: 'area',
                      toolbar: { show: false },
                      zoom: { enabled: true, type: 'x' },
                      fontFamily: 'inherit',
                      stacked: false,
                    },
                    stroke: {
                      curve: 'smooth',
                      width: 2.5,
                    },
                    fill: {
                      type: 'gradient',
                      gradient: {
                        shadeIntensity: 1,
                        opacityFrom: 0.4,
                        opacityTo: 0.1,
                        stops: [0, 90, 100]
                      }
                    },
                    dataLabels: {
                      enabled: false
                    },
                    markers: {
                      size: 3,
                      hover: {
                        size: 5
                      }
                    },
                    xaxis: {
                      categories: series.map(r => r.period),
                      labels: {
                        style: {
                          fontSize: '12px',
                        }
                      }
                    },
                    yaxis: {
                      labels: {
                        style: {
                          fontSize: '12px',
                        },
                        formatter: (val: number) => val.toFixed(2)
                      }
                    },
                    colors: ['#ef4444', '#3b82f6', '#10b981'],
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
                      fontSize: '11px',
                    },
                    tooltip: {
                      theme: 'light',
                      style: {
                        fontSize: '12px',
                      },
                      y: {
                        formatter: (val: number) => val.toFixed(2)
                      }
                    },
                  } as ApexOptions}
                />
              </div>
            </div>
            <div className="rounded-xl border bg-background p-3">
              <div className="text-sm font-medium mb-2">CPUE vs Depth Comparison</div>
              <div style={{ height: 280 }}>
                <Chart
                  type="line"
                  height={280}
                  series={[
                    {
                      name: 'CPUE',
                      type: 'line',
                      data: series.map(r => r.cpue_mean)
                    },
                    {
                      name: 'Depth',
                      type: 'column',
                      data: series.map(r => r.depth_mean)
                    }
                  ]}
                  options={{
                    chart: {
                      toolbar: { show: false },
                      zoom: { enabled: true, type: 'x' },
                      fontFamily: 'inherit',
                    },
                    stroke: {
                      curve: 'smooth',
                      width: 2.5,
                    },
                    plotOptions: {
                      bar: {
                        borderRadius: 4,
                        columnWidth: '50%',
                      }
                    },
                    fill: {
                      type: 'gradient',
                      gradient: {
                        shade: 'light',
                        type: 'vertical',
                        shadeIntensity: 0.5,
                        gradientToColors: ['#6ee7b7'],
                        inverseColors: false,
                        opacityFrom: 0.9,
                        opacityTo: 0.7,
                        stops: [0, 100],
                      },
                    },
                    dataLabels: {
                      enabled: false
                    },
                    markers: {
                      size: 4,
                      hover: {
                        size: 6
                      },
                      strokeColors: ['#ef4444'],
                      strokeWidth: 2
                    },
                    xaxis: {
                      categories: series.map(r => r.period),
                      labels: {
                        style: {
                          fontSize: '12px',
                        }
                      }
                    },
                    yaxis: [
                      {
                        title: {
                          text: 'CPUE',
                          style: {
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#ef4444'
                          }
                        },
                        labels: {
                          style: {
                            fontSize: '12px',
                            colors: '#ef4444'
                          },
                          formatter: (val: number) => val.toFixed(2)
                        }
                      },
                      {
                        opposite: true,
                        title: {
                          text: 'Depth (m)',
                          style: {
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#10b981'
                          }
                        },
                        labels: {
                          style: {
                            fontSize: '12px',
                            colors: '#10b981'
                          },
                          formatter: (val: number) => val.toFixed(2)
                        }
                      }
                    ],
                    colors: ['#ef4444', '#10b981'],
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
                      fontSize: '11px',
                    },
                    tooltip: {
                      theme: 'light',
                      style: {
                        fontSize: '12px',
                      },
                      y: {
                        formatter: (val: number) => val.toFixed(2)
                      }
                    },
                  } as ApexOptions}
                />
              </div>
            </div>
          </div>

          {/* Environmental Metrics Overview */}
          <div className="rounded-xl border bg-background p-3">
            <div className="text-sm font-medium mb-2">Environmental Metrics Overview by {period}</div>
            <div style={{ height: 320 }}>
              <Chart
                type="line"
                height={320}
                series={[
                  {
                    name: 'Temp',
                    data: (period === 'quarter' ? trendSeriesForQuarter : series).map(r => r.temp_mean)
                  },
                  {
                    name: 'DO',
                    data: (period === 'quarter' ? trendSeriesForQuarter : series).map(r => r.do_mean)
                  },
                  {
                    name: 'pH',
                    data: (period === 'quarter' ? trendSeriesForQuarter : series).map(r => r.ph_mean)
                  },
                  {
                    name: 'Salinity',
                    data: (period === 'quarter' ? trendSeriesForQuarter : series).map(r => r.sal_mean)
                  }
                ]}
                options={{
                  chart: {
                    type: 'line',
                    toolbar: { show: false },
                    zoom: { enabled: period !== 'quarter', type: 'x' },
                    fontFamily: 'inherit',
                  },
                  stroke: {
                    curve: 'smooth',
                    width: 2.5,
                  },
                  dataLabels: {
                    enabled: false
                  },
                  markers: {
                    size: 4,
                    hover: {
                      size: 6
                    }
                  },
                  fill: {
                    type: 'gradient',
                    gradient: {
                      shadeIntensity: 1,
                      opacityFrom: 0.3,
                      opacityTo: 0.05,
                      stops: [0, 90, 100]
                    }
                  },
                  xaxis: {
                    categories: (period === 'quarter' ? trendSeriesForQuarter : series).map(r => r.period),
                    labels: {
                      style: {
                        fontSize: '12px',
                      }
                    }
                  },
                  yaxis: {
                    labels: {
                      style: {
                        fontSize: '12px',
                      },
                      formatter: (val: number) => val.toFixed(2)
                    }
                  },
                  colors: ['#60a5fa', '#f59e0b', '#ef4444', '#34d399'],
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
                    fontSize: '11px',
                  },
                  tooltip: {
                    theme: 'light',
                    style: {
                      fontSize: '12px',
                    },
                    y: {
                      formatter: (val: number) => val.toFixed(2)
                    }
                  },
                } as ApexOptions}
              />
            </div>
          </div>

          {/* Summary Table */}
          <div className="rounded-xl border bg-background p-3">
            <div className="text-sm font-medium mb-2">Summary</div>
            <Table
              columns={["Period","CPUE mean","CPUE min","CPUE max","CV","Depth","Temp","Sal","DO","pH"]}
              rows={series.map((r) => [r.period, r.cpue_mean.toFixed(2), r.cpue_min.toFixed(2), r.cpue_max.toFixed(2), r.cpue_cv.toFixed(2), r.depth_mean.toFixed(2), r.temp_mean.toFixed(2), r.sal_mean.toFixed(2), r.do_mean.toFixed(2), r.ph_mean.toFixed(2)])}
              maxHeight={360}
            />
          </div>
        </div>
      )}
    </div>
  )
}
