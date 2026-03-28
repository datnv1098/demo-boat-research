import { useState, useEffect, useMemo, startTransition } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, ImageOverlay, useMap } from 'react-leaflet'
import { LatLngBounds } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Switch } from './ui/switch'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { useI18n } from '../lib/i18n'
import thailandCoastalLandMask from '../data/thailandCoastalLandMask.json'

// Import Leaflet icons
import L from 'leaflet'

// Fix Leaflet default icons - using CDN approach to avoid require issues
const DefaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

// Type definitions
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
  currentSpeed?: number
  currentDirection?: number
  windSpeed?: number
  windDirection?: number
  monthLabel: string
}

interface ThailandMapProps {
  hotspotData: HotspotCell[]
  stationData?: StationData[]
  hotspotStations?: StationData[]
  gridCells?: HotspotCell[]
  percentileThreshold?: number
  month: string
  blacklistLinks?: string[]
}

type GeoRing = [number, number][]
type GeoPolygon = GeoRing[]
type CoastalLandFeature = {
  name: string
  polygons: GeoPolygon[]
}
type PreparedCoastalPolygon = {
  ring: GeoRing
  minLat: number
  maxLat: number
  minLon: number
  maxLon: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = clamp(Math.floor(sorted.length * p), 0, sorted.length - 1)
  return sorted[idx]
}

function normalizeCpue(cpue: number, p10: number, p90: number): number {
  const low = Math.max(0, p10)
  const high = Math.max(low + 1e-6, p90)
  const denom = Math.log1p(high) - Math.log1p(low)
  if (denom <= 0) return 0.2
  const n = (Math.log1p(Math.max(0, cpue)) - Math.log1p(low)) / denom
  return clamp(0.08 + clamp(n, 0, 1) * 0.68, 0.08, 0.7)
}

function formatMetric(value?: number, digits = 1): string | null {
  return value != null && isFinite(value) ? value.toFixed(digits) : null
}

function formatDirection(value?: number): string | null {
  return value != null && isFinite(value) ? `${value.toFixed(0)}°` : null
}

function formatCurrentSummary(speed?: number, direction?: number): string | null {
  const speedText = formatMetric(speed, 2)
  const directionText = formatDirection(direction)
  if (!speedText && !directionText) return null
  if (speedText && directionText) return `${directionText} / ${speedText} m/s`
  if (directionText) return directionText
  return `${speedText} m/s`
}

const HEAT_REFERENCE_RADIUS = 15
const HEAT_BLUR_RATIO = 1.85
const HEAT_MAX_INTENSITY = 1.55
const HEAT_MIN_RADIUS = 2
const HEAT_MAX_RADIUS = 96
const HEAT_MIN_BLUR = 4
const HEAT_MAX_BLUR = 180
const LAND_MASK_SHORELINE_PX = 4
const HEAT_MIN_OPACITY = 0.19
const HEAT_OVERLAY_MAX_DIM = 2560
const HEAT_GRADIENT_STOPS: Record<number, string> = {
  0.08: '#d8f8ff',
  0.26: '#afe8f4',
  0.44: '#79cedf',
  0.60: '#f4df87',
  0.78: '#f1b075',
  0.92: '#e88669',
  1.00: '#de705b',
}
const COASTAL_LAND_MASK: PreparedCoastalPolygon[] = (thailandCoastalLandMask as CoastalLandFeature[]).flatMap((feature) =>
  feature.polygons
    .map((polygon) => polygon[0])
    .filter((ring): ring is GeoRing => ring.length > 2)
    .map((ring) => {
      let minLat = Infinity
      let maxLat = -Infinity
      let minLon = Infinity
      let maxLon = -Infinity

      for (const [lon, lat] of ring) {
        if (lat < minLat) minLat = lat
        if (lat > maxLat) maxLat = lat
        if (lon < minLon) minLon = lon
        if (lon > maxLon) maxLon = lon
      }

      return {
        ring,
        minLat,
        maxLat,
        minLon,
        maxLon,
      }
    })
)

