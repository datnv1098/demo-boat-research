import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import { LatLngBounds } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'
import { Switch } from './ui/switch'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { useI18n } from '../lib/i18n'

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
        points.push([lat, lon, intensity])

        const offset = 0.035
        points.push([lat + perpLat * offset, lon + perpLon * offset, intensity * 0.42])
        points.push([lat - perpLat * offset, lon - perpLon * offset, intensity * 0.42])
      }
      continue
    }

    points.push([station.lat, station.lon, baseIntensity])

    const spreadRings = [0.05, 0.1, 0.18]
    const decay = [0.55, 0.28, 0.12]
    const dirs = 8
    spreadRings.forEach((radius, ringIdx) => {
      for (let i = 0; i < dirs; i += 1) {
        const angle = (2 * Math.PI * i) / dirs
        const latOffset = Math.sin(angle) * radius * 0.72
        const lonOffset = Math.cos(angle) * radius * 1.25
        points.push([
          station.lat + latOffset,
          station.lon + lonOffset,
          clamp(baseIntensity * decay[ringIdx], 0.03, 0.6),
        ])
      }
    })
  }

  return points
}

// Heatmap Layer Component with dynamic radius based on zoom
function HeatmapLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap()

  useEffect(() => {
    if (!map || !points.length) return

    // Keep kernel compact when zooming in, but taper it more gradually across zoom levels.
    const calculateRadius = (zoom: number): number => {
      const BASE_RADIUS = 15
      const ZOOM_ANCHOR = 7
      const radius = BASE_RADIUS * Math.pow(1, zoom - ZOOM_ANCHOR)
      return Math.max(6, Math.min(radius, 20))
    }

    const calculateBlur = (radius: number): number => {
      return Math.max(10, Math.min(Math.round(radius * 1.85), 28))
    }

    const currentZoom = map.getZoom()
    const initialRadius = calculateRadius(currentZoom)
    const initialBlur = calculateBlur(initialRadius)

    // @ts-ignore - leaflet.heat doesn't have official types in some setups
    const heatLayer = L.heatLayer(points, {
      radius: initialRadius,
      blur: initialBlur,
      minOpacity: 0.19,
      gradient: {
        0.08: '#d8f8ff',
        0.26: '#afe8f4',
        0.44: '#79cedf',
        0.60: '#f4df87',
        0.78: '#f1b075',
        0.92: '#e88669',
        1.00: '#de705b',
      }
    }).addTo(map)

    // Update radius when zoom changes
    const handleZoomEnd = () => {
      const newZoom = map.getZoom()
      const newRadius = calculateRadius(newZoom)
      const newBlur = calculateBlur(newRadius)

      // @ts-ignore
      heatLayer.setOptions({ radius: newRadius, blur: newBlur })
      // @ts-ignore
      heatLayer.redraw()
    }

    map.on('zoomend', handleZoomEnd)

    return () => {
      map.off('zoomend', handleZoomEnd)
      map.removeLayer(heatLayer)
    }
  }, [map, points])

  return null
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

  const visibleStations = stationData.filter((s) => !blacklistLinks.includes(s.link))
  const visibleHotspots = hotspotStations.filter((s) => !blacklistLinks.includes(s.link))
  const visibleGridCells = gridCells.filter((cell) => cell.cpue > 0)
  const heatmapPoints = makeSurfaceHeatPoints(visibleStations)

  // Provincial overlay removed per request

  // Calculate bounds for Thailand Marine Area
  const marineBounds = new LatLngBounds(
    [5.0, 96.5], // Southwest (Andaman)
    [14.0, 104.5] // Northeast (Upper Gulf)
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
            <HeatmapLayer points={heatmapPoints} />
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
