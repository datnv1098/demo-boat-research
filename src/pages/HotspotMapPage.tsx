import { useEffect, useMemo, useState } from 'react'
import { Map as MapIcon } from 'lucide-react'
import { Header, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/common'
import { useI18n } from '../lib/i18n'
import { ThailandMap } from '../components/ThailandMap'
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

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '').trim()
    const n = Number(cleaned)
    return isFinite(n) ? n : NaN
  }
  return NaN
}

function normalizeLongitude(value: number): number {
  if (!isFinite(value)) return NaN
  if (value > 180) return value - 360
  if (value < -180) return value + 360
  return value
}

function parseCoordinate(value: unknown, type: 'lat' | 'lon'): number {
  const raw = toNumber(value)
  if (!isFinite(raw)) return NaN

  let n = raw
  // Some source rows store coordinates in DDMM.MMMM format.
  if (Math.abs(n) > 180 && Math.abs(n) < 10000) {
    const sign = n < 0 ? -1 : 1
    const abs = Math.abs(n)
    const deg = Math.floor(abs / 100)
    const min = abs - deg * 100
    n = sign * (deg + min / 60)
  }

  if (type === 'lon') {
    return normalizeLongitude(n)
  }
  return n
}

function getStationCenter(effort: any): { lat: number; lon: number } {
  const startLat = parseCoordinate(effort?.lat_start, 'lat')
  const startLon = parseCoordinate(effort?.long_start, 'lon')
  const endLat = parseCoordinate(effort?.lat_end, 'lat')
  const endLon = parseCoordinate(effort?.long_end, 'lon')

  if (isFinite(startLat) && isFinite(startLon) && isFinite(endLat) && isFinite(endLon)) {
    return {
      lat: (startLat + endLat) / 2,
      lon: (startLon + endLon) / 2,
    }
  }

  if (isFinite(startLat) && isFinite(startLon)) {
    return { lat: startLat, lon: startLon }
  }

  if (isFinite(endLat) && isFinite(endLon)) {
    return { lat: endLat, lon: endLon }
  }

  return { lat: NaN, lon: NaN }
}


interface StationData {
  link: string
  lat: number
  lon: number
  startLat?: number
  startLon?: number
  endLat?: number
  endLon?: number
  cpue: number
  zone: string
  depth: number
  course: string
  temp?: number
  do?: number
  salinity?: number
  monthLabel: string
  date: Date | null
  yearNum: number
  monthNum: number
  quarterNum: number
  speciesSet: string[]
  totalCatch: number
  effortHours: number
}

interface HotspotCell {
  id: string
  cpue: number
  count: number
  totalCatch: number
  totalEffort: number
  centerLat: number
  centerLon: number
  latMin: number
  latMax: number
  lonMin: number
  lonMax: number
}

