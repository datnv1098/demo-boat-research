import React, { useState, useEffect } from 'react'
import { MapContainer, TileLayer, GeoJSON, Circle, Popup } from 'react-leaflet'
import { LatLngBounds } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  THAILAND_PROVINCES_GEOJSON,
  THAILAND_MARINE_ZONES,
  THAILAND_CENTER,
  THAILAND_BOUNDS,
} from '../data/thailandGeoData'
import { Switch } from './ui/switch'
import { Label } from './ui/label'

// Import Leaflet icons
import L from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

// Fix Leaflet default icons
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

export function ThailandMap({ hotspotData, month }) {
  const [showProvinces, setShowProvinces] = useState(false) // Ẩn tỉnh thành mặc định
  const [showMarineZones, setShowMarineZones] = useState(false) // Ẩn mặc định
  const [showHeatmap, setShowHeatmap] = useState(true)

  // Convert hotspot grid data to heatmap points - chỉ lấy những điểm có mật độ cao
  const heatmapPoints = hotspotData
    .flat()
    .filter((cell) => cell.density > 60) // Chỉ lấy điểm có mật độ > 60%
    .sort((a, b) => b.density - a.density) // Sắp xếp theo mật độ giảm dần
    .slice(0, 8) // Chỉ lấy 8 điểm có mật độ cao nhất
    .map((cell) => ({
      lat: cell.coordinates.lat,
      lng: cell.coordinates.lon,
      density: cell.density,
    }))

  // Style functions for GeoJSON layers
  const provinceStyle = (feature) => ({
    fillColor: 'transparent',
    weight: 0.75, // Giảm từ 1.5 xuống 0.75
    opacity: 0.8,
    color: '#2563eb',
    dashArray: '',
    fillOpacity: 0.1,
  })

  const marineZoneStyle = (feature) => {
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
  const onEachFeature = (feature, layer) => {
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
              data={THAILAND_PROVINCES_GEOJSON}
              style={provinceStyle}
              onEachFeature={onEachFeature}
            />
          )}

          {/* Marine Zones */}
          {showMarineZones && (
            <GeoJSON
              data={THAILAND_MARINE_ZONES}
              style={marineZoneStyle}
              onEachFeature={onEachFeature}
            />
          )}

          {/* Heatmap Overlay as Circles */}
          {showHeatmap &&
            heatmapPoints.map((point, index) => (
              <Circle
                key={index}
                center={[point.lat, point.lng]}
                radius={Math.max(point.density * 1500, 4000)} // Tăng kích thước radius
                pathOptions={{
                  fillColor: `hsl(${200 - point.density * 1.5}, 75%, ${
                    65 - point.density * 0.4
                  }%)`,
                  fillOpacity: 0.3,
                  color: 'white',
                  weight: 1, // Giảm từ 2 xuống 1
                  stroke: true,
                }}
              >
                {/* Popup hiển thị thông tin mật độ */}
                <Popup>
                  <div className="text-center">
                    <h4 className="font-semibold">จุดร้อนประมง</h4>
                    <p>
                      ความหนาแน่น: <strong>{point.density}%</strong>
                    </p>
                    <p className="text-xs text-gray-600">
                      พิกัด: {point.lat.toFixed(2)}, {point.lng.toFixed(2)}
                    </p>
                  </div>
                </Popup>
              </Circle>
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
