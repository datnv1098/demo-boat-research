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

function finiteOrUndefined(value: unknown): number | undefined {
  const n = toNumber(value)
  return isFinite(n) ? n : undefined
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function formatDateKey(date: Date | null): string {
  if (!date || isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function directionFromComponents(u?: number, v?: number, fromDirection = false): number | undefined {
  if (u == null || v == null || !isFinite(u) || !isFinite(v)) return undefined
  if (Math.abs(u) < 1e-9 && Math.abs(v) < 1e-9) return undefined

  const toDirection = (Math.atan2(u, v) * 180) / Math.PI
  const normalizedToDirection = (toDirection + 360) % 360
  return fromDirection ? (normalizedToDirection + 180) % 360 : normalizedToDirection
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
  currentU?: number
  currentV?: number
  currentSpeed?: number
  currentDirection?: number
  windU?: number
  windV?: number
  windSpeed?: number
  windDirection?: number
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
  temp?: number
  salinity?: number
  currentSpeed?: number
  currentDirection?: number
  windSpeed?: number
  windDirection?: number
}

export default function HotspotMapPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [effortRows, setEffortRows] = useState<any[]>([])
  const [catchRows, setCatchRows] = useState<any[]>([])
  const [envRows, setEnvRows] = useState<any[]>([])
  const { t, lang } = useI18n()

  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
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
        const [effortData, catchData, envData] = await Promise.all([
          fetchApiRows('/api/tables/effort2'),
          fetchApiRows('/api/tables/catch2'),
          fetchApiRows('/api/environment/daily'),
        ])

        if (!cancelled) {
          setEffortRows(effortData)
          setCatchRows(catchData)
          setEnvRows(envData)
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
    const envByDateAndZone = new Map<string, any>()

    for (const c of catchRows) {
      const link = String(c?.sample_id || '')
      if (!link) continue
      const w = Number(c?.total_weight) || 0
      linkToCatchWeight.set(link, (linkToCatchWeight.get(link) || 0) + w)
      const spp = String(c?.species_id || 'ALL')
      if (!linkSpeciesSet.has(link)) linkSpeciesSet.set(link, new Set<string>())
      linkSpeciesSet.get(link)!.add(spp)
    }

    for (const env of envRows) {
      const envDate = parseSurveyDate(String(env?.date || ''))
      const dateKey = formatDateKey(envDate)
      const zoneKey = normalizeZone(String(env?.region_code || ''))
      if (!dateKey || !zoneKey) continue
      envByDateAndZone.set(`${dateKey}|${zoneKey}`, env)
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
      const zoneCode = normalizeZone(String(h?.main_area || ''))
      const env = envByDateAndZone.get(`${formatDateKey(surveyDate)}|${zoneCode}`)
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
        zone: zoneCode,
        depth: Number(h?.depth) || 0,
        course: String(h?.course || ''),
        temp: finiteOrUndefined(env?.temp_c),
        do: finiteOrUndefined(env?.do_mg_l_approx),
        salinity: finiteOrUndefined(env?.salinity_psu),
        currentU: finiteOrUndefined(env?.current_u_ms),
        currentV: finiteOrUndefined(env?.current_v_ms),
        currentSpeed: finiteOrUndefined(env?.current_speed_ms),
        currentDirection: finiteOrUndefined(env?.current_direction_deg),
        windU: finiteOrUndefined(env?.wind_u_ms),
        windV: finiteOrUndefined(env?.wind_v_ms),
        windSpeed: finiteOrUndefined(env?.wind_speed_ms),
        windDirection: finiteOrUndefined(env?.wind_direction_deg),
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
  }, [effortRows, catchRows, envRows, lang])

  const filterOptions = useMemo(() => {
    const zoneSet = new Set(stationData.map((r: StationData) => r.zone))
    const zones = Array.from(zoneSet).sort()
    const speciesSet = new Set<string>()
    stationData.forEach((r: StationData) => {
      if (r.speciesSet && r.speciesSet.length > 0) {
        r.speciesSet.forEach((sp: string) => speciesSet.add(sp))
      }
    })
    const speciesList = Array.from(speciesSet).sort()
    return { zones, species: speciesList }
  }, [stationData])

  const filtered = useMemo(() => {
    const fromTs = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null
    const toTs = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null

    return stationData.filter((r: StationData) => {
      if (!isMarineLocation(r.lat, r.lon, r.depth)) return false
      const surveyTs = r.date ? r.date.getTime() : null
      if (fromTs != null && (surveyTs == null || surveyTs < fromTs)) return false
      if (toTs != null && (surveyTs == null || surveyTs > toTs)) return false
      return (
        (zone === 'all' || r.zone === zone) &&
        (depthClass === 'all' || depthToClass(r.depth) === depthClass) &&
        (species === 'all' || (r.speciesSet && r.speciesSet.includes(species)))
      )
    })
  }, [stationData, fromDate, toDate, zone, depthClass, species])

  const gridCells = useMemo<HotspotCell[]>(() => {
    const binSize = 0.2
    const latMin = 6, latMax = 14, lonMin = 95, lonMax = 105
    type HotspotAccumulator = HotspotCell & {
      tempSum: number
      tempCount: number
      salinitySum: number
      salinityCount: number
      currentUSum: number
      currentVSum: number
      currentSpeedSum: number
      currentCount: number
      windUSum: number
      windVSum: number
      windSpeedSum: number
      windCount: number
    }

    const bucket = new Map<string, HotspotAccumulator>()

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
          tempSum: 0,
          tempCount: 0,
          salinitySum: 0,
          salinityCount: 0,
          currentUSum: 0,
          currentVSum: 0,
          currentSpeedSum: 0,
          currentCount: 0,
          windUSum: 0,
          windVSum: 0,
          windSpeedSum: 0,
          windCount: 0,
        })
      }

      const cell = bucket.get(id)!
      cell.count += 1
      cell.totalCatch += s.totalCatch
      cell.totalEffort += s.effortHours

      if (s.temp != null && isFinite(s.temp)) {
        cell.tempSum += s.temp
        cell.tempCount += 1
      }
      if (s.salinity != null && isFinite(s.salinity)) {
        cell.salinitySum += s.salinity
        cell.salinityCount += 1
      }
      if (s.currentU != null && s.currentV != null && isFinite(s.currentU) && isFinite(s.currentV)) {
        cell.currentUSum += s.currentU
        cell.currentVSum += s.currentV
        cell.currentCount += 1
      }
      if (s.currentSpeed != null && isFinite(s.currentSpeed)) {
        cell.currentSpeedSum += s.currentSpeed
      }
      if (s.windU != null && s.windV != null && isFinite(s.windU) && isFinite(s.windV)) {
        cell.windUSum += s.windU
        cell.windVSum += s.windV
        cell.windCount += 1
      }
      if (s.windSpeed != null && isFinite(s.windSpeed)) {
        cell.windSpeedSum += s.windSpeed
      }
    }

    return Array.from(bucket.values())
      .map((cell) => ({
        ...cell,
        cpue: cell.totalEffort > 0 ? cell.totalCatch / cell.totalEffort : 0,
        temp: cell.tempCount > 0 ? cell.tempSum / cell.tempCount : undefined,
        salinity: cell.salinityCount > 0 ? cell.salinitySum / cell.salinityCount : undefined,
        currentSpeed: cell.currentCount > 0 ? cell.currentSpeedSum / cell.currentCount : undefined,
        currentDirection:
          cell.currentCount > 0
            ? directionFromComponents(cell.currentUSum / cell.currentCount, cell.currentVSum / cell.currentCount)
            : undefined,
        windSpeed: cell.windCount > 0 ? cell.windSpeedSum / cell.windCount : undefined,
        windDirection:
          cell.windCount > 0
            ? directionFromComponents(cell.windUSum / cell.windCount, cell.windVSum / cell.windCount, true)
            : undefined,
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label>{t('filter.dateFrom')}</Label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              />
              <div className="mt-1 text-xs text-muted-foreground">{fromDate || t('common.all')}</div>
            </div>
            <div>
              <Label>{t('filter.dateTo')}</Label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              />
              <div className="mt-1 text-xs text-muted-foreground">{toDate || t('common.all')}</div>
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
            month={'all'}
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
