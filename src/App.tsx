import { useState } from 'react'
import { Badge } from './components/ui/badge'
import { Layers, ShieldCheck, Activity, Ruler, Map, Droplets, BarChart2, Database, Users } from 'lucide-react'
import DataQualityPage from './pages/DataQualityPage'
import UserManagementPage from './pages/UserManagementPage'
import CPUEPage from './pages/CPUEPage'
import LengthBiologyPage from './pages/LengthBiologyPage'
import HotspotMapPage from './pages/HotspotMapPage'
import ReportsPage from './pages/ReportsPage'
import DataMartAPIPage from './pages/DataMartAPIPage'
import WaterQualityPage from './pages/WaterQualityPage'

function TopNav() {
  return (
    <div className="h-14 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <Layers className="h-5 w-5" />
        <span className="font-semibold">ระบบวิเคราะห์ประมงไทย</span>
        <Badge className="ml-2 bg-blue-100 text-blue-700">เดสก์ท็อป • ข้อมูลจำลอง</Badge>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">v1.0 • ต.ค. 2568</div>
    </div>
  )
}

const NAV = [
  { id: 'dq', label: 'คุณภาพข้อมูล', icon: <ShieldCheck className="h-4 w-4" />, comp: <DataQualityPage /> },
  { id: 'cpue', label: 'CPUE', icon: <Activity className="h-4 w-4" />, comp: <CPUEPage /> },
  { id: 'length', label: 'ความยาว & ชีวภาพ', icon: <Ruler className="h-4 w-4" />, comp: <LengthBiologyPage /> },
  { id: 'hotspot', label: 'แผนที่จุดร้อน', icon: <Map className="h-4 w-4" />, comp: <HotspotMapPage /> },
  { id: 'waterquality', label: 'ตรวจสอบคุณภาพน้ำ', icon: <Droplets className="h-4 w-4" />, comp: <WaterQualityPage /> },
  { id: 'reports', label: 'รายงาน & แดชบอร์ด', icon: <BarChart2 className="h-4 w-4" />, comp: <ReportsPage /> },
  { id: 'datamart', label: 'คลังข้อมูล & API', icon: <Database className="h-4 w-4" />, comp: <DataMartAPIPage /> },
  { id: 'users', label: 'การจัดการผู้ใช้', icon: <Users className="h-4 w-4" />, comp: <UserManagementPage /> },
]

export default function App() {
  const [active, setActive] = useState('dq')
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 text-foreground">
      <TopNav />
      <div className="max-w-[1300px] mx-auto px-6 py-6 grid grid-cols-[260px_1fr] gap-6">
        <aside className="rounded-2xl border bg-background/60 backdrop-blur p-3">
          <div className="text-xs uppercase text-muted-foreground px-2 mb-2">ฟีเจอร์</div>
          <nav className="space-y-1">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left transition ${
                  active === item.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'
                }`}
              >
                {item.icon}
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="mt-4 border-t pt-3 text-xs text-muted-foreground">โอเพ่นซอร์สเท่านั้น • อัปโหลดเป็นแบทช์</div>
        </aside>

        <main className="pb-12" style={{ maxHeight: 'calc(100vh - 110px)' }}>
          {NAV.find((n) => n.id === active)?.comp}
        </main>
      </div>
    </div>
  )
}