function getHeatKernel(map: L.Map, zoom: number, referenceZoom: number) {
  const zoomScale = map.getZoomScale(zoom, referenceZoom)
  const radius = clamp(HEAT_REFERENCE_RADIUS * zoomScale, HEAT_MIN_RADIUS, HEAT_MAX_RADIUS)
  const blur = clamp(
    HEAT_REFERENCE_RADIUS * HEAT_BLUR_RATIO * zoomScale,
    HEAT_MIN_BLUR,
    HEAT_MAX_BLUR
  )

  return {
    radius: Math.round(radius),
    blur: Math.round(blur),
  }
}

function buildHeatCircle(radius: number, blur: number) {
  const drawRadius = radius + blur
  const circle = document.createElement('canvas')
  const ctx = circle.getContext('2d')
  if (!ctx) return null

  circle.width = circle.height = drawRadius * 2
  ctx.shadowOffsetX = 200
  ctx.shadowOffsetY = 200
  ctx.shadowBlur = blur
  ctx.shadowColor = 'black'
  ctx.beginPath()
  ctx.arc(drawRadius - 200, drawRadius - 200, radius, 0, Math.PI * 2, true)
  ctx.closePath()
  ctx.fill()

  return { circle, drawRadius }
}

function buildHeatGradient() {
  const gradientCanvas = document.createElement('canvas')
  const ctx = gradientCanvas.getContext('2d')
  if (!ctx) return null

  gradientCanvas.width = 1
  gradientCanvas.height = 256

  const gradient = ctx.createLinearGradient(0, 0, 0, 256)
  for (const [offset, color] of Object.entries(HEAT_GRADIENT_STOPS)) {
    gradient.addColorStop(Number(offset), color)
  }

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1, 256)

  return ctx.getImageData(0, 0, 1, 256).data
}

function colorizeHeatmap(pixels: Uint8ClampedArray, gradient: Uint8ClampedArray) {
  for (let i = 3; i < pixels.length; i += 4) {
    const alphaIndex = pixels[i] * 4
    if (!alphaIndex) continue

    pixels[i - 3] = gradient[alphaIndex]
    pixels[i - 2] = gradient[alphaIndex + 1]
    pixels[i - 1] = gradient[alphaIndex + 2]
  }
}

function eraseHeatOnLandWithProjection(
  ctx: CanvasRenderingContext2D,
  projectPoint: (lat: number, lon: number) => { x: number; y: number }
) {
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = '#000'
  ctx.strokeStyle = '#000'
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.lineWidth = LAND_MASK_SHORELINE_PX

  for (const polygon of COASTAL_LAND_MASK) {
    ctx.beginPath()

    polygon.ring.forEach(([lon, lat], index) => {
      const point = projectPoint(lat, lon)
      if (index === 0) {
        ctx.moveTo(point.x, point.y)
        return
      }
      ctx.lineTo(point.x, point.y)
    })

    ctx.closePath()
    ctx.fill()
    if (LAND_MASK_SHORELINE_PX > 0) ctx.stroke()
  }

  ctx.restore()
}

function aggregateHeatPointsForOverlay(
  points: [number, number, number][],
  map: L.Map,
  renderZoom: number,
  left: number,
  top: number,
  width: number,
  height: number,
  rasterScale: number,
  bucketSize: number
) {
  const buckets = new Map<string, [number, number, number]>()

  for (const [lat, lon, weight] of points) {
    const projected = map.project([lat, lon], renderZoom)
    const x = (projected.x - left) * rasterScale
    const y = (projected.y - top) * rasterScale
    if (x < 0 || x > width || y < 0 || y > height) continue

    const bucketX = Math.floor(x / bucketSize)
    const bucketY = Math.floor(y / bucketSize)
    const key = `${bucketX}:${bucketY}`
    const existing = buckets.get(key)

    if (existing) {
      existing[0] = (existing[0] * existing[2] + x * weight) / (existing[2] + weight)
      existing[1] = (existing[1] * existing[2] + y * weight) / (existing[2] + weight)
      existing[2] += weight
      continue
    }

    buckets.set(key, [x, y, weight])
  }

  return Array.from(buckets.values()).map(([x, y, weight]) => [
    Math.round(x),
    Math.round(y),
    Math.min(weight, HEAT_MAX_INTENSITY),
  ] as [number, number, number])
}

