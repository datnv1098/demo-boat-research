import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type Language = 'th' | 'en'

type Translations = Record<string, Record<Language, string>>

const translations: Translations = {
  'app.topnav.title': { th: 'ระบบวิเคราะห์ประมงไทย', en: 'Thailand Fisheries Analytics' },
  'app.topnav.badge': { th: 'เดสก์ท็อป • ข้อมูลจริง', en: 'Desktop • Real data' },
  'app.topnav.version': { th: 'v1.0 • ต.ค. 2568', en: 'v1.0 • Oct 2025' },
  'app.sidebar.features': { th: 'ฟีเจอร์', en: 'Features' },
  'app.sidebar.footer': { th: 'โอเพ่นซอร์สเท่านั้น • อัปโหลดเป็นแบทช์', en: 'Open source only • Batch upload' },

  'nav.ingestionQc': { th: 'นำเข้า & ตรวจสอบคุณภาพ', en: 'Ingestion & QC' },
  'nav.cpue': { th: 'CPUE', en: 'CPUE' },
  'nav.lengthBio': { th: 'ความยาว & ชีววิทยา', en: 'Length & Biology' },
  'nav.hotspot': { th: 'แผนที่จุดร้อน', en: 'Hotspot Map' },
  'nav.overview': { th: 'ภาพรวม', en: 'Overview' },
  'nav.users': { th: 'ผู้ใช้', en: 'Users' },
  'nav.system': { th: 'การตั้งค่า', en: 'Settings' },
  'nav.api': { th: 'การตั้งค่า API', en: 'API Config' },
  'nav.water': { th: 'คุณภาพน้ำ', en: 'Water Quality' },

  'ing.title': { th: 'การนำเข้า & ตรวจสอบคุณภาพข้อมูล', en: 'Data Ingestion & Quality Control' },
  'ing.desc': { th: 'อัปโหลด Excel/API และตรวจสอบคุณภาพ (DQI, บันทึก QC)', en: 'Upload Excel/API and validate quality (DQI, QC logs)' },
  'cpue.title': { th: 'มาตรฐาน CPUE', en: 'CPUE Standardization' },
  'cpue.desc': { th: 'ปรับมาตรฐานตามพื้นที่/ชั้นความลึก/ช่วงเวลา', en: 'Normalize by area/depth/time' },
  'len.title': { th: 'ความถี่ความยาว & ดัชนีชีววิทยา', en: 'Length-Frequency & Bio Indices' },
  'len.desc': { th: 'ฮิสโตแกรมและดัชนี Lmean/L95/%<Lm50/LFI', en: 'Histogram and Lmean/L95/%<Lm50/LFI' },
  'dash.title': { th: 'ภาพรวม', en: 'Overview' },
  'dash.desc': { th: 'ภาพรวมตัวชี้วัดหลักและสรุปการสำรวจ', en: 'Overview of key metrics and survey summary' },
  'hot.title': { th: 'แผนที่จุดร้อน', en: 'Hotspot Map' },
  'hot.desc': { th: 'อนุมานความหนาแน่น/CPUE มาตรฐานบนกริดเชิงพื้นที่-เวลา; จัดอันดับจุดร้อนตามสปีชีส์/เวลา', en: 'Heatmap of standardized CPUE across space-time; rank hotspots by species/time' },
  'hot.zone': { th: 'โซน', en: 'Zone' },
  'hot.depth': { th: 'ระดับความลึก', en: 'Depth Class' },
  'hot.species': { th: 'ชนิด', en: 'Species' },
  'hot.percentile': { th: 'เกณฑ์ความร้อน', en: 'Hotspot Rank' },
  'hot.totalStations': { th: 'จำนวนสถานีทั้งหมด', en: 'Total Stations' },
  'hot.hotspotCount': { th: 'จุดร้อน', en: 'Hotspots' },
  'hot.threshold': { th: 'เกณฑ์', en: 'Threshold' },
  'hot.export.png': { th: 'กรุณาถ่ายภาพหน้าจอ (Printscreen หรือ Snipping Tool)', en: 'Please take a screenshot (Printscreen or Snipping Tool)' },
  'users.title': { th: 'การจัดการผู้ใช้ (RBAC)', en: 'User Management (RBAC)' },
  'users.desc': { th: 'จัดการผู้ใช้ บทบาท และสิทธิ์การเข้าถึง', en: 'Manage users, roles, and permissions' },
  'sys.title': { th: 'การตั้งค่าระบบ', en: 'System Configuration' },
  'sys.desc': { th: 'การตั้งค่าแบบไดนามิก sys_config (QC/CPUE/Bio/Hotspot/System)', en: 'Dynamic sys_config (QC/CPUE/Bio/Hotspot/System)' },
  'api.title': { th: 'การตั้งค่า API', en: 'API Configuration' },
  'api.desc': { th: 'Endpoint, API Key, Rate Limit, OpenAPI', en: 'Endpoint, API Key, Rate Limit, OpenAPI' },
  'loading.demo': { th: 'กำลังโหลดข้อมูลสาธิต...', en: 'Loading demo data...' },
  'hot.month': { th: 'เดือน', en: 'Month' },
  'table.sheet': { th: 'ชีต', en: 'Sheet' },
  'table.records': { th: 'จำนวนเรคอร์ด', en: 'Records' },
  'table.dataset': { th: 'ชุดข้อมูล', en: 'Dataset' },
  'table.recordCount': { th: 'จำนวนเรคอร์ด', en: 'Record count' },
  'cpue.col.index': { th: '#', en: '#' },
  'cpue.col.station': { th: 'สถานี', en: 'Station' },
  'cpue.col.towMin': { th: 'เวลา Tow (นาที)', en: 'Tow time (min)' },
  'cpue.col.catchKg': { th: 'น้ำหนัก (กก.)', en: 'Catch (kg)' },
  'header.export': { th: 'ส่งออก', en: 'Export' },
  'header.quick': { th: 'การกระทำด่วน', en: 'Quick action' },
  'common.all': { th: 'ทั้งหมด', en: 'All' },
  // ThailandMap labels
  'map.switch.marine': { th: '🌊 เขตประมง & EEZ', en: '🌊 Marine zones & EEZ' },
  'map.switch.heatmap': { th: '🎯 จุดร้อนประมง', en: '🎯 Fishing hotspots' },
  'map.switch.provinces': { th: '📍 รายงานจังหวัด', en: '📍 Provinces overlay' },
  'map.legend.title': { th: 'คำอธิบาย:', en: 'Legend:' },
  'map.legend.province': { th: '🟦 จังหวัด', en: '🟦 Province' },
  'map.legend.eez': { th: '🟢 เขต EEZ', en: '🟢 EEZ' },
  'map.legend.fishing': { th: '🔵 พื้นที่ประมง', en: '🔵 Fishing area' },
  'map.legend.low': { th: 'ความหนาแน่นต่ำ', en: 'Low density' },
  'map.legend.high': { th: 'สูง', en: 'High' },
  // Popup
  'map.switch.stations': { th: '📍 สถานีจุดร้อน', en: '📍 Hotspot Stations' },
  'map.switch.grid': { th: '📏 ตารางกริด', en: '📏 Grid overlay' },
  'map.switch.tracks': { th: '🧭 เส้นทางลากอวน', en: '🧭 Haul tracks' },
  'map.tile.carto': { th: 'Carto Voyager (เห็นบก/ทะเลชัดเจน)', en: 'Carto Voyager (clear land/sea)' },
  'map.tile.osm': { th: 'OSM มาตรฐาน', en: 'OSM Standard' },
  'map.tile.esri': { th: 'Esri Ocean (มีป้ายกำกับ)', en: 'Esri Ocean (labels)' },
  'map.popup.region': { th: 'ภูมิภาค', en: 'Region' },
  'map.popup.type': { th: 'ประเภท', en: 'Type' },
  'map.popup.type.eez': { th: 'เขตเศรษฐกิจจำเพาะ', en: 'Exclusive Economic Zone' },
  'map.popup.type.fishing': { th: 'พื้นที่ประมง', en: 'Fishing area' },
  'map.popup.cpue': { th: 'CPUE', en: 'CPUE' },
  'map.popup.zone': { th: 'โซน', en: 'Zone' },
  'map.popup.depth': { th: 'ความลึก', en: 'Depth' },
  'map.popup.course': { th: 'ทิศทาง', en: 'Course' },
  'map.popup.month': { th: 'เดือน', en: 'Month' },
  'map.popup.temp': { th: 'อุณหภูมิ', en: 'Temperature' },
  'map.popup.do': { th: 'ออกซิเจนละลาย', en: 'DO' },
  'map.popup.salinity': { th: 'ความเค็ม', en: 'Salinity' },
  'map.legend.hotspotCells': { th: 'เซลล์จุดร้อน', en: 'hotspot cells' },
  'map.grid.cell': { th: 'เซลล์', en: 'Cell' },
  'map.grid.cpue': { th: 'CPUE', en: 'CPUE' },
  'map.grid.hauls': { th: 'เที่ยวลาก', en: 'Hauls' },
  'map.grid.catch': { th: 'สัตว์น้ำจับได้', en: 'Catch' },
  'map.grid.effort': { th: 'ความพยายาม', en: 'Effort' },
  // Water Quality
  'water.title': { th: 'คุณภาพน้ำ', en: 'Water Quality' },
  'water.desc': { th: 'Dashboard các chỉ số môi trường theo tháng/khu vực', en: 'Dashboard various environmental indicators by month/zone' },
  'water.month': { th: 'เดือน', en: 'Month' },
  'water.zone': { th: 'โซน', en: 'Zone' },
  'water.avgTemp': { th: 'อุณหภูมิเฉลี่ย (°C)', en: 'Avg Temp (°C)' },
  'water.avgDO': { th: 'ออกซิเจนละลายเฉลี่ย (mg/L)', en: 'Avg DO (mg/L)' },
  'water.avgpH': { th: 'pH เฉลี่ย', en: 'Avg pH' },
  'water.avgSalinity': { th: 'ความเค็มเฉลี่ย (PSU)', en: 'Avg Salinity (PSU)' },
  'water.radarChart': { th: 'เรดาร์: ค่าเฉลี่ยคุณภาพน้ำ', en: 'Radar: Water Quality mean' },
  'water.lineChart': { th: 'กราฟเส้น: แนวโน้มคุณภาพน้ำ', en: 'Line: Water Quality Trend' },
  'water.alertTable': { th: 'ตารางแจ้งเตือน (ค่าผิดปกติ)', en: 'Alert Table (Anomalies)' },
  'water.export.placeholder': { th: 'การส่งออกไฟล์จะเพิ่มในภายหลัง (ต้องติดตั้ง SheetJS/xlsx)', en: 'Export functionality will be added later (requires SheetJS/xlsx)' },
  'water.chart.temp': { th: 'อุณหภูมิ', en: 'Temp' },
  'water.chart.do': { th: 'ออกซิเจนละลาย', en: 'DO' },
  'water.chart.ph': { th: 'pH', en: 'pH' },
  'water.chart.salinity': { th: 'ความเค็ม', en: 'Salinity' },
  'water.top10': { th: 'Top 10 ค่าสูงสุด', en: 'Top 10 Highest Values' },
  // Shared filter labels
  'filter.year': { th: 'ปี', en: 'Year' },
  'filter.type': { th: 'ประเภท', en: 'Type' },
  'filter.type.previous': { th: 'ก่อนหน้า', en: 'Previous' },
  'filter.type.month': { th: 'เดือน', en: 'Month' },
  'filter.value': { th: 'ค่า', en: 'Value' },
  'filter.area': { th: 'พื้นที่', en: 'Area' },
  'filter.station': { th: 'สถานี', en: 'Station' },
  'filter.metric': { th: 'ตัวชี้วัด', en: 'Metric' },
  'filter.species': { th: 'ชนิดสัตว์น้ำ', en: 'Species' },
  'filter.search': { th: 'ค้นหา', en: 'Search' },
  // Loading
  'loading.api': { th: 'กำลังโหลดข้อมูลจาก API...', en: 'Loading data from API...' },
  // Hotspot KPI cards
  'hot.kpi.filteredCpue': { th: 'CPUE ที่กรองแล้ว', en: 'Filtered CPUE' },
  'hot.kpi.activeCells': { th: 'เซลล์ที่ใช้งาน', en: 'Active cells' },
  'hot.kpi.hotspotCells': { th: 'เซลล์จุดร้อน', en: 'Hotspot cells' },
  'hot.kpi.topHotspot': { th: 'จุดร้อนสูงสุด', en: 'Top hotspot' },
  'hot.kpi.weighted': { th: 'ถ่วงน้ำหนักตามยอดจับ/ความพยายาม', en: 'Weighted by catch/effort' },
  'hot.kpi.haulFiltered': { th: 'haul ที่กรองแล้ว', en: 'haul filtered' },
  'hot.kpi.noCell': { th: 'ไม่มีเซลล์จุดร้อน', en: 'No hotspot cell' },
  // CPUE chart titles
  'cpue.chart.byPeriod': { th: 'CPUE ตามช่วงเวลา', en: 'CPUE by Period' },
  'cpue.chart.byDepth': { th: 'CPUE ตามชั้นความลึก', en: 'CPUE by Depth class' },
  'cpue.chart.distribution': { th: 'การกระจาย CPUE (ฮิสโตแกรม)', en: 'CPUE Distribution (Histogram)' },
  'cpue.chart.byArea': { th: 'CPUE เปรียบเทียบตามพื้นที่', en: 'CPUE Comparison by Area' },
  // Dashboard chart titles
  'dash.chart.topStations': { th: 'สถานีอันดับสูงสุด (CPUE เฉลี่ย)', en: 'Top Stations (Avg CPUE)' },
  'dash.chart.cpueRange': { th: 'ช่วง CPUE (Min-Max) ตาม', en: 'CPUE Range (Min-Max) by' },
  'dash.chart.cpueVsDepth': { th: 'เปรียบเทียบ CPUE กับความลึก', en: 'CPUE vs Depth Comparison' },
  'dash.chart.envBy': { th: 'สิ่งแวดล้อม', en: 'Env' },
  'dash.chart.envOverview': { th: 'ภาพรวมตัวชี้วัดสิ่งแวดล้อม ตาม', en: 'Environmental Metrics Overview by' },
  'dash.chart.summary': { th: 'สรุป', en: 'Summary' },
  // Length chart titles
  'len.chart.histogram': { th: 'ฮิสโตแกรมความถี่ความยาว', en: 'Length Frequency Histogram' },
  'len.chart.proxyHistogram': { th: 'ฮิสโตแกรมการกระจายน้ำหนัก (ตัวแทน)', en: 'Weight Distribution Histogram (Proxy)' },
  'len.chart.lmeanByZone': { th: 'Lmean ตามโซน', en: 'Lmean by Zone' },
  'len.chart.lmeanByMonth': { th: 'Lmean ตามเดือน', en: 'Lmean by Month' },
  'len.chart.bioIndices': { th: 'ดัชนีชีววิทยา', en: 'Bio Indices' },
  'len.chart.details': { th: 'รายละเอียด (100 อันดับแรก)', en: 'Details (Top 100)' },
  // QC chart titles
  'ing.chart.status': { th: 'สถานะ QC', en: 'QC Status' },
  'ing.chart.topIssues': { th: 'ปัญหาหลักตามโซน', en: 'Top Issues by Zone' },
  // Users page
  'users.role': { th: 'บทบาท', en: 'Role' },
  'users.office': { th: 'สำนักงาน', en: 'Office' },
  'users.filterStatus': { th: 'สถานะ', en: 'Status' },
  'users.addUser': { th: 'เพิ่มผู้ใช้', en: 'Add User' },
  'users.loadDemo': { th: 'โหลดข้อมูลตัวอย่าง', en: 'Load Demo' },
  'users.noUsers': { th: 'ยังไม่มีผู้ใช้ คลิก "โหลดข้อมูลตัวอย่าง" เพื่อสร้าง 50 รายการ', en: 'No users found. Click "Load Demo" to seed 50 demo users.' },
  'users.placeholder': { th: 'ชื่อหรืออีเมล', en: 'Name or email' },
  'len.warn.proxyMode': { th: '⚠️ API ยังไม่มีข้อมูล length-bin/freqtext มาตรฐาน กราฟ Length/Bio Indices กำลังทำงานในโหมด proxy จาก total_weight', en: '⚠️ API does not yet have standard length-bin/freqtext data. Length/Bio Indices charts are running in proxy mode from total_weight.' },
  'len.warn.juvenile': { th: '⚠️ สัดส่วนปลาวัยอ่อนสูง (≥60%)', en: '⚠️ High juvenile ratio (≥60%)' },
}

type I18nContextValue = {
  lang: Language
  setLang: (lang: Language) => void
  t: (key: keyof typeof translations) => string
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('th')

  useEffect(() => {
    const saved = localStorage.getItem('lang') as Language | null
    if (saved) setLangState(saved)
  }, [])

  const setLang = useCallback((l: Language) => {
    setLangState(l)
    localStorage.setItem('lang', l)
    document.documentElement.lang = l === 'th' ? 'th' : 'en'
  }, [])

  const t = useCallback((key: keyof typeof translations) => {
    const entry = translations[key]
    return entry ? entry[lang] : String(key)
  }, [lang])

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
