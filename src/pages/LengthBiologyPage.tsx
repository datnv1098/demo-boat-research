import { useState } from 'react'
import { Ruler } from 'lucide-react'
import { Header, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Card, CardContent, CardHeader, CardTitle, Stat } from '../components/common'
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts'
import { excelConvertedLengthData } from '../data/convertedExcelData'

export default function LengthBiologyPage() {
  const [selectedSpecies, setSelectedSpecies] = useState('ปลาทู')
  const lengthDist = excelConvertedLengthData.filter((d) => d.species === selectedSpecies && d.season === 'Q3').map((d) => ({ bin: d.lengthBin, Male: d.male, Female: d.female, Unsexed: d.unsexed }))
  const L95 = 28.2, meanLen = 19.7, underLm50 = 31.5

  return (
    <div>
      <Header title="วิเคราะห์ความยาว & ชีวภาพ" desc="แปลงข้อมูลความยาวเป็นฮิสโตแกรม; คำนวณ L95, ความยาวเฉลี่ย, % ต่ำกว่า Lm50, LFI; เตือนอัตราส่วนปลาเด็ก" icon={<Ruler className="h-6 w-6" />} />

      <div className="mb-4 flex items-center gap-4">
        <Label className="whitespace-nowrap">สปีชีส์</Label>
        <Select defaultValue={selectedSpecies} onValueChange={setSelectedSpecies}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[...new Set(excelConvertedLengthData.map(d => d.species))].sort().map((species) => (
              <SelectItem key={species} value={species}>{species}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Stat label="L95 (ซม.)" value={L95} hint="ความยาวที่เปอร์เซนไทล์ 95" />
        <Stat label="ความยาวเฉลี่ย (ซม.)" value={meanLen} />
        <Stat label="% < Lm50" value={`${underLm50}%`} hint="สัดส่วนปลาเด็ก" />
      </div>
      <Card className="shadow-sm">
        <CardHeader className="pb-2"><CardTitle>การแจกแจงความยาวตามเพศ - {selectedSpecies}</CardTitle></CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lengthDist}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bin" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Male" name="ตัวผู้" fill="#3b82f6" stackId="a" />
                <Bar dataKey="Female" name="ตัวเมีย" fill="#ec4899" stackId="a" />
                <Bar dataKey="Unsexed" name="ไม่ระบุ" fill="#6b7280" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


