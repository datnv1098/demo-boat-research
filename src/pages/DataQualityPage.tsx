import React, { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Header, Stat, Table, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/common'
import { excelConvertedTrips } from '../data/convertedExcelData'

export default function DataQualityPage() {
  const totalTrips = excelConvertedTrips.length
  const avgDQScore = Math.round(excelConvertedTrips.reduce((a, b) => a + b.dqScore, 0) / totalTrips)
  const totalIssues = excelConvertedTrips.reduce((a, b) => a + (b.issues?.length || 0), 0)

  const [uploadedTrips, setUploadedTrips] = useState<any[]>([])
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set())
  const [dqPage, setDqPage] = useState(1)
  const dqPageSize = 12

  function parseCSV(content: string) {
    const lines = content.split(/\r?\n/).filter(l => l.trim().length)
    if (lines.length < 2) return [] as any[]
    const headers = lines[0].split(',').map(h => h.trim())
    return lines.slice(1).map(line => {
      const cols = line.split(',')
      const obj: any = {}
      headers.forEach((h, i) => { obj[h] = cols[i] })
      return obj
    })
  }

  async function handleUpload(file: File) {
    const text = await file.text()
    let rows: any[] = []
    if (file.name.toLowerCase().endsWith('.json')) rows = JSON.parse(text)
    else rows = parseCSV(text)
    const mapped = rows.map((r, idx) => ({
      tripId: r.tripId || r.trip_id || r.id || `UP_${Date.now()}_${idx}`,
      vessel: r.vessel || r.vessel_reg || r.boat || 'เรือทดลอง',
      fishingArea: r.fishingArea || r.area || 'อ่าวไทย',
      startDate: r.startDate || r.date || '2025-10-01',
      dqScore: Number(r.dqScore ?? r.dq_score ?? 65 + Math.round(Math.random()*30)),
      issues: Array.isArray(r.issues) ? r.issues : (r.issues ? String(r.issues).split('|') : ['พิกัดคลาดเคลื่อน']),
    }))
    setUploadedTrips(prev => [...mapped, ...prev])
    setDqPage(1)
  }

  function acceptTrip(tripId: string) {
    setAcceptedIds(prev => new Set(prev).add(tripId))
  }

  const issueTypes: Record<string, number> = {}
  excelConvertedTrips.forEach(trip => {
    trip.issues?.forEach(issue => { issueTypes[issue] = (issueTypes[issue] || 0) + 1 })
  })

  const monthlyDQ: Record<string, { trips: number; totalDQ: number; issues: number }> = {}
  excelConvertedTrips.forEach(trip => {
    const month = trip.startDate.substring(0, 7)
    if (!monthlyDQ[month]) monthlyDQ[month] = { trips: 0, totalDQ: 0, issues: 0 }
    monthlyDQ[month].trips++
    monthlyDQ[month].totalDQ += trip.dqScore
    monthlyDQ[month].issues += trip.issues?.length || 0
  })
  const monthlyDQData = Object.entries(monthlyDQ).sort(([a],[b]) => a.localeCompare(b)).map(([month, data]) => ({ month, avgDQ: Math.round(data.totalDQ / data.trips), issueRate: Math.round((data.issues / data.trips) * 100) / 100 }))
  const issueChartData = totalIssues > 0 ? Object.entries(issueTypes).sort(([,a],[,b]) => b - a).slice(0,8).map(([issue, count]) => ({ issue: issue.length>20?issue.substring(0,20)+'...':issue, count, percentage: Math.round((count/totalIssues)*100) })) : []

  const combinedRows = [ ...excelConvertedTrips.map(t => ({ ...t, __source: 'API' })), ...uploadedTrips.map(t => ({ ...t, __source: 'อัปโหลด' })) ]
  const totalCombined = combinedRows.length
  const totalPages = Math.max(1, Math.ceil(totalCombined / dqPageSize))
  const pageRows = combinedRows.slice((dqPage - 1) * dqPageSize, dqPage * dqPageSize)

  return (
    <div>
      <Header title="คุณภาพข้อมูล & ควบคุมคุณภาพ" desc="อัปโหลด/ตรวจสอบคุณภาพข้อมูลสำรวจ; รวมข้อมูลจาก API/Upload พร้อม Accept รายการที่มีคำเตือน" icon={<ShieldCheck className="h-6 w-6" />} />

      <Card className="shadow-sm mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">นำเข้าข้อมูล (CSV/JSON)</CardTitle>
          <CardDescription>อัปโหลดข้อมูลสำรวจเพื่อประเมินคุณภาพและรวมกับข้อมูล API</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <input type="file" accept=".csv,.json" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f) }} />
            <Badge className="bg-gray-100 text-gray-700">ไฟล์ที่รองรับ: .csv, .json</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">บันทึกการสำรวจและคุณภาพข้อมูล</CardTitle>
          <CardDescription>รายละเอียดการสำรวจ (API + อัปโหลด) พร้อมการประเมินคุณภาพข้อมูลและปัญหาที่ตรวจพบ</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 overflow-y-auto pr-2">
            <Table
              columns={[ 'รหัสการสำรวจ','เรือ','พื้นที่','วันที่','คะแนน DQ','ปัญหา','สถานะ','แหล่งที่มา','การกระทำ' ]}
              rows={pageRows.map((t: any) => [
                t.tripId,
                t.vessel,
                String(t.fishingArea||'').split(' ')[0],
                t.startDate,
                <Badge key={`dq-${t.tripId}`} className={ t.dqScore>=90?'bg-green-100 text-green-700' : t.dqScore>=70?'bg-blue-100 text-blue-700':'bg-red-100 text-red-700' }>{t.dqScore}</Badge>,
                <div className="flex flex-wrap gap-1" key={`issues-${t.tripId}`}>
                  {t.issues?.length ? (
                    t.issues.slice(0,2).map((i: string, ix: number) => (
                      <Badge key={`issue-${t.tripId}-${ix}`} className="bg-red-100 text-red-700 text-xs">{i.length>15?i.substring(0,15)+'...':i}</Badge>
                    ))
                  ) : (<Badge key={`no-issue-${t.tripId}`} className="bg-gray-100 text-gray-700 text-xs">ไม่มีปัญหา</Badge>)}
                  {t.issues?.length>2 && (<Badge key={`more-issues-${t.tripId}`} className="bg-gray-100 text-gray-700 text-xs">+{t.issues.length-2}</Badge>)}
                </div>,
                <Badge key={`status-${t.tripId}`} className={ acceptedIds.has(t.tripId) ? 'bg-green-100 text-green-700' : t.dqScore>=90?'bg-green-100 text-green-700': t.dqScore>=70?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700' }>{ acceptedIds.has(t.tripId)?'ยอมรับแล้ว' : (t.dqScore>=90?'ดีเยี่ยม': t.dqScore>=70?'ดี':'ต้องปรับปรุง') }</Badge>,
                <Badge key={`src-${t.tripId}`} className="bg-gray-100 text-gray-700">{t.__source || 'API'}</Badge>,
                <div key={`act-${t.tripId}`} className="flex gap-2">{ (!acceptedIds.has(t.tripId) && (t.issues?.length||0)>0) && (<Button className="h-8 px-3 text-xs bg-blue-600 text-white hover:bg-blue-700" onClick={() => acceptTrip(t.tripId)}>Accept</Button>) }</div>
              ])}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <div>แสดง {pageRows.length} จากทั้งหมด {totalCombined} รายการ</div>
            <div className="flex items-center gap-2">
              <Button className="h-8 px-3 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200" disabled={dqPage===1} onClick={() => setDqPage(p=>Math.max(1,p-1))}>ก่อนหน้า</Button>
              <span>หน้า {dqPage}/{totalPages}</span>
              <Button className="h-8 px-3 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200" disabled={dqPage===totalPages} onClick={() => setDqPage(p=>Math.min(totalPages,p+1))}>ถัดไป</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


