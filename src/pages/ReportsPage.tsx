import { useState } from 'react'
import { BarChart2, Download } from 'lucide-react'
import { Header, Stat, Table, Button, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/common'
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, LineChart, Line, Bar } from 'recharts'
import { excelConvertedWaterQualityData } from '../data/convertedExcelData'

const thaiReportSchedule = [
  { id: 1, name: 'รายงาน CPUE รายเดือน', format: 'PDF', nextRun: '2025-11-15 09:00', status: 'ใช้งาน' },
  { id: 2, name: 'ดัชนีความยาวรายไตรมาส', format: 'Excel', nextRun: '2025-12-01 14:00', status: 'ใช้งาน' },
  { id: 3, name: 'แผนที่จุดร้อนประมง', format: 'GeoJSON', nextRun: '2025-11-08 10:30', status: 'หยุดชั่วคราว' },
  { id: 4, name: 'ประเมินผลกระทบเครื่องมือ', format: 'PowerPoint', nextRun: '2025-11-20 16:00', status: 'ใช้งาน' },
  { id: 5, name: 'สรุปสถิติการจับ', format: 'PDF', nextRun: '2025-11-10 08:00', status: 'ใช้งาน' },
]

type ParamKey = 'pH' | 'temperature' | 'dissolvedOxygen' | 'salinity'

export default function ReportsPage() {
  const [param, setParam] = useState<ParamKey>('pH')
  const stationIds = Array.from(new Set(excelConvertedWaterQualityData.map((_: any, idx: number) => `WQ${String(idx + 1).padStart(3, '0')}`)))
  const [selectedStation, setSelectedStation] = useState(stationIds[0] || 'WQ001')

  function getParamValue(rec: any, key: ParamKey) {
    if (!rec) return null
    if (key === 'pH') return rec.pH?.surface ?? rec.pH
    if (key === 'temperature') return rec.temperature?.surface ?? rec.temperature
    if (key === 'dissolvedOxygen') return rec.dissolvedOxygen?.surface ?? rec.dissolvedOxygen
    if (key === 'salinity') return rec.salinity?.surface ?? rec.salinity
    return null
  }

  const latestStationCompare = stationIds.map((sid, i) => {
    const rec = excelConvertedWaterQualityData[i]
    const value = getParamValue(rec as any, param)
    return { station: sid, value: typeof value === 'number' ? value : Number(value) || 0 }
  })

  const timeSeries = excelConvertedWaterQualityData.map((rec: any, idx: number) => {
    const date = `2025-10-${String((idx % 28) + 1).padStart(2, '0')}`
    const value = getParamValue(rec, param)
    return { date, value: typeof value === 'number' ? value : Number(value) || 0 }
  })

  function toCSV<T extends Record<string, any>>(rows: T[], headers?: string[]) {
    if (!rows.length) return ''
    const cols = headers || Object.keys(rows[0])
    const escape = (v: any) => {
      const s = String(v ?? '')
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
    }
    const head = cols.join(',')
    const body = rows.map(r => cols.map(c => escape(r[c])).join(',')).join('\n')
    return head + '\n' + body
  }

  function downloadCSV(filename: string, rows: any[], headers?: string[]) {
    const csv = toCSV(rows, headers)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <Header title="แดชบอร์ด & รายงานอัตโนมัติ" desc="แดชบอร์ดแบบอินเตอร์แอคทีฟ และการส่งออก PDF/Excel/PowerPoint ตามกำหนดการ" icon={<BarChart2 className="h-6 w-6" />} />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Stat label="แดชบอร์ด" value={6} />
        <Stat label="รายงานที่กำหนดไว้" value={thaiReportSchedule.length} />
        <Stat label="การส่งออก (เดือนนี้)" value={23} />
        <Stat label="ผู้รับ" value={'กรมประมง, สถาบัน, องค์กรภายใน'} />
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-2"><CardTitle>ตารางเวลารายงาน</CardTitle></CardHeader>
        <CardContent>
          <div className="h-80 overflow-y-auto pr-2">
            <Table columns={['รายงาน', 'รูปแบบ', 'รันครั้งต่อไป', 'การกระทำ']}
              rows={thaiReportSchedule.map((r) => [
                r.name,
                r.format,
                r.nextRun,
                <div className="flex gap-2" key={r.id}>
                  <Button className="h-8 px-3 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200"><Download className="h-3 w-3 mr-1" />ทันที</Button>
                  <Button className="h-8 px-3 text-xs bg-blue-600 text-white hover:bg-blue-700">รายละเอียด</Button>
                </div>,
              ])}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm mt-6">
        <CardHeader className="pb-2">
          <CardTitle>เปรียบเทียบสถานีและช่วงเวลา</CardTitle>
          <CardDescription>เปรียบเทียบค่าพารามิเตอร์ระหว่างสถานี และอนุกรมเวลาของหนึ่งสถานี</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div>
              <Label className="text-xs">พารามิเตอร์</Label>
              <Select defaultValue={param} onValueChange={(v: any) => setParam(v)}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pH">pH</SelectItem>
                  <SelectItem value="temperature">อุณหภูมิ (°C)</SelectItem>
                  <SelectItem value="dissolvedOxygen">DO (mg/L)</SelectItem>
                  <SelectItem value="salinity">ความเค็ม (PSU)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">สถานี</Label>
              <Select defaultValue={selectedStation} onValueChange={setSelectedStation}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {stationIds.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button className="h-8 px-3 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200" onClick={() => downloadCSV(`compare_stations_${param}.csv`, latestStationCompare, ['station','value'])}>ดาวน์โหลดเทียบสถานี (CSV)</Button>
              <Button className="h-8 px-3 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200" onClick={() => downloadCSV(`timeseries_${selectedStation}_${param}.csv`, timeSeries, ['date','value'])}>ดาวน์โหลดอนุกรมเวลา (CSV)</Button>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base">เทียบสถานี (ค่าล่าสุด)</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={latestStationCompare}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="station" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" name={param} fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base">อนุกรมเวลา ({selectedStation})</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeSeries}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" name={param} stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