export default function HotspotMapPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [effortRows, setEffortRows] = useState<any[]>([])
  const [catchRows, setCatchRows] = useState<any[]>([])
  const { t, lang } = useI18n()

  const [yearFilter, setYearFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<'previous' | 'month'>('previous')
  const [valueFilter, setValueFilter] = useState<string>('all')
  const [zone, setZone] = useState<string>('all')
  const [depthClass] = useState<string>('all')
  const [species] = useState<string>('all')
  const [percentileMode, setPercentileMode] = useState<'P90' | 'P95' | 'top10'>('P90')
  const [heatmapType] = useState<'cpue' | 'temp'>('cpue')

  useEffect(() => {
    let cancelled = false

    async function loadFromApi() {
      setLoading(true)
      setError(null)
      try {
        const [effortData, catchData] = await Promise.all([
          fetchApiRows('/api/tables/effort2'),
          fetchApiRows('/api/tables/catch2'),
        ])

        if (!cancelled) {
          setEffortRows(effortData)
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
    return (lang === 'th' ? thMonths[m] : enMonths[m]) + ' ' + year
  }

  function depthToClass(depth?: number) {
    if (depth == null || !isFinite(depth)) return 'N/A'
    if (depth < 20) return '<20'
    if (depth <= 40) return '20–40'
    return '>40'
  }

  // Check if a location is in marine area (not on land)
  function isMarineLocation(lat: number, lon: number, depth?: number): boolean {
    if (depth == null || !isFinite(depth) || depth <= 0) return false
    const marineLatMin = 4.0
    const marineLatMax = 15.0
    const marineLonMin = 95.0
    const marineLonMax = 106.0
    if (!isFinite(lat) || !isFinite(lon)) return false
    if (lat < marineLatMin || lat > marineLatMax) return false
    if (lon < marineLonMin || lon > marineLonMax) return false
    return true
  }

  // Calculate CPUE for each station
  const stationData = useMemo(() => {
    const linkToCatchWeight = new Map<string, number>()
    const linkSpeciesSet = new Map<string, Set<string>>()

    for (const c of catchRows) {
      const link = String(c?.sample_id || '')
      if (!link) continue
      const w = Number(c?.total_weight) || 0
      linkToCatchWeight.set(link, (linkToCatchWeight.get(link) || 0) + w)
      const spp = String(c?.species_id || 'ALL')
      if (!linkSpeciesSet.has(link)) linkSpeciesSet.set(link, new Set<string>())
      linkSpeciesSet.get(link)!.add(spp)
    }

    const list: StationData[] = []

    for (const h of effortRows) {
      const link = String(h?.sample_id || '')
      if (!link) continue

      const towMin = Number(h?.tow_time)
      const hours = isFinite(towMin) ? towMin / 60 : NaN
      const totalCatch = linkToCatchWeight.get(link) || 0
      const cpue = isFinite(hours) && hours > 0 ? totalCatch / hours : NaN

      const center = getStationCenter(h)
      const startLat = parseCoordinate(h?.lat_start, 'lat')
      const startLon = parseCoordinate(h?.long_start, 'lon')
      const endLat = parseCoordinate(h?.lat_end, 'lat')
      const endLon = parseCoordinate(h?.long_end, 'lon')

      const lat = center.lat
      const lon = center.lon
      const surveyDate = parseSurveyDate(String(h?.sample_date_eng || ''))
      if (!surveyDate) continue
      const yearNum = surveyDate.getFullYear()
      const monthNum = surveyDate.getMonth() + 1
      const quarterNum = Math.floor((monthNum - 1) / 3) + 1

      if (!isFinite(lat) || !isFinite(lon)) continue
      if (!isFinite(cpue) || cpue <= 0) continue

      list.push({
        link,
        lat,
        lon,
        startLat: isFinite(startLat) ? startLat : undefined,
        startLon: isFinite(startLon) ? startLon : undefined,
        endLat: isFinite(endLat) ? endLat : undefined,
        endLon: isFinite(endLon) ? endLon : undefined,
        cpue: isFinite(cpue) ? cpue : 0,
        zone: normalizeZone(String(h?.main_area || '')),
        depth: Number(h?.depth) || 0,
        course: String(h?.course || ''),
        monthLabel: toMonthLabel(String(h?.sample_date_eng || '')),
        date: surveyDate,
        yearNum,
        monthNum,
        quarterNum,
        speciesSet: Array.from(linkSpeciesSet.get(link) || []),
        totalCatch,
        effortHours: isFinite(hours) ? hours : 0,
      })
    }

    return list
  }, [effortRows, catchRows, lang])

  const filterOptions = useMemo(() => {
    const zoneSet = new Set(stationData.map((r: StationData) => r.zone))
    const zones = Array.from(zoneSet).sort()
    const years = Array.from(new Set(stationData.map((r: StationData) => String(r.yearNum)))).sort()
    const speciesSet = new Set<string>()
    stationData.forEach((r: StationData) => {
      if (r.speciesSet && r.speciesSet.length > 0) {
        r.speciesSet.forEach((sp: string) => speciesSet.add(sp))
      }
    })
    const speciesList = Array.from(speciesSet).sort()
    return { zones, years, species: speciesList }
  }, [stationData])

  const valueOptions = useMemo(() => {
    if (typeFilter === 'previous') return ['1', '2', '3', '4']
    return ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
  }, [typeFilter])

  useEffect(() => {
    setValueFilter('all')
  }, [typeFilter])

  const filtered = useMemo(() => {
    return stationData.filter((r: StationData) => {
      if (!isMarineLocation(r.lat, r.lon, r.depth)) return false
      return (
        (yearFilter === 'all' || String(r.yearNum) === yearFilter) &&
        (valueFilter === 'all' || (typeFilter === 'previous' ? r.quarterNum === Number(valueFilter) : r.monthNum === Number(valueFilter))) &&
        (zone === 'all' || r.zone === zone) &&
        (depthClass === 'all' || depthToClass(r.depth) === depthClass) &&
        (species === 'all' || (r.speciesSet && r.speciesSet.includes(species)))
      )
    })
  }, [stationData, yearFilter, typeFilter, valueFilter, zone, depthClass, species])

  const gridCells = useMemo<HotspotCell[]>(() => {
    const binSize = 0.2
    const latMin = 6, latMax = 14, lonMin = 95, lonMax = 105
    const bucket = new Map<string, HotspotCell>()

    for (const s of filtered) {
      if (!isFinite(s.lat) || !isFinite(s.lon)) continue
      const val = heatmapType === 'cpue' ? s.cpue : (s.temp || 0)
      if (!isFinite(val) || val <= 0) continue
      if (s.lat < latMin || s.lat > latMax || s.lon < lonMin || s.lon > lonMax) continue
      const r = Math.max(0, Math.floor((s.lat - latMin) / binSize))
      const c = Math.max(0, Math.floor((s.lon - lonMin) / binSize))
      const id = `${r}-${c}`
      const cellLatMin = latMin + r * binSize
      const cellLonMin = lonMin + c * binSize

      if (!bucket.has(id)) {
        bucket.set(id, {
          id,
          cpue: 0,
          count: 0,
          totalCatch: 0,
          totalEffort: 0,
          centerLat: cellLatMin + binSize / 2,
          centerLon: cellLonMin + binSize / 2,
          latMin: cellLatMin,
          latMax: cellLatMin + binSize,
          lonMin: cellLonMin,
          lonMax: cellLonMin + binSize,
        })
      }

      const cell = bucket.get(id)!
      cell.count += 1
      cell.totalCatch += s.totalCatch
      cell.totalEffort += s.effortHours
    }

    return Array.from(bucket.values())
      .map((cell) => ({
        ...cell,
        cpue: cell.totalEffort > 0 ? cell.totalCatch / cell.totalEffort : 0,
      }))
      .filter((cell) => cell.cpue > 0)
      .sort((a, b) => b.cpue - a.cpue)
  }, [filtered, heatmapType])

  const hotspotThreshold = useMemo(() => {
    if (!gridCells.length) return 0
    const values = gridCells
      .map((cell: HotspotCell) => cell.cpue)
      .filter((v: number) => isFinite(v))
      .sort((a: number, b: number) => a - b)
    if (!values.length) return 0
    const idx = percentileMode === 'P95' ? Math.floor(values.length * 0.95) : Math.floor(values.length * 0.9)
    return values[idx] || 0
  }, [gridCells, percentileMode])

  const hotspotCells = useMemo(() => {
    return gridCells.filter((cell: HotspotCell) => cell.cpue >= hotspotThreshold)
  }, [gridCells, hotspotThreshold])

  const hotspotStations = useMemo(() => {
    const hotspotIds = new Set(hotspotCells.map((cell: HotspotCell) => cell.id))
    const binSize = 0.2
    const latMin = 6
    const lonMin = 95
    return filtered.filter((station: StationData) => {
      const r = Math.max(0, Math.floor((station.lat - latMin) / binSize))
      const c = Math.max(0, Math.floor((station.lon - lonMin) / binSize))
      return hotspotIds.has(`${r}-${c}`)
    })
  }, [filtered, hotspotCells])

  const summary = useMemo(() => {
    const totalCatch = filtered.reduce((sum: number, item: StationData) => sum + item.totalCatch, 0)
    const totalEffort = filtered.reduce((sum: number, item: StationData) => sum + item.effortHours, 0)
    const filteredCpue = totalEffort > 0 ? totalCatch / totalEffort : 0
    const topCell = hotspotCells[0] || gridCells[0] || null
    return {
      totalCatch,
      totalEffort,
      filteredCpue,
      topCell,
      activeCells: gridCells.length,
      haulCount: filtered.length,
    }
  }, [filtered, hotspotCells, gridCells])

  function exportPDF() {
    const win = window.open('', '_blank', 'width=1024,height=768')
    if (!win) return
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Hotspot Map</title>
      <style>body{font-family: Arial, sans-serif; padding: 20px;} table{border-collapse:collapse;width:100%;} th,td{border:1px solid #ddd;padding:8px;} th{background:#f5f5f5;}</style>
      </head><body>
      <h2>Hotspot Map - ${percentileMode}</h2>
      <p>Hotspot Cells: ${hotspotCells.length}</p>
      <table>
        <tr><th>Cell</th><th>CPUE</th><th>Hauls</th><th>Catch</th></tr>
        ${hotspotCells.slice(0, 50).map((cell: HotspotCell) => `<tr><td>${cell.id}</td><td>${cell.cpue.toFixed(2)}</td><td>${cell.count}</td><td>${cell.totalCatch.toFixed(2)}</td></tr>`).join('')}
      </table>
      <script>window.print();</script>
      </body></html>`)
    win.document.close()
  }

  // const depthClasses = ['<20', '20–40', '>40']
  const blacklistLinks: string[] = []

  return (
    <div>
      <Header title={t('hot.title')} desc={t('hot.desc')} icon={<MapIcon className="h-6 w-6" />} onExport={exportPDF} exportLabel={`${t('header.export')} PDF`} sticky={true} />
      {loading && <div className="text-sm text-muted-foreground">{t('loading.demo')}</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
      {!loading && !error && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="rounded-lg border bg-card px-4 py-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">{t('hot.kpi.filteredCpue')}</div>
              <div className="text-2xl font-semibold">{summary.filteredCpue.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">{summary.haulCount} {t('hot.kpi.haulFiltered')}</div>
            </div>
            <div className="rounded-lg border bg-card px-4 py-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">{t('hot.kpi.activeCells')}</div>
              <div className="text-2xl font-semibold">{summary.activeCells}</div>
              <div className="text-xs text-muted-foreground">{t('hot.kpi.weighted')}</div>
            </div>
            <div className="rounded-lg border bg-card px-4 py-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">{t('hot.kpi.hotspotCells')}</div>
              <div className="text-2xl font-semibold">{hotspotCells.length}</div>
              <div className="text-xs text-muted-foreground">{t('hot.threshold')} {percentileMode}</div>
            </div>
            <div className="rounded-lg border bg-card px-4 py-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">{t('hot.kpi.topHotspot')}</div>
              <div className="text-2xl font-semibold">{summary.topCell ? summary.topCell.cpue.toFixed(2) : '0.00'}</div>
              <div className="text-xs text-muted-foreground">{summary.topCell ? summary.topCell.id : t('hot.kpi.noCell')}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div>
              <Label>{t('filter.year')}</Label>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {filterOptions.years.map((m: string, idx: number) => <SelectItem key={idx} value={String(m)}>{String(m)}</SelectItem>)}
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
                  {valueOptions.map((m: string) => <SelectItem key={m} value={String(m)}>{String(m)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('hot.zone')}</Label>
              <Select value={zone} onValueChange={setZone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {filterOptions.zones.map((z: string, idx: number) => <SelectItem key={idx} value={String(z)}>{String(z)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('hot.percentile')}</Label>
              <Select value={percentileMode} onValueChange={(v: any) => setPercentileMode(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="P90">P90</SelectItem>
                  <SelectItem value="P95">P95</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <ThailandMap
            hotspotData={hotspotCells as any}
            stationData={filtered}
            month={valueFilter === 'all' ? 'all' : (typeFilter === 'month' ? `M${valueFilter}` : `Q${valueFilter}`)}
            blacklistLinks={blacklistLinks}
            percentileThreshold={hotspotThreshold}
            hotspotStations={hotspotStations}
            gridCells={gridCells as any}
          />
        </div>
      )}
    </div>
  )
}
