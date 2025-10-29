import React, { useState } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from 'recharts'
// import { Slider } from './components/ui/slider'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Badge } from './components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './components/ui/card'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from './components/ui/select'
// import { Switch } from './components/ui/switch'
import { Label } from './components/ui/label'
import {
  // Bell,
  Download,
  Map,
  Database,
  BarChart2,
  // Settings,
  // Bot,
  Activity,
  ShieldCheck,
  Ruler,
  Layers,
  Zap,
  Droplets,
} from 'lucide-react'
import { ThailandMap } from './components/ThailandMap'

// Import converted Excel data
import {
  excelConvertedTrips,
  excelConvertedCPUEData,
  excelConvertedLengthData,
  excelConvertedSpeciesInfo,
  excelConvertedWaterQualityData
} from './data/convertedExcelData'

// Import additional mock data for features not in Excel
import {
  // mockSelectivityData,
  // mockForecastData,
  // mockAlerts,
  FISHING_AREAS,
  mockWaterQualityAlerts,
} from './data/mockData'
import { formatValidDate } from './lib/utils'

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
      lon: 95 + (c / 12) * 8, // Thailand's longitude range
    },
  }))
)

const thaiReportSchedule = [
  {
    id: 1,
    name: 'รายงาน CPUE รายเดือน',
    format: 'PDF',
    nextRun: '2025-11-15 09:00',
    status: 'ใช้งาน',
  },
  {
    id: 2,
    name: 'ดัชนีความยาวรายไตรมาส',
    format: 'Excel',
    nextRun: '2025-12-01 14:00',
    status: 'ใช้งาน',
  },
  {
    id: 3,
    name: 'แผนที่จุดร้อนประมง',
    format: 'GeoJSON',
    nextRun: '2025-11-08 10:30',
    status: 'หยุดชั่วคราว',
  },
  {
    id: 4,
    name: 'ประเมินผลกระทบเครื่องมือ',
    format: 'PowerPoint',
    nextRun: '2025-11-20 16:00',
    status: 'ใช้งาน',
  },
  {
    id: 5,
    name: 'สรุปสถิติการจับ',
    format: 'PDF',
    nextRun: '2025-11-10 08:00',
    status: 'ใช้งาน',
  },
]

const thaiFisheriesSchema = [
  {
    table: 'trip_data',
    column: 'trip_id',
    type: 'varchar',
    desc: 'รหัสการเดินทาง',
  },
  {
    table: 'trip_data',
    column: 'vessel_reg',
    type: 'varchar',
    desc: 'ทะเบียนเรือประมง',
  },
  {
    table: 'trip_data',
    column: 'departure_time',
    type: 'timestamptz',
    desc: 'เวลาออกเดินทาง',
  },
  {
    table: 'trip_data',
    column: 'fishing_area',
    type: 'varchar',
    desc: 'พื้นที่ประมง',
  },
  {
    table: 'trip_data',
    column: 'latitude',
    type: 'numeric',
    desc: 'ละติจูด (WGS84)',
  },
  {
    table: 'trip_data',
    column: 'longitude',
    type: 'numeric',
    desc: 'ลองจิจูด (WGS84)',
  },
  {
    table: 'catch_data',
    column: 'species_name',
    type: 'varchar',
    desc: 'ชื่อสปีชีส์ (ไทย/วิทยาศาสตร์)',
  },
  {
    table: 'catch_data',
    column: 'weight_kg',
    type: 'numeric',
    desc: 'น้ำหนักที่จับได้ (กก.)',
  },
  {
    table: 'length_data',
    column: 'length_cm',
    type: 'numeric',
    desc: 'ความยาวตัว (ซม.)',
  },
  {
    table: 'length_data',
    column: 'sex',
    type: 'varchar',
    desc: 'เพศ (ผู้/เมี้ยง/ไม่ระบุ)',
  },
]

const thaiAPIEndpoints = [
  {
    method: 'GET',
    path: '/api/v1/cpue?species=ปลาทู&area=อ่าวไทยบน&season=Q3',
    desc: 'อนุกรม CPUE มาตรฐาน',
  },
  {
    method: 'GET',
    path: '/api/v1/length-indices?species=กุ้งกุลาดำ&area=อันดามัน',
    desc: 'ดัชนีตามความยาว (L95, %<Lm50)',
  },
  {
    method: 'POST',
    path: '/api/v1/scenario-simulation',
    desc: 'รันการจำลองสถานการณ์',
  },
  {
    method: 'GET',
    path: '/api/v1/closure-areas',
    desc: 'รายการพื้นที่ปิดตามเวลา',
  },
]

