import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LAND_MASK_PATH = path.join(ROOT, 'src/data/thailandCoastalLandMask.json')
const ADM1_SOURCE_PATH = path.join(ROOT, 'public/geo/source/thailand-adm1-simplified.geojson')
const OUTPUT_GEOJSON_PATH = path.join(ROOT, 'public/geo/thailand-marine-admin-adm1.geojson')
const OUTPUT_GRID_PATH = path.join(ROOT, 'public/geo/thailand-marine-admin-adm1-grid.json')
const OUTPUT_METADATA_PATH = path.join(ROOT, 'public/geo/thailand-marine-admin-adm1.metadata.json')

const BOUNDS = {
  latMin: 5.0,
  latMax: 14.0,
  lonMin: 96.5,
  lonMax: 104.5,
}

const CELL_SIZE = 0.08

const ANDAMAN_ISOS = new Set(['TH-85', 'TH-82', 'TH-83', 'TH-81', 'TH-92', 'TH-91'])

const NAME_ALIASES = new Map([
  ['bangkokmetropolis', 'bangkok'],
])

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/province/g, '')
    .replace(/metropolis/g, '')
    .replace(/[^a-z]/g, '')
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function pointInRing(lat, lon, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const intersects = yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / ((yj - yi) || 1e-12) + xi
    if (intersects) inside = !inside
  }
  return inside
}

function pointOnLand(lat, lon, provinces) {
  for (const province of provinces) {
    if (lat < province.minLat || lat > province.maxLat || lon < province.minLon || lon > province.maxLon) continue
    for (const ring of province.rings) {
      if (pointInRing(lat, lon, ring)) return true
    }
  }
  return false
}

function distancePointToSegmentSquared(px, py, ax, ay, bx, by) {
  const abx = bx - ax
  const aby = by - ay
  const apx = px - ax
  const apy = py - ay
  const abLenSq = abx * abx + aby * aby
  if (abLenSq <= 1e-12) {
    const dx = px - ax
    const dy = py - ay
    return dx * dx + dy * dy
  }
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq))
  const qx = ax + abx * t
  const qy = ay + aby * t
  const dx = px - qx
  const dy = py - qy
  return dx * dx + dy * dy
}

function minDistanceToProvinceSquared(lat, lon, province) {
  let best = Number.POSITIVE_INFINITY
  for (const ring of province.rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      const [ax, ay] = ring[i]
      const [bx, by] = ring[i + 1]
      const d = distancePointToSegmentSquared(lon, lat, ax, ay, bx, by)
      if (d < best) best = d
    }
  }
  return best
}

function formatProvinceName(shapeName, fallback) {
  const base = String(shapeName || fallback || '')
  return base.endsWith(' Province') ? base.replace(/ Province$/, '') : base
}

function prepareCoastalProvince(maskFeature, adm1Index) {
  const normalizedMaskName = NAME_ALIASES.get(normalizeName(maskFeature.name)) || normalizeName(maskFeature.name)
  const adm1Feature = adm1Index.get(normalizedMaskName)
  if (!adm1Feature) {
    throw new Error(`Cannot match coastal province "${maskFeature.name}" to ADM1 source`)
  }

  const rings = maskFeature.polygons
    .map((polygon) => polygon[0])
    .filter((ring) => Array.isArray(ring) && ring.length > 3)

  let minLat = Number.POSITIVE_INFINITY
  let maxLat = Number.NEGATIVE_INFINITY
  let minLon = Number.POSITIVE_INFINITY
  let maxLon = Number.NEGATIVE_INFINITY

  for (const ring of rings) {
    for (const [lon, lat] of ring) {
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
      if (lon < minLon) minLon = lon
      if (lon > maxLon) maxLon = lon
    }
  }

  const iso = adm1Feature.properties.shapeISO
  const nameEn = formatProvinceName(adm1Feature.properties.shapeName, maskFeature.name)

  return {
    id: iso,
    iso,
    shapeId: adm1Feature.properties.shapeID,
    name: maskFeature.name,
    nameEn,
    zoneHint: ANDAMAN_ISOS.has(iso) ? 'ADM' : 'GOT',
    rings,
    minLat,
    maxLat,
    minLon,
    maxLon,
    cells: [],
  }
}

function buildCellPolygon(latMin, lonMin, cellSize) {
  const latMax = latMin + cellSize
  const lonMax = lonMin + cellSize
  return [[
    [lonMin, latMin],
    [lonMax, latMin],
    [lonMax, latMax],
    [lonMin, latMax],
    [lonMin, latMin],
  ]]
}

