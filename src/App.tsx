import { useState } from 'react'
import { Badge } from './components/ui/badge'
import { Layers, Map, ClipboardCheck, Activity, Ruler, BarChart2, Users } from 'lucide-react'
import HotspotMapPage from './pages/HotspotMapPage'
import DataIngestionQCPage from './pages/DataIngestionQCPage'
import CPUEPage from './pages/CPUEPage'
import LengthBiologyPage from './pages/LengthBiologyPage'
import ReportsComparisonPage from './pages/ReportsComparisonPage'
import UserManagementPage from './pages/UserManagementPage'
import { I18nProvider, useI18n } from './lib/i18n'

function TopNav() {
  const { lang, setLang } = useI18n()
  return (
    <div className="h-14 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <Layers className="h-5 w-5" />
        <span className="font-semibold">ระบบวิเคราะห์ประมงไทย</span>
        <Badge className="ml-2 bg-blue-100 text-blue-700">เดสก์ท็อป • ข้อมูลจำลอง</Badge>
      </div>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <button className={`px-2 py-1 rounded ${lang==='th'?'bg-primary/10 text-primary':'hover:bg-muted'}`} onClick={() => setLang('th')}>TH</button>
          <button className={`px-2 py-1 rounded ${lang==='en'?'bg-primary/10 text-primary':'hover:bg-muted'}`} onClick={() => setLang('en')}>EN</button>
        </div>
        <span>v1.0 • ต.ค. 2568</span>
      </div>
    </div>
  )
}

const NAV = [
  { id: 'ingestion-qc', labelKey: 'nav.ingestionQc', icon: <ClipboardCheck className="h-4 w-4" />, comp: <DataIngestionQCPage /> },
  { id: 'cpue', labelKey: 'nav.cpue', icon: <Activity className="h-4 w-4" />, comp: <CPUEPage /> },
  { id: 'length-bio', labelKey: 'nav.lengthBio', icon: <Ruler className="h-4 w-4" />, comp: <LengthBiologyPage /> },
  { id: 'hotspot', labelKey: 'nav.hotspot', icon: <Map className="h-4 w-4" />, comp: <HotspotMapPage /> },
  { id: 'reports-compare', labelKey: 'nav.dashboard', icon: <BarChart2 className="h-4 w-4" />, comp: <ReportsComparisonPage /> },
  { id: 'users', labelKey: 'nav.users', icon: <Users className="h-4 w-4" />, comp: <UserManagementPage /> },
]

function AppInner() {
  const { t } = useI18n()
  const [active, setActive] = useState('ingestion-qc')
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
                <span className="text-sm">{t(item.labelKey as any)}</span>
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

export default function App() {
  return (
    <I18nProvider>
      <AppInner />
    </I18nProvider>
  )
}


