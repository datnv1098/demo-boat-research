import { useState } from 'react'
import { Activity } from 'lucide-react'
import { Header, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Card, CardContent, CardHeader, CardTitle } from '../components/common'
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area } from 'recharts'
import { excelConvertedCPUEData, excelConvertedSpeciesInfo } from '../data/convertedExcelData'
import { FISHING_AREAS } from '../data/mockData'

export default function CPUEPage() {
  const [species, setSpecies] = useState('ปลาทู')
  const [area, setArea] = useState('อ่าวไทยตอนล่าง (ชุมพร-สงขลา)')

  const rawData = excelConvertedCPUEData.filter((d) => d.species === species && d.fishingArea === area)
  const series = Object.entries(
    rawData.reduce((acc, d) => {
      if (!acc[d.month]) acc[d.month] = []
      acc[d.month].push(d.cpue)
      return acc
    }, {} as Record<string, number[]>)
  ).map(([month, cpueValues]) => ({ x: month, y: cpueValues.reduce((sum, val) => sum + val, 0) / cpueValues.length })).sort((a, b) => a.x.localeCompare(b.x))

  const speciesOptions = [...new Set(excelConvertedCPUEData.map(d => d.species))].sort()
  const areaOptions = Object.keys(FISHING_AREAS)

  return (
    <div>
      <Header title="CPUE มาตรฐาน" desc="คำนวณ CPUE ดิบและมาตรฐาน ค่าเฉลี่ยแบ่งชั้น และอนุกรมเวลาตามสปีชีส์/พื้นที่/ฤดูกาล" icon={<Activity className="h-6 w-6" />} />

      <div className="mb-4 flex items-center gap-4">
        <div className="w-72">
          <Label>สปีชีส์</Label>
          <Select defaultValue={species} onValueChange={setSpecies}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {speciesOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s} ({(excelConvertedSpeciesInfo as any)[s]?.scientificName || 'N/A'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-80">
          <Label>พื้นที่ประมง</Label>
          <Select defaultValue={area} onValueChange={setArea}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {areaOptions.slice(0, 6).map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="shadow-sm" style={{ marginLeft: '10px' }}>
        <CardHeader className="pb-5"><CardTitle>อนุกรมเวลา CPUE – {species}</CardTitle></CardHeader>
        <CardContent>
          <div className="h-100">
            <div style={{ width: '100%', height: '300px', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '10px', background: 'white' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="x" tick={{ fontSize: 11 }} axisLine={{ stroke: '#e2e8f0' }} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={{ stroke: '#e2e8f0' }} />
                  <Tooltip formatter={(value: any) => [Number(value).toFixed(2), 'CPUE (กก./ชม.)']} />
                  <Area type="monotone" dataKey="y" name="CPUE" fill="#3b82f6" fillOpacity={0.3} stroke="#3b82f6" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


