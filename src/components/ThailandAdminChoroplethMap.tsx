import { startTransition, useEffect, useMemo, useState } from 'react'
import { CircleMarker, ImageOverlay, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import { LatLngBounds } from 'leaflet'
import { Delaunay } from 'd3-delaunay'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { getMarineExtents, getMarineViewBbox, type PreparedMarineAdminRegion, type ZoneKey } from '../lib/marineAdmin'

type MetricKey = 'cpue' | 'totalCatch' | 'totalEffort' | 'haulCount'

const MARINE_VIEW_BBOX = getMarineViewBbox()
const MARINE_BOUNDS = new LatLngBounds(
  [MARINE_VIEW_BBOX.latMin, MARINE_VIEW_BBOX.lonMin],
  [MARINE_VIEW_BBOX.latMax, MARINE_VIEW_BBOX.lonMax]
)
const OVERLAY_MAX_DIM = 2048
const MARINE_EXTENTS = getMarineExtents()

export interface AdminCpueFeature {
  type: 'Feature'
  properties: {
    region_iso: string
    region_name: string
    region_name_local?: string
    zone_hint?: string
    cell_count?: number
    cpue?: number | null
    totalCatch?: number
    totalEffort?: number
    haulCount?: number
    assignedHauls?: number
  }
  geometry: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: number[][][][] | number[][][]
  }
}

export interface AdminHaulPoint {
  link: string
  lat: number
  lon: number
  cpue: number
  regionId?: string
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function quantile(values: number[], q: number): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = clamp(Math.floor(sorted.length * q), 0, sorted.length - 1)
  return sorted[idx]
}

function formatNumber(value?: number | null, digits = 2): string {
  return value != null && Number.isFinite(value) ? value.toFixed(digits) : 'N/A'
}

function metricUnit(metric: MetricKey): string {
  switch (metric) {
    case 'cpue':
      return 'kg/hr'
    case 'totalCatch':
      return 'kg'
    case 'totalEffort':
      return 'hr'
    case 'haulCount':
      return 'hauls'
    default:
      return ''
  }
}

function metricLabel(metric: MetricKey): string {
  switch (metric) {
    case 'cpue':
      return 'CPUE'
    case 'totalCatch':
      return 'Catch'
    case 'totalEffort':
      return 'Effort'
    case 'haulCount':
      return 'Haul count'
    default:
      return metric
  }
}

function fillColorForValue(value: number | null | undefined, breaks: number[]): string {
  if (value == null || !Number.isFinite(value)) return 'rgba(0,0,0,0)'
  if (value >= breaks[3]) return '#de705b'
  if (value >= breaks[2]) return '#f1b075'
  if (value >= breaks[1]) return '#f4df87'
  if (value >= breaks[0]) return '#79cedf'
  return '#d8f8ff'
}

function clipToMarineExtent(
  ctx: CanvasRenderingContext2D,
  projectPoint: (lat: number, lon: number) => { x: number; y: number },
  zone: ZoneKey
) {
  ctx.beginPath()

  for (const extent of MARINE_EXTENTS) {
    if (extent.zone !== zone) continue

    for (const polygon of extent.polygons) {
      for (const ring of polygon) {
        ring.forEach(([lon, lat], index) => {
          const point = projectPoint(lat, lon)
          if (index === 0) {
            ctx.moveTo(point.x, point.y)
            return
          }
          ctx.lineTo(point.x, point.y)
        })
        ctx.closePath()
      }
    }
  }

  ctx.clip('evenodd')
}

