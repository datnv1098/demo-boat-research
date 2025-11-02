import { useEffect, useMemo, useState } from 'react'
import { Activity } from 'lucide-react'
import { Header, Table, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/common'
import { useI18n } from '../lib/i18n'
import Chart from 'react-apexcharts'
import { ApexOptions } from 'apexcharts'

export default function CPUEPage() {
  const [data, setData] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { t, lang } = useI18n()

  const [area, setArea] = useState<string>('all')
  const [zone, setZone] = useState<string>('all')
  const [depthClass, setDepthClass] = useState<string>('all')
  // removed month filter per request
  const [periodMode] = useState<'month' | 'quarter'>('quarter')
  const [quarter, setQuarter] = useState<string>('all')

  useEffect(() => {
    fetch(new URL('../../cmdec_mock.json', import.meta.url).href)
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(String(e)))
  }, [])

  const { headerRows, catchRows } = useMemo(() => {
    if (!data) return { headerRows: [], catchRows: [] }
    const lower: Record<string, any> = {}
    Object.keys(data).forEach((k) => (lower[k.toLowerCase()] = data[k]))
    return {
      headerRows: Array.isArray(lower['header']) ? lower['header'] : [],
      catchRows: Array.isArray(lower['catch']) ? lower['catch'] : [],
    }
  }, [data])

  function toMonthLabel(dateStr?: string) {
    if (!dateStr) return 'N/A'
    const d = new Date(dateStr)
    const m = d.getMonth()
    const year = d.getFullYear()
    const thMonths = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
    const enMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const label = (lang === 'th' ? thMonths[m] : enMonths[m]) + ' ' + year
    return label
  }

  function toQuarterLabel(dateStr?: string) {
    if (!dateStr) return 'N/A'
    const d = new Date(dateStr)
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

  const cpueRecords = useMemo(() => {
    if (!headerRows.length) return []
    const linkToHeader = new Map<string, any>()
    for (const h of headerRows) linkToHeader.set(String(h?.Link), h)
    const linkToCatchWeight = new Map<string, number>()
    const linkSpeciesSet = new Map<string, Set<string>>()
    for (const c of catchRows) {
      const link = String(c?.Link)
      const w = Number(c?.total_weight) || 0
      linkToCatchWeight.set(link, (linkToCatchWeight.get(link) || 0) + w)
      const spp = String(c?.btscodename || 'ALL')
      if (!linkSpeciesSet.has(link)) linkSpeciesSet.set(link, new Set<string>())
      linkSpeciesSet.get(link)!.add(spp)
    }
    const list: any[] = []
    for (const [link, h] of linkToHeader.entries()) {
      const towMin = Number(h?.Tow)
      const hours = isFinite(towMin) ? towMin / 60 : NaN
      const totalCatch = linkToCatchWeight.get(link) || 0
      const cpue = isFinite(hours) && hours > 0 ? totalCatch / hours : NaN
      list.push({
        link,
        cpue,
        totalCatch,
        towMin,
        area: h?.Area || 'N/A',
        zone: h?.Zone || 'N/A',
        depth: Number(h?.Depth),
        depthClass: depthToClass(Number(h?.Depth)),
        monthLabel: toMonthLabel(String(h?.Date)),
        quarterLabel: toQuarterLabel(String(h?.Date)),
        speciesSet: Array.from(linkSpeciesSet.get(link) || []),
        station: h?.Station || '-',
      })
    }
    return list.filter((r) => isFinite(r.cpue))
  }, [headerRows, catchRows, lang])

  const filterOptions = useMemo(() => {
    const quarters = Array.from(new Set(cpueRecords.map((r) => r.quarterLabel))).sort()
    const areas = Array.from(new Set(cpueRecords.map((r) => r.area))).sort()
    const zones = Array.from(new Set(cpueRecords.map((r) => r.zone))).sort()
    const depthClasses = ['<20','20–40','>40']
    return { quarters, areas, zones, depthClasses }
  }, [cpueRecords])

  const filtered = useMemo(() => {
    return cpueRecords.filter((r) => (
      (area === 'all' || r.area === area) &&
      (zone === 'all' || r.zone === zone) &&
      (depthClass === 'all' || r.depthClass === depthClass) &&
      (quarter === 'all' || r.quarterLabel === quarter)
    ))
  }, [cpueRecords, quarter, area, zone, depthClass])

  const stats = useMemo(() => {
    const values = filtered.map((r) => r.cpue).sort((a, b) => a - b)
    const n = values.length
    if (!n) return { n: 0 }
    const mean = values.reduce((a, b) => a + b, 0) / n
    const median = values[Math.floor(n / 2)]
    const variance = values.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / n
    const stddev = Math.sqrt(variance)
    // P95
    const p95 = values[Math.floor(n * 0.95)]
    return { n, mean, median, stddev, p95 }
  }, [filtered])

  const withOutlier = useMemo(() => filtered.map((r) => ({ ...r, outlier: stats.p95 != null ? r.cpue > stats.p95 : false })), [filtered, stats])

  const byMonth = useMemo(() => {
    const map = new Map<string, { month: string; cpue: number; count: number }>()
    for (const r of withOutlier) {
      const key = r.monthLabel
      const cur = map.get(key) || { month: key, cpue: 0, count: 0 }
      cur.cpue += r.cpue
      cur.count += 1
      map.set(key, cur)
    }
    return Array.from(map.values()).map((x) => ({ month: x.month, cpue: x.count ? x.cpue / x.count : 0 }))
  }, [withOutlier])

  const byQuarter = useMemo(() => {
    const map = new Map<string, { quarter: string; cpue: number; count: number }>()
    for (const r of withOutlier) {
      const key = r.quarterLabel
      const cur = map.get(key) || { quarter: key, cpue: 0, count: 0 }
      cur.cpue += r.cpue
      cur.count += 1
      map.set(key, cur)
    }
    return Array.from(map.values()).map((x) => ({ quarter: x.quarter, cpue: x.count ? x.cpue / x.count : 0 }))
  }, [withOutlier])

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
    const values = filtered.map((r) => r.cpue)
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
      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
      {!data && !error && <div className="text-sm text-muted-foreground">{t('loading.demo')}</div>}
      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label>Quarter</Label>
              <Select defaultValue={quarter} onValueChange={setQuarter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {filterOptions.quarters.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
            <div>
              <Label>Area</Label>
          <Select defaultValue={area} onValueChange={setArea}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {filterOptions.areas.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Zone</Label>
              <Select defaultValue={zone} onValueChange={setZone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {filterOptions.zones.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Depth</Label>
              <Select defaultValue={depthClass} onValueChange={setDepthClass}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {filterOptions.depthClasses.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
      </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border bg-background p-3">
              <div className="text-sm font-medium mb-2">CPUE by Period</div>
              <div style={{ height: 260 }}>
                <Chart
                  type="line"
                  height={260}
                  series={[{
                    name: 'CPUE',
                    data: (periodMode === 'month' ? byMonth : byQuarter).map(r => r.cpue)
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
                      categories: (periodMode === 'month' ? byMonth : byQuarter).map(r => {
                        if (periodMode === 'month') {
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
            </div>
            <div className="rounded-xl border bg-background p-3">
              <div className="text-sm font-medium mb-2">CPUE by Depth class</div>
              <div style={{ height: 260 }}>
                <Chart
                  type="bar"
                  height={260}
                  series={[{
                    name: 'CPUE',
                    data: byDepth.map(r => r.cpue)
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
                      categories: byDepth.map(r => r.cls),
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
            </div>
          </div>

          <div className="rounded-xl border bg-background p-3">
            <div className="text-sm font-medium mb-2">CPUE Distribution (Histogram)</div>
            <div style={{ height: 320 }}>
              <Chart
                type="bar"
                height={320}
                series={[{
                  name: 'Count',
                  data: histData.map(r => r.count)
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
                    categories: histData.map(r => r.bin),
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
          </div>
          <Table
            columns={["Link","Area","Zone","Depth","Month","Tow(min)","Catch(kg)","CPUE","Outlier"]}
            maxHeight={400}
            rows={withOutlier.slice(0, 100).map((r) => [
              r.link,
              r.area,
              r.zone,
              r.depthClass,
              r.monthLabel,
              r.towMin,
              r.totalCatch,
              r.cpue.toFixed(3),
              r.outlier ? 'P95' : '',
            ])}
          />
        </div>
      )}
    </div>
  )
}


