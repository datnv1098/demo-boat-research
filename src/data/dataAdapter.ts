/**
 * Data Adapter: Transforms converted_excel_data.json (real data)
 * into the cmdec_mock.json format that all pages expect.
 *
 * Real data sections: trips, cpueData, lengthData, waterQualityData, speciesInfo
 * Expected format: { header, catch, Water_QL, TS_Spp }
 */

// Fishing area => Zone mapping
function areaToZone(fishingArea: string): string {
  if (fishingArea.includes('อันดามัน')) return 'Andaman'
  if (fishingArea.includes('อ่าวไทย') || fishingArea.includes('น่านน้ำลึก')) return 'Gulf'
  return 'Gulf'
}

// Fishing area => Area code
function areaToCode(fishingArea: string): string {
  if (fishingArea.includes('อันดามันใต้')) return 'B2'
  if (fishingArea.includes('อันดามันเหนือ')) return 'A1'
  if (fishingArea.includes('อ่าวไทยตอนล่าง')) return 'A2'
  if (fishingArea.includes('น่านน้ำลึก')) return 'B1'
  return 'A3'
}

// Generate freqtext from lengthBin data
function generateFreqtext(lengthBin: string, male: number, female: number, unsexed: number): string {
  const match = lengthBin.match(/(\d+)-(\d+)/)
  if (!match) return ''
  const mid = Math.round((Number(match[1]) + Number(match[2])) / 2)
  const total = male + female + unsexed
  if (total <= 0) return ''
  return `${mid}:${total}`
}



interface RealData {
  trips: any[]
  cpueData: any[]
  lengthData: any[]
  waterQualityData: any[]
  speciesInfo: Record<string, any>
}

export function transformRealData(real: RealData) {
  // --- Pre-index lengthData by species for fast lookup ---
  const lengthBySpecies = new Map<string, any[]>()
  for (const ld of real.lengthData) {
    const key = ld.species
    if (!lengthBySpecies.has(key)) lengthBySpecies.set(key, [])
    lengthBySpecies.get(key)!.push(ld)
  }

  // 1. Build header[] from trips[]
  const header: any[] = []
  const stationCounter: Record<string, number> = {}
  const offices = ['Office-1', 'Office-2', 'Office-3']
  const courses = ['N', 'S', 'E', 'W']

  for (const trip of real.trips) {
    const zone = areaToZone(trip.fishingArea)
    const area = areaToCode(trip.fishingArea)
    const stKey = area
    stationCounter[stKey] = ((stationCounter[stKey] || 0) % 9) + 1
    const stationNum = stationCounter[stKey]

    header.push({
      Link: trip.tripId,
      Date: trip.startDate,
      LatStart: trip.coordinates.lat,
      LongStart: trip.coordinates.lon,
      LatEnd: null,
      LongEnd: null,
      Depth: trip.depth ?? null,
      Tow: trip.duration ?? null,
      Distance_nm: null,
      Speed_est_kn: null,
      Station: trip.station ? String(trip.station) : String(stationNum).padStart(3, '0'),
      Area: area,
      Zone: zone,
      Office: offices[stationNum % 3],
      Course: courses[stationNum % 4],
      // Pass through original Excel metadata
      originalIssues: trip.issues || [],
      dqScore: trip.dqScore || 0,
      vessel: trip.vessel || '',
      captain: trip.captain || '',
      totalCatch: trip.totalCatch || 0,
      fishingArea: trip.fishingArea || '',
      centerId: trip.centerId || '',
      centerName: trip.centerName || '',
    })
  }

  // 2. Build catch[] from cpueData[]
  const catchRows: any[] = []
  // Build tripId set for validation
  const tripIdSet = new Set<string>()
  for (const trip of real.trips) tripIdSet.add(trip.tripId)

  for (const cpue of real.cpueData) {
    const tripId = cpue.tripId || ''
    if (!tripId || !tripIdSet.has(tripId)) continue

    // Build freqtext from matching lengthData
    const matchingLengths = lengthBySpecies.get(cpue.species) || []
    let freqtext = ''
    if (matchingLengths.length > 0) {
      const pairs = matchingLengths
        .slice(0, 20)
        .map((ld: any) => generateFreqtext(ld.lengthBin, ld.male, ld.female, ld.unsexed))
        .filter((s: string) => s.length > 0)
      freqtext = pairs.join(', ')
    }

    catchRows.push({
      Link: tripId,
      btscodename: cpue.species,
      name: cpue.species,
      total_weight: cpue.catch,
      sam_weight: null, // No sample weight in cpueData
      freqtext: freqtext,
      fishingArea: cpue.fishingArea || '',
    })
  }

  // 3. Build Water_QL[] from waterQualityData[]
  const waterQl: any[] = []
  for (let i = 0; i < real.waterQualityData.length; i++) {
    const wq = real.waterQualityData[i]
    // Distribute across months/years
    const month = (i % 12) + 1
    const year = 2024 + Math.floor(i / 12)

    waterQl.push({
      link: wq.tripId || '',
      year,
      month,
      station: (i % 9) + 1,
      Salinity_surface: wq.salinity?.surface || 0,
      Temp_surface: wq.temperature?.surface || 0,
      pH_surface: wq.pH?.surface || 0,
      DO_surface: wq.dissolvedOxygen?.surface || 0,
      Transparency: wq.transparency || 0,
    })
  }

  // 4. Build TS_Spp[] from speciesInfo
  const tsSpp: any[] = []
  let sppIdx = 1
  for (const [thaiName, info] of Object.entries(real.speciesInfo)) {
    const si = info as any
    tsSpp.push({
      Link: '',
      IDspp: sppIdx,
      SppSciName: si.scientificName || '',
      CommonName: si.commonName || '',
      ThaiName: si.thaiName || thaiName,
      lm50: si.lm50 || 15,
      maxLength: si.maxLength || 30,
      habitat: si.habitat || '',
      economicValue: si.economicValue || '',
    })
    sppIdx++
  }

  return {
    header,
    catch: catchRows,
    Water_QL: waterQl,
    TS_Spp: tsSpp,
  }
}

// Cache and URL for data
let cachedData: any = null
const DATA_URL = new URL('../../converted_excel_data.json', import.meta.url).href

export async function loadRealData(): Promise<any> {
  if (cachedData) return cachedData
  const response = await fetch(DATA_URL)
  const realData: RealData = await response.json()
  cachedData = transformRealData(realData)
  return cachedData
}
