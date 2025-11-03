import { useState } from 'react'
import { MapContainer, TileLayer, Circle, Marker, Popup } from 'react-leaflet'
import { LatLngBounds } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  THAILAND_BOUNDS,
} from '../data/thailandGeoData'
import { Switch } from './ui/switch'
import { Label } from './ui/label'
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
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [showStations, setShowStations] = useState(true)

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
      <div className="flex flex-wrap gap-6 p-3 bg-muted/50 rounded-lg">
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

        {/* Provinces option removed */}
      </div>

      {/* Map Container */}
      <div
        className="w-full rounded-lg overflow-hidden border"
        style={{ height: '500px' }}
      >
        <MapContainer
          center={[6.0, 100.0]}
          zoom={7.25}
          style={{ height: '100%', width: '100%' }}
          bounds={thailandBounds}
          maxBounds={thailandBounds}
          maxBoundsViscosity={1.0}
        >
          {/* Base Map Layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Provinces overlay removed */}

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

      {/* Legend */}
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <div>
          <strong>{t('map.legend.title')}</strong>
          <span className="ml-2">{t('map.legend.province')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>{t('map.legend.low')}</span>
          <div className="w-16 h-3 bg-gradient-to-r from-blue-200 to-red-600 rounded"></div>
          <span>{t('map.legend.high')}</span>
        </div>
      </div>
    </div>
  )
}
