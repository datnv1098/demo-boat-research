import React from 'react'
import { Database } from 'lucide-react'
import { Header, Table, Badge, Button, Input, Label, Card, CardContent, CardHeader, CardTitle } from '../components/common'
import { thaiFisheriesSchema, thaiAPIEndpoints } from '../data/apiSchema'

export default function DataMartAPIPage() {
  const apiKey = 'th_fisheries_demo_key_67890'
  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text)
  const dataStats = { totalRecords: 156789, lastUpdate: '2025-10-15 14:30:25', dataSize: '2.3 GB', backupStatus: 'สำเร็จ' }
  const apiUsageStats = [
    { endpoint: '/api/v1/cpue', calls: 456, avgResponse: '120ms' },
    { endpoint: '/api/v1/length-indices', calls: 234, avgResponse: '95ms' },
    { endpoint: '/api/v1/scenario-simulation', calls: 89, avgResponse: '2.1s' },
    { endpoint: '/api/v1/closure-areas', calls: 123, avgResponse: '78ms' },
  ]

  return (
    <div>
      <Header title="คลังข้อมูล & API มาตรฐาน" desc="ตารางมาตรฐานและ API ที่มีการควบคุมสิทธิ์เพื่อเชื่อมต่อกับระบบภายนอก (กรมประมง, สถาบันวิจัย, VMS)" icon={<Database className="h-6 w-6" />} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="shadow-sm"><div className="p-3 text-sm"><div className="text-muted-foreground">จำนวนเรคคอร์ดทั้งหมด</div><div className="text-2xl font-semibold">{dataStats.totalRecords.toLocaleString()}</div><div className="text-xs text-muted-foreground">ข้อมูลประมง</div></div></div>
        <div className="shadow-sm"><div className="p-3 text-sm"><div className="text-muted-foreground">ขนาดข้อมูล</div><div className="text-2xl font-semibold">{dataStats.dataSize}</div><div className="text-xs text-muted-foreground">ฐานข้อมูลหลัก</div></div></div>
        <div className="shadow-sm"><div className="p-3 text-sm"><div className="text-muted-foreground">อัปเดตล่าสุด</div><div className="text-2xl font-semibold">{dataStats.lastUpdate.split(' ')[0]}</div><div className="text-xs text-muted-foreground">{dataStats.lastUpdate.split(' ')[1]}</div></div></div>
        <div className="shadow-sm"><div className="p-3 text-sm"><div className="text-muted-foreground">สถานะสำรองข้อมูล</div><div className="text-2xl font-semibold">{dataStats.backupStatus}</div><div className="text-xs text-muted-foreground">สำเร็จ</div></div></div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-2"><CardTitle>โครงสร้างฐานข้อมูล</CardTitle></CardHeader>
        <CardContent>
          <div className="h-80 overflow-y-auto pr-2">
            <Table columns={['ตาราง', 'คอลัมน์', 'ประเภท', 'คำอธิบาย']} rows={thaiFisheriesSchema.map((s) => [s.table, s.column, s.type, s.desc])} />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm mt-4">
        <CardHeader className="pb-2"><CardTitle>จุดปลาย API</CardTitle></CardHeader>
        <CardContent>
          <div className="h-80 overflow-y-auto pr-2">
            <Table columns={['เมธอด', 'เส้นทาง', 'คำอธิบาย']} rows={thaiAPIEndpoints.map((a) => [a.method, <code key={a.path} className="text-xs">{a.path}</code>, a.desc])} />
            <div className="mt-4">
              <Label>กุญแจ API (จำลอง)</Label>
              <div className="mt-1 flex gap-2">
                <Input value={apiKey} readOnly className="font-mono" />
                <Button className="bg-gray-100 text-gray-700 hover:bg-gray-200" onClick={() => copyToClipboard(apiKey)}>คัดลอก</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm mt-4">
        <CardHeader className="pb-2"><CardTitle>สถิติการใช้งาน API</CardTitle></CardHeader>
        <CardContent>
          <div className="h-80 overflow-y-auto pr-2">
            <Table columns={['Endpoint', 'จำนวนครั้ง', 'เวลาตอบสนองเฉลี่ย', 'สถานะ']} rows={apiUsageStats.map((stat) => [<code key={stat.endpoint} className="text-xs">{stat.endpoint}</code>, stat.calls.toLocaleString(), stat.avgResponse, <Badge key={`status-${stat.endpoint}`} className="bg-green-100 text-green-700">ปกติ</Badge>])} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


