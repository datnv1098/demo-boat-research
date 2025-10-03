import React, { useMemo, useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts";
import { Slider } from "./components/ui/slider";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Badge } from "./components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./components/ui/select";
import { Switch } from "./components/ui/switch";
import { Label } from "./components/ui/label";
import { Bell, Download, Map, Database, BarChart2, Settings, Bot, Activity, ShieldCheck, Ruler, Layers, Zap } from "lucide-react";
import { Chatbot } from "./components/Chatbot";

// Import professional Thai fisheries data
import { 
  mockTrips, 
  mockCPUEData, 
  mockLengthData, 
  mockSelectivityData, 
  mockForecastData, 
  mockAlerts,
  SPECIES_INFO,
  FISHING_AREAS
} from "./data/mockData";

// ------------------------------------------------------------
// Thai Fisheries Analytics Demo
// Professional fisheries management system with realistic Thai data
// Tech: React + TypeScript + Vite + TailwindCSS + shadcn/ui + Recharts
// ------------------------------------------------------------

// Additional computed data
const mockHotspotGrid = Array.from({ length: 8 }).map((_, r) =>
  Array.from({ length: 12 }).map((_, c) => ({
    r,
    c,
    density: Math.round(10 + Math.random() * 90),
    coordinates: { 
      lat: 6 + (r / 8) * 8, // Thailand's latitude range
      lon: 95 + (c / 12) * 8 // Thailand's longitude range
    }
  }))
);

const thaiReportSchedule = [
  { id: 1, name: "รายงาน CPUE รายเดือน", format: "PDF", nextRun: "2025-11-15 09:00", status: "ใช้งาน" },
  { id: 2, name: "ดัชนีความยาวรายไตรมาส", format: "Excel", nextRun: "2025-12-01 14:00", status: "ใช้งาน" },
  { id: 3, name: "แผนที่จุดร้อนประมง", format: "GeoJSON", nextRun: "2025-11-08 10:30", status: "หยุดชั่วคราว" },
  { id: 4, name: "ประเมินผลกระทบเครื่องมือ", format: "PowerPoint", nextRun: "2025-11-20 16:00", status: "ใช้งาน" },
  { id: 5, name: "สรุปสถิติการจับ", format: "PDF", nextRun: "2025-11-10 08:00", status: "ใช้งาน" },
];

const thaiFisheriesSchema = [
  { table: "trip_data", column: "trip_id", type: "varchar", desc: "รหัสการเดินทาง" },
  { table: "trip_data", column: "vessel_reg", type: "varchar", desc: "ทะเบียนเรือประมง" },
  { table: "trip_data", column: "departure_time", type: "timestamptz", desc: "เวลาออกเดินทาง" },
  { table: "trip_data", column: "fishing_area", type: "varchar", desc: "พื้นที่ประมง" },
  { table: "trip_data", column: "latitude", type: "numeric", desc: "ละติจูด (WGS84)" },
  { table: "trip_data", column: "longitude", type: "numeric", desc: "ลองจิจูด (WGS84)" },
  { table: "catch_data", column: "species_name", type: "varchar", desc: "ชื่อสปีชีส์ (ไทย/วิทยาศาสตร์)" },
  { table: "catch_data", column: "weight_kg", type: "numeric", desc: "น้ำหนักที่จับได้ (กก.)" },
  { table: "length_data", column: "length_cm", type: "numeric", desc: "ความยาวตัว (ซม.)" },
  { table: "length_data", column: "sex", type: "varchar", desc: "เพศ (ผู้/เมี้ยง/ไม่ระบุ)" },
];

const thaiAPIEndpoints = [
  { method: "GET", path: "/api/v1/cpue?species=ปลาทู&area=อ่าวไทยบน&season=Q3", desc: "อนุกรม CPUE มาตรฐาน" },
  { method: "GET", path: "/api/v1/length-indices?species=กุ้งกุลาดำ&area=อันดามัน", desc: "ดัชนีตามความยาว (L95, %<Lm50)" },
  { method: "POST", path: "/api/v1/scenario-simulation", desc: "รันการจำลองสถานการณ์" },
  { method: "GET", path: "/api/v1/closure-areas", desc: "รายการพื้นที่ปิดตามเวลา" },
];

