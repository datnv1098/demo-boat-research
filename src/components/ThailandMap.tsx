import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet'
import { LatLngBounds } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  THAILAND_BOUNDS,
} from '../data/thailandGeoData'
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
  coordinates: {
    lat: number
    lon: number
  }
  cpue: number
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
}

interface ThailandMapProps {
  hotspotData: HotspotCell[][]
  stationData?: StationData[]
  percentileThreshold?: number
  month: string
  blacklistLinks?: string[]
}

interface HeatmapPoint {
  lat: number
  lng: number
  cpue: number
}

export function ThailandMap({ hotspotData, stationData = [], blacklistLinks = [] }: ThailandMapProps) {
  const { t } = useI18n()
  // Keep parameter used to satisfy TS noUnusedParameters when overlay removed
  void hotspotData
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [showStations, setShowStations] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [tileStyle, setTileStyle] = useState<'carto_voyager' | 'osm' | 'esri_ocean'>('carto_voyager')

  // Points are derived from selected hotspot stations (not independent grid)
  const visibleStations = stationData.filter((s) => !blacklistLinks.includes(s.link))
  const maxCPUE = visibleStations.length > 0 ? Math.max(...visibleStations.map((s) => s.cpue)) : 1

  const heatmapPoints: HeatmapPoint[] = visibleStations
    .sort((a, b) => b.cpue - a.cpue)
    .slice(0, 50) // Top 50 stations for performance
    .map((s) => ({ lat: s.lat, lng: s.lon, cpue: s.cpue }))

  // Provincial overlay removed per request

  // Calculate bounds for Thailand
  const thailandBounds = new LatLngBounds(
    [THAILAND_BOUNDS.southwest.lat, THAILAND_BOUNDS.southwest.lng],
    [THAILAND_BOUNDS.northeast.lat, THAILAND_BOUNDS.northeast.lng]
  )

  return (
    <div className="space-y-4">
      {/* Layer Controls */}
      <div className="relative z-50 flex flex-wrap gap-6 p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center space-x-2">
          <Switch
            id="heatmap"
            checked={showHeatmap}
            onCheckedChange={setShowHeatmap}
          />
          <Label htmlFor="heatmap" className="text-sm">
            {t('map.switch.heatmap')} CPUE
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="stations"
            checked={showStations}
            onCheckedChange={setShowStations}
          />
          <Label htmlFor="stations" className="text-sm">
            {t('map.switch.stations') || 'Hotspot Stations'}
          </Label>
        </div>

        {/* Base map tile selector */}
        <div className="flex items-center space-x-2">
          <Select value={tileStyle} onValueChange={(v: any) => setTileStyle(v)}>
            <SelectTrigger className="w-[280px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="carto_voyager">Carto Voyager (clear land/sea)</SelectItem>
              <SelectItem value="osm">OSM Standard</SelectItem>
              <SelectItem value="esri_ocean">Esri Ocean (labels)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="grid"
            checked={showGrid}
            onCheckedChange={setShowGrid}
          />
          <Label htmlFor="grid" className="text-sm">
            {t('map.switch.grid') || 'Grid'}
          </Label>
        </div>
      </div>

      {/* Map Container */}
      <div
        className="relative z-0 w-full rounded-lg overflow-hidden border mt-2.5"
        style={{ height: '520px' }}
      >
        <MapContainer
          center={[5.0, 100.0]}
          zoom={7.25}
          style={{ height: '100%', width: '100%' }}
          bounds={thailandBounds}
          maxBounds={thailandBounds}
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

          {/* Provinces overlay removed */}

          {/* Grid overlay */}
          {showGrid && <GridOverlay spacing={1} stationData={visibleStations} />}

          {/* Heatmap Overlay as Circles (CPUE-based) - tied to stations toggle */}
          {showStations && showHeatmap &&
            heatmapPoints.map((point: HeatmapPoint, index: number) => {
              const intensity = maxCPUE > 0 ? point.cpue / maxCPUE : 0
              const radius = Math.max(intensity * 15000, 3000)
              return (
                <Circle
                  key={index}
                  center={[point.lat, point.lng]}
                  radius={radius}
                  pathOptions={{
                    fillColor: intensity > 0.8 ? '#dc2626' : intensity > 0.6 ? '#ea580c' : intensity > 0.4 ? '#f59e0b' : '#fbbf24',
                    fillOpacity: Math.max(0.2, intensity * 0.5),
                    color: '#fff',
                    weight: 1,
                    stroke: true,
                  }}
                />
              )
            })}

          {/* Hotspot Stations as Markers */}
          {showStations &&
            visibleStations.map((station: StationData, index: number) => (
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

      {/* Legend removed per request */}
    </div>
  )
}

function GridOverlay({
  spacing = 1,
  color = '#9ca3af',
  weight = 0.75,
  opacity = 0.5,
  stationData = [],
}: {
  spacing?: number
  color?: string
  weight?: number
  opacity?: number
  stationData?: StationData[]
}) {
  const map = useMap()

  // Function to count stations in a grid cell
  const countStationsInCell = (cellLat: number, cellLon: number): number => {
    return stationData.filter((station) => {
      return (
        station.lat >= cellLat &&
        station.lat < cellLat + spacing &&
        station.lon >= cellLon &&
        station.lon < cellLon + spacing
      )
    }).length
  }

  // Function to get color based on station count
  const getCellColor = (count: number): string => {
    if (count === 0) return 'transparent'
    if (count === 1) return '#86efac' // green-300 - xanh nhạt nhất
    if (count === 2) return '#22c55e' // green-500 - xanh vừa
    return '#15803d' // green-700 - xanh đậm nhất (3+)
  }

  useEffect(() => {
    const group = L.layerGroup()
    const bounds = map.getBounds()
    const south = Math.floor(bounds.getSouth())
    const north = Math.ceil(bounds.getNorth())
    const west = Math.floor(bounds.getWest())
    const east = Math.ceil(bounds.getEast())

    // Draw grid cells as polygons with colors
    for (let lat = south; lat < north; lat += spacing) {
      for (let lon = west; lon < east; lon += spacing) {
        const stationCount = countStationsInCell(lat, lon)
        const cellColor = getCellColor(stationCount)

        const cellBounds = [
          [lat, lon],
          [lat + spacing, lon],
          [lat + spacing, lon + spacing],
          [lat, lon + spacing],
        ] as [number, number][]

        const cell = L.polygon(cellBounds, {
          fillColor: cellColor,
          fillOpacity: cellColor === 'transparent' ? 0 : 0.4,
          color: color,
          weight: weight,
          opacity: opacity,
          dashArray: '4,4',
        })

        group.addLayer(cell)
      }
    }

    // Draw grid lines
    for (let lat = south; lat <= north; lat += spacing) {
      const line = L.polyline(
        [
          [lat, west],
          [lat, east],
        ],
        { color, weight, opacity, dashArray: '4,4' }
      )
      group.addLayer(line)
    }

    for (let lon = west; lon <= east; lon += spacing) {
      const line = L.polyline(
        [
          [south, lon],
          [north, lon],
        ],
        { color, weight, opacity, dashArray: '4,4' }
      )
      group.addLayer(line)
    }

    group.addTo(map)

    const handleMove = () => {
      group.clearLayers()
      const b = map.getBounds()
      const s = Math.floor(b.getSouth())
      const n = Math.ceil(b.getNorth())
      const w = Math.floor(b.getWest())
      const e = Math.ceil(b.getEast())

      // Redraw grid cells
      for (let la = s; la < n; la += spacing) {
        for (let lo = w; lo < e; lo += spacing) {
          const stationCount = countStationsInCell(la, lo)
          const cellColor = getCellColor(stationCount)

          const cellBounds = [
            [la, lo],
            [la + spacing, lo],
            [la + spacing, lo + spacing],
            [la, lo + spacing],
          ] as [number, number][]

          const cell = L.polygon(cellBounds, {
            fillColor: cellColor,
            fillOpacity: cellColor === 'transparent' ? 0 : 0.4,
            color: color,
            weight: weight,
            opacity: opacity,
            dashArray: '4,4',
          })

          group.addLayer(cell)
        }
      }

      // Redraw grid lines
      for (let la = s; la <= n; la += spacing) {
        const line = L.polyline(
          [
            [la, w],
            [la, e],
          ],
          { color, weight, opacity, dashArray: '4,4' }
        )
        group.addLayer(line)
      }
      for (let lo = w; lo <= e; lo += spacing) {
        const line = L.polyline(
          [
            [s, lo],
            [n, lo],
          ],
          { color, weight, opacity, dashArray: '4,4' }
        )
        group.addLayer(line)
      }
    }

    map.on('moveend zoomend', handleMove)

    return () => {
      map.off('moveend zoomend', handleMove)
      map.removeLayer(group)
    }
  }, [map, spacing, color, weight, opacity, stationData])

  return null
}