function main() {
  const landMask = readJson(LAND_MASK_PATH)
  const adm1Source = readJson(ADM1_SOURCE_PATH)

  const adm1Index = new Map()
  for (const feature of adm1Source.features) {
    const key = NAME_ALIASES.get(normalizeName(feature.properties.shapeName)) || normalizeName(feature.properties.shapeName)
    adm1Index.set(key, feature)
  }

  const provinces = landMask.map((feature) => prepareCoastalProvince(feature, adm1Index))

  const rowCount = Math.ceil((BOUNDS.latMax - BOUNDS.latMin) / CELL_SIZE)
  const colCount = Math.ceil((BOUNDS.lonMax - BOUNDS.lonMin) / CELL_SIZE)
  const assignments = {}

  for (let row = 0; row < rowCount; row++) {
    const cellLatMin = BOUNDS.latMin + row * CELL_SIZE
    const lat = cellLatMin + CELL_SIZE / 2
    for (let col = 0; col < colCount; col++) {
      const cellLonMin = BOUNDS.lonMin + col * CELL_SIZE
      const lon = cellLonMin + CELL_SIZE / 2

      if (pointOnLand(lat, lon, provinces)) continue

      let winner = null
      let winnerDistance = Number.POSITIVE_INFINITY
      for (const province of provinces) {
        const distance = minDistanceToProvinceSquared(lat, lon, province)
        if (distance < winnerDistance) {
          winner = province
          winnerDistance = distance
        }
      }

      if (!winner) continue

      winner.cells.push(buildCellPolygon(cellLatMin, cellLonMin, CELL_SIZE))
      assignments[`${row}-${col}`] = winner.iso
    }
  }

  const featureCollection = {
    type: 'FeatureCollection',
    features: provinces
      .filter((province) => province.cells.length > 0)
      .map((province) => ({
        type: 'Feature',
        properties: {
          region_id: province.iso,
          region_iso: province.iso,
          region_shape_id: province.shapeId,
          region_name: province.nameEn,
          region_name_local: province.name,
          adm_level: 'ADM1',
          zone_hint: province.zoneHint,
          geometry_kind: 'derived_marine_admin_polygon',
          derivation: 'nearest_coastal_province_on_regular_sea_grid',
          cell_count: province.cells.length,
          cell_size_deg: CELL_SIZE,
        },
        geometry: {
          type: 'MultiPolygon',
          coordinates: province.cells,
        },
      })),
  }

  const metadata = {
    id: 'thailand-marine-admin-adm1',
    title: 'Thailand marine admin polygons ADM1 (derived analytical geometry)',
    generatedAt: new Date().toISOString(),
    bounds: BOUNDS,
    cellSizeDeg: CELL_SIZE,
    rows: rowCount,
    cols: colCount,
    regionCount: featureCollection.features.length,
    sources: [
      {
        path: 'frontend/public/geo/source/thailand-adm1-simplified.geojson',
        source: 'geoBoundaries THA ADM1 simplified',
      },
      {
        path: 'frontend/src/data/thailandCoastalLandMask.json',
        source: 'Existing Thailand coastal land mask used by ThailandMap',
      },
    ],
    disclaimer: 'Derived analytical polygons for CPUE choropleth visualization; not a legal maritime boundary dataset.',
    regions: featureCollection.features.map((feature) => feature.properties),
  }

  const gridIndex = {
    id: 'thailand-marine-admin-adm1-grid',
    generatedAt: metadata.generatedAt,
    bounds: BOUNDS,
    cellSizeDeg: CELL_SIZE,
    assignments,
  }

  ensureDir(OUTPUT_GEOJSON_PATH)
  fs.writeFileSync(OUTPUT_GEOJSON_PATH, JSON.stringify(featureCollection))
  fs.writeFileSync(OUTPUT_GRID_PATH, JSON.stringify(gridIndex))
  fs.writeFileSync(OUTPUT_METADATA_PATH, JSON.stringify(metadata, null, 2))

  console.log(`Generated ${featureCollection.features.length} marine admin regions`)
  console.log(`Assigned ${Object.keys(assignments).length} sea cells`)
  console.log(`GeoJSON: ${OUTPUT_GEOJSON_PATH}`)
  console.log(`Grid: ${OUTPUT_GRID_PATH}`)
  console.log(`Metadata: ${OUTPUT_METADATA_PATH}`)
}

main()