function Header({ title, desc, icon }: { title: string; desc?: string; icon?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          {icon} {title}
        </h1>
        {desc && <p className="text-muted-foreground mt-1 max-w-3xl">{desc}</p>}
      </div>
      <div className="flex gap-2">
        <Button className="bg-gray-100 text-gray-700 hover:bg-gray-200"><Download className="h-4 w-4 mr-1"/>ส่งออก</Button>
        <Button className="bg-blue-600 text-white hover:bg-blue-700"><Zap className="h-4 w-4 mr-1"/>การกระทำด่วน</Button>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      {hint && <CardContent className="pt-0 text-sm text-muted-foreground">{hint}</CardContent>}
    </Card>
  );
}

function Table({ columns, rows }: { columns: string[]; rows: (string | number | React.ReactNode)[][] }) {
  return (
    <div className="overflow-auto rounded-xl border bg-background">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted/50">
          <tr>
            {columns.map((c) => (
              <th key={c} className="text-left px-3 py-2 font-medium text-muted-foreground border-b">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-muted/20">
              {r.map((cell, j) => (
                <td key={j} className="px-3 py-2 border-b align-top">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Pages ----------

function DataQualityPage() {
  return (
    <div>
      <Header title="คุณภาพข้อมูล & ควบคุมคุณภาพ" desc="ตรวจสอบข้อมูลการเดินทางประมงที่อัปโหลดด้วยกฎและสถิติ: พิกัด ระยะเวลา ความเร็ว ความลึก การซ้ำ; คำนวณดัชนีคุณภาพต่อการลาก/การเดินทาง" icon={<ShieldCheck className="h-6 w-6"/>} />
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Stat label="จำนวนครั้งที่ออกเก็บข้อมูล" value={mockTrips.length} hint="ในช่วงนี้" />
        <Stat label="ดัชนีคุณภาพเฉลี่ย" value={`${Math.round(mockTrips.reduce((a,b)=>a+b.dqScore,0)/mockTrips.length)} / 100`} />
        <Stat label="ปัญหาที่ตรวจพบ" value={mockTrips.reduce((a,b)=>a+(b.issues?.length||0),0)} hint="ทุกการเดินทาง" />
        <Stat label="จำนวนเรือทั้งหมด" value={new Set(mockTrips.map(t=>t.vessel)).size} />
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>บันทึกคุณภาพการเดินทาง</CardTitle>
          <CardDescription>ปัญหาที่ถูกติดธงจะถูกแสดงเพื่อความโปร่งใสและการตรวจสอบย้อนหลัง</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 overflow-y-auto pr-2">
            <Table
              columns={["รหัสการเดินทาง", "เรือ", "วันที่เริ่ม", "คะแนน DQ", "ปัญหา"]}
              rows={mockTrips.map(t => [
                t.tripId,
                t.vessel,
                t.startDate,
                <Badge key="dq" className="bg-blue-100 text-blue-700">{t.dqScore}</Badge>,
                <div className="flex flex-wrap gap-2" key="issues">{t.issues.length ? t.issues.map((i,ix)=> <Badge key={ix} className="bg-red-100 text-red-700">{i}</Badge>) : <Badge className="bg-gray-100 text-gray-700">ไม่มี</Badge>}</div>
              ])}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CPUEPage() {
  const [species, setSpecies] = useState("ปลาทู");
  const [area, setArea] = useState("อ่าวไทยตอนบน (ชลบุรี-ประจวบคีรีขันธ์)");
  
  // Filter and transform CPUE data for selected species and area
  const series = mockCPUEData
    .filter(d => d.species === species && d.fishingArea === area)
    .map(d => ({ x: d.month, y: d.cpue }));
  
  const speciesOptions = Object.keys(SPECIES_INFO);
  const areaOptions = Object.keys(FISHING_AREAS);
  
  return (
    <div>
      <Header title="CPUE มาตรฐาน" desc="คำนวณ CPUE ดิบและมาตรฐาน ค่าเฉลี่ยแบ่งชั้น และอนุกรมเวลาตามสปีชีส์/พื้นที่/ฤดูกาล" icon={<Activity className="h-6 w-6"/>} />

      <div className="mb-4 flex items-center gap-4">
        <div className="w-64">
          <Label>สปีชีส์</Label>
          <Select defaultValue={species} onValueChange={setSpecies}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {speciesOptions.map(s => (
                <SelectItem key={s} value={s}>{s} ({SPECIES_INFO[s].scientificName})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-64">
          <Label>พื้นที่ประมง</Label>
          <Select defaultValue={area} onValueChange={setArea}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {areaOptions.slice(0, 6).map(a => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button>ดาวน์โหลด CSV</Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-2"><CardTitle>อนุกรมเวลา CPUE – {species}</CardTitle></CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="y" name="CPUE (กก./ชม.)" fillOpacity={0.3} fill="#3b82f6" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LengthBiologyPage() {
  const [selectedSpecies, setSelectedSpecies] = useState("ปลาทู");
  
  // Filter length data for selected species
  const lengthDist = mockLengthData
    .filter(d => d.species === selectedSpecies && d.season === "Q3")
    .map(d => ({
      bin: d.lengthBin,
      Male: d.male,
      Female: d.female,
      Unsexed: d.unsexed
    }));
    
  const L95 = 28.2, meanLen = 19.7, underLm50 = 31.5;
  
  return (
    <div>
      <Header title="วิเคราะห์ความยาว & ชีวภาพ" desc="แปลงข้อมูลความยาวเป็นฮิสโตแกรม; คำนวณ L95, ความยาวเฉลี่ย, % ต่ำกว่า Lm50, LFI; เตือนอัตราส่วนปลาเด็ก" icon={<Ruler className="h-6 w-6"/>} />
      
      <div className="mb-4 w-64">
        <Label>สปีชีส์</Label>
        <Select defaultValue={selectedSpecies} onValueChange={setSelectedSpecies}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.keys(SPECIES_INFO).map(species => (
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
  );
}

function GearSelectivityPage() {
  return (
    <div>
      <Header title="การคัดเลือกของเครื่องมือ" desc="ประมาณค่า L50 และความชัน; จำลองการเปลี่ยนแปลงขนาดตาข่ายและผลกระทบต่อปลาเด็กและผลผลิต" icon={<Settings className="h-6 w-6"/>} />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Stat label="L50 ประมาณ (ซม.)" value={22.5} />
        <Stat label="ค่าความชัน (k)" value={0.28} />
        <Stat label="% ปลาเด็ก (จำลอง)" value={"18.7%"} />
      </div>
      <Card className="shadow-sm mb-6">
        <CardHeader className="pb-2"><CardTitle>เส้นโค้งการคัดเลือก</CardTitle></CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockSelectivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="length" label={{ value: "ความยาว (ซม.)", position: "insideBottom", offset: -2 }} />
                <YAxis label={{ value: "อัตราการเก็บ (%)", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Mesh 40mm" name="ตาข่าย 40มม." stroke="#3b82f6" />
                <Line type="monotone" dataKey="Mesh 50mm" name="ตาข่าย 50มม." stroke="#10b981" />
                <Line type="monotone" dataKey="Mesh 60mm" name="ตาข่าย 60มม." stroke="#f59e0b" />
                <Line type="monotone" dataKey="Cover Net" name="อวนคลุม" stroke="#ef4444" strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2"><CardTitle>จำลอง: ขนาดตาข่าย</CardTitle><CardDescription>ปรับขนาดตาข่ายและดูตัวอย่างสัดส่วนปลาเด็กและดัชนีผลผลิต</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6 items-center">
            <div>
              <Label>ขนาดตาข่าย (มม.)</Label>
              <Slider defaultValue={[45]} max={80} min={35} step={5} className="mt-2"/>
            </div>
            <Stat label="% ปลาเด็ก (จำลอง)" value="16.8%" />
            <Stat label="ดัชนีผลผลิต" value="1.12×" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function HotspotMapPage() {
  const [month, setMonth] = useState("ส.ค.");
  const thaiMonths = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
  
  return (
    <div>
      <Header title="แผนที่จุดร้อน" desc="อนุมานความหนาแน่น/CPUE มาตรฐานบนกริดเชิงพื้นที่-เวลา; จัดอันดับจุดร้อนตามสปีชีส์/เวลา" icon={<Map className="h-6 w-6"/>} />
      <div className="mb-4 w-56">
        <Label>เดือน</Label>
        <Select defaultValue={month} onValueChange={setMonth}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {thaiMonths.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Card className="shadow-sm">
        <CardHeader className="pb-2"><CardTitle>กริดความหนาแน่น – {month}</CardTitle><CardDescription>เซลล์ที่เข้มกว่าแสดงความหนาแน่นมาตรฐานที่สูงกว่า</CardDescription></CardHeader>
        <CardContent>
          <div className="h-80">
            <div className="grid grid-cols-12 gap-1">
              {mockHotspotGrid.flat().map((cell, idx) => (
                <div key={idx} className="h-8 rounded" style={{ backgroundColor: `hsl(${200 - cell.density * 1.5}deg 75% ${85 - cell.density * 0.6}% )` }} title={`เซลล์ (${cell.r},${cell.c}) – ${cell.density}%`}></div>
              ))}
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              ข้อมูล: พื้นที่อ่าวไทยและทะเลอันดามัน (จำลอง)
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ForecastAlertsPage() {
  const forecastData = mockForecastData.map(d => ({ week: d.week, CPUE: d.predicted }));
  
  return (
    <div>
      <Header title="พยากรณ์ & การแจ้งเตือนระยะสั้น" desc="พยากรณ์ 1-4 สัปดาห์โดยใช้ข้อมูลประวัติ; เรียกการแจ้งเตือนสำหรับสัดส่วนปลาเด็กและความผิดปกติของ CPUE" icon={<Bell className="h-6 w-6"/>} />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Stat label="ขอบเขตพยากรณ์" value="4 สัปดาห์" />
        <Stat label="การแจ้งเตือนที่ใช้งาน" value={mockAlerts.filter(a => a.status === 'active').length} />
        <Stat label="อัปเดตโมเดลล่าสุด" value="28 ก.ย. 2568" />
      </div>
      <Card className="shadow-sm mb-6">
        <CardHeader className="pb-2"><CardTitle>พยากรณ์ CPUE (สัปดาห์ข้างหน้า)</CardTitle></CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="CPUE" name="CPUE พยากรณ์" stroke="#3b82f6" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2"><CardTitle>การแจ้งเตือน</CardTitle></CardHeader>
        <CardContent>
          <div className="h-80 overflow-y-auto pr-2">
            <Table
              columns={["ประเภท", "ระดับ", "พื้นที่", "ข้อความ"]}
              rows={mockAlerts.map(a => [
                a.type, 
                <Badge key="lv" className={a.level === "สูง" || a.level === "สูงมาก" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}>{a.level}</Badge>, 
                a.area, 
                a.message
              ])}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function WhatIfSimulatorPage() {
  const [seasonClosed, setSeasonClosed] = useState(false);
  const [mesh, setMesh] = useState([45]);
  const [tow, setTow] = useState([60]);
  const simCPUE = useMemo(() => {
    const base = 32; const m = mesh[0]; const t = tow[0];
    const adj = (100 - Math.abs(m - 45)) * 0.025 + (65 - Math.abs(t - 65)) * 0.018;
    return Array.from({ length: 8 }).map((_, i) => ({ week: `W${i + 1}`, CPUE: +(base + adj + Math.sin(i/1.8)*3).toFixed(1) }));
  }, [mesh, tow]);
  const juvenile = useMemo(() => +(25 - (mesh[0]-45)*0.4 + (tow[0]-65)*0.08 + (seasonClosed? -4:0)).toFixed(1), [mesh, tow, seasonClosed]);

  return (
    <div>
      <Header title="ตัวจำลองการจัดการแบบ What-if" desc="เปรียบเทียบสถานการณ์นโยบาย: การปิดฤดูกาล, ขนาดตาข่าย, ระยะเวลาลาก; ดูผลกระทบต่อ CPUE และส่วนแบ่งปลาเด็ก" icon={<Settings className="h-6 w-6"/>} />

      <Card className="shadow-sm mb-6">
        <CardHeader><CardTitle>พารามิเตอร์สถานการณ์</CardTitle><CardDescription>ปรับตัวควบคุมและสังเกตผลลัพธ์ที่จำลอง</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>การปิดฤดูกาล</Label>
              <Switch checked={seasonClosed} onCheckedChange={setSeasonClosed} />
            </div>
            <div>
              <Label>ขนาดตาข่าย (มม.)</Label>
              <Slider value={mesh} onValueChange={setMesh} min={35} max={80} step={5} className="mt-2"/>
              <div className="text-sm text-muted-foreground mt-1">ปัจจุบัน: {mesh[0]} มม.</div>
            </div>
            <div>
              <Label>ระยะเวลาลาก (นาที)</Label>
              <Slider value={tow} onValueChange={setTow} min={30} max={120} step={5} className="mt-2"/>
              <div className="text-sm text-muted-foreground mt-1">ปัจจุบัน: {tow[0]} นาที</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Stat label="% ปลาเด็ก (จำลอง)" value={`${juvenile}%`} />
            <Stat label="ดัชนีผลผลิต" value={`${(1 + (mesh[0]-45)*0.015).toFixed(2)}×`} />
            <Stat label="สถานะปิดฤดู" value={seasonClosed? "ใช้":"ไม่ใช้"} />
            <Stat label="คะแนนสถานการณ์" value={`${Math.max(0, 85 + (seasonClosed? 5:0) - Math.abs(mesh[0]-45)*0.3).toFixed(0)}/100`} />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2"><CardTitle>CPUE จำลอง</CardTitle></CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={simCPUE}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="CPUE" name="CPUE จำลอง" stroke="#3b82f6" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ChatbotPage() {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "สวัสดีครับ! ถามเกี่ยวกับสปีชีส์, พื้นที่ประมง, ฤดูกาล หรือตัวชี้วัดได้เลยครับ ผมจะหาข้อมูลและวาดกราฟให้" },
  ]);
  const [input, setInput] = useState("");
  const onSend = () => {
    if (!input.trim()) return;
    setMessages((m) => [...m, { role: "user", text: input }, { role: "assistant", text: `ตอบ: ${input} (จำลอง)` }]);
    setInput("");
  };
  
  // Sample chart data from Thai species
  const sampleChartData = mockCPUEData
    .filter(d => d.species === "ปลาทู")
    .slice(-8)
    .map(d => ({ x: d.month, y: d.cpue }));
  
  return (
    <div>
      <Header title="AI Chatbot ประมง" desc="ถามตอบด้วยภาษาธรรมชาติพร้อมการอ้างอิงแหล่งที่มาและกราฟอัตโนมัติ (จำลอง)" icon={<Bot className="h-6 w-6"/>} />
      <div className="grid grid-cols-3 gap-6">
        <Card className="shadow-sm col-span-2">
          <CardHeader className="pb-2"><CardTitle>บทสนทนา</CardTitle></CardHeader>
          <CardContent>
            <div className="h-80 overflow-auto rounded-md border p-4 bg-muted/30 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-background border"}`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input placeholder="ถามเกี่ยวกับ CPUE ของปลาทูในอ่าวไทยตอนบน..." value={input} onChange={(e)=>setInput(e.target.value)} onKeyDown={(e)=> e.key==='Enter' && onSend()} />
              <Button onClick={onSend}>ส่ง</Button>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2"><CardTitle>กราฟตัวอย่าง</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sampleChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="y" name="CPUE (กก./ชม.)" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">แหล่งที่มา: ข้อมูลตัวอย่างปลาทู (จำลอง)</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ReportsPage() {
  return (
    <div>
      <Header title="แดชบอร์ด & รายงานอัตโนมัติ" desc="แดชบอร์ดแบบอินเตอร์แอคทีฟ และการส่งออก PDF/Excel/PowerPoint ตามกำหนดการ" icon={<BarChart2 className="h-6 w-6"/>} />
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Stat label="แดชบอร์ด" value={6} />
        <Stat label="รายงานที่กำหนดไว้" value={thaiReportSchedule.length} />
        <Stat label="การส่งออก (เดือนนี้)" value={23} />
        <Stat label="ผู้รับ" value={"กรมประมง, สถาบัน, องค์กรภายใน"} />
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-2"><CardTitle>ตารางเวลารายงาน</CardTitle></CardHeader>
        <CardContent>
          <div className="h-80 overflow-y-auto pr-2">
            <Table
              columns={["รายงาน", "รูปแบบ", "รันครั้งต่อไป", "การกระทำ"]}
              rows={thaiReportSchedule.map(r => [
                r.name, 
                r.format, 
                r.nextRun, 
                <div className="flex gap-2" key={r.id}>
                  <Button className="h-8 px-3 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200">
                    <Download className="h-3 w-3 mr-1"/>ทันที
                  </Button>
                  <Button className="h-8 px-3 text-xs bg-blue-600 text-white hover:bg-blue-700">รายละเอียด</Button>
                </div>
              ])}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DataMartAPIPage() {
  return (
    <div>
      <Header title="คลังข้อมูล & API มาตรฐาน" desc="ตารางมาตรฐานและ API ที่มีการควบคุมสิทธิ์เพื่อเชื่อมต่อกับระบบภายนอก (กรมประมง, สถาบันวิจัย, VMS)" icon={<Database className="h-6 w-6"/>} />
      <div className="grid grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-2"><CardTitle>โครงสร้างฐานข้อมูล</CardTitle></CardHeader>
          <CardContent>
            <div className="h-80 overflow-y-auto pr-2">
              <Table columns={["ตาราง", "คอลัมน์", "ประเภท", "คำอธิบาย"]} rows={thaiFisheriesSchema.map(s => [s.table, s.column, s.type, s.desc])} />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2"><CardTitle>จุดปลาย API</CardTitle></CardHeader>
          <CardContent>
            <div className="h-80 overflow-y-auto pr-2">
              <Table columns={["เมธอด", "เส้นทาง", "คำอธิบาย"]} rows={thaiAPIEndpoints.map(a => [a.method, <code key={a.path} className="text-xs">{a.path}</code>, a.desc])} />
              <div className="mt-4">
                <Label>กุญแจ API (จำลอง)</Label>
                <div className="mt-1 flex gap-2">
                  <Input value="th_fisheries_demo_key_67890" readOnly className="font-mono"/>
                  <Button className="bg-gray-100 text-gray-700 hover:bg-gray-200">คัดลอก</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TopNav() {
  return (
    <div className="h-14 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <Layers className="h-5 w-5"/>
        <span className="font-semibold">ระบบวิเคราะห์ประมงไทย</span>
        <Badge className="ml-2 bg-blue-100 text-blue-700">เดสก์ท็อป • ข้อมูลจำลอง</Badge>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        v1.0 • ต.ค. 2568
      </div>
    </div>
  );
}

const NAV = [
  { id: "dq", label: "คุณภาพข้อมูล", icon: <ShieldCheck className="h-4 w-4"/>, comp: <DataQualityPage/> },
  { id: "cpue", label: "CPUE", icon: <Activity className="h-4 w-4"/>, comp: <CPUEPage/> },
  { id: "length", label: "ความยาว & ชีวภาพ", icon: <Ruler className="h-4 w-4"/>, comp: <LengthBiologyPage/> },
  { id: "select", label: "การเลือกของเครื่องมือ", icon: <Settings className="h-4 w-4"/>, comp: <GearSelectivityPage/> },
  { id: "hotspot", label: "แผนที่จุดร้อน", icon: <Map className="h-4 w-4"/>, comp: <HotspotMapPage/> },
  { id: "forecast", label: "พยากรณ์ & แจ้งเตือน", icon: <Bell className="h-4 w-4"/>, comp: <ForecastAlertsPage/> },
  { id: "whatif", label: "จำลองสถานการณ์", icon: <Settings className="h-4 w-4"/>, comp: <WhatIfSimulatorPage/> },
  { id: "chatbot", label: "AI Chatbot", icon: <Bot className="h-4 w-4"/>, comp: <ChatbotPage/> },
  { id: "reports", label: "รายงาน & แดชบอร์ด", icon: <BarChart2 className="h-4 w-4"/>, comp: <ReportsPage/> },
  { id: "datamart", label: "คลังข้อมูล & API", icon: <Database className="h-4 w-4"/>, comp: <DataMartAPIPage/> },
];

export default function App() {
  const [active, setActive] = useState("dq");
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 text-foreground">
      <TopNav />
      <div className="max-w-[1300px] mx-auto px-6 py-6 grid grid-cols-[260px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="rounded-2xl border bg-background/60 backdrop-blur p-3">
          <div className="text-xs uppercase text-muted-foreground px-2 mb-2">ฟีเจอร์</div>
          <nav className="space-y-1">
            {NAV.map(item => (
              <button key={item.id} onClick={()=>setActive(item.id)} className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left transition ${active===item.id? "bg-primary/10 border border-primary/30":"hover:bg-muted"}`}>
                {item.icon}
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="mt-4 border-t pt-3 text-xs text-muted-foreground">
            โอเพ่นซอร์สเท่านั้น • อัปโหลดเป็นแบทช์
          </div>
        </aside>

        {/* Content */}
        <main className="pb-12">
          {NAV.find(n => n.id===active)?.comp}
        </main>
      </div>
      
      {/* Floating AI Chatbot */}
      <Chatbot />
    </div>
  );
}
