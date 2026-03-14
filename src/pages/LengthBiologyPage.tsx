import { useEffect, useMemo, useState } from 'react'
import { Ruler } from 'lucide-react'
import { Header, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button } from '../components/common'
import { Table } from '../components/common'
import { useI18n } from '../lib/i18n'
import Chart from 'react-apexcharts'
import { ApexOptions } from 'apexcharts'
import { CPUEVisualDashboard } from '../components/CPUEVisualDashboard'
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
  const isoDate = /^\d{4}-\d{2}-\d{2}/.test(s)
  if (isoDate) {
    const d = new Date(s)
    return isNaN(d.getTime()) ? null : d
  }
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

export default function LengthBiologyPage() {
  const [loading, setLoading] = useState(true)
  const [effortRows, setEffortRows] = useState<any[]>([])
  const [catchRows, setCatchRows] = useState<any[]>([])
  const [tsSppRows, setTsSppRows] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const { t, lang } = useI18n()

  const [species, setSpecies] = useState<string>('all')
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<'previous' | 'month'>('previous')
  const [valueFilter, setValueFilter] = useState<string>('all')
  const [zone, setZone] = useState<string>('all')

  useEffect(() => {
    let cancelled = false
    async function loadFromApi() {
      setLoading(true)
      setError(null)
      try {
        const [effort, catchData, tsSpp] = await Promise.all([
          fetchApiRows('/api/tables/effort2'),
          fetchApiRows('/api/tables/catch2'),
          fetchApiRows('/api/tables/ts_spp'),
        ])

        if (!cancelled) {
          setEffortRows(effort)
          setCatchRows(catchData)
          setTsSppRows(tsSpp)
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

  function parseFreqtext(ft?: string) {
    if (!ft || typeof ft !== 'string') return []
    const parts = ft.split(',').map((s) => s.trim())
    const pairs: { length: number; count: number }[] = []
    for (const p of parts) {
      const m = p.match(/(\d+):(\d+)/)
      if (m) pairs.push({ length: Number(m[1]), count: Number(m[2]) })
    }
    return pairs
  }

  function toMonthLabel(dateStr?: string) {
    const d = parseSurveyDate(dateStr)
    if (!d) return 'N/A'
    const m = d.getMonth()
    const year = d.getFullYear()
    const thMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    const enMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return (lang === 'th' ? thMonths[m] : enMonths[m]) + ' ' + year
  }

  const speciesNameById = useMemo(() => {
    const map = new Map<number, string>()
    for (const s of tsSppRows) {
      const id = Number(s?.idspp)
      if (!isNaN(id)) map.set(id, String(s?.spp_sci_name || s?.common_name || s?.thai_name || id))
    }
    return map
  }, [tsSppRows])

  const linkToHeader = useMemo(() => {
    const map = new Map<string, any>()
    for (const h of effortRows) {
      const d = parseSurveyDate(String(h?.sample_date_eng))
      if (!d) continue
      const yearNum = d.getFullYear()
      const monthNum = d.getMonth() + 1
      const quarterNum = Math.floor((monthNum - 1) / 3) + 1
      const monthKey = d && !isNaN(d.getTime()) ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : 'N/A'
      map.set(String(h?.sample_id || ''), {
        zone: normalizeZone(String(h?.main_area || '')),
        area: h?.rv_area != null ? String(h?.rv_area) : 'N/A',
        fishingArea: normalizeZone(String(h?.main_area || '')),
        monthLabel: toMonthLabel(String(h?.sample_date_eng)),
        monthKey,
        yearNum,
        monthNum,
        quarterNum,
      })
    }
    return map
  }, [effortRows, lang])

  const lengthFreqData = useMemo(() => {
    const list: any[] = []
    for (const c of catchRows) {
      const link = String(c?.sample_id || '')
      const speciesId = Number(c?.species_id)
      const speciesCode = !isNaN(speciesId) ? String(speciesId) : 'ALL'
      const speciesName = speciesNameById.get(speciesId) || String(c?.scientific_name || speciesCode)
      const ft = parseFreqtext(String((c as any)?.freqtext || ''))
      const hdr = linkToHeader.get(link) || {}
      list.push({
        link,
        speciesCode,
        speciesName,
        freqPairs: ft,
        zone: hdr.zone,
        area: hdr.area,
        fishingArea: hdr.fishingArea || hdr.zone || '',
        monthLabel: hdr.monthLabel,
        monthKey: hdr.monthKey,
        yearNum: hdr.yearNum,
        monthNum: hdr.monthNum,
        quarterNum: hdr.quarterNum,
        total_weight: Number(c?.total_weight) || 0,
      })
    }
    return list
  }, [catchRows, linkToHeader, speciesNameById])

  const filterOptions = useMemo(() => {
    const species = Array.from(new Set(lengthFreqData.map((r) => r.speciesName))).sort()
    const years = Array.from(new Set(lengthFreqData.map((r) => String(r.yearNum)).filter((y) => y !== 'undefined'))).sort()
    const zones = Array.from(new Set(lengthFreqData.map((r) => r.zone))).sort()
    return { species, years, zones }
  }, [lengthFreqData])

  const valueOptions = useMemo(() => {
    if (typeFilter === 'previous') return ['1', '2', '3', '4']
    return ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
  }, [typeFilter])

  useEffect(() => {
    setValueFilter('all')
  }, [typeFilter])

  const filtered = useMemo(() => {
    return lengthFreqData.filter((r) => (
      (species === 'all' || r.speciesName === species) &&
      (yearFilter === 'all' || String(r.yearNum) === yearFilter) &&
      (valueFilter === 'all' || (typeFilter === 'previous' ? r.quarterNum === Number(valueFilter) : r.monthNum === Number(valueFilter))) &&
      (zone === 'all' || r.zone === zone)
    ))
  }, [lengthFreqData, species, yearFilter, typeFilter, valueFilter, zone])

  const hasRealLengthData = useMemo(() => filtered.some((r) => r.freqPairs.length > 0), [filtered])

  function pairsForRecord(r: any): { length: number; count: number }[] {
    if (r.freqPairs && r.freqPairs.length > 0) return r.freqPairs
    // Fallback proxy when API lacks length bins: map one observation from total_weight.
    const w = Number(r.total_weight) || 0
    return w > 0 ? [{ length: w, count: 1 }] : []
  }

  function calcBioIndices(freqPairs: { length: number; count: number }[]) {
    if (!freqPairs.length) return { lmean: 0, l95: 0, pctJuvenile: 0, lfi: 0, total: 0 }
    const total = freqPairs.reduce((a, b) => a + b.count, 0)
    if (total === 0) return { lmean: 0, l95: 0, pctJuvenile: 0, lfi: 0, total: 0 }
    const weighted = freqPairs.reduce((sum, p) => sum + (p.length * p.count), 0)
    const lmean = weighted / total
    const sorted = freqPairs.flatMap((p) => Array(p.count).fill(p.length)).sort((a, b) => a - b)
    const l95 = sorted[Math.floor(sorted.length * 0.95)]
    const median = sorted[Math.floor(sorted.length * 0.5)]
    const pctJuvenile = (sorted.filter((l) => l < median).length / sorted.length) * 100
    const large = sorted.filter((l) => l > lmean * 1.5).length
    const lfi = (large / sorted.length) * 0.65
    return { lmean, l95, pctJuvenile, lfi, total }
  }

  const aggregated = useMemo(() => {
    if (!hasRealLengthData) {
      const values = filtered.map((r) => Number(r.total_weight) || 0).filter((v) => v > 0)
      if (!values.length) return []
      const min = Math.min(...values)
      const max = Math.max(...values)
      const bins = 12
      const width = (max - min) / bins || 1
      const counts = Array.from({ length: bins }, () => 0)
      for (const v of values) {
        let idx = Math.floor((v - min) / width)
        if (idx >= bins) idx = bins - 1
        if (idx < 0) idx = 0
        counts[idx] += 1
      }
      return counts.map((c, i) => ({
        length: `${(min + i * width).toFixed(1)}–${(min + (i + 1) * width).toFixed(1)}`,
        count: c,
      }))
    }

    const map = new Map<number, { length: number; count: number }>()
    for (const r of filtered) {
      for (const p of pairsForRecord(r)) {
        const key = p.length
        map.set(key, { length: key, count: (map.get(key)?.count || 0) + p.count })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.length - b.length)
  }, [filtered, hasRealLengthData])

  const bioStats = useMemo(() => {
    const combined = filtered.flatMap((r) => pairsForRecord(r))
    return calcBioIndices(combined)
  }, [filtered])

  const warning = useMemo(() => {
    return bioStats.pctJuvenile >= 60
  }, [bioStats])

  function exportBioPdf() {
    const win = window.open('', '_blank', 'width=1024,height=768')
    if (!win) return
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Bio Indices</title>
      <style>body{font-family: 'Noto Sans Thai', Arial, sans-serif;} table{border-collapse:collapse;width:100%;font-size:12px;} th{background:#f5f5f5;}</style>
      </head><body>
      <h2>Length-Frequency & Bio Indices</h2>
      <table><tr><th>Lmean</th><th>L95</th><th>%<Lm50</th><th>LFI</th></tr>
      <tr><td>${bioStats.lmean.toFixed(2)}</td><td>${bioStats.l95.toFixed(2)}</td><td>${bioStats.pctJuvenile.toFixed(2)}%</td><td>${bioStats.lfi.toFixed(3)}</td></tr>
      </table>
      <script>window.print();</script>
      </body></html>`)
    win.document.close()
  }

  // Charts: Lmean by Month & by Zone
  const lmeanByMonth = useMemo(() => {
    const map = new Map<string, { monthKey: string; monthLabel: string; lsum: number; cnt: number }>()
    for (const r of filtered) {
      const s = calcBioIndices(pairsForRecord(r))
      const key = r.monthKey || 'N/A'
      const cur = map.get(key) || { monthKey: key, monthLabel: r.monthLabel || 'N/A', lsum: 0, cnt: 0 }
      cur.lsum += s.lmean
      cur.cnt += 1
      map.set(key, cur)
    }
    const arr = Array.from(map.values())
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .slice(-6)
      .map((x) => ({ month: x.monthLabel, lmean: x.cnt ? x.lsum / x.cnt : 0 }))
    return arr
  }, [filtered])

  const lmeanByZone = useMemo(() => {
    const map = new Map<string, { zone: string; lsum: number; cnt: number }>()
    for (const r of filtered) {
      const s = calcBioIndices(pairsForRecord(r))
      const key = r.zone || 'N/A'
      const cur = map.get(key) || { zone: key, lsum: 0, cnt: 0 }
      cur.lsum += s.lmean
      cur.cnt += 1
      map.set(key, cur)
    }
    return Array.from(map.values()).map((x) => ({ zone: x.zone, lmean: x.cnt ? x.lsum / x.cnt : 0 }))
  }, [filtered])

  return (
    <div>
      <Header title={t('len.title')} desc={t('len.desc')} icon={<Ruler className="h-6 w-6" />} sticky={true} />
      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
      {loading && !error && <div className="text-sm text-muted-foreground">{t('loading.api')}</div>}
      {!loading && !error && (
        <div className="space-y-8">
          {/* Rich Visual Dashboard */}
          <CPUEVisualDashboard data={filtered} />

          {!hasRealLengthData && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-800 text-sm p-3">
              {t('len.warn.proxyMode')}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <Label>{t('filter.year')}</Label>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {filterOptions.years.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
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
                  {valueOptions.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('filter.species')}</Label>
              <Select defaultValue={species} onValueChange={setSpecies}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {filterOptions.species.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('hot.zone')}</Label>
              <Select defaultValue={zone} onValueChange={setZone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {filterOptions.zones.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border bg-background p-3">
              <div className="text-sm font-medium mb-2">{hasRealLengthData ? t('len.chart.histogram') : t('len.chart.proxyHistogram')}</div>
              <div style={{ height: 300 }}>
                <Chart
                  type="bar"
                  height={300}
                  series={[{
                    name: 'Count',
                    data: aggregated.map(r => r.count)
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
                        columnWidth: '70%',
                      }
                    },
                    dataLabels: {
                      enabled: false
                    },
                    stroke: {
                      show: false
                    },
                    xaxis: {
                      categories: aggregated.map(r => r.length),
                      title: {
                        text: hasRealLengthData ? 'Length (cm)' : 'Weight bin (kg)',
                        style: {
                          fontSize: '12px',
                        }
                      },
                      labels: {
                        style: {
                          fontSize: '12px',
                        }
                      }
                    },
                    yaxis: {
                      title: {
                        text: 'Count',
                        style: {
                          fontSize: '12px',
                        }
                      },
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
                        gradientToColors: ['#a78bfa'],
                        inverseColors: false,
                        opacityFrom: 0.9,
                        opacityTo: 0.7,
                        stops: [0, 100],
                      },
                      colors: ['#8b5cf6']
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

            <div className="rounded-xl border bg-background p-3">
              <div className="text-sm font-medium mb-2">{t('len.chart.lmeanByZone')}</div>
              <div style={{ height: 260 }}>
                <Chart
                  type="bar"
                  height={260}
                  series={[{
                    name: 'Lmean',
                    data: lmeanByZone.map(r => r.lmean)
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
                      categories: lmeanByZone.map(r => r.zone),
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
                        gradientToColors: ['#6ee7b7'],
                        inverseColors: false,
                        opacityFrom: 0.9,
                        opacityTo: 0.7,
                        stops: [0, 100],
                      },
                      colors: ['#34d399']
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
                        formatter: (val: number) => val.toFixed(2) + ' cm'
                      }
                    },
                  } as ApexOptions}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border bg-background p-3">
              <div className="text-sm font-medium mb-2">{t('len.chart.lmeanByMonth')}</div>
              <div style={{ height: 260 }}>
                <Chart
                  type="line"
                  height={260}
                  series={[{
                    name: 'Lmean',
                    data: lmeanByMonth.map(r => r.lmean)
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
                      categories: lmeanByMonth.map(r => r.month),
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
                        formatter: (val: number) => val.toFixed(2) + ' cm'
                      }
                    },
                  } as ApexOptions}
                />
              </div>
            </div>
            <div className="rounded-xl border bg-background p-3 flex flex-col">
              <div className="text-sm font-medium mb-2">{t('len.chart.bioIndices')}</div>
              <div className="space-y-2">
                <div className="flex justify-between"><span>Lmean:</span><span className="font-medium">{bioStats.lmean.toFixed(2)} cm</span></div>
                <div className="flex justify-between"><span>L95:</span><span className="font-medium">{bioStats.l95.toFixed(2)} cm</span></div>
                <div className="flex justify-between"><span>%&lt;Lm50:</span><span className={`font-medium ${warning ? 'text-orange-600' : ''}`}>{bioStats.pctJuvenile.toFixed(2)}%</span></div>
                <div className="flex justify-between"><span>LFI:</span><span className="font-medium">{bioStats.lfi.toFixed(3)}</span></div>
                {warning && <div className="text-orange-600 text-sm font-medium">{t('len.warn.juvenile')}</div>}
              </div>
              <div className="mt-4 flex-1" />
              <div className="pt-2 flex justify-end">
                <Button className="bg-gray-100 text-gray-700 hover:bg-gray-200" onClick={exportBioPdf}>{t('header.export')} PDF</Button>
              </div>
            </div>
          </div>

          {/* Details table */}
          {(() => {
            const details = filtered.map((r: any) => {
              const s = calcBioIndices(pairsForRecord(r))
              return [r.link, r.speciesName, r.zone, r.monthLabel, s.lmean.toFixed(2), s.l95.toFixed(2), s.pctJuvenile.toFixed(2) + '%']
            })
            return (
              <div className="rounded-xl border bg-background p-3">
                <div className="text-sm font-medium mb-2">{t('len.chart.details')}</div>
                <Table
                  columns={["Link", "Species", "Zone", "Month", "Lmean", "L95", "%<Lm50"]}
                  maxHeight={320}
                  minHeight="420px"
                  rows={details.slice(0, 100)}
                />
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