function Header({
  title,
  desc,
  icon,
}: {
  title: string
  desc?: string
  icon?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          {icon} {title}
        </h1>
        {desc && <p className="text-muted-foreground mt-1 max-w-3xl">{desc}</p>}
      </div>
      <div className="flex gap-2">
        <Button className="bg-gray-100 text-gray-700 hover:bg-gray-200">
          <Download className="h-4 w-4 mr-1" />
          ส่งออก
        </Button>
        <Button className="bg-blue-600 text-white hover:bg-blue-700">
          <Zap className="h-4 w-4 mr-1" />
          การกระทำด่วน
        </Button>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      {hint && (
        <CardContent className="pt-0 text-sm text-muted-foreground">
          {hint}
        </CardContent>
      )}
    </Card>
  )
}

function Table({
  columns,
  rows,
}: {
  columns: string[]
  rows: (string | number | React.ReactNode)[][]
}) {
  return (
    <div className="overflow-auto rounded-xl border bg-background">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted/50">
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                className="text-left px-3 py-2 font-medium text-muted-foreground border-b"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-muted/20">
              {r.map((cell, j) => (
                <td key={j} className="px-3 py-2 border-b align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------- Pages ----------

function DataQualityPage() {
  // Enhanced data quality analysis from Excel data
  const totalTrips = excelConvertedTrips.length;
  const avgDQScore = Math.round(
    excelConvertedTrips.reduce((a, b) => a + b.dqScore, 0) / totalTrips
  );
  const totalIssues = excelConvertedTrips.reduce((a, b) => a + (b.issues?.length || 0), 0);

  // Analyze issues by type
  const issueTypes: Record<string, number> = {};
  excelConvertedTrips.forEach(trip => {
    trip.issues?.forEach(issue => {
      issueTypes[issue] = (issueTypes[issue] || 0) + 1;
    });
  });

  // Data quality by fishing area
  const dqByArea: Record<string, { trips: number; totalDQ: number; issues: number }> = {};
  excelConvertedTrips.forEach(trip => {
    if (!dqByArea[trip.fishingArea]) {
      dqByArea[trip.fishingArea] = { trips: 0, totalDQ: 0, issues: 0 };
    }
    dqByArea[trip.fishingArea].trips++;
    dqByArea[trip.fishingArea].totalDQ += trip.dqScore;
    dqByArea[trip.fishingArea].issues += trip.issues?.length || 0;
  });

  // Monthly data quality trends
  const monthlyDQ: Record<string, { trips: number; totalDQ: number; issues: number }> = {};
  excelConvertedTrips.forEach(trip => {
    const month = trip.startDate.substring(0, 7); // YYYY-MM
    if (!monthlyDQ[month]) {
      monthlyDQ[month] = { trips: 0, totalDQ: 0, issues: 0 };
    }
    monthlyDQ[month].trips++;
    monthlyDQ[month].totalDQ += trip.dqScore;
    monthlyDQ[month].issues += trip.issues?.length || 0;
  });

  const monthlyDQData = Object.entries(monthlyDQ)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      avgDQ: Math.round(data.totalDQ / data.trips),
      issueRate: Math.round((data.issues / data.trips) * 100) / 100
    }));

  // Issue type analysis for chart
  const issueChartData = totalIssues > 0 ? Object.entries(issueTypes)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 8)
    .map(([issue, count]) => ({
      issue: issue.length > 20 ? issue.substring(0, 20) + '...' : issue,
      count,
      percentage: Math.round((count / totalIssues) * 100)
    })) : [];

  return (
    <div>
      <Header
        title="คุณภาพข้อมูล & ควบคุมคุณภาพ"
        desc="วิเคราะห์คุณภาพข้อมูลจากการสำรวจประมงด้วย Excel: ตรวจสอบพิกัด ความลึก ระยะเวลา การซ้ำซ้อน; คำนวณดัชนีคุณภาพและอัตราการปฏิบัติตามกฎ"
        icon={<ShieldCheck className="h-6 w-6" />}
      />

      {/* Enhanced Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat
          label="จำนวนการสำรวจ"
          value={totalTrips}
          hint="จากข้อมูล Excel"
        />
        <Stat
          label="ดัชนีคุณภาพเฉลี่ย"
          value={`${avgDQScore}/100`}
          hint={`${Math.round((avgDQScore/100)*100)}% compliance`}
        />
        <Stat
          label="ปัญหาที่ตรวจพบ"
          value={totalIssues}
          hint={`${Math.round((totalIssues/totalTrips)*100)}% ของการสำรวจ`}
        />
        <Stat
          label="จำนวนเรือที่ใช้งาน"
          value={new Set(excelConvertedTrips.map((t) => t.vessel)).size}
          hint="จากข้อมูลจริง"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Data Quality Trends */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">แนวโน้มคุณภาพข้อมูลรายเดือน</CardTitle>
            <CardDescription>ติดตามการปรับปรุงคุณภาพข้อมูลตามช่วงเวลา</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyDQData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="dq" orientation="left" domain={[0, 100]} />
                <YAxis yAxisId="issues" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="dq"
                  type="monotone"
                  dataKey="avgDQ"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="ดัชนีคุณภาพ"
                />
                <Line
                  yAxisId="issues"
                  type="monotone"
                  dataKey="issueRate"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="อัตราปัญหา"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Issue Types Analysis */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">ประเภทปัญหาที่ตรวจพบ</CardTitle>
            <CardDescription>การกระจายของปัญหาต่างๆ ในข้อมูลสำรวจ</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
                <BarChart data={issueChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="issue" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value: any) => [value, 'จำนวนครั้ง']} />
                <Bar dataKey="count" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Data Quality by Fishing Area - TEMPORARILY COMMENTED OUT */}
      {/*
      <Card className="shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="text-lg">คุณภาพข้อมูลตามพื้นที่ประมง</CardTitle>
          <CardDescription>เปรียบเทียบคุณภาพข้อมูลในแต่ละพื้นที่สำรวจ</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table
              columns={['พื้นที่ประมง', 'จำนวนการสำรวจ', 'ดัชนีคุณภาพเฉลี่ย', 'จำนวนปัญหา', 'อัตราการปฏิบัติตาม']}
              rows={Object.entries(dqByArea).map(([area, data]) => [
                area,
                data.trips,
                `${Math.round(data.totalDQ / data.trips)}/100`,
                data.issues,
                <Badge key={`compliance-${area}`} className={
                  Math.round(data.totalDQ / data.trips) >= 90 ? "bg-green-100 text-green-700" :
                  Math.round(data.totalDQ / data.trips) >= 70 ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-700"
                }>
                  {Math.round((data.totalDQ / data.trips) / 100 * 100)}%
                </Badge>
              ])}
            />
          </div>
        </CardContent>
      </Card>
      */}

      {/* Detailed Trip Records */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">บันทึกการสำรวจและคุณภาพข้อมูล</CardTitle>
          <CardDescription>
            รายละเอียดการสำรวจแต่ละครั้งพร้อมการประเมินคุณภาพข้อมูลและปัญหาที่ตรวจพบ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 overflow-y-auto pr-2">
            <Table
              columns={[
                'รหัสการสำรวจ',
                'เรือ',
                'พื้นที่',
                'วันที่',
                'คะแนน DQ',
                'ปัญหา',
                'สถานะ'
              ]}
              rows={excelConvertedTrips.map((t) => [
                t.tripId,
                t.vessel,
                t.fishingArea.split(' ')[0],
                t.startDate,
                <Badge key={`dq-${t.tripId}`} className={
                  t.dqScore >= 90 ? "bg-green-100 text-green-700" :
                  t.dqScore >= 70 ? "bg-blue-100 text-blue-700" :
                  "bg-red-100 text-red-700"
                }>
                  {t.dqScore}
                </Badge>,
                <div className="flex flex-wrap gap-1" key={`issues-${t.tripId}`}>
                  {t.issues.length ? (
                    t.issues.slice(0, 2).map((i, ix) => (
                      <Badge key={`issue-${t.tripId}-${ix}`} className="bg-red-100 text-red-700 text-xs">
                        {i.length > 15 ? i.substring(0, 15) + '...' : i}
                      </Badge>
                    ))
                  ) : (
                    <Badge key={`no-issue-${t.tripId}`} className="bg-gray-100 text-gray-700 text-xs">ไม่มีปัญหา</Badge>
                  )}
                  {t.issues.length > 2 && (
                    <Badge key={`more-issues-${t.tripId}`} className="bg-gray-100 text-gray-700 text-xs">
                      +{t.issues.length - 2}
                    </Badge>
                  )}
                </div>,
                <Badge key={`status-${t.tripId}`} className={
                  t.dqScore >= 90 ? "bg-green-100 text-green-700" :
                  t.dqScore >= 70 ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-700"
                }>
                  {t.dqScore >= 90 ? 'ดีเยี่ยม' : t.dqScore >= 70 ? 'ดี' : 'ต้องปรับปรุง'}
                </Badge>
              ])}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function CPUEPage() {
  const [species, setSpecies] = useState('ปลาทู')
  const [area, setArea] = useState('อ่าวไทยตอนล่าง (ชุมพร-สงขลา)')

  // Filter and aggregate CPUE data for selected species and area
  // Group by month and calculate average CPUE to handle duplicates
  const rawData = excelConvertedCPUEData
    .filter((d) => d.species === species && d.fishingArea === area)


  const series = Object.entries(
    rawData.reduce((acc, d) => {
      if (!acc[d.month]) {
        acc[d.month] = []
      }
      acc[d.month].push(d.cpue)
      return acc
    }, {} as Record<string, number[]>)
  )
    .map(([month, cpueValues]) => ({
      x: month,
      y: cpueValues.reduce((sum, val) => sum + val, 0) / cpueValues.length
    }))
    .sort((a, b) => a.x.localeCompare(b.x))



  // Only show species that have CPUE data
  const speciesOptions = [...new Set(excelConvertedCPUEData.map(d => d.species))].sort()
  const areaOptions = Object.keys(FISHING_AREAS)

  return (
    <div>
      <Header
        title="CPUE มาตรฐาน"
        desc="คำนวณ CPUE ดิบและมาตรฐาน ค่าเฉลี่ยแบ่งชั้น และอนุกรมเวลาตามสปีชีส์/พื้นที่/ฤดูกาล"
        icon={<Activity className="h-6 w-6" />}
      />

      <div className="mb-4 flex items-center gap-4">
        <div className="w-72">
          <Label>สปีชีส์</Label>
          <Select defaultValue={species} onValueChange={setSpecies}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
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
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {areaOptions.slice(0, 6).map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* <Button>ดาวน์โหลด CSV</Button> */}
      </div>

      <Card className="shadow-sm" style={{ marginLeft: '10px' }}>
        <CardHeader className="pb-5">
          <CardTitle>อนุกรมเวลา CPUE – {species}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-100">
            <div style={{ marginBottom: '10px' }}>
              <button
                onClick={() => {
                  // Force chart re-render by changing a state
                  setSpecies(species);
                }}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                🔄 Force Re-render
              </button>
            </div>

            {/* Chart container with explicit dimensions */}
            <div style={{
              width: '100%',
              height: '300px',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              padding: '10px',
              background: 'white'
            }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={series}
                  margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
                  key={`area-${species}-${area}-${series.length}-${Date.now()}`}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="x"
                    tick={{ fontSize: 11 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <Tooltip
                    formatter={(value) => [Number(value).toFixed(2), 'CPUE (กก./ชม.)']}
                    labelFormatter={(label) => `Tháng: ${label}`}
                    contentStyle={{
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="y"
                    name="CPUE"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 5, fill: '#1d4ed8' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Fallback: Simple div-based visualization */}
            <div style={{ marginTop: '10px', padding: '10px', background: '#f8fafc', borderRadius: '4px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
                📈 Raw Data Points ({series.length}):
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                gap: '4px',
                fontSize: '10px',
                maxHeight: '100px',
                overflowY: 'auto'
              }}>
                {series.slice(0, 12).map((point, i) => (
                  <div key={i} style={{
                    background: '#e2e8f0',
                    padding: '4px',
                    borderRadius: '2px',
                    textAlign: 'center'
                  }}>
                    {point.x}: {point.y.toFixed(1)}
                  </div>
                ))}
                {series.length > 12 && (
                  <div style={{
                    background: '#cbd5e1',
                    padding: '4px',
                    borderRadius: '2px',
                    textAlign: 'center'
                  }}>
                    +{series.length - 12} more...
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function LengthBiologyPage() {
  const [selectedSpecies, setSelectedSpecies] = useState('ปลาทู')

  // Filter length data for selected species
  const lengthDist = excelConvertedLengthData
    .filter((d) => d.species === selectedSpecies && d.season === 'Q3')
    .map((d) => ({
      bin: d.lengthBin,
      Male: d.male,
      Female: d.female,
      Unsexed: d.unsexed,
    }))

  const L95 = 28.2,
    meanLen = 19.7,
    underLm50 = 31.5

  return (
    <div>
      <Header
        title="วิเคราะห์ความยาว & ชีวภาพ"
        desc="แปลงข้อมูลความยาวเป็นฮิสโตแกรม; คำนวณ L95, ความยาวเฉลี่ย, % ต่ำกว่า Lm50, LFI; เตือนอัตราส่วนปลาเด็ก"
        icon={<Ruler className="h-6 w-6" />}
      />

      <div className="mb-4 flex items-center gap-4">
        <Label className="whitespace-nowrap">สปีชีส์</Label>
        <Select
          defaultValue={selectedSpecies}
          onValueChange={setSelectedSpecies}
        >
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[...new Set(excelConvertedLengthData.map(d => d.species))].sort().map((species) => (
              <SelectItem key={species} value={species}>
                {species}
              </SelectItem>
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
        <CardHeader className="pb-2">
          <CardTitle>การแจกแจงความยาวตามเพศ - {selectedSpecies}</CardTitle>
        </CardHeader>
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
                <Bar
                  dataKey="Female"
                  name="ตัวเมีย"
                  fill="#ec4899"
                  stackId="a"
                />
                <Bar
                  dataKey="Unsexed"
                  name="ไม่ระบุ"
                  fill="#6b7280"
                  stackId="a"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function HotspotMapPage() {
  const [month, setMonth] = useState('ส.ค.')
  const thaiMonths = [
    'ม.ค.',
    'ก.พ.',
    'มี.ค.',
    'เม.ย.',
    'พ.ค.',
    'มิ.ย.',
    'ก.ค.',
    'ส.ค.',
    'ก.ย.',
    'ต.ค.',
    'พ.ย.',
    'ธ.ค.',
  ]

  return (
    <div>
      <Header
        title="แผนที่จุดร้อน"
        desc="อนุมานความหนาแน่น/CPUE มาตรฐานบนกริดเชิงพื้นที่-เวลา; จัดอันดับจุดร้อนตามสปีชีส์/เวลา"
        icon={<Map className="h-6 w-6" />}
      />
      <div className="mb-4 w-56">
        <Label>เดือน</Label>
        <Select defaultValue={month} onValueChange={setMonth}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {thaiMonths.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ThailandMap hotspotData={mockHotspotGrid} month={month} />
    </div>
  )
}

function ReportsPage() {
  return (
    <div>
      <Header
        title="แดชบอร์ด & รายงานอัตโนมัติ"
        desc="แดชบอร์ดแบบอินเตอร์แอคทีฟ และการส่งออก PDF/Excel/PowerPoint ตามกำหนดการ"
        icon={<BarChart2 className="h-6 w-6" />}
      />
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Stat label="แดชบอร์ด" value={6} />
        <Stat label="รายงานที่กำหนดไว้" value={thaiReportSchedule.length} />
        <Stat label="การส่งออก (เดือนนี้)" value={23} />
        <Stat label="ผู้รับ" value={'กรมประมง, สถาบัน, องค์กรภายใน'} />
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle>ตารางเวลารายงาน</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 overflow-y-auto pr-2">
            <Table
              columns={['รายงาน', 'รูปแบบ', 'รันครั้งต่อไป', 'การกระทำ']}
              rows={thaiReportSchedule.map((r) => [
                r.name,
                r.format,
                r.nextRun,
                <div className="flex gap-2" key={r.id}>
                  <Button className="h-8 px-3 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200">
                    <Download className="h-3 w-3 mr-1" />
                    ทันที
                  </Button>
                  <Button className="h-8 px-3 text-xs bg-blue-600 text-white hover:bg-blue-700">
                    รายละเอียด
                  </Button>
                </div>,
              ])}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Adapter to convert Excel water quality data to compatible format
const adaptExcelWaterQualityData = (excelData: typeof excelConvertedWaterQualityData) => {
  return excelData.map((record: any, index: number) => ({
    stationId: `WQ${String(index + 1).padStart(3, '0')}`,
    date: `2025-10-${String((index % 28) + 1).padStart(2, '0')}`,
    time: `${String((index % 24)).padStart(2, '0')}:00`,
    measurements: {
      pH: { value: record.pH.surface, status: 'normal', statusThai: 'ปกติ' },
      temperature: { value: record.temperature.surface, status: 'normal', statusThai: 'ปกติ' },
      dissolvedOxygen: { value: record.dissolvedOxygen.surface, status: 'normal', statusThai: 'ปกติ' },
      salinity: { value: record.salinity.surface, status: 'normal', statusThai: 'ปกติ' },
      turbidity: { value: 10 + Math.random() * 20, unit: 'NTU', status: 'clear', statusThai: 'ใส' },
      conductivity: { value: 35000 + Math.random() * 10000 }, // Mock conductivity
      chlorophyl: { value: record.chlorophyl || 5 + Math.random() * 10, status: 'normal', statusThai: 'ปกติ' }
    },
    overallQuality: 'good' as const,
    overallQualityThai: 'ดี',
    waterQualityIndex: 75 + Math.random() * 20,
    fishingRecommendation: 'เงื่อนไขน้ำเหมาะสมสำหรับการประมง แนะนำใช้เครื่องมือลากและอุปกรณ์เสริม',
    alerts: []
  }));
};

function WaterQualityPage() {
  const [selectedStation, setSelectedStation] = useState('WQ001')

  // Use adapted Excel water quality data
  const adaptedWaterQualityData = adaptExcelWaterQualityData(excelConvertedWaterQualityData);

  // Filter water quality data for selected station
  const stationData = adaptedWaterQualityData.filter(
    (d: any) => d.stationId === selectedStation
  )
  const latestData = stationData[stationData.length - 1]

  // Time series data for charts (currently commented out)

  // Calculate averages
  const activeAlerts = mockWaterQualityAlerts.filter((a) => !a.resolved).length

  return (
    <div
      className="h-[calc(100vh-7rem)] overflow-y-auto scroll-smooth"
      style={{ paddingRight: 10 }}
    >
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b pb-4 mb-6 z-10">
        <Header
          title="ตรวจสอบคุณภาพน้ำ"
          desc="ระบบติดตามคุณภาพน้ำแบบเรียลไทม์ พร้อมการแจ้งเตือนและการประเมิน Water Quality Index สำหรับพื้นที่ประมง"
          icon={<Droplets className="h-6 w-6" />}
        />

        <div className="flex items-center gap-4" style={{ marginLeft: 5 }}>
          <Label className="whitespace-nowrap">สถานีตรวจวัด</Label>
          <Select
            defaultValue={selectedStation}
            onValueChange={setSelectedStation}
          >
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from(new Set(adaptedWaterQualityData.map((d: any) => d.stationId))).map((stationId) => (
                <SelectItem key={stationId} value={stationId}>
                  {stationId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4 px-1">
        <div className="grid grid-cols-4 gap-3">
          <Stat
            label="Water Quality Index"
            value={latestData ? latestData.waterQualityIndex.toFixed(2) : 0}
            hint="คะแนนคุณภาพน้ำโดยรวม"
          />
          <Stat
            label="สถานะโดยรวม"
            value={latestData ? latestData.overallQualityThai : 'ไม่มีข้อมูล'}
          />
          <Stat
            label="การแจ้งเตือนที่ใช้งาน"
            value={activeAlerts}
            hint="การแจ้งเตือนทั้งหมด"
          />
          <Stat
            label="สถานีตรวจวัดทั้งหมด"
            value={new Set(adaptedWaterQualityData.map((d: any) => d.stationId)).size}
            hint="สถานีที่ใช้งานได้"
          />
        </div>

        {/* TEMPORARILY COMMENTED OUT - Water Quality Charts */}
        {/*
        <div className="grid grid-cols-3 gap-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                ค่า pH (24 ชั่วโมงล่าสุด)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer
                  width="120%"
                  height="100%"
                  style={{ marginLeft: -45 }}
                >
                  <LineChart data={pHData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" fontSize={11} />
                    <YAxis domain={[6.5, 9.0]} fontSize={11} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name="pH"
                      stroke="#10b981"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">อุณหภูมิน้ำ (°C)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer
                  width="120%"
                  height="100%"
                  style={{ marginLeft: -45 }}
                >
                  <LineChart data={tempData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name="อุณหภูมิ"
                      stroke="#f59e0b"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                ออกซิเจนละลายน้ำ (mg/L)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer
                  width="120%"
                  height="100%"
                  style={{ marginLeft: -45 }}
                >
                  <LineChart data={oxygenData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name="DO"
                      stroke="#3b82f6"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
        */}

        {latestData && (
          <div className="grid grid-cols-2 gap-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">พารามิเตอร์ปัจจุบัน</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center text-sm">
                    <span>ค่า pH:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {latestData.measurements.pH.value}
                      </span>
                      <Badge
                        className={
                          latestData.measurements.pH.status === 'excellent' ||
                          latestData.measurements.pH.status === 'good'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }
                      >
                        {latestData.measurements.pH.statusThai}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>อุณหภูมิ:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {latestData.measurements.temperature.value}°C
                      </span>
                      <Badge
                        className={
                          latestData.measurements.temperature.status ===
                          'normal'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                        }
                      >
                        {latestData.measurements.temperature.statusThai}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>ออกซิเจน:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {latestData.measurements.dissolvedOxygen.value} mg/L
                      </span>
                      <Badge
                        className={
                          latestData.measurements.dissolvedOxygen.status ===
                            'excellent' ||
                          latestData.measurements.dissolvedOxygen.status ===
                            'good'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }
                      >
                        {latestData.measurements.dissolvedOxygen.statusThai}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>ความเค็ม:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {latestData.measurements.salinity.value} PSU
                      </span>
                      <Badge className="bg-blue-100 text-blue-700">
                        {latestData.measurements.salinity.statusThai}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>ความขุ่น:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {latestData.measurements.turbidity.value} NTU
                      </span>
                      <Badge
                        className={
                          latestData.measurements.turbidity.status === 'clear'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }
                      >
                        {latestData.measurements.turbidity.statusThai}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>คลอโรฟิลล์:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {latestData.measurements.chlorophyl.value} mg/L
                      </span>
                      <Badge
                        className={
                          latestData.measurements.chlorophyl.status === 'normal'
                            ? 'bg-green-100 text-green-700'
                            : latestData.measurements.chlorophyl.status ===
                              'bloom'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }
                      >
                        {latestData.measurements.chlorophyl.statusThai}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">คำแนะนำการประมง</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm">
                      {latestData.fishingRecommendation}
                    </p>
                  </div>
                  {latestData.alerts.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 text-sm">
                        การแจ้งเตือน:
                      </h4>
                      <div className="space-y-1.5">
                        {latestData.alerts.map((alert: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-xs"
                          >
                            <div className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0"></div>
                            <span>{alert}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">การแจ้งเตือนคุณภาพน้ำ</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div
              className="h-[32rem] overflow-y-auto pr-2 p-2"
              style={{ marginLeft: 10 }}
            >
              <Table
                columns={['ประเภท', 'ระดับ', 'สถานี', 'ข้อความ', 'เวลา']}
                rows={mockWaterQualityAlerts.slice(0, 15).map((alert) => [
                  alert.type,
                  <Badge
                    key="severity"
                    className={
                      alert.severity === 'critical'
                        ? 'bg-red-100 text-red-700'
                        : alert.severity === 'warning'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-blue-100 text-blue-700'
                    }
                  >
                    {alert.severityThai}
                  </Badge>,
                  alert.stationName,
                  alert.messageThai,
                  formatValidDate(alert.timestamp),
                ])}
              />
            </div>
          </CardContent>
        </Card>

        {/* Scroll indicator */}
        <div className="text-center py-2 text-xs text-muted-foreground">
          ⬆️ ข้อมูล ⬆️
        </div>
      </div>
    </div>
  )
}

function DataMartAPIPage() {
  return (
    <div>
      <Header
        title="คลังข้อมูล & API มาตรฐาน"
        desc="ตารางมาตรฐานและ API ที่มีการควบคุมสิทธิ์เพื่อเชื่อมต่อกับระบบภายนอก (กรมประมง, สถาบันวิจัย, VMS)"
        icon={<Database className="h-6 w-6" />}
      />
      <div className="space-y-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle>โครงสร้างฐานข้อมูล</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 overflow-y-auto pr-2">
              <Table
                columns={['ตาราง', 'คอลัมน์', 'ประเภท', 'คำอธิบาย']}
                rows={thaiFisheriesSchema.map((s) => [
                  s.table,
                  s.column,
                  s.type,
                  s.desc,
                ])}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle>จุดปลาย API</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 overflow-y-auto pr-2">
              <Table
                columns={['เมธอด', 'เส้นทาง', 'คำอธิบาย']}
                rows={thaiAPIEndpoints.map((a) => [
                  a.method,
                  <code key={a.path} className="text-xs">
                    {a.path}
                  </code>,
                  a.desc,
                ])}
              />
              <div className="mt-4">
                <Label>กุญแจ API (จำลอง)</Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    value="th_fisheries_demo_key_67890"
                    readOnly
                    className="font-mono"
                  />
                  <Button className="bg-gray-100 text-gray-700 hover:bg-gray-200">
                    คัดลอก
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle>การเชื่อมต่อระบบภายนอก</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">กรมประมง</span>
                  </div>
                  <Badge className="bg-green-100 text-green-700">ออนไลน์</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm font-medium">VMS กองทัพเรือ</span>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-700">ซิงค์</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium">สถาบันวิจัย</span>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700">พร้อม</Badge>
                </div>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <div>• API calls ในวันนี้: 1,247 ครั้ง</div>
                <div>• อัตราการตอบสนอง: 98.7%</div>
                <div>• ข้อมูลซิงค์ล่าสุด: 15 นาทีที่แล้ว</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function TopNav() {
  return (
    <div className="h-14 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <Layers className="h-5 w-5" />
        <span className="font-semibold">ระบบวิเคราะห์ประมงไทย</span>
        <Badge className="ml-2 bg-blue-100 text-blue-700">
          เดสก์ท็อป • ข้อมูลจำลอง
        </Badge>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        v1.0 • ต.ค. 2568
      </div>
    </div>
  )
}

const NAV = [
  {
    id: 'dq',
    label: 'คุณภาพข้อมูล',
    icon: <ShieldCheck className="h-4 w-4" />,
    comp: <DataQualityPage />,
  },
  {
    id: 'cpue',
    label: 'CPUE',
    icon: <Activity className="h-4 w-4" />,
    comp: <CPUEPage />,
  },
  {
    id: 'length',
    label: 'ความยาว & ชีวภาพ',
    icon: <Ruler className="h-4 w-4" />,
    comp: <LengthBiologyPage />,
  },
  // {
  //   id: 'select',
  //   label: 'การเลือกของเครื่องมือ',
  //   icon: <Settings className="h-4 w-4" />,
  //   comp: <GearSelectivityPage />,
  // },
  {
    id: 'hotspot',
    label: 'แผนที่จุดร้อน',
    icon: <Map className="h-4 w-4" />,
    comp: <HotspotMapPage />,
  },
  {
    id: 'waterquality',
    label: 'ตรวจสอบคุณภาพน้ำ',
    icon: <Droplets className="h-4 w-4" />,
    comp: <WaterQualityPage />,
  },
  // {
  //   id: 'forecast',
  //   label: 'พยากรณ์ & แจ้งเตือน',
  //   icon: <Bell className="h-4 w-4" />,
  //   comp: <ForecastAlertsPage />,
  // },
  // {
  //   id: 'whatif',
  //   label: 'จำลองสถานการณ์',
  //   icon: <Settings className="h-4 w-4" />,
  //   comp: <WhatIfSimulatorPage />,
  // },
  // {
  //   id: 'chatbot',
  //   label: 'AI Chatbot',
  //   icon: <Bot className="h-4 w-4" />,
  //   comp: <ChatbotPage />,
  // },
  {
    id: 'reports',
    label: 'รายงาน & แดชบอร์ด',
    icon: <BarChart2 className="h-4 w-4" />,
    comp: <ReportsPage />,
  },
  {
    id: 'datamart',
    label: 'คลังข้อมูล & API',
    icon: <Database className="h-4 w-4" />,
    comp: <DataMartAPIPage />,
  },
]

export default function App() {
  const [active, setActive] = useState('dq')
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 text-foreground">
      <TopNav />
      <div className="max-w-[1300px] mx-auto px-6 py-6 grid grid-cols-[260px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="rounded-2xl border bg-background/60 backdrop-blur p-3">
          <div className="text-xs uppercase text-muted-foreground px-2 mb-2">
            ฟีเจอร์
          </div>
          <nav className="space-y-1">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left transition ${
                  active === item.id
                    ? 'bg-primary/10 border border-primary/30'
                    : 'hover:bg-muted'
                }`}
              >
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
        <main className="pb-12" style={{ maxHeight: 'calc(100vh - 110px)' }}>
          {NAV.find((n) => n.id === active)?.comp}
        </main>
      </div>

      {/* <Chatbot /> */}
    </div>
  )
}
