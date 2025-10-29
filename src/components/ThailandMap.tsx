import { useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, Circle, Popup } from 'react-leaflet'
import { LatLngBounds } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  THAILAND_PROVINCES_GEOJSON,
  THAILAND_MARINE_ZONES,
  THAILAND_BOUNDS,
} from '../data/thailandGeoData'
import { Switch } from './ui/switch'
import { Label } from './ui/label'

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
  density: number
}

interface ThailandMapProps {
  hotspotData: HotspotCell[][]
  month: string
}

interface HeatmapPoint {
  lat: number
  lng: number
  density: number
}

export function ThailandMap({ hotspotData, month }: ThailandMapProps) {
  const [showProvinces, setShowProvinces] = useState(false) // Ẩn tỉnh thành mặc định
  const [showMarineZones, setShowMarineZones] = useState(false) // Ẩn mặc định
  const [showHeatmap, setShowHeatmap] = useState(true)

  // Convert hotspot grid data to heatmap points - chỉ lấy những điểm có mật độ cao
  const heatmapPoints: HeatmapPoint[] = hotspotData
    .flat()
    .filter((cell: HotspotCell) => cell.density > 60) // Chỉ lấy điểm có mật độ > 60%
    .sort((a: HotspotCell, b: HotspotCell) => b.density - a.density) // Sắp xếp theo mật độ giảm dần
    .slice(0, 8) // Chỉ lấy 8 điểm có mật độ cao nhất
    .map((cell: HotspotCell) => ({
      lat: cell.coordinates.lat,
      lng: cell.coordinates.lon,
      density: cell.density,
    }))

  // Style functions for GeoJSON layers
  const provinceStyle = () => ({
    fillColor: 'transparent',
    weight: 0.75, // Giảm từ 1.5 xuống 0.75
    opacity: 0.8,
    color: '#2563eb',
    dashArray: '',
    fillOpacity: 0.1,
  })

  const marineZoneStyle = (feature: any) => {
    const zoneType = feature.properties.zone_type
    return {
      fillColor: zoneType === 'eez' ? '#10b981' : '#3b82f6',
      weight: 1, // Giảm từ 2 xuống 1
      opacity: 0.2, // Giảm opacity viền
      color: zoneType === 'eez' ? '#065f46' : '#1e40af',
      dashArray: zoneType === 'eez' ? '8, 4' : '',
      fillOpacity: 0.2,
    }
  }

  // Popup content for features
  const onEachFeature = (feature: any, layer: any) => {
    if (feature.properties) {
      const props = feature.properties
      let popupContent = `<div class="p-2">
        <h3 class="font-semibold text-sm">${props.name}</h3>
        <p class="text-xs text-gray-600">${props.name_en}</p>`

      if (props.region) {
        popupContent += `<p class="text-xs mt-1"><strong>ภูมิภาค:</strong> ${props.region}</p>`
      }

      if (props.zone_type) {
        const zoneTypeText =
          props.zone_type === 'eez' ? 'เขตเศรษฐกิจจำเพาะ' : 'พื้นที่ประมง'
        popupContent += `<p class="text-xs mt-1"><strong>ประเภท:</strong> ${zoneTypeText}</p>`
      }

      popupContent += `</div>`

      layer.bindPopup(popupContent)
    }
  }

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
            id="marine"
            checked={showMarineZones}
            onCheckedChange={setShowMarineZones}
          />
          <Label htmlFor="marine" className="text-sm">
            🌊 เขตประมง & EEZ
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="heatmap"
            checked={showHeatmap}
            onCheckedChange={setShowHeatmap}
          />
          <Label htmlFor="heatmap" className="text-sm">
            🎯 จุดร้อนประมง {month}
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="provinces"
            checked={showProvinces}
            onCheckedChange={setShowProvinces}
          />
          <Label htmlFor="provinces" className="text-sm">
            📍 รายงานจังหวัด
          </Label>
        </div>
      </div>

      {/* Map Container */}
      <div
        className="w-full rounded-lg overflow-hidden border"
        style={{ height: '500px' }}
      >
        <MapContainer
          center={[10.0, 100.0]}
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

          {/* Provincial Boundaries */}
          {showProvinces && (
            <GeoJSON
              data={THAILAND_PROVINCES_GEOJSON as any}
              style={provinceStyle}
              onEachFeature={onEachFeature}
            />
          )}

          {/* Marine Zones */}
          {showMarineZones && (
            <GeoJSON
              data={THAILAND_MARINE_ZONES as any}
              style={marineZoneStyle}
              onEachFeature={onEachFeature}
            />
          )}

          {/* Heatmap Overlay as Circles */}
          {showHeatmap &&
            heatmapPoints.map((point: HeatmapPoint, index: number) => (
              <Circle
                key={index}
                center={[point.lat, point.lng]}
                radius={Math.max(point.density * 800, 2000)}
                pathOptions={{
                  fillColor: `hsl(${200 - point.density * 1.5}, 75%, ${
                    65 - point.density * 0.4
                  }%)`,
                  fillOpacity: 0.3,
                  color: 'white',
                  weight: 1, // Giảm từ 2 xuống 1
                  stroke: true,
                }}
              />
            ))}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <div>
          <strong>คำอธิบาย:</strong>
          <span className="ml-2">🟦 จังหวัด</span>
          <span className="ml-2">🟢 เขต EEZ</span>
          <span className="ml-2">🔵 พื้นที่ประมง</span>
        </div>
        <div className="flex items-center gap-2">
          <span>ความหนาแน่นต่ำ</span>
          <div className="w-16 h-3 bg-gradient-to-r from-blue-200 to-red-600 rounded"></div>
          <span>สูง</span>
        </div>
      </div>
    </div>
  )
}
