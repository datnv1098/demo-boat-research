import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type Language = 'th' | 'en'

type Translations = Record<string, Record<Language, string>>

const translations: Translations = {
  'nav.ingestionQc': { th: 'นำเข้า & ตรวจสอบคุณภาพ', en: 'Ingestion & QC' },
  'nav.cpue': { th: 'CPUE', en: 'CPUE' },
  'nav.lengthBio': { th: 'ความยาว & ชีววิทยา', en: 'Length & Biology' },
  'nav.hotspot': { th: 'แผนที่จุดร้อน', en: 'Hotspot Map' },
  'nav.dashboard': { th: 'แดชบอร์ด', en: 'Dashboard' },
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
  'dash.title': { th: 'แดชบอร์ด', en: 'Dashboard' },
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
