import { useState } from 'react'
import { Droplets } from 'lucide-react'
import { Header, Stat, Table, Badge, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Card, CardContent, CardHeader, CardTitle } from '../components/common'
import { excelConvertedWaterQualityData } from '../data/convertedExcelData'
import { mockWaterQualityAlerts } from '../data/mockData'

// Adapt excel data to page format
function adaptExcelWaterQualityData(data: typeof excelConvertedWaterQualityData) {
  return data.map((record: any, index: number) => ({
    stationId: `WQ${String(index + 1).padStart(3, '0')}`,
    date: `2025-10-${String((index % 28) + 1).padStart(2, '0')}`,
    time: `${String(index % 24).padStart(2, '0')}:00`,
    measurements: {
      pH: { value: record.pH?.surface ?? record.pH, status: 'normal', statusThai: 'ปกติ' },
      temperature: { value: record.temperature?.surface ?? record.temperature, status: 'normal', statusThai: 'ปกติ' },
      dissolvedOxygen: { value: record.dissolvedOxygen?.surface ?? record.dissolvedOxygen, status: 'normal', statusThai: 'ปกติ' },
      salinity: { value: record.salinity?.surface ?? record.salinity, status: 'normal', statusThai: 'ปกติ' },
      turbidity: { value: 10 + Math.random() * 20, unit: 'NTU', status: 'clear', statusThai: 'ใส' },
      chlorophyl: { value: record.chlorophyl ?? (5 + Math.random() * 10), status: 'normal', statusThai: 'ปกติ' },
    },
    overallQualityThai: 'ดี',
    waterQualityIndex: 75 + Math.random() * 20,
    alerts: [] as string[],
  }))
}

export default function WaterQualityPage() {
  const adapted = adaptExcelWaterQualityData(excelConvertedWaterQualityData)
  const stationIds = Array.from(new Set(adapted.map((d: any) => d.stationId)))
  const [selectedStation, setSelectedStation] = useState(stationIds[0] || 'WQ001')
  const stationData = adapted.filter((d: any) => d.stationId === selectedStation)
  const latest = stationData[stationData.length - 1]
  const activeAlerts = mockWaterQualityAlerts.filter((a) => !a.resolved).length

  return (
    <div className="h-[calc(100vh-7rem)] overflow-y-auto scroll-smooth" style={{ paddingRight: 10 }}>
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b pb-4 mb-6 z-10">
        <Header title="ตรวจสอบคุณภาพน้ำ" desc="ติดตามคุณภาพน้ำแบบเรียลไทม์ มีดัชนีคุณภาพและการแจ้งเตือนสำหรับพื้นที่ประมง" icon={<Droplets className="h-6 w-6" />} />
        <div className="flex items-center gap-4" style={{ marginLeft: 5 }}>
          <Label className="whitespace-nowrap">สถานีตรวจวัด</Label>
          <Select defaultValue={selectedStation} onValueChange={setSelectedStation}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {stationIds.map((id) => (<SelectItem key={id} value={id}>{id}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4 px-1">
        <div className="grid grid-cols-4 gap-3">
          <Stat label="Water Quality Index" value={latest ? latest.waterQualityIndex.toFixed(2) : 0} hint="คะแนนคุณภาพน้ำโดยรวม" />
          <Stat label="สถานะโดยรวม" value={latest ? latest.overallQualityThai : 'ไม่มีข้อมูล'} />
          <Stat label="การแจ้งเตือนที่ใช้งาน" value={activeAlerts} hint="การแจ้งเตือนทั้งหมด" />
          <Stat label="สถานีตรวจวัดทั้งหมด" value={stationIds.length} hint="สถานีที่ใช้งานได้" />
        </div>

        {latest && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base">พารามิเตอร์ปัจจุบัน</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between items-center"><span>ค่า pH:</span><div className="flex items-center gap-2"><span className="font-medium">{latest.measurements.pH.value}</span><Badge className="bg-green-100 text-green-700">{latest.measurements.pH.statusThai}</Badge></div></div>
                  <div className="flex justify-between items-center"><span>อุณหภูมิ:</span><div className="flex items-center gap-2"><span className="font-medium">{latest.measurements.temperature.value}°C</span><Badge className="bg-green-100 text-green-700">{latest.measurements.temperature.statusThai}</Badge></div></div>
                  <div className="flex justify-between items-center"><span>ออกซิเจน:</span><div className="flex items-center gap-2"><span className="font-medium">{latest.measurements.dissolvedOxygen.value} mg/L</span><Badge className="bg-green-100 text-green-700">{latest.measurements.dissolvedOxygen.statusThai}</Badge></div></div>
                  <div className="flex justify-between items-center"><span>ความเค็ม:</span><div className="flex items-center gap-2"><span className="font-medium">{latest.measurements.salinity.value} PSU</span><Badge className="bg-blue-100 text-blue-700">{latest.measurements.salinity.statusThai}</Badge></div></div>
                  <div className="flex justify-between items-center"><span>ความขุ่น:</span><div className="flex items-center gap-2"><span className="font-medium">{latest.measurements.turbidity.value} NTU</span><Badge className="bg-green-100 text-green-700">{latest.measurements.turbidity.statusThai}</Badge></div></div>
                  <div className="flex justify-between items-center"><span>คลอโรฟิลล์:</span><div className="flex items-center gap-2"><span className="font-medium">{latest.measurements.chlorophyl.value} mg/L</span><Badge className="bg-green-100 text-green-700">{latest.measurements.chlorophyl.statusThai}</Badge></div></div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base">การแจ้งเตือนคุณภาพน้ำ</CardTitle></CardHeader>
              <CardContent className="p-2">
                <div className="h-[22rem] overflow-y-auto pr-2 p-2">
                  <Table
                    columns={['ประเภท', 'ระดับ', 'สถานี', 'ข้อความ', 'เวลา']}
                    rows={mockWaterQualityAlerts.slice(0, 15).map((alert) => [
                      alert.type,
                      <Badge key="severity" className={alert.severity==='critical'?'bg-red-100 text-red-700': alert.severity==='warning'?'bg-yellow-100 text-yellow-700':'bg-blue-100 text-blue-700'}>{alert.severityThai}</Badge>,
                      alert.stationName,
                      alert.messageThai,
                      new Date(alert.timestamp).toLocaleString('th-TH'),
                    ])}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}


