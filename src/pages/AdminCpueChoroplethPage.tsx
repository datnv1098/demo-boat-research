import { useEffect, useMemo, useState } from 'react'
import { Map as MapIcon } from 'lucide-react'
import { Header, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Stat, Table } from '../components/common'
import { Switch } from '../components/ui/switch'
import { useI18n } from '../lib/i18n'
import { fetchApiRows } from '../lib/mockApi'
import { AdminCpueFeature, ThailandAdminChoroplethMap } from '../components/ThailandAdminChoroplethMap'
import { assignMarineAdminRegion, pointInMarineExtent, prepareMarineAdminRegions } from '../lib/marineAdmin'

type MetricKey = 'cpue' | 'totalCatch' | 'totalEffort' | 'haulCount'

type MarineAdminMetadata = {
  regions: Array<AdminCpueFeature['properties']>
}

type MarineFeatureCollection = {
  type: 'FeatureCollection'
  features: AdminCpueFeature[]
}

type StationRecord = {
  link: string
  lat: number
  lon: number
  zone: string
  depth: number
  date: Date | null
  totalCatch: number
  effortHours: number
  cpue: number
  regionId?: string
}

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
    return Number.isFinite(n) ? n : NaN
  }
  return NaN
}

function normalizeLongitude(value: number): number {
  if (!Number.isFinite(value)) return NaN
  if (value > 180) return value - 360
  if (value < -180) return value + 360
  return value
}

function parseCoordinate(value: unknown, type: 'lat' | 'lon'): number {
  const raw = toNumber(value)
  if (!Number.isFinite(raw)) return NaN

  let n = raw
  if (Math.abs(n) > 180 && Math.abs(n) < 10000) {
    const sign = n < 0 ? -1 : 1
    const abs = Math.abs(n)
    const deg = Math.floor(abs / 100)
    const min = abs - deg * 100
    n = sign * (deg + min / 60)
  }

  return type === 'lon' ? normalizeLongitude(n) : n
}

function getStationCenter(effort: any): { lat: number; lon: number } {
  const startLat = parseCoordinate(effort?.lat_start, 'lat')
  const startLon = parseCoordinate(effort?.long_start, 'lon')
  const endLat = parseCoordinate(effort?.lat_end, 'lat')
  const endLon = parseCoordinate(effort?.long_end, 'lon')

  if (Number.isFinite(startLat) && Number.isFinite(startLon) && Number.isFinite(endLat) && Number.isFinite(endLon)) {
    return {
      lat: (startLat + endLat) / 2,
      lon: (startLon + endLon) / 2,
    }
  }

  if (Number.isFinite(startLat) && Number.isFinite(startLon)) return { lat: startLat, lon: startLon }
  if (Number.isFinite(endLat) && Number.isFinite(endLon)) return { lat: endLat, lon: endLon }
  return { lat: NaN, lon: NaN }
}

function isMarineLocation(lat: number, lon: number, depth?: number): boolean {
  if (depth == null || !Number.isFinite(depth) || depth <= 0) return false
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false
  return lat >= 4.0 && lat <= 15.0 && lon >= 95.0 && lon <= 106.0
}

function formatMetricValue(metric: MetricKey, value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return 'N/A'
  switch (metric) {
    case 'cpue':
      return `${value.toFixed(2)} kg/hr`
    case 'totalCatch':
      return `${value.toFixed(2)} kg`
    case 'totalEffort':
      return `${value.toFixed(2)} hr`
    case 'haulCount':
      return `${value.toFixed(0)}`
    default:
      return value.toFixed(2)
  }
}

function metricLabel(metric: MetricKey, t: (key: any) => string): string {
  switch (metric) {
    case 'cpue':
      return 'CPUE'
    case 'totalCatch':
      return t('adm.metric.catch')
    case 'totalEffort':
      return t('adm.metric.effort')
    case 'haulCount':
      return t('adm.metric.hauls')
    default:
      return metric
  }
}

