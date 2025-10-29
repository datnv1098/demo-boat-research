import { useEffect, useState } from 'react'
import { ClipboardCheck } from 'lucide-react'
import { Header, Table, Button } from '../components/common'
import { useI18n } from '../lib/i18n'
import * as XLSX from 'xlsx'
import { THAILAND_BOUNDS } from '../data/thailandGeoData'

export default function DataIngestionQCPage() {
  const [data, setData] = useState<any | null>(null)
  const [headerRows, setHeaderRows] = useState<any[]>([])
  const [catchRows, setCatchRows] = useState<any[]>([])
  const [waterRows, setWaterRows] = useState<any[]>([])
  const [tsSppRows, setTsSppRows] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const { t } = useI18n()
  const [qcLogs, setQcLogs] = useState<any[]>([])
  const [accepted, setAccepted] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch('/cmdec_mock.json')
      .then((r) => r.json())
      .then((d) => parseAndSet(d))
      .catch((e) => setError(String(e)))
  }, [])

  function parseAndSet(d: any) {
    setData(d)
    // load accepted from localStorage
    try {
      const saved = localStorage.getItem('qcAcceptedWarnings')
      if (saved) setAccepted(JSON.parse(saved))
    } catch {}
    const lowerKeys: Record<string, any> = {}
    Object.keys(d || {}).forEach((k) => (lowerKeys[k.toLowerCase()] = d[k]))
    const hdr = Array.isArray(lowerKeys['header']) ? lowerKeys['header'] : []
    const cth = Array.isArray(lowerKeys['catch']) ? lowerKeys['catch'] : []
    const wql = Array.isArray(lowerKeys['water_ql']) ? lowerKeys['water_ql'] : []
    const tss = Array.isArray(lowerKeys['ts_spp']) ? lowerKeys['ts_spp'] : []
    setHeaderRows(hdr)
    setCatchRows(cth)
    setWaterRows(wql)
    setTsSppRows(tss)
    const logs = validateSheets(hdr, cth, wql, tss)
    setQcLogs(logs)
  }

  function validateSheets(hdr: any[], cth: any[], wql: any[], tss: any[]) {
    const logs: any[] = []
    const sw = THAILAND_BOUNDS.southwest
    const ne = THAILAND_BOUNDS.northeast
    // index helpers
    const linkToCatchExists = new Set<string>()
    for (const row of cth) if (row?.Link) linkToCatchExists.add(String(row.Link))
    const linkToWater = new Map<string, any>()
    for (const row of wql) if (row?.Link) linkToWater.set(String(row.Link), row)
    const linkToTS = new Set<string>()
    for (const row of tss) if (row?.Link) linkToTS.add(String(row.Link))

    for (const h of hdr) {
      const tripId = String(h?.Link ?? '')
      const latStart = Number(h?.LatStart), lonStart = Number(h?.LongStart)
      const latEnd = Number(h?.LatEnd), lonEnd = Number(h?.LongEnd)
      const depth = Number(h?.Depth)
      const tow = Number(h?.Tow)
      const issues: string[] = []
      let status: 'ok' | 'warn' | 'error' = 'ok'

      // Lat/Lon bounds (start & end)
      const latlonValid = (lat: number, lon: number) => isFinite(lat) && isFinite(lon) && lat >= sw.lat && lat <= ne.lat && lon >= sw.lng && lon <= ne.lng
      if (!isFinite(latStart) || !isFinite(lonStart) || !isFinite(latEnd) || !isFinite(lonEnd)) {
        status = 'error'
        issues.push('พิกัดไม่ถูกต้อง (Lat/Lon)')
      } else if (!(latlonValid(latStart, lonStart) && latlonValid(latEnd, lonEnd))) {
        status = 'warn'
        issues.push('พิกัดอยู่นอกน่านน้ำที่กำหนด')
      }

      // Depth
      if (!isFinite(depth)) {
        issues.push('ไม่มีค่าความลึก (Depth)')
      } else {
        if (!(depth > 0 && depth >= 7 && depth <= 53)) {
          status = status === 'error' ? 'error' : 'warn'
          issues.push('Depth นอกช่วง 7–53 m')
        }
      }

      // Tow default 60 min
      if (isFinite(tow)) {
        if (Math.abs(tow - 60) > 1e-6) {
          status = status === 'error' ? 'error' : 'warn'
          issues.push('Tow != 60 นาที')
        }
      } else {
        issues.push('ไม่มีค่าเวลาลากอวน (Tow)')
      }

      // Speed_est_kn (not enough datapoints) -> informational
      if (!isFinite(Number(h?.Speed_est_kn))) {
        issues.push('Speed_est_kn: ไม่สามารถคำนวณ (ข้อมูลไม่ครบ)')
      }

      // Link Header↔Catch
      if (tripId) {
        if (!linkToCatchExists.has(tripId)) {
          status = status === 'error' ? 'error' : 'warn'
          issues.push('ไม่มีแถว Catch ที่เชื่อมด้วย Link เดียวกัน')
        }
      }

      // freqtext (TS_Spp) presence by Link
      if (tripId && !linkToTS.has(tripId)) issues.push('ไม่มีข้อมูล TS_Spp (freqtext) สำหรับ Link นี้')

      // Environment params
      const env = tripId ? linkToWater.get(tripId) : null
      if (env) {
        if (env.Temp != null && (env.Temp < 0 || env.Temp > 40)) {
          status = status === 'error' ? 'error' : 'warn'
          issues.push('Temp เกินช่วงปกติ')
        }
        if (env.DO != null && (env.DO < 0 || env.DO > 15)) {
          status = status === 'error' ? 'error' : 'warn'
          issues.push('DO เกินช่วงปกติ')
        }
        if (env.pH != null && (env.pH < 7.8 || env.pH > 8.3)) {
          status = status === 'error' ? 'error' : 'warn'
          issues.push('pH เกินช่วงปกติ (7.8–8.3)')
        }
        if (env.Salinity != null && (env.Salinity < 0 || env.Salinity > 40)) {
          status = status === 'error' ? 'error' : 'warn'
          issues.push('Salinity เกินช่วงปกติ')
        }
      } else {
        issues.push('ไม่มีค่าพารามิเตอร์สิ่งแวดล้อม (Temp/DO/pH/Salinity)')
      }

      const acceptedWarning = accepted[tripId] === true
      const finalStatus = acceptedWarning && status === 'warn' ? 'accepted' : status

      logs.push({ tripId, status: finalStatus, rawStatus: status, issues })
    }
    return logs
  }

  function onAcceptWarning(id: string) {
    setAccepted((prev) => ({ ...prev, [id]: true }))
    setQcLogs((prev) => prev.map((l) => (l.tripId === id && l.rawStatus === 'warn' ? { ...l, status: 'accepted' } : l)))
    try {
      const next = { ...accepted, [id]: true }
      localStorage.setItem('qcAcceptedWarnings', JSON.stringify(next))
    } catch {}
  }

  function onFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const wb = XLSX.read(reader.result, { type: 'binary' })
      const sheets: Record<string, any[]> = {}
      for (const sn of wb.SheetNames) {
        const ws = wb.Sheets[sn]
        sheets[sn] = XLSX.utils.sheet_to_json(ws, { defval: null })
      }
      parseAndSet(sheets)
    }
    reader.readAsBinaryString(file)
  }

  function exportCsv() {
    const header = ['Trip','Status','Issues']
    const lines = [header.join(',')]
    for (const l of qcLogs) {
      const status = l.status
      const issues = (l.issues || []).join(' | ').replace(/\n|\r/g, ' ')
      const row = [l.tripId, status, '"' + issues.replace(/"/g, '""') + '"']
      lines.push(row.join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'qc_logs.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportPdf() {
    const win = window.open('', '_blank', 'width=1024,height=768')
    if (!win) return
    const rowsHtml = qcLogs.slice(0, 500).map((l) => {
      const status = l.status === 'ok' ? '✅' : l.status === 'warn' ? '⚠️' : l.status === 'accepted' ? '☑️' : '❌'
      const issues = (l.issues || []).map((i: string) => `<li>${i}</li>`).join('')
      return `<tr><td style="padding:6px;border:1px solid #ddd;">${l.tripId}</td><td style="padding:6px;border:1px solid #ddd;">${status}</td><td style="padding:6px;border:1px solid #ddd;"><ul>${issues}</ul></td></tr>`
    }).join('')
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>QC Logs</title>
      <style>body{font-family: 'Noto Sans Thai', Arial, sans-serif;} table{border-collapse:collapse;width:100%;font-size:12px;} th{background:#f5f5f5;}</style>
      </head><body>
      <h2>QC Logs</h2>
      <table><thead><tr><th style="padding:6px;border:1px solid #ddd;">Trip</th><th style="padding:6px;border:1px solid #ddd;">Status</th><th style="padding:6px;border:1px solid #ddd;">Issues</th></tr></thead>
      <tbody>${rowsHtml}</tbody></table>
      <script>window.print();</script>
      </body></html>`)
    win.document.close()
  }

  return (
    <div>
      <Header title={t('ing.title')} desc={t('ing.desc')} icon={<ClipboardCheck className="h-6 w-6" />} />
      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
      {!data && !error && <div className="text-sm text-muted-foreground">{t('loading.demo')}</div>}
      {data && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input type="file" accept=".xlsx" onChange={onFileUpload} className="text-sm" />
            <Button className="bg-gray-100 text-gray-700 hover:bg-gray-200" onClick={() => {
              fetch('/cmdec_mock.json').then(r=>r.json()).then(parseAndSet)
            }}>โหลดข้อมูลสาธิต</Button>
          </div>

          <Table
            columns={[t('table.sheet'), t('table.records')]}
            rows={[["Header", headerRows.length], ["Catch", catchRows.length], ["Water_QL", waterRows.length], ["TS_Spp", tsSppRows.length]]}
          />

          <div className="text-sm font-medium mt-4">บันทึกการตรวจสอบคุณภาพ (QC Logs)</div>
          <div className="flex gap-2 mb-2">
            <Button className="bg-gray-100 text-gray-700 hover:bg-gray-200" onClick={exportCsv}>{t('header.export')} CSV</Button>
            <Button className="bg-gray-100 text-gray-700 hover:bg-gray-200" onClick={exportPdf}>{t('header.export')} PDF</Button>
          </div>
          <div>
          <Table
            columns={["Trip", "สถานะ", "ปัญหา/หมายเหตุ", "การทำงาน"]}
            maxHeight={'calc(100vh - 600px)'}
            rows={qcLogs.slice(0, 50).map((l) => [
              l.tripId,
              l.status === 'ok' ? '✅ ผ่าน' : l.status === 'warn' ? '⚠️ คำเตือน' : l.status === 'accepted' ? '☑️ ยอมรับเตือน' : '❌ ผิดพลาด',
              <ul className="list-disc pl-4">
                {l.issues.map((msg: string, idx: number) => (<li key={idx}>{msg}</li>))}
              </ul>,
              l.status === 'warn' ? <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => onAcceptWarning(l.tripId)}>Accept Warning</Button> : ''
            ])}
          />
          </div>
        </div>
      )}
    </div>
  )
}