function renderHeatOverlay(
  map: L.Map,
  points: [number, number, number][],
  bounds: L.LatLngBounds,
  referenceZoom: number
) {
  if (!points.length) return null

  const renderZoom = map.getMaxZoom()
  const sw = map.project(bounds.getSouthWest(), renderZoom)
  const ne = map.project(bounds.getNorthEast(), renderZoom)
  const projectedWidth = Math.max(1, ne.x - sw.x)
  const projectedHeight = Math.max(1, sw.y - ne.y)
  const rasterScale = HEAT_OVERLAY_MAX_DIM / Math.max(projectedWidth, projectedHeight)
  const width = Math.max(1, Math.round(projectedWidth * rasterScale))
  const height = Math.max(1, Math.round(projectedHeight * rasterScale))
  const kernel = getHeatKernel(map, renderZoom, referenceZoom)
  const radius = Math.max(1, Math.round(kernel.radius * rasterScale))
  const blur = Math.max(1, Math.round(kernel.blur * rasterScale))
  const baseBucketSize = (HEAT_REFERENCE_RADIUS + HEAT_REFERENCE_RADIUS * HEAT_BLUR_RATIO) / 2
  const bucketSize = Math.max(
    1,
    Math.round(baseBucketSize * map.getZoomScale(renderZoom, referenceZoom) * rasterScale)
  )
  const circle = buildHeatCircle(radius, blur)
  const gradient = buildHeatGradient()
  if (!circle || !gradient) return null

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const data = aggregateHeatPointsForOverlay(
    points,
    map,
    renderZoom,
    sw.x,
    ne.y,
    width,
    height,
    rasterScale,
    bucketSize
  )

  for (const [x, y, weight] of data) {
    ctx.globalAlpha = Math.max(weight / HEAT_MAX_INTENSITY, HEAT_MIN_OPACITY)
    ctx.drawImage(circle.circle, x - circle.drawRadius, y - circle.drawRadius)
  }

  const image = ctx.getImageData(0, 0, width, height)
  colorizeHeatmap(image.data, gradient)
  ctx.putImageData(image, 0, 0)

  eraseHeatOnLandWithProjection(ctx, (lat, lon) => {
    const projected = map.project([lat, lon], renderZoom)
    return {
      x: (projected.x - sw.x) * rasterScale,
      y: (projected.y - ne.y) * rasterScale,
    }
  })

  return canvas.toDataURL('image/png')
}

function isPointInRing(lat: number, lon: number, ring: GeoRing): boolean {
  let inside = false

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [lonI, latI] = ring[i]
    const [lonJ, latJ] = ring[j]
    const intersects =
      latI > lat !== latJ > lat &&
      lon < ((lonJ - lonI) * (lat - latI)) / ((latJ - latI) || Number.EPSILON) + lonI

    if (intersects) inside = !inside
  }

  return inside
}

function isPointOnLand(lat: number, lon: number): boolean {
  for (const polygon of COASTAL_LAND_MASK) {
    if (lat < polygon.minLat || lat > polygon.maxLat || lon < polygon.minLon || lon > polygon.maxLon) {
      continue
    }

    if (isPointInRing(lat, lon, polygon.ring)) return true
  }

  return false
}

function pushHeatPoint(
  points: [number, number, number][],
  lat: number,
  lon: number,
  intensity: number
) {
  if (isPointOnLand(lat, lon)) return
  points.push([lat, lon, intensity])
}

