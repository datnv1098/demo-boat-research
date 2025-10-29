import React, { useState } from 'react'
import { Map } from 'lucide-react'
import { Header, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/common'
import { ThailandMap } from '../components/ThailandMap'

interface HotspotCell { r: number; c: number; density: number; coordinates: { lat: number; lon: number } }

const mockHotspotGrid: HotspotCell[][] = Array.from({ length: 8 }).map((_, r) =>
  Array.from({ length: 12 }).map((_, c) => ({ r, c, density: Math.round(10 + Math.random() * 90), coordinates: { lat: 6 + (r / 8) * 8, lon: 95 + (c / 12) * 8 } }))
)

export default function HotspotMapPage() {
  const [month, setMonth] = useState('ส.ค.')
  const thaiMonths = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

  return (
    <div>
      <Header title="แผนที่จุดร้อน" desc="อนุมานความหนาแน่น/CPUE มาตรฐานบนกริดเชิงพื้นที่-เวลา; จัดอันดับจุดร้อนตามสปีชีส์/เวลา" icon={<Map className="h-6 w-6" />} />
      <div className="mb-4 w-56">
        <Label>เดือน</Label>
        <Select defaultValue={month} onValueChange={setMonth}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {thaiMonths.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <ThailandMap hotspotData={mockHotspotGrid as any} month={month} />
    </div>
  )
}