function renderChoroplethOverlay(
  map: L.Map,
  preparedRegions: PreparedMarineAdminRegion[],
  regionMetricValues: Map<string, number | null>,
  breaks: number[]
) {
  if (!preparedRegions.length) return null

  const renderZoom = map.getMaxZoom()
  const sw = map.project(MARINE_BOUNDS.getSouthWest(), renderZoom)
  const ne = map.project(MARINE_BOUNDS.getNorthEast(), renderZoom)
  const projectedWidth = Math.max(1, ne.x - sw.x)
  const projectedHeight = Math.max(1, sw.y - ne.y)
  const rasterScale = OVERLAY_MAX_DIM / Math.max(projectedWidth, projectedHeight)
  const width = Math.max(1, Math.round(projectedWidth * rasterScale))
  const height = Math.max(1, Math.round(projectedHeight * rasterScale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.imageSmoothingEnabled = true

  const projectPoint = (lat: number, lon: number) => {
    const projected = map.project([lat, lon], renderZoom)
    return {
      x: (projected.x - sw.x) * rasterScale,
      y: (projected.y - ne.y) * rasterScale,
    }
  }

  for (const zone of ['ADM', 'GOT'] as const) {
    const seeds = preparedRegions
      .filter((region) => region.zone === zone)
      .flatMap((region) => region.coastalSeeds)

    if (!seeds.length) continue

    const delaunay = Delaunay.from(seeds, (seed: { lon: number }) => seed.lon, (seed: { lat: number }) => seed.lat)
    const voronoi = delaunay.voronoi([
      MARINE_VIEW_BBOX.lonMin,
      MARINE_VIEW_BBOX.latMin,
      MARINE_VIEW_BBOX.lonMax,
      MARINE_VIEW_BBOX.latMax,
    ])

    ctx.save()
    clipToMarineExtent(ctx, projectPoint, zone)

    for (let i = 0; i < seeds.length; i += 1) {
      const cell = voronoi.cellPolygon(i) as [number, number][] | null
      if (!cell) continue

      const value = regionMetricValues.get(seeds[i].regionId)
      const fillColor = fillColorForValue(value, breaks)
      if (fillColor === 'rgba(0,0,0,0)') continue

      ctx.beginPath()
      cell.forEach(([lon, lat]: [number, number], index: number) => {
        const point = projectPoint(lat, lon)
        if (index === 0) {
          ctx.moveTo(point.x, point.y)
          return
        }
        ctx.lineTo(point.x, point.y)
      })
      ctx.closePath()
      ctx.fillStyle = fillColor
      ctx.fill()
    }

    ctx.restore()
  }

  return canvas.toDataURL('image/png')
}

function ChoroplethOverlay({
  preparedRegions,
  regionMetricValues,
  breaks,
}: {
  preparedRegions: PreparedMarineAdminRegion[]
  regionMetricValues: Map<string, number | null>
  breaks: number[]
}) {
  const map = useMap()
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!map || !preparedRegions.length) {
      setOverlayUrl(null)
      return
    }

    const nextOverlayUrl = renderChoroplethOverlay(map, preparedRegions, regionMetricValues, breaks)
    startTransition(() => {
      setOverlayUrl(nextOverlayUrl)
    })
  }, [map, preparedRegions, regionMetricValues, breaks])

  if (!overlayUrl) return null
  return <ImageOverlay url={overlayUrl} bounds={MARINE_BOUNDS} opacity={0.8} interactive={false} />
}

export function ThailandAdminChoroplethMap({
  features,
  preparedRegions,
  metric,
  haulPoints = [],
  showHauls = false,
}: {
  features: AdminCpueFeature[]
  preparedRegions: PreparedMarineAdminRegion[]
  metric: MetricKey
  haulPoints?: AdminHaulPoint[]
  showHauls?: boolean
}) {
  const values = useMemo(
    () => features
      .map((feature) => Number(feature.properties[metric]))
      .filter((value) => Number.isFinite(value) && value > 0),
    [features, metric]
  )

  const breaks = useMemo(
    () => [
      quantile(values, 0.2),
      quantile(values, 0.4),
      quantile(values, 0.6),
      quantile(values, 0.8),
    ],
    [values]
  )

  const regionMetricValues = useMemo(
    () => new Map(
      features.map((feature) => {
        const value = Number(feature.properties[metric])
        return [feature.properties.region_iso, Number.isFinite(value) ? value : null] as const
      })
    ),
    [features, metric]
  )

  return (
    <div className="space-y-3" data-testid="marine-adm-map">
      <div className="relative rounded-2xl border overflow-hidden bg-background">
        <MapContainer
          className="marine-adm-leaflet"
          bounds={MARINE_BOUNDS}
          scrollWheelZoom={true}
          minZoom={5}
          maxZoom={10}
          style={{ height: 640, width: '100%' }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          />

          <ChoroplethOverlay
            preparedRegions={preparedRegions}
            regionMetricValues={regionMetricValues}
            breaks={breaks}
          />

          {showHauls && haulPoints.map((point) => (
            <CircleMarker
              key={point.link}
              center={[point.lat, point.lon]}
              radius={3}
              pathOptions={{
                color: '#154c79',
                weight: 1,
                fillColor: '#79cedf',
                fillOpacity: 0.7,
              }}
            >
              <Popup>
                <div className="space-y-1 text-sm">
                  <div className="font-semibold">{point.link}</div>
                  <div>CPUE: {point.cpue.toFixed(2)} kg/hr</div>
                  <div>Region: {point.regionId || 'Unassigned'}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        <div className="absolute right-3 bottom-3 z-[500] rounded-xl border bg-background/95 px-3 py-2 text-xs shadow-md">
          <div className="font-semibold mb-2">{metricLabel(metric)} legend</div>
          <div className="space-y-1.5">
            {[
              { color: '#de705b', label: `>= ${formatNumber(breaks[3])}` },
              { color: '#f1b075', label: `>= ${formatNumber(breaks[2])}` },
              { color: '#f4df87', label: `>= ${formatNumber(breaks[1])}` },
              { color: '#79cedf', label: `>= ${formatNumber(breaks[0])}` },
              { color: '#d8f8ff', label: `< ${formatNumber(breaks[0])}` },
              { color: 'transparent', label: 'No data / transparent' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="inline-block h-3 w-4 rounded-sm border" style={{ backgroundColor: item.color }} />
                <span>{item.label} {metricUnit(metric)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