function makeSurfaceHeatPoints(stations: StationData[]): [number, number, number][] {
  if (!stations.length) return []

  const positiveCpue = stations.map((s) => s.cpue).filter((v) => isFinite(v) && v > 0)
  const p10 = percentile(positiveCpue, 0.1)
  const p90 = percentile(positiveCpue, 0.9)

  const points: [number, number, number][] = []

  for (const station of stations) {
    if (!isFinite(station.cpue) || station.cpue <= 0) continue
    const baseIntensity = normalizeCpue(station.cpue, p10, p90)

    const hasTrack =
      station.startLat != null &&
      station.startLon != null &&
      station.endLat != null &&
      station.endLon != null &&
      isFinite(station.startLat) &&
      isFinite(station.startLon) &&
      isFinite(station.endLat) &&
      isFinite(station.endLon)

    if (hasTrack) {
      const startLat = Number(station.startLat)
      const startLon = Number(station.startLon)
      const endLat = Number(station.endLat)
      const endLon = Number(station.endLon)
      const segmentCount = 8
      const dx = endLon - startLon
      const dy = endLat - startLat
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      const perpLat = -dx / len
      const perpLon = dy / len

      for (let i = 0; i <= segmentCount; i += 1) {
        const t = i / segmentCount
        const lat = startLat + (endLat - startLat) * t
        const lon = startLon + (endLon - startLon) * t
        const centerBoost = 1 - Math.abs(t - 0.5) * 0.55
        const intensity = clamp(baseIntensity * centerBoost, 0.08, 1)
        pushHeatPoint(points, lat, lon, intensity)

        const offset = 0.035
        pushHeatPoint(points, lat + perpLat * offset, lon + perpLon * offset, intensity * 0.42)
        pushHeatPoint(points, lat - perpLat * offset, lon - perpLon * offset, intensity * 0.42)
      }
      continue
    }

    pushHeatPoint(points, station.lat, station.lon, baseIntensity)

    const spreadRings = [0.05, 0.1, 0.18]
    const decay = [0.55, 0.28, 0.12]
    const dirs = 8
    spreadRings.forEach((radius, ringIdx) => {
      for (let i = 0; i < dirs; i += 1) {
        const angle = (2 * Math.PI * i) / dirs
        const latOffset = Math.sin(angle) * radius * 0.72
        const lonOffset = Math.cos(angle) * radius * 1.25
        pushHeatPoint(
          points,
          station.lat + latOffset,
          station.lon + lonOffset,
          clamp(baseIntensity * decay[ringIdx], 0.03, 0.6)
        )
      }
    })
  }

  return points
}

// Render the heatmap once into a raster aligned to marine bounds so zoom/pan
// keeps the original footprint and colors instead of re-bucketing per zoom.
function HeatmapLayer({
  points,
  bounds,
}: {
  points: [number, number, number][]
  bounds: L.LatLngBounds
}) {
  const map = useMap()
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!map || !points.length) {
      setOverlayUrl(null)
      return
    }

    const referenceZoom = map.getZoom()
    const nextOverlayUrl = renderHeatOverlay(map, points, bounds, referenceZoom)
    startTransition(() => {
      setOverlayUrl(nextOverlayUrl)
    })
  }, [map, points, bounds])

  if (!overlayUrl) return null

  return <ImageOverlay url={overlayUrl} bounds={bounds} opacity={1} interactive={false} />
}

