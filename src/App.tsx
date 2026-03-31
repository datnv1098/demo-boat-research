import { useState } from 'react'
import {
  Activity,
  BarChart2,
  ClipboardCheck,
  Layers,
  Map,
  Ruler,
  Users,
} from 'lucide-react'
import HotspotMapPage from './pages/HotspotMapPage'
import DataIngestionQCPage from './pages/DataIngestionQCPage'
import CPUEPage from './pages/CPUEPage'
import LengthBiologyPage from './pages/LengthBiologyPage'
import ReportsComparisonPage from './pages/ReportsComparisonPage'
import UserManagementPage from './pages/UserManagementPage'
import WaterQualityPage from './pages/WaterQualityPage'
import { I18nProvider, useI18n } from './lib/i18n'
import { AppShell } from './design-system'

function WaterIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3C12 3 4.5 12.0882 4.5 16.5C4.5 19.5376 7.58172 22 12 22C16.4183 22 19.5 19.5376 19.5 16.5C19.5 12.0882 12 3 12 3Z"
      />
    </svg>
  )
}

const navIconClassName = 'h-4 w-4'

function AppInner() {
  const { t, lang, setLang } = useI18n()
  const [active, setActive] = useState('reports-compare')

  const nav = [
    {
      id: 'reports-compare',
      label: t('nav.overview'),
      icon: <BarChart2 className={navIconClassName} />,
      content: <ReportsComparisonPage />,
    },
    {
      id: 'ingestion-qc',
      label: t('nav.ingestionQc'),
      icon: <ClipboardCheck className={navIconClassName} />,
      content: <DataIngestionQCPage />,
    },
    {
      id: 'cpue',
      label: t('nav.cpue'),
      icon: <Activity className={navIconClassName} />,
      content: <CPUEPage />,
    },
    {
      id: 'length-bio',
      label: t('nav.lengthBio'),
      icon: <Ruler className={navIconClassName} />,
      content: <LengthBiologyPage />,
    },
    {
      id: 'hotspot',
      label: t('nav.hotspot'),
      icon: <Map className={navIconClassName} />,
      content: <HotspotMapPage />,
    },
    {
      id: 'water',
      label: t('nav.water'),
      icon: <WaterIcon />,
      content: <WaterQualityPage />,
    },
    {
      id: 'users',
      label: t('nav.users'),
      icon: <Users className={navIconClassName} />,
      content: <UserManagementPage />,
    },
  ]

  const activeItem = nav.find((item) => item.id === active)

  return (
    <AppShell
      brand={t('app.topnav.title')}
      badge={t('app.topnav.badge')}
      version={t('app.topnav.version')}
      navLabel={t('app.sidebar.features')}
      navFooter={t('app.sidebar.footer')}
      navItems={nav.map((item) => ({
        id: item.id,
        label: item.label,
        icon: item.icon,
      }))}
      activeId={active}
      onNavigate={setActive}
      lang={lang}
      setLang={setLang}
      pageIntro={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Layers className="h-4 w-4 text-primary" />
          <span>{activeItem?.label}</span>
        </div>
      }
    >
      {activeItem?.content}
    </AppShell>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <AppInner />
    </I18nProvider>
  )
}
