import { useEffect, useMemo, useState } from 'react'
import { Map as MapIcon } from 'lucide-react'
import { Header, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/common'
import { useI18n } from '../lib/i18n'
import { ThailandMap } from '../components/ThailandMap'



interface StationData {
  link: string
  lat: number
  lon: number
  cpue: number
  zone: string
  depth: number
  course: string
  temp?: number
  do?: number
  salinity?: number
  monthLabel: string
  date: Date | null
  speciesSet: string[]
}

const EXTRA_MONITORING_POINTS = [
  { "Link": "em202512101", "Date": "2025-12-29", "LatStart": 13.154082, "LongStart": 100.157953, "LatEnd": 13.16, "LongEnd": 100.16, "Depth": 15.0, "Tow": 60, "Distance_nm": 1.5, "Speed_est_kn": 1.5, "Station": "M01", "Area": "A1", "Zone": "Gulf", "Office": "Office-1", "Course": "N" },
  { "Link": "em202512102", "Date": "2025-12-29", "LatStart": 12.801869, "LongStart": 100.101477, "LatEnd": 12.81, "LongEnd": 100.11, "Depth": 15.0, "Tow": 60, "Distance_nm": 1.5, "Speed_est_kn": 1.5, "Station": "M02", "Area": "A1", "Zone": "Gulf", "Office": "Office-1", "Course": "N" },
  { "Link": "em202512103", "Date": "2025-12-29", "LatStart": 12.094954, "LongStart": 100.150468, "LatEnd": 12.10, "LongEnd": 100.16, "Depth": 15.0, "Tow": 60, "Distance_nm": 1.5, "Speed_est_kn": 1.5, "Station": "M03", "Area": "A1", "Zone": "Gulf", "Office": "Office-1", "Course": "N" },
  { "Link": "em202512104", "Date": "2025-12-29", "LatStart": 11.675271, "LongStart": 99.922104, "LatEnd": 11.68, "LongEnd": 99.93, "Depth": 15.0, "Tow": 60, "Distance_nm": 1.5, "Speed_est_kn": 1.5, "Station": "M04", "Area": "A1", "Zone": "Gulf", "Office": "Office-1", "Course": "N" },
  { "Link": "em202512105", "Date": "2025-12-29", "LatStart": 11.096489, "LongStart": 99.721590, "LatEnd": 11.10, "LongEnd": 99.73, "Depth": 15.0, "Tow": 60, "Distance_nm": 1.5, "Speed_est_kn": 1.5, "Station": "M05", "Area": "A1", "Zone": "Gulf", "Office": "Office-1", "Course": "N" },
  { "Link": "em202512106", "Date": "2025-12-29", "LatStart": 10.554890, "LongStart": 99.504366, "LatEnd": 10.56, "LongEnd": 99.51, "Depth": 15.0, "Tow": 60, "Distance_nm": 1.5, "Speed_est_kn": 1.5, "Station": "M06", "Area": "A1", "Zone": "Gulf", "Office": "Office-1", "Course": "N" },
  { "Link": "em202512107", "Date": "2025-12-29", "LatStart": 9.908103, "LongStart": 99.537785, "LatEnd": 9.91, "LongEnd": 99.54, "Depth": 15.0, "Tow": 60, "Distance_nm": 1.5, "Speed_est_kn": 1.5, "Station": "M07", "Area": "A1", "Zone": "Gulf", "Office": "Office-1", "Course": "N" },
  { "Link": "em202512108", "Date": "2025-12-29", "LatStart": 8.998063, "LongStart": 100.396658, "LatEnd": 9.00, "LongEnd": 100.40, "Depth": 15.0, "Tow": 60, "Distance_nm": 1.5, "Speed_est_kn": 1.5, "Station": "M08", "Area": "A1", "Zone": "Gulf", "Office": "Office-1", "Course": "N" },
  { "Link": "em202512109", "Date": "2025-12-29", "LatStart": 12.882982, "LongStart": 100.660191, "LatEnd": 12.89, "LongEnd": 100.67, "Depth": 15.0, "Tow": 60, "Distance_nm": 1.5, "Speed_est_kn": 1.5, "Station": "M09", "Area": "A1", "Zone": "Gulf", "Office": "Office-1", "Course": "N" },
  { "Link": "em202512110", "Date": "2025-12-29", "LatStart": 12.359595, "LongStart": 101.007240, "LatEnd": 12.36, "LongEnd": 101.01, "Depth": 15.0, "Tow": 60, "Distance_nm": 1.5, "Speed_est_kn": 1.5, "Station": "M10", "Area": "A1", "Zone": "Gulf", "Office": "Office-1", "Course": "N" },
  { "Link": "em202512111", "Date": "2025-12-29", "LatStart": 12.304116, "LongStart": 101.657169, "LatEnd": 12.31, "LongEnd": 101.66, "Depth": 15.0, "Tow": 60, "Distance_nm": 1.5, "Speed_est_kn": 1.5, "Station": "M11", "Area": "A1", "Zone": "Gulf", "Office": "Office-1", "Course": "N" },
  { "Link": "em202512112", "Date": "2025-12-29", "LatStart": 11.903085, "LongStart": 102.111488, "LatEnd": 11.91, "LongEnd": 102.12, "Depth": 15.0, "Tow": 60, "Distance_nm": 1.5, "Speed_est_kn": 1.5, "Station": "M12", "Area": "A1", "Zone": "Gulf", "Office": "Office-1", "Course": "N" },
  { "Link": "em202512113", "Date": "2025-12-29", "LatStart": 9.423632, "LongStart": 97.775702, "LatEnd": 9.43, "LongEnd": 97.78, "Depth": 15.0, "Tow": 60, "Distance_nm": 1.5, "Speed_est_kn": 1.5, "Station": "M13", "Area": "B1", "Zone": "Andaman", "Office": "Office-2", "Course": "W" },
  { "Link": "em202512114", "Date": "2025-12-29", "LatStart": 8.195391, "LongStart": 97.661767, "LatEnd": 8.20, "LongEnd": 97.67, "Depth": 15.0, "Tow": 60, "Distance_nm": 1.5, "Speed_est_kn": 1.5, "Station": "M14", "Area": "B1", "Zone": "Andaman", "Office": "Office-2", "Course": "W" },
  { "Link": "em202512115", "Date": "2025-12-29", "LatStart": 7.312779, "LongStart": 98.252158, "LatEnd": 7.32, "LongEnd": 98.26, "Depth": 15.0, "Tow": 60, "Distance_nm": 1.5, "Speed_est_kn": 1.5, "Station": "M15", "Area": "B1", "Zone": "Andaman", "Office": "Office-2", "Course": "W" },
  { "Link": "em202512116", "Date": "2025-12-29", "LatStart": 6.767960, "LongStart": 99.091135, "LatEnd": 6.77, "LongEnd": 99.10, "Depth": 15.0, "Tow": 60, "Distance_nm": 1.5, "Speed_est_kn": 1.5, "Station": "M16", "Area": "B1", "Zone": "Andaman", "Office": "Office-2", "Course": "W" }
]

export default function HotspotMapPage() {
  const [data, setData] = useState<any | null>(null)
  const [, setError] = useState<string | null>(null)
  const { t, lang } = useI18n()

  const [month, setMonth] = useState<string>('all')
  const [zone, setZone] = useState<string>('all')
  const [depthClass] = useState<string>('all')
  const [species] = useState<string>('all')
  const [percentileMode, setPercentileMode] = useState<'P90' | 'P95' | 'top10'>('P90')
  const [heatmapType] = useState<'cpue' | 'temp'>('cpue')

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
    const linkToCatchWeight: Record<string, number> = {}
    const linkSpeciesSet = new globalThis.Map<string, Set<string>>()

    // Process catchRows from file
    for (const c of catchRows) {
      const link = String(c?.Link)
      const w = Number(c?.total_weight) || 0
      linkToCatchWeight[link] = (linkToCatchWeight[link] || 0) + w
      const spp = String(c?.btscodename || 'ALL')
      if (!linkSpeciesSet.has(link)) linkSpeciesSet.set(link, new Set<string>())
      linkSpeciesSet.get(link)!.add(spp)
    }

    const waterQlMap: Record<string, any> = {}
    for (const w of waterQlRows) {
      const key = `${String(w?.station)}_${String(w?.year)}_${String(w?.month)}`
      waterQlMap[key] = w
    }

    const list: StationData[] = []

    // 1. Add stations from headerRows (mock data file)
    for (const h of headerRows) {
      const link = String(h?.Link)
      const towMin = Number(h?.Tow)
      const hours = isFinite(towMin) ? towMin / 60 : NaN
      const totalCatch = linkToCatchWeight[link] || 0
      const cpue = isFinite(hours) && hours > 0 ? totalCatch / hours : NaN
      if (!isFinite(cpue)) continue

      const latStart = Number(h?.LatStart)
      const lonStart = Number(h?.LongStart)
      const lat = isFinite(latStart) ? latStart : NaN
      const lon = isFinite(lonStart) ? lonStart : NaN

      if (!isFinite(lat) || !isFinite(lon)) continue
    }

    // 2. Add extra monitoring points from our new variable
    for (const p of EXTRA_MONITORING_POINTS) {
      list.push({
        link: p.Link,
        lat: p.LatStart,
        lon: p.LongStart,
        cpue: 250, // Set high CPUE to ensure it's a hotspot
        zone: p.Zone,
        depth: p.Depth,
        course: p.Course,
        monthLabel: toMonthLabel(p.Date),
        date: new Date(p.Date),
        speciesSet: ['ALL'],
      })
    }

    return list
  }, [headerRows, catchRows, waterQlRows, lang])

  const filterOptions = useMemo(() => {
    const zoneSet = new Set(stationData.map((r) => r.zone))
    const zones = Array.from(zoneSet).sort()
    const speciesSet = new Set<string>()
    stationData.forEach((r) => {
      if (r.speciesSet && r.speciesSet.length > 0) {
        r.speciesSet.forEach((sp) => speciesSet.add(sp))
      }
    })
    const speciesList = Array.from(speciesSet).sort()
    const monthSet: Record<string, Date> = {}
    for (const r of stationData) {
      if (r.monthLabel && r.date && !monthSet[r.monthLabel]) {
        monthSet[r.monthLabel] = r.date
      }
    }
    const months = Object.keys(monthSet).sort((a, b) => {
      const dateA = monthSet[a]
      const dateB = monthSet[b]
      if (!dateA || !dateB) return 0
      return dateB.getTime() - dateA.getTime()
    })
    return { zones, months, species: speciesList }
  }, [stationData])

  const filtered = useMemo(() => {
    return stationData.filter((r) => {
      if (!isMarineLocation(r.lat, r.lon, r.depth)) return false
      return (
        (month === 'all' || r.monthLabel === month) &&
        (zone === 'all' || r.zone === zone) &&
        (depthClass === 'all' || depthToClass(r.depth) === depthClass) &&
        (species === 'all' || (r.speciesSet && r.speciesSet.includes(species)))
      )
    })
  }, [stationData, month, zone, depthClass, species])

  const percentileThreshold = useMemo(() => {
    if (!filtered.length) return 0
    const cpues = filtered.map((r) => r.cpue).filter((v) => isFinite(v)).sort((a, b) => a - b)
    if (!cpues.length) return 0
    const idx = percentileMode === 'P95' ? Math.floor(cpues.length * 0.95) : Math.floor(cpues.length * 0.9)
    return cpues[idx] || 0
  }, [filtered, percentileMode])

  const grid = useMemo(() => {
    const binSize = 0.2
    const latMin = 6, latMax = 14, lonMin = 95, lonMax = 105
    const latBins = Math.ceil((latMax - latMin) / binSize)
    const lonBins = Math.ceil((lonMax - lonMin) / binSize)
    const acc: { value: number; count: number }[][] = Array.from({ length: latBins }, () =>
      Array(lonBins).fill(null).map(() => ({ value: 0, count: 0 }))
    )
    for (const s of filtered) {
      if (!isFinite(s.lat) || !isFinite(s.lon)) continue
      let val = heatmapType === 'cpue' ? s.cpue : (s.temp || 0)
      if (!isFinite(val) || val <= 0) continue
      if (s.lat < latMin || s.lat > latMax || s.lon < lonMin || s.lon > lonMax) continue
      const r = Math.min(latBins - 1, Math.max(0, Math.floor((s.lat - latMin) / binSize)))
      const c = Math.min(lonBins - 1, Math.max(0, Math.floor((s.lon - lonMin) / binSize)))
      acc[r][c].value += val
      acc[r][c].count += 1
    }
    return acc.map((row, r) =>
      row.map((cell, c) => ({
        r, c, cpue: cell.count > 0 ? cell.value / cell.count : 0, count: cell.count,
        coordinates: { lat: latMin + r * binSize + binSize / 2, lon: lonMin + c * binSize + binSize / 2 }
      }))
    )
  }, [filtered, heatmapType])

  const hotspotStations = useMemo(() => {
    return filtered.filter((s) => s.cpue >= percentileThreshold)
  }, [filtered, percentileThreshold])

  function exportPDF() {
    const win = window.open('', '_blank', 'width=1024,height=768')
    if (!win) return
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Hotspot Map</title>
      <style>body{font-family: Arial, sans-serif; padding: 20px;} table{border-collapse:collapse;width:100%;} th,td{border:1px solid #ddd;padding:8px;} th{background:#f5f5f5;}</style>
      </head><body>
      <h2>Hotspot Map - ${percentileMode}</h2>
      <p>Hotspot Stations: ${hotspotStations.length}</p>
      <table>
        <tr><th>Link</th><th>CPUE</th><th>Zone</th><th>Depth</th></tr>
        ${hotspotStations.slice(0, 50).map((s) => `<tr><td>${s.link}</td><td>${s.cpue.toFixed(2)}</td><td>${s.zone}</td><td>${s.depth}</td></tr>`).join('')}
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
      {!data && <div className="text-sm text-muted-foreground">{t('loading.demo')}</div>}
      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <Label>{t('hot.month')}</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all') || 'All'}</SelectItem>
                  {filterOptions.months.map((m, idx) => <SelectItem key={idx} value={String(m)}>{String(m)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('hot.zone')}</Label>
              <Select value={zone} onValueChange={setZone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {filterOptions.zones.map((z, idx) => <SelectItem key={idx} value={String(z)}>{String(z)}</SelectItem>)}
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
          <ThailandMap hotspotData={grid as any} stationData={hotspotStations} month={month} blacklistLinks={blacklistLinks} />
        </div>
      )}
    </div>
  )
}