export function ThailandMap({
  hotspotData,
  stationData = [],
  hotspotStations = [],
  gridCells = [],
  blacklistLinks = [],
}: ThailandMapProps) {
  const { t } = useI18n()
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [showStations, setShowStations] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [showTracks, setShowTracks] = useState(true)
  const [tileStyle, setTileStyle] = useState<'carto_voyager' | 'osm' | 'esri_ocean'>('carto_voyager')
  const blacklistedLinks = useMemo(() => new Set(blacklistLinks), [blacklistLinks])
  const visibleStations = useMemo(
    () => stationData.filter((s) => !blacklistedLinks.has(s.link)),
    [stationData, blacklistedLinks]
  )
  const visibleHotspots = useMemo(
    () => hotspotStations.filter((s) => !blacklistedLinks.has(s.link)),
    [hotspotStations, blacklistedLinks]
  )
  const visibleGridCells = useMemo(
    () => gridCells.filter((cell) => cell.cpue > 0),
    [gridCells]
  )
  const heatmapPoints = useMemo(
    () => makeSurfaceHeatPoints(visibleStations),
    [visibleStations]
  )

  // Provincial overlay removed per request

  // Calculate bounds for Thailand Marine Area
  const marineBounds = useMemo(
    () =>
      new LatLngBounds(
        [5.0, 96.5], // Southwest (Andaman)
        [14.0, 104.5] // Northeast (Upper Gulf)
      ),
    []
  )

  return (
    <div className="space-y-4">
      {/* Layer Controls */}
      <div className="relative z-50 flex flex-wrap gap-6 bg-muted/50 rounded-lg">
        <div className="flex items-center space-x-1">
          <Switch
            id="heatmap"
            className="scale-50 origin-left -mr-5"
            checked={showHeatmap}
            onCheckedChange={setShowHeatmap}
          />
          <Label htmlFor="heatmap" className="text-sm">
            {t('map.switch.heatmap')} CPUE
          </Label>
        </div>

        <div className="flex items-center space-x-1">
          <Switch
            id="stations"
            className="scale-50 origin-left -mr-5"
            checked={showStations}
            onCheckedChange={setShowStations}
          />
          <Label htmlFor="stations" className="text-sm">
            {t('map.switch.stations')}
          </Label>
        </div>

        {/* Base map tile selector */}
        <div className="flex items-center space-x-2">
          <Select value={tileStyle} onValueChange={(v: any) => setTileStyle(v)}>
            <SelectTrigger className="w-[280px]"><SelectValue /></SelectTrigger>
            <SelectContent side="top">
              <SelectItem value="carto_voyager">{t('map.tile.carto')}</SelectItem>
              <SelectItem value="osm">{t('map.tile.osm')}</SelectItem>
              <SelectItem value="esri_ocean">{t('map.tile.esri')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-1">
          <Switch
            id="grid"
            className="scale-50 origin-left -mr-5"
            checked={showGrid}
            onCheckedChange={setShowGrid}
          />
          <Label htmlFor="grid" className="text-sm">
            {t('map.switch.grid')}
          </Label>
        </div>

        <div className="flex items-center space-x-1">
          <Switch
            id="tracks"
            className="scale-50 origin-left -mr-5"
            checked={showTracks}
            onCheckedChange={setShowTracks}
          />
          <Label htmlFor="tracks" className="text-sm">
            Haul Tracks
          </Label>
        </div>
      </div>

      {/* Map Container */}
      <div
        className="w-full rounded-lg overflow-hidden border"
        style={{ height: '600px' }} // Increased height for better view
      >
        <MapContainer
          center={[9.2, 100.8]}
          zoom={7.2}
          minZoom={3}
          maxZoom={9}
          zoomAnimation={false}
          fadeAnimation={false}
          markerZoomAnimation={false}
          style={{ height: '100%', width: '100%' }}
          bounds={marineBounds}
          maxBounds={marineBounds}
          maxBoundsViscosity={1.0}
          dragging={true}
          scrollWheelZoom={true}
          touchZoom={true}
          doubleClickZoom={true}
          keyboard={true}
          boxZoom={true}
        >
          {/* Base Map Layer */}
          <TileLayer
            attribution={
              tileStyle === 'carto_voyager'
                ? '&copy; OpenStreetMap contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>'
                : tileStyle === 'esri_ocean'
                  ? 'Tiles &copy; Esri — Sources: GEBCO, NOAA, National Geographic, DeLorme, NAVTEQ, and others'
                  : '&copy; OpenStreetMap contributors'
            }
            url={
              tileStyle === 'carto_voyager'
                ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
                : tileStyle === 'esri_ocean'
                  ? 'https://services.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}'
                  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            }
          />

          {/* Heatmap Overlay */}
          {showHeatmap && (
            <HeatmapLayer points={heatmapPoints} bounds={marineBounds} />
          )}

          {/* Grid overlay */}
          {showGrid && <GridOverlay gridCells={visibleGridCells} />}

          {/* Haul tracks for visual verification of hotspot continuity */}
          {showTracks &&
            visibleStations
              .filter(
                (station) =>
                  station.startLat != null &&
                  station.startLon != null &&
                  station.endLat != null &&
                  station.endLon != null
              )
              .map((station, index) => (
                <Polyline
                  key={`track-${station.link}-${index}`}
                  positions={[[Number(station.startLat), Number(station.startLon)], [Number(station.endLat), Number(station.endLon)]]}
                  pathOptions={{ color: '#1f7a8c', weight: 1.6, opacity: 0.32 }}
                />
              ))}

          {/* Hotspot Stations as Markers */}
          {showStations &&
            visibleHotspots.map((station: StationData, index: number) => (
              <Marker key={index} position={[station.lat, station.lon]}>
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <h3 className="font-semibold text-sm mb-2">{station.link}</h3>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('map.popup.cpue') || 'CPUE'}:</span>
                        <span className="font-medium text-red-600">{station.cpue.toFixed(2)} kg/hr</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('map.popup.zone') || 'Zone'}:</span>
                        <span>{station.zone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('map.popup.depth') || 'Depth'}:</span>
                        <span>{station.depth.toFixed(1)} m</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('map.popup.course') || 'Course'}:</span>
                        <span>{station.course}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('map.popup.month') || 'Month'}:</span>
                        <span>{station.monthLabel}</span>
                      </div>
                      {station.temp != null && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('map.popup.temp') || 'Temp'}:</span>
                          <span>{station.temp.toFixed(1)} °C</span>
                        </div>
                      )}
                      {station.do != null && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('map.popup.do') || 'DO'}:</span>
                          <span>{station.do.toFixed(2)} mg/L</span>
                        </div>
                      )}
                      {station.salinity != null && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('map.popup.salinity') || 'Salinity'}:</span>
                          <span>{station.salinity.toFixed(1)} PSU</span>
                        </div>
                      )}
                      {(station.windDirection != null || station.windSpeed != null) && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Wind:</span>
                          <span>{formatCurrentSummary(station.windSpeed, station.windDirection)}</span>
                        </div>
                      )}
                      {(station.currentDirection != null || station.currentSpeed != null) && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Current:</span>
                          <span>{formatCurrentSummary(station.currentSpeed, station.currentDirection)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <div>
          <strong>{t('map.legend.title')}</strong>
          <span className="ml-2">{hotspotData.length} hotspot cells</span>
        </div>
        <div className="flex items-center gap-2">
          <span>{t('map.legend.low')}</span>
          <div
            className="w-32 h-3 rounded"
            style={{ background: 'linear-gradient(90deg, #d8f8ff 0%, #afe8f4 26%, #79cedf 44%, #f4df87 60%, #f1b075 78%, #e88669 92%, #de705b 100%)' }}
          ></div>
          <span>{t('map.legend.high')}</span>
        </div>
      </div>
    </div>
  )
}

