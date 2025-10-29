import { useEffect, useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { Header, Table, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Input, Button } from '../components/common'
import { useI18n } from '../lib/i18n'

interface AppUser {
  id: string
  name: string
  email: string
  role: 'Admin' | 'Researcher' | 'DataEntry' | 'Viewer'
  zone: 'Andaman' | 'Gulf' | 'National'
  area: 'A1' | 'A2' | 'B1' | 'B2' | 'All'
  office: string
  status: 'Active' | 'Locked'
  lastLogin?: string
}

function generateDemoUsers(count: number): AppUser[] {
  const roles: AppUser['role'][] = ['Admin', 'Researcher', 'DataEntry', 'Viewer']
  const zones: AppUser['zone'][] = ['National', 'Andaman', 'Gulf']
  const areas: AppUser['area'][] = ['All', 'A1', 'A2', 'B1', 'B2']
  const offices = ['HQ', 'Office-1', 'Office-2', 'Office-3', 'Office-4']
  const users: AppUser[] = []
  for (let i = 0; i < count; i++) {
    const idx = i + 1
    const role = roles[i % roles.length]
    const zone = zones[i % zones.length]
    const area = areas[i % areas.length]
    const office = offices[i % offices.length]
    users.push({
      id: 'u' + String(100 + idx),
      name: `Demo User ${idx}`,
      email: `user${idx}@marine.gov`,
      role,
      zone,
      area,
      office,
      status: i % 7 === 0 ? 'Locked' : 'Active',
      lastLogin: `2025-10-${String((idx % 28) + 1).padStart(2, '0')} ${String((idx % 24)).padStart(2, '0')}:${String((idx * 3) % 60).padStart(2, '0')}`,
    })
  }
  return users
}

export default function UserManagementPage() {
  const { t } = useI18n()
  const [users, setUsers] = useState<AppUser[]>([])
  const [q, setQ] = useState('')
  const [role, setRole] = useState<'all' | AppUser['role']>('all')
  const [zone, setZone] = useState<'all' | AppUser['zone']>('all')
  const [area, setArea] = useState<'all' | AppUser['area']>('all')
  const [office, setOffice] = useState<'all' | string>('all')
  const [status, setStatus] = useState<'all' | AppUser['status']>('all')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('app_users')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setUsers(parsed)
        } else {
          setUsers(generateDemoUsers(50))
        }
      } else {
        setUsers(generateDemoUsers(50))
      }
    } catch {
      setUsers(generateDemoUsers(50))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('app_users', JSON.stringify(users))
  }, [users])

  const filterOptions = useMemo(() => {
    const roles: AppUser['role'][] = ['Admin', 'Researcher', 'DataEntry', 'Viewer']
    const zones: AppUser['zone'][] = ['National', 'Andaman', 'Gulf']
    const areas: AppUser['area'][] = ['All', 'A1', 'A2', 'B1', 'B2']
    const offices = Array.from(new Set(users.map((u) => u.office))).sort()
    const statuses: AppUser['status'][] = ['Active', 'Locked']
    return { roles, zones, areas, offices, statuses }
  }, [users])

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase()
    return users.filter((u) => (
      (role === 'all' || u.role === role) &&
      (zone === 'all' || u.zone === zone) &&
      (area === 'all' || u.area === area) &&
      (office === 'all' || u.office === office) &&
      (status === 'all' || u.status === status) &&
      (!text || u.name.toLowerCase().includes(text) || u.email.toLowerCase().includes(text))
    ))
  }, [users, role, zone, area, office, status, q])

  // No-op logger (audit UI removed)
  function log(_action: string, _userId: string, _details?: string) {}

  function addUser() {
    const name = prompt('Name')
    if (!name) return
    const email = prompt('Email')
    if (!email) return
    const newUser: AppUser = {
      id: 'u' + Math.random().toString(36).slice(2, 7),
      name,
      email,
      role: 'Viewer',
      zone: 'National',
      area: 'All',
      office: 'HQ',
      status: 'Active',
      lastLogin: '',
    }
    setUsers((prev) => [newUser, ...prev])
    log('USER_CREATE', newUser.id, `${newUser.name} (${newUser.email})`)
  }

  function toggleLock(u: AppUser) {
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, status: x.status === 'Active' ? 'Locked' : 'Active' } : x)))
    log('USER_STATUS', u.id, `Set status to ${u.status === 'Active' ? 'Locked' : 'Active'}`)
  }

  function changeRole(u: AppUser, r: AppUser['role']) {
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: r } : x)))
    log('USER_ROLE', u.id, `Role ${u.role} -> ${r}`)
  }

  function changeZone(u: AppUser, z: AppUser['zone']) {
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, zone: z } : x)))
    log('USER_ZONE', u.id, `Zone ${u.zone} -> ${z}`)
  }

  function changeArea(u: AppUser, a: AppUser['area']) {
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, area: a } : x)))
    log('USER_AREA', u.id, `Area ${u.area} -> ${a}`)
  }

  function changeOffice(u: AppUser) {
    const v = prompt('New office', u.office)
    if (!v) return
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, office: v } : x)))
    log('USER_OFFICE', u.id, `Office ${u.office} -> ${v}`)
  }

  function resetPassword(u: AppUser) {
    alert(`Password reset link sent to ${u.email}`)
    log('USER_RESET_PW', u.id)
  }

  function exportUsersCSV() {
    const header = ['ID','Name','Email','Role','Zone','Area','Office','Status','LastLogin']
    const lines = [header.join(',')].concat(users.map((u) => [u.id,u.name,u.email,u.role,u.zone,u.area,u.office,u.status,u.lastLogin||''].join(',')))
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'users.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function onTopbarExport() {
    exportUsersCSV()
  }

  return (
    <div>
      <Header title={t('users.title')} desc={t('users.desc')} icon={<Users className="h-6 w-6" />} onExport={onTopbarExport} />
      <div className="space-y-4">
        {users.length === 0 && (
          <div className="text-sm text-orange-600">No users found. Click "Load Demo" to seed 50 demo users.</div>
        )}
        {/* Filters & actions */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          <div className="md:col-span-2">
            <Label>Search</Label>
            <Input placeholder="Name or email" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(v: any) => setRole(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {filterOptions.roles.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Zone</Label>
            <Select value={zone} onValueChange={(v: any) => setZone(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {filterOptions.zones.map((z) => (<SelectItem key={z} value={z}>{z}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Area</Label>
            <Select value={area} onValueChange={(v: any) => setArea(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {filterOptions.areas.map((a) => (<SelectItem key={a} value={a}>{a}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Office</Label>
            <Select value={office} onValueChange={(v: any) => setOffice(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {filterOptions.offices.map((o) => (<SelectItem key={o} value={o}>{o}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {filterOptions.statuses.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={addUser}>Add User</Button>
          <Button className="bg-gray-100 text-gray-700 hover:bg-gray-200" onClick={() => setUsers(generateDemoUsers(50))}>Load Demo</Button>
        </div>

        {/* Users table */}
        <Table
          columns={["ID","Name","Email","Role","Zone","Area","Office","Status","Last Login","Actions"]}
          rows={filtered.map((u) => ([
            u.id,
            u.name,
            u.email,
            <div key={u.id+"r"} className="min-w-[120px]">
              <Select defaultValue={u.role} onValueChange={(v: any) => changeRole(u, v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {filterOptions.roles.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>,
            <div key={u.id+"z"} className="min-w-[120px]">
              <Select defaultValue={u.zone} onValueChange={(v: any) => changeZone(u, v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {filterOptions.zones.map((z) => (<SelectItem key={z} value={z}>{z}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>,
            <div key={u.id+"a"} className="min-w-[120px]">
              <Select defaultValue={u.area} onValueChange={(v: any) => changeArea(u, v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {filterOptions.areas.map((a) => (<SelectItem key={a} value={a}>{a}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>,
            <button key={u.id+"o"} className="underline text-blue-600" onClick={() => changeOffice(u)}>{u.office}</button>,
            <span className={u.status === 'Active' ? 'text-green-700' : 'text-red-600'}>{u.status}</span>,
            u.lastLogin || '-',
            <div className="flex gap-2">
              <Button className="bg-gray-100 text-gray-700 hover:bg-gray-200" onClick={() => toggleLock(u)}>{u.status === 'Active' ? 'Lock' : 'Unlock'}</Button>
              <Button className="bg-gray-100 text-gray-700 hover:bg-gray-200" onClick={() => resetPassword(u)}>Reset</Button>
            </div>
          ]))}
          maxHeight="calc(100vh - 450px)"
        />
      </div>
    </div>
  )
}


