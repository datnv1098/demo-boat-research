import { useState } from 'react'
import { Users } from 'lucide-react'
import { Header, Table, Badge, Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Card, CardContent, CardHeader, CardTitle } from '../components/common'

type User = {
  id: string
  nameThai: string
  email: string
  role: 'ผู้ดูแลระบบ' | 'นักวิจัย' | 'เจ้าหน้าที่ภาคสนาม'
  status: 'ใช้งาน' | 'ระงับ'
  organization?: string
  createdAt: string
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([
    { id: 'U001', nameThai: 'น.ส. สุชาดา ศรีวัฒน์', email: 'suchada@fisheries.go.th', role: 'ผู้ดูแลระบบ', status: 'ใช้งาน', organization: 'กรมประมง', createdAt: '2025-09-20' },
    { id: 'U002', nameThai: 'นาย ธนกร พลชัย', email: 'thanakorn@research.ac.th', role: 'นักวิจัย', status: 'ใช้งาน', organization: 'สถาบันวิจัยทะเล', createdAt: '2025-07-11' },
    { id: 'U003', nameThai: 'นาง มณีรัตน์ ชาญกิจ', email: 'maneerat@fisheries.go.th', role: 'เจ้าหน้าที่ภาคสนาม', status: 'ใช้งาน', organization: 'ศูนย์ประมงภาคใต้', createdAt: '2025-10-02' },
    { id: 'U004', nameThai: 'น.ส. อรอนงค์ วัฒนกูล', email: 'oranong@navy.mil.th', role: 'นักวิจัย', status: 'ระงับ', organization: 'หน่วย VMS', createdAt: '2025-06-28' },
  ])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'ทั้งหมด' | User['role']>('ทั้งหมด')
  const [statusFilter, setStatusFilter] = useState<'ทั้งหมด' | User['status']>('ทั้งหมด')

  const filtered = users.filter(u => {
    const q = search.trim().toLowerCase()
    const okSearch = !q || u.nameThai.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    const okRole = roleFilter === 'ทั้งหมด' || u.role === roleFilter
    const okStatus = statusFilter === 'ทั้งหมด' || u.status === statusFilter
    return okSearch && okRole && okStatus
  })

  const pageSize = 8
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)

  function toggleStatus(id: string) {
    setUsers(users.map(u => u.id === id ? { ...u, status: u.status === 'ใช้งาน' ? 'ระงับ' : 'ใช้งาน' } : u))
  }

  function removeUser(id: string) {
    setUsers(users.filter(u => u.id !== id))
  }

  return (
    <div>
      <Header
        title="การจัดการผู้ใช้ระบบ"
        desc="เพิ่ม/จัดการผู้ใช้ กำหนดบทบาทและสถานะสำหรับระบบวิเคราะห์ประมงไทย"
        icon={<Users className="h-6 w-6" />}
      />

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">ผู้ใช้ทั้งหมด</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <Input placeholder="ค้นหาชื่อหรืออีเมล" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="w-64" />
            <div>
              <Label className="text-xs">บทบาท</Label>
              <Select defaultValue={roleFilter} onValueChange={(v: any) => { setRoleFilter(v); setPage(1) }}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['ทั้งหมด','ผู้ดูแลระบบ','นักวิจัย','เจ้าหน้าที่ภาคสนาม'] as const).map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">สถานะ</Label>
              <Select defaultValue={statusFilter} onValueChange={(v: any) => { setStatusFilter(v); setPage(1) }}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['ทั้งหมด','ใช้งาน','ระงับ'] as const).map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="h-[28rem] overflow-y-auto pr-2">
            <Table
              columns={[ 'ผู้ใช้', 'อีเมล', 'บทบาท', 'หน่วยงาน', 'สถานะ', 'สร้างเมื่อ', 'การกระทำ' ]}
              rows={pageRows.map(u => [
                <div key={`${u.id}-name`} className="flex flex-col">
                  <span className="font-medium">{u.nameThai}</span>
                  <span className="text-xs text-muted-foreground">ID: {u.id}</span>
                </div>,
                u.email,
                <Badge key={`${u.id}-role`} className="bg-blue-100 text-blue-700">{u.role}</Badge>,
                u.organization || '-',
                <Badge key={`${u.id}-status`} className={u.status==='ใช้งาน' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>{u.status}</Badge>,
                u.createdAt,
                <div key={`${u.id}-actions`} className="flex gap-2">
                  <Button className="h-8 px-3 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200" onClick={() => toggleStatus(u.id)}>
                    {u.status==='ใช้งาน' ? 'ระงับ' : 'เปิดใช้งาน'}
                  </Button>
                  <Button className="h-8 px-3 text-xs bg-red-600 text-white hover:bg-red-700" onClick={() => removeUser(u.id)}>
                    ลบ
                  </Button>
                </div>
              ])}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-sm">
            <div>
              แสดง {pageRows.length} จากทั้งหมด {filtered.length} ผู้ใช้
            </div>
            <div className="flex items-center gap-2">
              <Button className="h-8 px-3 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200" disabled={page===1} onClick={() => setPage(p => Math.max(1, p-1))}>ก่อนหน้า</Button>
              <span>หน้า {page}/{totalPages}</span>
              <Button className="h-8 px-3 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200" disabled={page===totalPages} onClick={() => setPage(p => Math.min(totalPages, p+1))}>ถัดไป</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