function GridOverlay({
  gridCells = [],
  borderColor = '#6b7280',
  borderOpacity = 0.28,
}: {
  gridCells?: HotspotCell[]
  borderColor?: string
  borderOpacity?: number
}) {
  const map = useMap()

  useEffect(() => {
    const group = L.layerGroup()

    const cpues = gridCells.map((cell) => cell.cpue).filter((value) => isFinite(value) && value > 0)
    const p10 = percentile(cpues, 0.1)
    const p90 = percentile(cpues, 0.9)

    for (const cell of gridCells) {
      const intensity = normalizeCpue(cell.cpue, p10, p90)
      const fillColor = intensity >= 0.82
        ? '#ee9e86'
        : intensity >= 0.68
          ? '#f7bf9a'
          : intensity >= 0.5
            ? '#f6efb8'
            : intensity >= 0.32
              ? '#a8e2ea'
              : '#d6f5fb'

      const polygon = L.polygon(
        [
          [cell.latMin, cell.lonMin],
          [cell.latMin, cell.lonMax],
          [cell.latMax, cell.lonMax],
          [cell.latMax, cell.lonMin],
        ],
        {
          fillColor,
          fillOpacity: 0.05 + intensity * 0.14,
          color: '#8fcdd6',
          weight: 0.5 + intensity * 0.45,
          opacity: 0.18,
        }
      )

      polygon.bindPopup(`
        <div class="p-1 min-w-[180px]">
          <div style="font-weight:600;margin-bottom:6px;">Cell ${cell.id}</div>
          <div>CPUE: ${cell.cpue.toFixed(2)} kg/hr</div>
          <div>Hauls: ${cell.count}</div>
          <div>Catch: ${cell.totalCatch.toFixed(2)} kg</div>
          <div>Effort: ${cell.totalEffort.toFixed(2)} hr</div>
          ${cell.temp != null && isFinite(cell.temp) ? `<div>Temp: ${cell.temp.toFixed(1)} °C</div>` : ''}
          ${cell.salinity != null && isFinite(cell.salinity) ? `<div>Salinity: ${cell.salinity.toFixed(1)} PSU</div>` : ''}
          ${formatCurrentSummary(cell.windSpeed, cell.windDirection) ? `<div>Wind: ${formatCurrentSummary(cell.windSpeed, cell.windDirection)}</div>` : ''}
          ${formatCurrentSummary(cell.currentSpeed, cell.currentDirection) ? `<div>Current: ${formatCurrentSummary(cell.currentSpeed, cell.currentDirection)}</div>` : ''}
        </div>
      `)
      group.addLayer(polygon)
    }

    group.addTo(map)

    return () => {
      map.removeLayer(group)
    }
  }, [map, gridCells, borderColor, borderOpacity])

  return null
}
