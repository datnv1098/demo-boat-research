const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

type MockBundle = {
  effort2: any[]
  catch2: any[]
  ts_spp: any[]
  env_daily: any[]
}

let backendReadyCache: boolean | null = null
let mockBundleCache: MockBundle | null = null

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const n = Number(value)
    return Number.isFinite(n) ? n : NaN
  }
  return NaN
}

function normalizeRegionCode(value: string): 'ADM' | 'GOT' {
  const v = String(value || '').toUpperCase().trim()
  if (v.includes('ANDAMAN') || v === 'ADM') return 'ADM'
  return 'GOT'
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function parseQuery(path: string): URLSearchParams {
  const idx = path.indexOf('?')
  if (idx < 0) return new URLSearchParams()
  return new URLSearchParams(path.slice(idx + 1))
}

function stripQuery(path: string): string {
  const idx = path.indexOf('?')
  return idx < 0 ? path : path.slice(0, idx)
}

async function fetchBackendPages(path: string, limit = 500): Promise<any[]> {
  const rows: any[] = []
  let page = 1
  while (true) {
    const sep = path.includes('?') ? '&' : '?'
    const res = await fetch(`${API_BASE}${path}${sep}page=${page}&limit=${limit}`)
    if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
    const json = await res.json()
    const data = Array.isArray(json.data) ? json.data : []
    rows.push(...data)
    if (data.length < limit) break
    if (json.total != null && rows.length >= Number(json.total)) break
    page += 1
  }
  return rows
}

async function loadMockBundle(): Promise<MockBundle> {
  if (mockBundleCache) return mockBundleCache

  const res = await fetch('/cmdec_mock.json')
  if (!res.ok) {
    throw new Error(`Cannot load mock data: ${res.status}`)
  }
  const raw = await res.json()

  const apiEffort = Array.isArray(raw?.effort2?.data) ? raw.effort2.data : null
  const apiCatch = Array.isArray(raw?.catch2?.data) ? raw.catch2.data : null
  const apiTsSpp = Array.isArray(raw?.ts_spp?.data) ? raw.ts_spp.data : null
  const apiEnv = Array.isArray(raw?.env_daily?.data) ? raw.env_daily.data : null

  if (apiEffort && apiCatch && apiTsSpp && apiEnv) {
    mockBundleCache = {
      effort2: apiEffort,
      catch2: apiCatch,
      ts_spp: apiTsSpp,
      env_daily: apiEnv,
    }
    return mockBundleCache
  }

  const rawTs = Array.isArray(raw?.TS_Spp) ? raw.TS_Spp : []
  const ts_spp = rawTs.map((row: any, idx: number) => ({
    idspp: toNumber(row?.IDspp) || idx + 1,
    spp_sci_name: String(row?.SppSciName || ''),
    common_name: String(row?.CommonName || ''),
    thai_name: String(row?.ThaiName || ''),
    lm50: toNumber(row?.lm50) || NaN,
  }))

  const speciesNameToId = new Map<string, number>()
  for (const s of ts_spp) {
    const id = Number(s.idspp)
    const aliases = [s.spp_sci_name, s.common_name, s.thai_name]
    for (const a of aliases) {
      const k = String(a || '').trim().toLowerCase()
      if (k) speciesNameToId.set(k, id)
    }
  }

  const rawHeader = Array.isArray(raw?.header) ? raw.header : []
  const effort2 = rawHeader.map((row: any, idx: number) => ({
    rv_id: idx + 1,
    sample_id: String(row?.Link || ''),
    sample_date_eng: String(row?.Date || ''),
    lat_start: toNumber(row?.LatStart),
    long_start: toNumber(row?.LongStart),
    lat_end: toNumber(row?.LatEnd),
    long_end: toNumber(row?.LongEnd),
    depth: toNumber(row?.Depth),
    tow_time: toNumber(row?.Tow),
    station: String(row?.Station || ''),
    station_code: String(row?.Station || ''),
    main_area: String(row?.Zone || ''),
    rv_area: String(row?.Area || ''),
    remark: '',
  }))

  const linkToRegion = new Map<string, 'ADM' | 'GOT'>()
  for (const e of effort2) {
    linkToRegion.set(String(e.sample_id), normalizeRegionCode(String(e.main_area)))
  }

  const rawCatch = Array.isArray(raw?.catch) ? raw.catch : []
  const catch2 = rawCatch.map((row: any, idx: number) => {
    const sci = String(row?.name || row?.btscodename || '').trim().toLowerCase()
    const speciesId = speciesNameToId.get(sci) || idx + 1
    return {
      sample_id: String(row?.Link || ''),
      species_id: speciesId,
      scientific_name: String(row?.name || row?.btscodename || ''),
      total_weight: toNumber(row?.total_weight) || 0,
      freqtext: String(row?.freqtext || ''),
    }
  })

  const rawWater = Array.isArray(raw?.Water_QL) ? raw.Water_QL : []
  const env_daily = rawWater.map((row: any) => {
    const year = toNumber(row?.year)
    const month = toNumber(row?.month)
    const day = 15
    const date = Number.isFinite(year) && Number.isFinite(month)
      ? `${String(year)}-${pad2(month)}-${pad2(day)}`
      : ''
    const link = String(row?.link || '')
    return {
      date,
      region_code: linkToRegion.get(link) || 'GOT',
      temp_c: toNumber(row?.Temp_surface),
      salinity_psu: toNumber(row?.Salinity_surface),
      do_mg_l_approx: toNumber(row?.DO_surface),
      ph_total_scale: toNumber(row?.pH_surface),
    }
  })

  mockBundleCache = { effort2, catch2, ts_spp, env_daily }
  return mockBundleCache
}

function filterEnvByDateRange(rows: any[], params: URLSearchParams): any[] {
  const start = params.get('start_date') || ''
  const end = params.get('end_date') || ''
  if (!start && !end) return rows
  return rows.filter((r: any) => {
    const d = String(r?.date || '')
    if (!d) return false
    if (start && d < start) return false
    if (end && d > end) return false
    return true
  })
}

async function fetchMockRows(path: string): Promise<any[]> {
  const mock = await loadMockBundle()
  const basePath = stripQuery(path)
  const params = parseQuery(path)

  if (basePath === '/api/tables/effort2') return mock.effort2
  if (basePath === '/api/tables/catch2') return mock.catch2
  if (basePath === '/api/tables/ts_spp') return mock.ts_spp
  if (basePath === '/api/environment/daily') return filterEnvByDateRange(mock.env_daily, params)

  return []
}

export async function isBackendReady(force = false): Promise<boolean> {
  if (!force && backendReadyCache != null) return backendReadyCache

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 1500)
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: controller.signal })
    if (!res.ok) {
      backendReadyCache = false
      return false
    }
    const json = await res.json()
    backendReadyCache = json?.db === 'connected'
    return backendReadyCache
  } catch {
    backendReadyCache = false
    return false
  } finally {
    clearTimeout(timeout)
  }
}

export async function fetchApiRows(path: string, limit = 500): Promise<any[]> {
  if (await isBackendReady()) {
    return fetchBackendPages(path, limit)
  }
  return fetchMockRows(path)
}

export function getApiBase(): string {
  return API_BASE
}

export function resetBackendCache(): void {
  backendReadyCache = null
}
