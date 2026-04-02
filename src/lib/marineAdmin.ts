import thailandCoastalLandMask from '../data/thailandCoastalLandMask.json'
import thailandMarineEezIho from '../data/thailandMarineEezIho.json'

type GeoRing = [number, number][]
type GeoPolygon = GeoRing[]

type CoastalLandFeature = {
  name: string
  polygons: GeoPolygon[]
}

type MarineExtentFeature = {
  type: 'Feature'
  properties: {
    mrgid: number
    iho_sea: string
    territory1: string
  }
  geometry: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: number[][][][] | number[][][]
  }
}

export type ZoneKey = 'ADM' | 'GOT'

export type MarineAdminFeatureLike = {
  properties: {
    region_iso: string
    region_name: string
    region_name_local?: string
    zone_hint?: string
  }
}

export type CoastalSeed = {
  lat: number
  lon: number
  regionId: string
  zone: ZoneKey
}

export type PreparedMarineAdminRegion = {
  regionId: string
  regionName: string
  regionNameLocal: string
  zone: ZoneKey
  coastalSeeds: CoastalSeed[]
}

type PreparedMarineExtent = {
  id: number
  zone: ZoneKey
  polygons: GeoPolygon[]
  minLat: number
  maxLat: number
  minLon: number
  maxLon: number
}

const SEED_SAMPLE_RADIUS = 0.04
const SEED_SAMPLE_SPACING = 0.08
const VIEW_PADDING_DEG = 0.35

function normalizeName(value: string | undefined | null): string {
  return String(value || '')
    .toLowerCase()
    .replace(/province/g, '')
    .replace(/metropolis/g, '')
    .replace(/[^a-z]/g, '')
}

function zoneFromIhoSea(ihoSea: string): ZoneKey | null {
  const value = String(ihoSea || '').toLowerCase()
  if (value.includes('gulf of thailand')) return 'GOT'
  if (value.includes('andaman') || value.includes('malacca')) return 'ADM'
  return null
}

function polygonSets(feature: MarineExtentFeature): number[][][][] {
  if (feature.geometry.type === 'Polygon') {
    return [feature.geometry.coordinates as number[][][]]
  }
  return feature.geometry.coordinates as number[][][][]
}

function computeBounds(polygons: GeoPolygon[]) {
  let minLat = Infinity
  let maxLat = -Infinity
  let minLon = Infinity
  let maxLon = -Infinity

  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const [lon, lat] of ring) {
        if (lat < minLat) minLat = lat
        if (lat > maxLat) maxLat = lat
        if (lon < minLon) minLon = lon
        if (lon > maxLon) maxLon = lon
      }
    }
  }

  return { minLat, maxLat, minLon, maxLon }
}

