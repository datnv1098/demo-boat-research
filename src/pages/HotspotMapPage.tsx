import { useEffect, useMemo, useState } from 'react'
import { Map as MapIcon } from 'lucide-react'
import { Header, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/common'
import { useI18n } from '../lib/i18n'
import { ThailandMap } from '../components/ThailandMap'

interface HotspotCell {
  r: number
  c: number
  cpue: number
  coordinates: { lat: number; lon: number }
  count: number
}

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

export default function HotspotMapPage() {
  const [data, setData] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { t, lang } = useI18n()

  const [month, setMonth] = useState<string>('all')
  const [zone, setZone] = useState<string>('all')
  const [depthClass, setDepthClass] = useState<string>('all')
  const [species, setSpecies] = useState<string>('all')
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
    // Must have valid depth > 0 (in sea)
    if (depth == null || !isFinite(depth) || depth <= 0) return false

    // Check bounds for Thailand marine area (general bounds)
    const marineLatMin = 5.0
    const marineLatMax = 14.5
    const marineLonMin = 96.0
    const marineLonMax = 105.0

    if (!isFinite(lat) || !isFinite(lon)) return false
    if (lat < marineLatMin || lat > marineLatMax) return false
    if (lon < marineLonMin || lon > marineLonMax) return false

    // Strict check to exclude Vietnam's sea areas (East of Thailand)
    if (lon > 103.0) return false

    // Rough check to exclude Thailand's main land mass
    // Central/North land: lat > 12.5 and 99.5 < lon < 102.5
    if (lat > 12.8 && lon > 99.8 && lon < 102.0) return false

    // Peninsula land: 7.0 < lat < 12.5 and 98.2 < lon < 100.0
    if (lat > 7.0 && lat < 12.8 && lon > 98.5 && lon < 99.8) return false

    return true
  }

  // Calculate CPUE for each station
  const stationData = useMemo(() => {
    if (!headerRows.length) return []
    const linkToHeader: Record<string, any> = {}
    for (const h of headerRows) {
      linkToHeader[String(h?.Link)] = h
    }
    const linkToCatchWeight: Record<string, number> = {}
    const linkSpeciesSet = new globalThis.Map<string, Set<string>>()
    for (const c of catchRows) {
      const link = String(c?.Link)
      const w = Number(c?.total_weight) || 0
      linkToCatchWeight[link] = (linkToCatchWeight[link] || 0) + w
      const spp = String(c?.btscodename || 'ALL')
      if (!linkSpeciesSet.has(link)) linkSpeciesSet.set(link, new Set<string>())
      linkSpeciesSet.get(link)!.add(spp)
    }
    // Match Water_QL by Station and Date
    const waterQlMap: Record<string, any> = {}
    for (const w of waterQlRows) {
      const key = `${String(w?.station)}_${String(w?.year)}_${String(w?.month)}`
      waterQlMap[key] = w
    }

    const list: StationData[] = []
    for (const link in linkToHeader) {
      const h = linkToHeader[link]
      const towMin = Number(h?.Tow)
      const hours = isFinite(towMin) ? towMin / 60 : NaN
      const totalCatch = linkToCatchWeight[link] || 0
      const cpue = isFinite(hours) && hours > 0 ? totalCatch / hours : NaN
      if (!isFinite(cpue)) continue

      const date = h?.Date ? new Date(String(h?.Date)) : null
      const month = date ? date.getMonth() + 1 : null
      const year = date ? date.getFullYear() : null
      const station = String(h?.Station || '')
      const waterKey = `${station}_${year}_${month}`
      const water = waterQlMap[waterKey]

      const latStart = Number(h?.LatStart)
      const lonStart = Number(h?.LongStart)
      const lat = isFinite(latStart) ? latStart : NaN
      const lon = isFinite(lonStart) ? lonStart : NaN

      if (!isFinite(lat) || !isFinite(lon)) continue

      list.push({
        link,
        lat,
        lon,
        cpue,
        zone: String(h?.Zone || 'N/A'),
        depth: Number(h?.Depth),
        course: String(h?.Course || '-'),
        temp: water ? Number(water?.Temp_surface) : undefined,
        do: water ? Number(water?.DO_surface) : undefined,
        salinity: water ? Number(water?.Salinity_surface) : undefined,
        monthLabel: toMonthLabel(String(h?.Date)),
        date,
        speciesSet: Array.from(linkSpeciesSet.get(link) || []),
      })
    }
    return list
  }, [headerRows, catchRows, waterQlRows, lang])

  const filterOptions = useMemo(() => {
    const zoneSet = new Set(stationData.map((r) => r.zone))
    const zones = Array.from(zoneSet).sort()

    // Get all unique species from station data
    const speciesSet = new Set<string>()
    stationData.forEach((r) => {
      if (r.speciesSet && r.speciesSet.length > 0) {
        r.speciesSet.forEach((sp) => speciesSet.add(sp))
      }
    })
    const speciesList = Array.from(speciesSet).sort()

    // Sort months by date descending
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
      return dateB.getTime() - dateA.getTime() // Descending
    })

    return { zones, months, species: speciesList }
  }, [stationData])

  const filtered = useMemo(() => {
    return stationData.filter((r) => {
      // First check: must be in marine area (not on land)
      if (!isMarineLocation(r.lat, r.lon, r.depth)) return false

      // Then apply other filters
      return (
        (month === 'all' || r.monthLabel === month) &&
        (zone === 'all' || r.zone === zone) &&
        (depthClass === 'all' || depthToClass(r.depth) === depthClass) &&
        (species === 'all' || (r.speciesSet && r.speciesSet.includes(species)))
      )
    })
  }, [stationData, month, zone, depthClass, species])

  // Calculate percentile threshold
  const percentileThreshold = useMemo(() => {
    if (!filtered.length) return 0
    const cpues = filtered.map((r) => r.cpue).filter((v) => isFinite(v)).sort((a, b) => a - b)
    if (!cpues.length) return 0
    if (percentileMode === 'P90') {
      const idx = Math.floor(cpues.length * 0.9)
      return cpues[idx] || 0
    } else if (percentileMode === 'P95') {
      const idx = Math.floor(cpues.length * 0.95)
      return cpues[idx] || 0
    } else {
      // Top 10%
      const idx = Math.floor(cpues.length * 0.9)
      return cpues[idx] || 0
    }
  }, [filtered, percentileMode])

  // Create grid for heatmap
  const grid = useMemo(() => {
    const binSize = 0.2 // degrees (finer grid for smoother heatmap)
    const latMin = 6
    const latMax = 14
    const lonMin = 95
    const lonMax = 105
    const latBins = Math.ceil((latMax - latMin) / binSize)
    const lonBins = Math.ceil((lonMax - lonMin) / binSize)
    const acc: { value: number; count: number }[][] = Array.from({ length: latBins }, () =>
      Array(lonBins).fill(null).map(() => ({ value: 0, count: 0 }))
    )

    for (const s of filtered) {
      if (!isFinite(s.lat) || !isFinite(s.lon)) continue

      let val = 0
      if (heatmapType === 'cpue') {
        val = s.cpue
      } else {
        val = s.temp || 0
      }

      if (!isFinite(val) || val <= 0) continue
      if (s.lat < latMin || s.lat > latMax || s.lon < lonMin || s.lon > lonMax) continue

      const r = Math.min(latBins - 1, Math.max(0, Math.floor((s.lat - latMin) / binSize)))
      const c = Math.min(lonBins - 1, Math.max(0, Math.floor((s.lon - lonMin) / binSize)))
      acc[r][c].value += val
      acc[r][c].count += 1
    }

    // Average value per cell
    const gridCells: HotspotCell[][] = acc.map((row, r) =>
      row.map((cell, c) => ({
        r,
        c,
        cpue: cell.count > 0 ? cell.value / cell.count : 0,
        count: cell.count,
        coordinates: {
          lat: latMin + r * binSize + binSize / 2,
          lon: lonMin + c * binSize + binSize / 2,
        },
      }))
    )
    return gridCells
  }, [filtered, heatmapType])

  // Hotspot stations (above threshold)
  const hotspotStations = useMemo(() => {
    return filtered.filter((s) => s.cpue >= percentileThreshold)
  }, [filtered, percentileThreshold])

  // Only PDF export is supported for Hotspot Map per requirement

  function exportPDF() {
    const win = window.open('', '_blank', 'width=1024,height=768')
    if (!win) return
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Hotspot Map</title>
      <style>body{font-family: 'Noto Sans Thai', Arial, sans-serif; padding: 20px;} table{border-collapse:collapse;width:100%;margin-top:20px;} th,td{border:1px solid #ddd;padding:8px;text-align:left;} th{background:#f5f5f5;}</style>
      </head><body>
      <h2>Hotspot Map - ${percentileMode}</h2>
      <p>Filters: Month=${month}, Zone=${zone}, Depth=${depthClass}</p>
      <p>Hotspot Stations: ${hotspotStations.length}</p>
      <table>
        <tr><th>Link</th><th>CPUE</th><th>Zone</th><th>Depth</th><th>Course</th><th>Temp</th><th>DO</th><th>Salinity</th></tr>
        ${hotspotStations.slice(0, 50).map((s) => `
          <tr>
            <td>${s.link}</td>
            <td>${s.cpue.toFixed(2)}</td>
            <td>${s.zone}</td>
            <td>${s.depth.toFixed(1)}</td>
            <td>${s.course}</td>
            <td>${s.temp?.toFixed(1) || '-'}</td>
            <td>${s.do?.toFixed(2) || '-'}</td>
            <td>${s.salinity?.toFixed(1) || '-'}</td>
          </tr>
        `).join('')}
      </table>
      <script>window.print();</script>
      </body></html>`)
    win.document.close()
  }

  const depthClasses = ['<20', '20–40', '>40']

  // Map-only blacklist links to hide markers
  const blacklistLinks: string[] = [
    'em202510245', 'em202502159', 'em202506201', 'em202511252', 'em202402015', 'em202510246',
    'em202401002', 'em202506199', 'em202511251', 'em202408084', 'em202505194', 'em202511256',
    'em202412126', 'em202410106', 'em202405056', 'em202507209', 'em202405050', 'em202412137',
    'em202509230', 'em202406068'
  ]

  return (
    <div>
      <Header title={t('hot.title')} desc={t('hot.desc')} icon={<MapIcon className="h-6 w-6" />} onExport={exportPDF} exportLabel={`${t('header.export')} PDF`} sticky={true} />
      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
      {!data && !error && <div className="text-sm text-muted-foreground">{t('loading.demo')}</div>}
      {data && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <Label>{t('hot.month')}</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all') || 'All'}</SelectItem>
                  {filterOptions.months.map((m, idx) => {
                    const monthStr = String(m)
                    return <SelectItem key={idx} value={monthStr}>{monthStr}</SelectItem>
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('hot.zone') || 'Zone'}</Label>
              <Select value={zone} onValueChange={setZone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all') || 'All'}</SelectItem>
                  {filterOptions.zones.map((z, idx) => {
                    const zoneStr = String(z)
                    return <SelectItem key={idx} value={zoneStr}>{zoneStr}</SelectItem>
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('hot.depth') || 'Depth Class'}</Label>
              <Select value={depthClass} onValueChange={setDepthClass}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all') || 'All'}</SelectItem>
                  {depthClasses.map((d) => (
                    <SelectItem key={d} value={d}>{d} m</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('hot.species') || 'Species'}</Label>
              <Select value={species} onValueChange={setSpecies}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all') || 'All'}</SelectItem>
                  {filterOptions.species.map((sp) => (
                    <SelectItem key={sp} value={sp}>{sp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('hot.percentile') || 'Hotspot Rank'}</Label>
              <Select value={percentileMode} onValueChange={(v: any) => setPercentileMode(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="P90">P90 (Top 10%)</SelectItem>
                  <SelectItem value="P95">P95 (Top 5%)</SelectItem>
                  <SelectItem value="top10">Top 10%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Export controlled by Header's Export button */}

          {/* Stats */}

          {/* Map */}
          <ThailandMap
            hotspotData={grid as any}
            stationData={hotspotStations}
            rawPoints={filtered}
            month={month}
            blacklistLinks={blacklistLinks}
          />
        </div>
      )}
    </div>
  )
}