export default function AdminCpueChoroplethPage() {
  const { t } = useI18n()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [effortRows, setEffortRows] = useState<any[]>([])
  const [catchRows, setCatchRows] = useState<any[]>([])
  const [marineFeatures, setMarineFeatures] = useState<MarineFeatureCollection | null>(null)

  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [zone, setZone] = useState<string>('all')
  const [metric, setMetric] = useState<MetricKey>('cpue')
  const [showHauls, setShowHauls] = useState<boolean>(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [effort, catchData, metadataRes] = await Promise.all([
          fetchApiRows('/api/tables/effort2'),
          fetchApiRows('/api/tables/catch2'),
          fetch('/geo/thailand-marine-admin-adm1.metadata.json'),
        ])

        if (!metadataRes.ok) throw new Error(`Cannot load metadata: ${metadataRes.status}`)
        const metadata = await metadataRes.json() as MarineAdminMetadata

        if (!cancelled) {
          setEffortRows(effort)
          setCatchRows(catchData)
          setMarineFeatures({
            type: 'FeatureCollection',
            features: metadata.regions.map((region) => ({
              type: 'Feature',
              properties: region,
              geometry: {
                type: 'MultiPolygon',
                coordinates: [],
              },
            })),
          })
        }
      } catch (e) {
        if (!cancelled) setError(String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const preparedRegions = useMemo(
    () => prepareMarineAdminRegions(marineFeatures?.features || []),
    [marineFeatures]
  )

  const stationRecords = useMemo<StationRecord[]>(() => {
    if (!effortRows.length || !preparedRegions.length) return []

    const catchBySample = new Map<string, number>()
    for (const row of catchRows) {
      const sampleId = String(row?.sample_id || '')
      if (!sampleId) continue
      const weight = Number(row?.total_weight) || 0
      catchBySample.set(sampleId, (catchBySample.get(sampleId) || 0) + weight)
    }

    const rows: StationRecord[] = []
    for (const effort of effortRows) {
      const sampleId = String(effort?.sample_id || '')
      if (!sampleId) continue
      const towMin = Number(effort?.tow_time)
      const effortHours = Number.isFinite(towMin) ? towMin / 60 : NaN
      const totalCatch = catchBySample.get(sampleId) || 0
      const cpue = Number.isFinite(effortHours) && effortHours > 0 ? totalCatch / effortHours : NaN
      const center = getStationCenter(effort)
      const depth = Number(effort?.depth) || 0

      if (!Number.isFinite(center.lat) || !Number.isFinite(center.lon)) continue
      if (!Number.isFinite(cpue) || cpue <= 0) continue
      if (!isMarineLocation(center.lat, center.lon, depth)) continue
      if (!pointInMarineExtent(center.lat, center.lon)) continue

      const surveyDate = parseSurveyDate(String(effort?.sample_date_eng || ''))
      const regionId = assignMarineAdminRegion(center.lat, center.lon, preparedRegions)

      rows.push({
        link: sampleId,
        lat: center.lat,
        lon: center.lon,
        zone: normalizeZone(String(effort?.main_area || '')),
        depth,
        date: surveyDate,
        totalCatch,
        effortHours,
        cpue,
        regionId,
      })
    }

    return rows
  }, [effortRows, catchRows, preparedRegions])

  const zoneOptions = useMemo(
    () => Array.from(new Set(stationRecords.map((record) => record.zone))).sort(),
    [stationRecords]
  )

  const filteredStations = useMemo(() => {
    const fromTs = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null
    const toTs = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null

    return stationRecords.filter((record) => {
      const surveyTs = record.date ? record.date.getTime() : null
      if (fromTs != null && (surveyTs == null || surveyTs < fromTs)) return false
      if (toTs != null && (surveyTs == null || surveyTs > toTs)) return false
      if (zone !== 'all' && record.zone !== zone) return false
      return true
    })
  }, [stationRecords, fromDate, toDate, zone])

  const regionSummary = useMemo(() => {
    const map = new Map<string, { totalCatch: number; totalEffort: number; haulCount: number }>()
    let assignedHauls = 0
    let assignedCatch = 0
    let assignedEffort = 0

    for (const record of filteredStations) {
      if (!record.regionId) continue
      assignedHauls += 1
      assignedCatch += record.totalCatch
      assignedEffort += record.effortHours

      const current = map.get(record.regionId) || { totalCatch: 0, totalEffort: 0, haulCount: 0 }
      current.totalCatch += record.totalCatch
      current.totalEffort += record.effortHours
      current.haulCount += 1
      map.set(record.regionId, current)
    }

    const summaryMap = new Map<string, { totalCatch: number; totalEffort: number; haulCount: number; cpue: number }>()
    for (const [regionId, value] of map.entries()) {
      summaryMap.set(regionId, {
        ...value,
        cpue: value.totalEffort > 0 ? value.totalCatch / value.totalEffort : 0,
      })
    }

    return {
      byRegion: summaryMap,
      assignedHauls,
      assignedCatch,
      assignedEffort,
      weightedCpue: assignedEffort > 0 ? assignedCatch / assignedEffort : 0,
    }
  }, [filteredStations])

  const enrichedFeatures = useMemo<AdminCpueFeature[]>(() => {
    if (!marineFeatures) return []
    return marineFeatures.features.map((feature) => {
      const regionId = feature.properties.region_iso
      const stats = regionSummary.byRegion.get(regionId)
      return {
        ...feature,
        properties: {
          ...feature.properties,
          cpue: stats?.cpue ?? null,
          totalCatch: stats?.totalCatch ?? 0,
          totalEffort: stats?.totalEffort ?? 0,
          haulCount: stats?.haulCount ?? 0,
          assignedHauls: stats?.haulCount ?? 0,
        },
      }
    })
  }, [marineFeatures, regionSummary])

  const rankedRegions = useMemo(() => {
    return [...enrichedFeatures]
      .filter((feature) => {
        const value = Number(feature.properties[metric])
        return Number.isFinite(value) && value > 0
      })
      .sort((a, b) => Number(b.properties[metric]) - Number(a.properties[metric]))
  }, [enrichedFeatures, metric])

  const topRegion = rankedRegions[0]

  function exportCsv() {
    const rows = [
      ['region_iso', 'region_name', 'cpue', 'totalCatch', 'totalEffort', 'haulCount'],
      ...enrichedFeatures.map((feature) => [
        feature.properties.region_iso,
        feature.properties.region_name,
        feature.properties.cpue ?? '',
        feature.properties.totalCatch ?? '',
        feature.properties.totalEffort ?? '',
        feature.properties.haulCount ?? '',
      ]),
    ]

    const blob = new Blob([rows.map((row) => row.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'marine-admin-adm1-cpue.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4" data-testid="marine-adm-page">
      <Header
        title={t('adm.title')}
        desc={t('adm.desc')}
        icon={<MapIcon className="h-6 w-6" />}
        sticky={true}
        onExport={exportCsv}
        exportLabel={`${t('header.export')} CSV`}
      />

      {loading && <div className="text-sm text-muted-foreground">{t('loading.api')}</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {!loading && !error && (
        <>
          <div className="rounded-2xl border bg-amber-50/80 text-amber-900 px-4 py-3 text-sm">
            {t('adm.notice')}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <Label>{t('filter.dateFrom')}</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <Label>{t('filter.dateTo')}</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <div>
              <Label>{t('hot.zone')}</Label>
              <Select value={zone} onValueChange={setZone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {zoneOptions.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('adm.metric')}</Label>
              <Select value={metric} onValueChange={(value) => setMetric(value as MetricKey)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpue">CPUE</SelectItem>
                  <SelectItem value="totalCatch">{t('adm.metric.catch')}</SelectItem>
                  <SelectItem value="totalEffort">{t('adm.metric.effort')}</SelectItem>
                  <SelectItem value="haulCount">{t('adm.metric.hauls')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end justify-between rounded-xl border px-4 py-3 bg-background">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{t('adm.showHauls')}</div>
                <div className="text-sm">{t('adm.level.adm1')}</div>
              </div>
              <Switch checked={showHauls} onCheckedChange={setShowHauls} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Stat
              label={t('adm.kpi.weightedCpue')}
              value={regionSummary.weightedCpue.toFixed(2)}
              hint="kg/hr"
            />
            <Stat
              label={t('adm.kpi.regionsWithData')}
              value={rankedRegions.length}
              hint={t('adm.level.adm1')}
            />
            <Stat
              label={t('adm.kpi.assignedHauls')}
              value={`${regionSummary.assignedHauls}/${filteredStations.length}`}
              hint={t('adm.kpi.assignmentCoverage')}
            />
            <Stat
              label={t('adm.kpi.topRegion')}
              value={topRegion ? topRegion.properties.region_name : 'N/A'}
              hint={topRegion ? formatMetricValue(metric, Number(topRegion.properties[metric])) : undefined}
            />
          </div>

          <ThailandAdminChoroplethMap
            features={enrichedFeatures}
            preparedRegions={preparedRegions}
            metric={metric}
            haulPoints={filteredStations.map((record) => ({
              link: record.link,
              lat: record.lat,
              lon: record.lon,
              cpue: record.cpue,
              regionId: record.regionId,
            }))}
            showHauls={showHauls}
          />

          <div className="space-y-2">
            <div className="text-sm font-medium">{t('adm.table.title')}</div>
            <Table
              columns={[
                '#',
                t('adm.table.region'),
                metricLabel(metric, t),
                t('adm.metric.catch'),
                t('adm.metric.effort'),
                t('adm.metric.hauls'),
              ]}
              rows={rankedRegions.slice(0, 15).map((feature, index) => ([
                index + 1,
                feature.properties.region_name,
                formatMetricValue(metric, Number(feature.properties[metric])),
                formatMetricValue('totalCatch', feature.properties.totalCatch),
                formatMetricValue('totalEffort', feature.properties.totalEffort),
                formatMetricValue('haulCount', feature.properties.haulCount),
              ]))}
              maxHeight={480}
            />
          </div>
        </>
      )}
    </div>
  )
}