function pointInRing(lat: number, lon: number, ring: GeoRing): boolean {
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

function pointInPolygon(lat: number, lon: number, polygon: GeoPolygon): boolean {
  if (!polygon.length) return false
  if (!pointInRing(lat, lon, polygon[0])) return false

  for (let i = 1; i < polygon.length; i += 1) {
    if (pointInRing(lat, lon, polygon[i])) return false
  }

  return true
}

function pointInExtent(lat: number, lon: number, extent: PreparedMarineExtent): boolean {
  if (lat < extent.minLat || lat > extent.maxLat || lon < extent.minLon || lon > extent.maxLon) return false
  return extent.polygons.some((polygon) => pointInPolygon(lat, lon, polygon))
}

function lonLatDistanceSquared(lonA: number, latA: number, lonB: number, latB: number): number {
  const dx = lonA - lonB
  const dy = latA - latB
  return dx * dx + dy * dy
}

const MARINE_EXTENTS: PreparedMarineExtent[] = (thailandMarineEezIho as { features: MarineExtentFeature[] }).features
  .map((feature) => {
    const zone = zoneFromIhoSea(feature.properties.iho_sea)
    if (!zone) return null

    const polygons = polygonSets(feature).map((polygon) =>
      polygon.map((ring) => ring.map(([lon, lat]) => [lon, lat] as [number, number]))
    )
    const bounds = computeBounds(polygons)

    return {
      id: feature.properties.mrgid,
      zone,
      polygons,
      ...bounds,
    }
  })
  .filter((extent): extent is PreparedMarineExtent => extent != null)

const MARINE_VIEW_BBOX = (() => {
  const bbox = MARINE_EXTENTS.reduce((acc, extent) => ({
    minLat: Math.min(acc.minLat, extent.minLat),
    maxLat: Math.max(acc.maxLat, extent.maxLat),
    minLon: Math.min(acc.minLon, extent.minLon),
    maxLon: Math.max(acc.maxLon, extent.maxLon),
  }), {
    minLat: Infinity,
    maxLat: -Infinity,
    minLon: Infinity,
    maxLon: -Infinity,
  })

  return {
    latMin: bbox.minLat - VIEW_PADDING_DEG,
    latMax: bbox.maxLat + VIEW_PADDING_DEG,
    lonMin: bbox.minLon - VIEW_PADDING_DEG,
    lonMax: bbox.maxLon + VIEW_PADDING_DEG,
  }
})()

function isCoastalVertex(lat: number, lon: number, zone: ZoneKey): boolean {
  const extents = MARINE_EXTENTS.filter((extent) => extent.zone === zone)
  if (!extents.length) return false

  for (let i = 0; i < 12; i += 1) {
    const angle = (Math.PI * 2 * i) / 12
    const probeLat = lat + Math.sin(angle) * SEED_SAMPLE_RADIUS
    const probeLon = lon + Math.cos(angle) * SEED_SAMPLE_RADIUS
    if (extents.some((extent) => pointInExtent(probeLat, probeLon, extent))) {
      return true
    }
  }

  return false
}

function collectCoastalSeeds(regionId: string, zone: ZoneKey, polygons: GeoPolygon[]): CoastalSeed[] {
  const seeds: CoastalSeed[] = []
  let lastSeed: CoastalSeed | null = null

  for (const polygon of polygons) {
    for (const ring of polygon) {
      const uniqueRing = ring[0] && ring[ring.length - 1] &&
        ring[0][0] === ring[ring.length - 1][0] &&
        ring[0][1] === ring[ring.length - 1][1]
        ? ring.slice(0, -1)
        : ring

      for (const [lon, lat] of uniqueRing) {
        if (!isCoastalVertex(lat, lon, zone)) continue

        if (
          lastSeed &&
          lonLatDistanceSquared(lon, lat, lastSeed.lon, lastSeed.lat) < SEED_SAMPLE_SPACING * SEED_SAMPLE_SPACING
        ) {
          continue
        }

        const seed = { lat, lon, regionId, zone }
        seeds.push(seed)
        lastSeed = seed
      }
    }
  }

  if (seeds.length) return seeds

  const fallbackPolygon = polygons[0]?.[0] || []
  return fallbackPolygon.slice(0, 1).map(([lon, lat]) => ({ lat, lon, regionId, zone }))
}

export function getMarineExtents(): PreparedMarineExtent[] {
  return MARINE_EXTENTS
}

export function getMarineViewBbox() {
  return MARINE_VIEW_BBOX
}

export function marineZoneForPoint(lat: number, lon: number): ZoneKey | null {
  const match = MARINE_EXTENTS.find((extent) => pointInExtent(lat, lon, extent))
  return match?.zone ?? null
}

export function pointInMarineExtent(lat: number, lon: number, zone?: ZoneKey): boolean {
  return MARINE_EXTENTS.some((extent) => {
    if (zone && extent.zone !== zone) return false
    return pointInExtent(lat, lon, extent)
  })
}

export function prepareMarineAdminRegions(features: MarineAdminFeatureLike[]): PreparedMarineAdminRegion[] {
  const landMaskIndex = new Map(
    (thailandCoastalLandMask as CoastalLandFeature[]).map((feature) => [normalizeName(feature.name), feature])
  )

  return features.map((feature) => {
    const zone = feature.properties.zone_hint === 'ADM' ? 'ADM' : 'GOT'
    const maskFeature =
      landMaskIndex.get(normalizeName(feature.properties.region_name_local)) ||
      landMaskIndex.get(normalizeName(feature.properties.region_name))

    if (!maskFeature) {
      return {
        regionId: feature.properties.region_iso,
        regionName: feature.properties.region_name,
        regionNameLocal: feature.properties.region_name_local || feature.properties.region_name,
        zone,
        coastalSeeds: [],
      }
    }

    const coastalSeeds = collectCoastalSeeds(
      feature.properties.region_iso,
      zone,
      maskFeature.polygons
    )

    return {
      regionId: feature.properties.region_iso,
      regionName: feature.properties.region_name,
      regionNameLocal: feature.properties.region_name_local || feature.properties.region_name,
      zone,
      coastalSeeds,
    }
  })
}

export function assignMarineAdminRegion(
  lat: number,
  lon: number,
  regions: PreparedMarineAdminRegion[]
): string | undefined {
  const zone = marineZoneForPoint(lat, lon)
  if (!zone) return undefined

  let winner: string | undefined
  let winnerDistance = Infinity

  for (const region of regions) {
    if (region.zone !== zone) continue

    for (const seed of region.coastalSeeds) {
      const distance = lonLatDistanceSquared(lon, lat, seed.lon, seed.lat)
      if (distance < winnerDistance) {
        winner = region.regionId
        winnerDistance = distance
      }
    }
  }

  return winner
}
