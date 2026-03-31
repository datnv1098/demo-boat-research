import { useEffect, useMemo, useState } from 'react'
import { Activity } from 'lucide-react'
import {
  ChartCard,
  ErrorState,
  Field,
  FilterBar,
  Header,
  LoadingState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
} from '../components/common'
import { useI18n } from '../lib/i18n'
import Chart from 'react-apexcharts'
import { ApexOptions } from 'apexcharts'
import { fetchApiRows } from '../lib/mockApi'

function normalizeZone(mainArea: string): string {
  const v = String(mainArea || '').toUpperCase().trim()
  if (!v) return 'N/A'
  if (v === 'AND') return 'ADM'
  if (v === 'ADM' || v.includes('ANDAMAN')) return 'ADM'
  if (v === 'GOT' || v.includes('GULF')) return 'GOT'
  return v
}

function parseSurveyDate(raw?: string): Date | null {
  if (!raw) return null
  const s = String(raw).trim()
  if (!s) return null

  // Support YYYY-MM-DD and full ISO date-time strings.
  const isoDate = /^\d{4}-\d{2}-\d{2}/.test(s)
  if (isoDate) {
    const d = new Date(s)
    return isNaN(d.getTime()) ? null : d
  }

  // Support M-D-YYYY / MM-DD-YYYY often found in original survey sources.
  const mdY = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (mdY) {
    const month = Number(mdY[1])
    const day = Number(mdY[2])
    const year = Number(mdY[3])
    const d = new Date(year, month - 1, day)
    return isNaN(d.getTime()) ? null : d
  }

  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

interface CpueRecord {
  link: string
  cpue: number
  totalCatch: number
  towMin: number
  area: string
  zone: string
  depth: number
  depthClass: string
  yearNum: number
  monthNum: number
  quarterNum: number
  monthLabel: string
  quarterLabel: string
  speciesSet: string[]
  station: string
}

export default function CPUEPage() {
  const [loading, setLoading] = useState(true)
  const [effortRows, setEffortRows] = useState<any[]>([])
  const [catchRows, setCatchRows] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const { t, lang } = useI18n()

  const [area, setArea] = useState<string>('all')
  const [zone, setZone] = useState<string>('all')
  const [depthClass, setDepthClass] = useState<string>('all')
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<'previous' | 'month'>('previous')
  const [valueFilter, setValueFilter] = useState<string>('all')

  useEffect(() => {
    let cancelled = false
    async function loadFromApi() {
      setLoading(true)
      setError(null)
      try {
        const [effort, catchData] = await Promise.all([
          fetchApiRows('/api/tables/effort2'),
          fetchApiRows('/api/tables/catch2'),
        ])

        if (!cancelled) {
          setEffortRows(effort)
          setCatchRows(catchData)
        }
      } catch (e) {
        if (!cancelled) setError(String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadFromApi()
    return () => {
      cancelled = true
    }
  }, [])

  function toMonthLabel(dateStr?: string) {
    const d = parseSurveyDate(dateStr)
    if (!d) return 'N/A'
    const m = d.getMonth()
    const year = d.getFullYear()
    const thMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    const enMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const label = (lang === 'th' ? thMonths[m] : enMonths[m]) + ' ' + year
    return label
  }

  function toQuarterLabel(dateStr?: string) {
    const d = parseSurveyDate(dateStr)
    if (!d) return 'N/A'
    const q = Math.floor(d.getMonth() / 3) + 1
    const year = d.getFullYear()
    return `Q${q} ${year}`
  }

  function depthToClass(depth?: number) {
    if (depth == null || !isFinite(depth)) return 'N/A'
    if (depth < 20) return '<20'
    if (depth <= 40) return '20–40'
    return '>40'
  }

  const cpueRecords = useMemo<CpueRecord[]>(() => {
    if (!effortRows.length) return []
    const sampleToEffort = new Map<string, any>()
    for (const e of effortRows) sampleToEffort.set(String(e?.sample_id || ''), e)
    const linkToCatchWeight = new Map<string, number>()
    const linkSpeciesSet = new Map<string, Set<string>>()
    for (const c of catchRows) {
      const link = String(c?.sample_id || '')
      const w = Number(c?.total_weight) || 0
      linkToCatchWeight.set(link, (linkToCatchWeight.get(link) || 0) + w)
      const spp = String(c?.species_id || 'ALL')
      if (!linkSpeciesSet.has(link)) linkSpeciesSet.set(link, new Set<string>())
      linkSpeciesSet.get(link)!.add(spp)
    }
    const list: CpueRecord[] = []
    for (const [link, h] of sampleToEffort.entries()) {
      const d = parseSurveyDate(String(h?.sample_date_eng))
      if (!d) continue
      const towMin = Number(h?.tow_time)
      const hours = isFinite(towMin) ? towMin / 60 : NaN
      const totalCatch = linkToCatchWeight.get(link) || 0
      const cpue = isFinite(hours) && hours > 0 ? totalCatch / hours : NaN
      const monthNum = d.getMonth() + 1
      const yearNum = d.getFullYear()
      const quarterNum = Math.floor((monthNum - 1) / 3) + 1
      list.push({
        link,
        cpue,
        totalCatch,
        towMin,
        area: h?.rv_area != null ? String(h.rv_area) : 'N/A',
        zone: normalizeZone(String(h?.main_area || '')),
        depth: Number(h?.depth),
        depthClass: depthToClass(Number(h?.depth)),
        yearNum,
        monthNum,
        quarterNum,
        monthLabel: toMonthLabel(String(h?.sample_date_eng)),
        quarterLabel: toQuarterLabel(String(h?.sample_date_eng)),
        speciesSet: Array.from(linkSpeciesSet.get(link) || []),
        station: h?.station || '-',
      })
    }
    return list.filter((r: CpueRecord) => isFinite(r.cpue))
  }, [effortRows, catchRows, lang])

  const filterOptions = useMemo(() => {
    const years = Array.from(new Set<string>(cpueRecords.map((r: CpueRecord) => String(r.yearNum)))).sort()
    const areas = Array.from(new Set<string>(cpueRecords.map((r: CpueRecord) => r.area))).sort()
    const zones = Array.from(new Set<string>(cpueRecords.map((r: CpueRecord) => r.zone))).sort()
    const depthClasses = ['<20', '20–40', '>40']
    return { years, areas, zones, depthClasses }
  }, [cpueRecords])

  const valueOptions = useMemo(() => {
    if (typeFilter === 'previous') return ['1', '2', '3', '4']
    return ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
  }, [typeFilter])

  useEffect(() => {
    setValueFilter('all')
  }, [typeFilter])

  const filtered = useMemo<CpueRecord[]>(() => {
    return cpueRecords.filter((r: CpueRecord) => (
      (yearFilter === 'all' || String(r.yearNum) === yearFilter) &&
      (valueFilter === 'all' || (typeFilter === 'previous' ? r.quarterNum === Number(valueFilter) : r.monthNum === Number(valueFilter))) &&
      (area === 'all' || r.area === area) &&
      (zone === 'all' || r.zone === zone) &&
      (depthClass === 'all' || r.depthClass === depthClass)
    ))
  }, [cpueRecords, yearFilter, typeFilter, valueFilter, area, zone, depthClass])

  const stats = useMemo(() => {
    const values = filtered.map((r: CpueRecord) => r.cpue).sort((a: number, b: number) => a - b)
    const n = values.length
    if (!n) return { n: 0 }
    const mean = values.reduce((a: number, b: number) => a + b, 0) / n
    const median = values[Math.floor(n / 2)]
    const variance = values.reduce((a: number, v: number) => a + Math.pow(v - mean, 2), 0) / n
    const stddev = Math.sqrt(variance)
    // P95
    const p95 = values[Math.floor(n * 0.95)]
    return { n, mean, median, stddev, p95 }
  }, [filtered])

  const withOutlier = useMemo(() => filtered.map((r: CpueRecord) => ({ ...r, outlier: stats.p95 != null ? r.cpue > stats.p95 : false })), [filtered, stats])

  const byMonth = useMemo(() => {
    const map = new Map<string, { month: string; cpue: number; count: number; sortKey: string }>()
    for (const r of withOutlier) {
      const key = r.monthLabel
      // Create sortKey from original date for proper sorting
      const dateMatch = key.match(/(\d{4})/)
      const year = dateMatch ? dateMatch[1] : '0000'
      const monthNames = lang === 'th'
        ? ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
        : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const monthIndex = monthNames.findIndex((m: string) => key.includes(m))
      const sortKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`

      const cur = map.get(key) || { month: key, cpue: 0, count: 0, sortKey }
      cur.cpue += r.cpue
      cur.count += 1
      map.set(key, cur)
    }
    return Array.from(map.values())
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map((x) => ({ month: x.month, cpue: x.count ? x.cpue / x.count : 0 }))
  }, [withOutlier, lang])

  const byQuarter = useMemo(() => {
    const map = new Map<string, { quarter: string; cpue: number; count: number; sortKey: string }>()
    for (const r of withOutlier) {
      const key = r.quarterLabel
      // Extract Q and year for sorting: "Q1 2024" -> "2024-1"
      const match = key.match(/Q(\d+)\s+(\d{4})/)
      const sortKey = match ? `${match[2]}-${match[1]}` : key

      const cur = map.get(key) || { quarter: key, cpue: 0, count: 0, sortKey }
      cur.cpue += r.cpue
      cur.count += 1
      map.set(key, cur)
    }
    return Array.from(map.values())
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map((x) => ({ quarter: x.quarter, cpue: x.count ? x.cpue / x.count : 0 }))
  }, [withOutlier])

  // CPUE by Area and Period - for area comparison chart
  const byAreaAndPeriod = useMemo(() => {
    // Keep area comparison by ignoring selected area while keeping other active filters.
    const unfilteredByArea = cpueRecords.filter((r: CpueRecord) => (
      (yearFilter === 'all' || String(r.yearNum) === yearFilter) &&
      (valueFilter === 'all' || (typeFilter === 'previous' ? r.quarterNum === Number(valueFilter) : r.monthNum === Number(valueFilter))) &&
      (zone === 'all' || r.zone === zone) &&
      (depthClass === 'all' || r.depthClass === depthClass)
    ))

    const areas = Array.from(new Set<string>(unfilteredByArea.map((r: CpueRecord) => r.area))).sort()

    const periodSet = new Set<string>(unfilteredByArea.map((r: CpueRecord) => (typeFilter === 'month' ? r.monthLabel : r.quarterLabel)))
    const periods = Array.from(periodSet).sort((a: string, b: string) => a.localeCompare(b))

    // Create a map structure: area -> period -> {cpue, count}
    const dataMap = new Map<string, Map<string, { cpue: number; count: number }>>()

    for (const r of unfilteredByArea) {
      if (!dataMap.has(r.area)) {
        dataMap.set(r.area, new Map())
      }
      const areaMap = dataMap.get(r.area)!
      const periodKey = typeFilter === 'month' ? r.monthLabel : r.quarterLabel
      const cur = areaMap.get(periodKey) || { cpue: 0, count: 0 }
      cur.cpue += r.cpue
      cur.count += 1
      areaMap.set(periodKey, cur)
    }

    // Convert to series format for ApexCharts
    const series = areas.map((area: string) => {
      const areaData = dataMap.get(area)!
      return {
        name: area,
        data: periods.map((q: string) => {
          const qData = areaData.get(q)
          return qData && qData.count ? qData.cpue / qData.count : null
        })
      }
    })

    return { series, categories: periods }
  }, [cpueRecords, yearFilter, typeFilter, valueFilter, zone, depthClass])

  const byDepth = useMemo(() => {
    const map = new Map<string, { cls: string; cpue: number; count: number }>()
    for (const r of withOutlier) {
      const key = r.depthClass
      const cur = map.get(key) || { cls: key, cpue: 0, count: 0 }
      cur.cpue += r.cpue
      cur.count += 1
      map.set(key, cur)
    }
    return Array.from(map.values()).map((x) => ({ cls: x.cls, cpue: x.count ? x.cpue / x.count : 0 }))
  }, [withOutlier])

  // Histogram of CPUE distribution (based on filtered records)
  const histData = useMemo(() => {
    const values = filtered.map((r: CpueRecord) => r.cpue)
    if (!values.length) return [] as { bin: string; count: number }[]
    const min = Math.min(...values)
    const max = Math.max(...values)
    const bins = 12
    const width = (max - min) / bins || 1
    const counts = Array.from({ length: bins }, () => 0)
    for (const v of values) {
      let idx = Math.floor((v - min) / width)
      if (idx >= bins) idx = bins - 1
      if (idx < 0) idx = 0
      counts[idx]++
    }
    return counts.map((c, i) => ({ bin: `${(min + i * width).toFixed(1)}–${(min + (i + 1) * width).toFixed(1)}`, count: c }))
  }, [filtered])

  return (
    <div>
      <Header title={t('cpue.title')} desc={t('cpue.desc')} icon={<Activity className="h-6 w-6" />} sticky={true} />
      {error && <ErrorState message={error} className="mb-3" />}
      {loading && !error && <LoadingState label={t('loading.api')} className="mb-3" />}
      {!loading && !error && (
        <div className="space-y-4">
          <FilterBar gridClassName="md:grid-cols-6">
            <Field label={t('filter.year')}>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {filterOptions.years.map((m: string) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t('filter.type')}>
              <Select value={typeFilter} onValueChange={(v: 'previous' | 'month') => setTypeFilter(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="previous">{t('filter.type.previous')}</SelectItem>
                  <SelectItem value="month">{t('filter.type.month')}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={t('filter.value')}>
              <Select value={valueFilter} onValueChange={setValueFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {valueOptions.map((m: string) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t('filter.area')}>
              <Select defaultValue={area} onValueChange={setArea}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {filterOptions.areas.map((m: string) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t('hot.zone')}>
              <Select defaultValue={zone} onValueChange={setZone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {filterOptions.zones.map((m: string) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t('hot.depth')}>
              <Select defaultValue={depthClass} onValueChange={setDepthClass}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {filterOptions.depthClasses.map((m: string) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
          </FilterBar>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title={t('cpue.chart.byPeriod')}>
              <div style={{ height: 260 }}>
                <Chart
                  type="line"
                  height={260}
                  series={[{
                    name: 'CPUE',
                    data: (typeFilter === 'month' ? byMonth : byQuarter).map((r: { cpue: number }) => r.cpue)
                  }]}
                  options={{
                    chart: {
                      type: 'line',
                      toolbar: { show: false },
                      zoom: { enabled: true, type: 'x' },
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
                      },
                      strokeColors: ['#2563eb'],
                      strokeWidth: 2
                    },
                    fill: {
                      type: 'gradient',
                      gradient: {
                        shade: 'light',
                        type: 'vertical',
                        shadeIntensity: 0.4,
                        gradientToColors: ['#93c5fd'],
                        inverseColors: false,
                        opacityFrom: 0.5,
                        opacityTo: 0.1,
                        stops: [0, 100],
                      },
                    },
                    xaxis: {
                      categories: (typeFilter === 'month' ? byMonth : byQuarter).map((r: { month?: string; quarter?: string; cpue: number }) => {
                        if (typeFilter === 'month') {
                          return (r as { month: string; cpue: number }).month
                        } else {
                          return (r as { quarter: string; cpue: number }).quarter
                        }
                      }),
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
                    colors: ['#2563eb'],
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
                        formatter: (val: number) => val.toFixed(3)
                      }
                    },
                  } as ApexOptions}
                />
              </div>
            </ChartCard>
            <ChartCard title={t('cpue.chart.byDepth')}>
              <div style={{ height: 260 }}>
                <Chart
                  type="bar"
                  height={260}
                  series={[{
                    name: 'CPUE',
                    data: byDepth.map((r: { cpue: number }) => r.cpue)
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
                      categories: byDepth.map((r: { cls: string }) => r.cls),
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
                        gradientToColors: ['#34d399'],
                        inverseColors: false,
                        opacityFrom: 0.9,
                        opacityTo: 0.7,
                        stops: [0, 100],
                      },
                      colors: ['#10b981']
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
                        formatter: (val: number) => val.toFixed(3)
                      }
                    },
                  } as ApexOptions}
                />
              </div>
            </ChartCard>
          </div>

          <ChartCard title={t('cpue.chart.distribution')}>
            <div style={{ height: 320 }}>
              <Chart
                type="bar"
                height={320}
                series={[{
                  name: 'Count',
                    data: histData.map((r: { count: number }) => r.count)
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
                      columnWidth: '80%',
                    }
                  },
                  dataLabels: {
                    enabled: false
                  },
                  stroke: {
                    show: false
                  },
                  xaxis: {
                    categories: histData.map((r: { bin: string }) => r.bin),
                    labels: {
                      style: {
                        fontSize: '11px',
                      },
                      rotate: -25,
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
                  fill: {
                    type: 'gradient',
                    gradient: {
                      shade: 'light',
                      type: 'vertical',
                      shadeIntensity: 0.5,
                      gradientToColors: ['#fbbf24'],
                      inverseColors: false,
                      opacityFrom: 0.9,
                      opacityTo: 0.7,
                      stops: [0, 100],
                    },
                    colors: ['#f59e0b']
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
                      formatter: (val: number) => Math.round(val).toString()
                    }
                  },
                } as ApexOptions}
              />
            </div>
          </ChartCard>

          <ChartCard title={t('cpue.chart.byArea')}>
            <div style={{ height: 320 }}>
              <Chart
                type="line"
                height={320}
                series={byAreaAndPeriod.series}
                options={{
                  chart: {
                    type: 'line',
                    toolbar: { show: true },
                    zoom: { enabled: true, type: 'x' },
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
                    },
                    strokeWidth: 2
                  },
                  xaxis: {
                    categories: byAreaAndPeriod.categories,
                    labels: {
                      style: {
                        fontSize: '12px',
                      },
                      rotate: -45,
                      rotateAlways: false,
                    }
                  },
                  yaxis: {
                    title: {
                      text: 'Average CPUE',
                      style: {
                        fontSize: '12px',
                      }
                    },
                    labels: {
                      style: {
                        fontSize: '12px',
                      },
                      formatter: (val: number) => val ? val.toFixed(2) : '0.00'
                    }
                  },
                  colors: ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
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
                    show: true,
                    position: 'top',
                    horizontalAlign: 'left',
                    fontSize: '12px',
                    markers: {
                      width: 10,
                      height: 10,
                      radius: 2,
                    },
                  },
                  tooltip: {
                    theme: 'light',
                    style: {
                      fontSize: '12px',
                    },
                    y: {
                      formatter: (val: number) => val ? val.toFixed(3) : 'N/A'
                    }
                  },
                } as ApexOptions}
              />
            </div>
          </ChartCard>
          <Table
            columns={["Link", "Area", "Zone", "Depth", "Month", "Tow(min)", "Catch(kg)", "CPUE", "Outlier"]}
            maxHeight={400}
            rows={withOutlier.slice(0, 100).map((r: CpueRecord & { outlier: boolean }) => [
              r.link,
              r.area,
              r.zone,
              r.depthClass,
              r.monthLabel,
              r.towMin,
              Number(r.totalCatch).toFixed(2),
              r.cpue.toFixed(2),
              r.outlier ? 'P95' : '',
            ])}
          />
        </div>
      )}
    </div>
  )
}
