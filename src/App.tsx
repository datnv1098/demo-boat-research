import { useEffect, useState } from 'react'
import { Badge } from './components/ui/badge'
import { Layers, Map, ClipboardCheck, Activity, Ruler, BarChart2, Users } from 'lucide-react'
import HotspotMapPage from './pages/HotspotMapPage'
import DataIngestionQCPage from './pages/DataIngestionQCPage'
import CPUEPage from './pages/CPUEPage'
import LengthBiologyPage from './pages/LengthBiologyPage'
import ReportsComparisonPage from './pages/ReportsComparisonPage'
import UserManagementPage from './pages/UserManagementPage'
import WaterQualityPage from './pages/WaterQualityPage'
import AdminCpueChoroplethPage from './pages/AdminCpueChoroplethPage'
import { I18nProvider, useI18n } from './lib/i18n'

function TopNav() {
  const { lang, setLang, t } = useI18n()
  return (
    <div className="h-14 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60 fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <Layers className="h-5 w-5" />
        <span className="font-semibold">{t('app.topnav.title')}</span>
        <Badge className="ml-2 bg-blue-100 text-blue-700">{t('app.topnav.badge')}</Badge>
      </div>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <button className={`px-2 py-1 rounded ${lang==='th'?'bg-primary/10 text-primary':'hover:bg-muted'}`} onClick={() => setLang('th')}>TH</button>
          <button className={`px-2 py-1 rounded ${lang==='en'?'bg-primary/10 text-primary':'hover:bg-muted'}`} onClick={() => setLang('en')}>EN</button>
        </div>
        <span>{t('app.topnav.version')}</span>
      </div>
    </div>
  )
}

const NAV = [
  { id: 'reports-compare', labelKey: 'nav.overview', icon: <BarChart2 className="h-4 w-4" />, comp: <ReportsComparisonPage /> },
  { id: 'ingestion-qc', labelKey: 'nav.ingestionQc', icon: <ClipboardCheck className="h-4 w-4" />, comp: <DataIngestionQCPage /> },
  { id: 'cpue', labelKey: 'nav.cpue', icon: <Activity className="h-4 w-4" />, comp: <CPUEPage /> },
  { id: 'length-bio', labelKey: 'nav.lengthBio', icon: <Ruler className="h-4 w-4" />, comp: <LengthBiologyPage /> },
  { id: 'hotspot', labelKey: 'nav.hotspot', icon: <Map className="h-4 w-4" />, comp: <HotspotMapPage /> },
  { id: 'marine-adm', labelKey: 'nav.adminCpue', icon: <Map className="h-4 w-4" />, comp: <AdminCpueChoroplethPage /> },
  { id: 'water', labelKey: 'nav.water', icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3C12 3 4.5 12.0882 4.5 16.5C4.5 19.5376 7.58172 22 12 22C16.4183 22 19.5 19.5376 19.5 16.5C19.5 12.0882 12 3 12 3Z" /></svg>, comp: <WaterQualityPage /> },
  { id: 'users', labelKey: 'nav.users', icon: <Users className="h-4 w-4" />, comp: <UserManagementPage /> },
]

const DEFAULT_PAGE = 'reports-compare'
const NAV_IDS = new Set(NAV.map((item) => item.id))

function getInitialPage(): string {
  if (typeof window === 'undefined') return DEFAULT_PAGE
  const urlPage = new URLSearchParams(window.location.search).get('page')
  return urlPage && NAV_IDS.has(urlPage) ? urlPage : DEFAULT_PAGE
}

function AppInner() {
  const { t } = useI18n()
  const [active, setActive] = useState(getInitialPage)

  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.get('page') === active) return
    url.searchParams.set('page', active)
    window.history.replaceState({}, '', url)
  }, [active])

  return (
    <div className="h-screen bg-gradient-to-b from-background to-muted/20 text-foreground overflow-hidden">
      <TopNav />
      <div className="flex h-[calc(100vh-56px)]">
        {/* Fixed Sidebar - Completely Fixed */}
        <aside className="w-[260px] flex-shrink-0 fixed left-0 top-14 h-[calc(100vh-56px)] p-6 pr-3 z-30">
          <div className="rounded-2xl border bg-background/60 backdrop-blur p-3 h-full overflow-hidden flex flex-col">
            <div className="text-xs uppercase text-muted-foreground px-2 mb-2">{t('app.sidebar.features')}</div>
            <nav className="space-y-1 flex-1 overflow-hidden">
              {NAV.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActive(item.id)}
                  data-testid={`nav-${item.id}`}
                  className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left transition ${
                    active === item.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'
                  }`}
                >
                  {item.icon}
                  <span className="text-sm">{t(item.labelKey as any)}</span>
                </button>
              ))}
            </nav>
            <div className="mt-4 border-t pt-3 text-xs text-muted-foreground flex-shrink-0">{t('app.sidebar.footer')}</div>
          </div>
        </aside>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto p-6 pb-12 ml-[260px]">
          <div className="max-w-[1040px] relative">
            {NAV.find((n) => n.id === active)?.comp}
          </div>
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
