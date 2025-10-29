import { useEffect, useMemo, useState } from 'react'
import { Ruler } from 'lucide-react'
import { Header, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button } from '../components/common'
import { Table } from '../components/common'
import { useI18n } from '../lib/i18n'
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'

export default function LengthBiologyPage() {
  const [data, setData] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { t, lang } = useI18n()

  const [species, setSpecies] = useState<string>('all')
  const [month, setMonth] = useState<string>('all')
  const [zone, setZone] = useState<string>('all')

  useEffect(() => {
    fetch('/cmdec_mock.json')
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(String(e)))
  }, [])

  const { headerRows, catchRows } = useMemo(() => {
    if (!data) return { headerRows: [], catchRows: [] }
    const lower: Record<string, any> = {}
    Object.keys(data).forEach((k) => (lower[k.toLowerCase()] = data[k]))
    return {
      headerRows: Array.isArray(lower['header']) ? lower['header'] : [],
      catchRows: Array.isArray(lower['catch']) ? lower['catch'] : [],
    }
  }, [data])

  function parseFreqtext(ft?: string) {
    if (!ft || typeof ft !== 'string') return []
    const parts = ft.split(',').map((s) => s.trim())
    const pairs: { length: number; count: number }[] = []
    for (const p of parts) {
      const m = p.match(/(\d+):(\d+)/)
      if (m) pairs.push({ length: Number(m[1]), count: Number(m[2]) })
    }
    return pairs
  }

  function toMonthLabel(dateStr?: string) {
    if (!dateStr) return 'N/A'
    const d = new Date(dateStr)
    const m = d.getMonth()
    const year = d.getFullYear()
    const thMonths = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
    const enMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return (lang === 'th' ? thMonths[m] : enMonths[m]) + ' ' + year
  }

  const linkToHeader = useMemo(() => {
    const map = new Map<string, any>()
    for (const h of headerRows) {
      const dateStr = String(h?.Date)
      const dateObj = dateStr ? new Date(dateStr) : null
      map.set(String(h?.Link), {
        zone: h?.Zone || 'N/A',
        monthLabel: toMonthLabel(dateStr),
        date: dateObj,
      })
    }
    return map
  }, [headerRows, lang])

  const lengthFreqData = useMemo(() => {
    const list: any[] = []
    for (const c of catchRows) {
      const link = String(c?.Link)
      const speciesCode = String(c?.btscodename || 'ALL')
      const ft = parseFreqtext(String(c?.freqtext))
      if (!ft.length) continue
      const hdr = linkToHeader.get(link) || {}
      list.push({
        link,
        speciesCode,
        freqPairs: ft,
        zone: hdr.zone,
        monthLabel: hdr.monthLabel,
        date: hdr.date,
      })
    }
    return list
  }, [catchRows, linkToHeader])

  const filterOptions = useMemo(() => {
    const species = Array.from(new Set(lengthFreqData.map((r) => r.speciesCode))).sort()
    // Sort months by date descending (newest first)
    const monthSet = new Map<string, Date>()
    for (const r of lengthFreqData) {
      if (r.monthLabel && r.date && !monthSet.has(r.monthLabel)) {
        monthSet.set(r.monthLabel, r.date)
      }
    }
    const months = Array.from(monthSet.keys()).sort((a, b) => {
      const dateA = monthSet.get(a)
      const dateB = monthSet.get(b)
      if (!dateA || !dateB) return 0
      return dateB.getTime() - dateA.getTime() // Descending
    })
    const zones = Array.from(new Set(lengthFreqData.map((r) => r.zone))).sort()
    return { species, months, zones }
  }, [lengthFreqData])

  const filtered = useMemo(() => {
    return lengthFreqData.filter((r) => (
      (species === 'all' || r.speciesCode === species) &&
      (month === 'all' || r.monthLabel === month) &&
      (zone === 'all' || r.zone === zone)
    ))
  }, [lengthFreqData, species, month, zone])

  function calcBioIndices(freqPairs: { length: number; count: number }[]) {
    if (!freqPairs.length) return { lmean: 0, l95: 0, pctJuvenile: 0, lfi: 0, total: 0 }
    const total = freqPairs.reduce((a, b) => a + b.count, 0)
    if (total === 0) return { lmean: 0, l95: 0, pctJuvenile: 0, lfi: 0, total: 0 }
    const weighted = freqPairs.reduce((sum, p) => sum + (p.length * p.count), 0)
    const lmean = weighted / total
    const sorted = freqPairs.flatMap((p) => Array(p.count).fill(p.length)).sort((a, b) => a - b)
    const l95 = sorted[Math.floor(sorted.length * 0.95)]
    // %<Lm50: assume Lm50≈median or approximate
    const median = sorted[Math.floor(sorted.length * 0.5)]
    const pctJuvenile = (sorted.filter((l) => l < median).length / sorted.length) * 100
    // LFI: Length-based Fish Index (simplified, using large fish %)
    const large = sorted.filter((l) => l > lmean * 1.5).length
    const lfi = (large / sorted.length) * 0.65
    return { lmean, l95, pctJuvenile, lfi, total }
  }

  const aggregated = useMemo(() => {
    const map = new Map<string, { length: number; count: number }>()
    for (const r of filtered) {
      for (const p of r.freqPairs) {
        const key = p.length
        map.set(key, { length: key, count: (map.get(key)?.count || 0) + p.count })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.length - b.length)
  }, [filtered])

  const bioStats = useMemo(() => {
    const combined = filtered.flatMap((r) => r.freqPairs)
    return calcBioIndices(combined)
  }, [filtered])

  const warning = useMemo(() => {
    return bioStats.pctJuvenile >= 60
  }, [bioStats])

  function exportBioPdf() {
    const win = window.open('', '_blank', 'width=1024,height=768')
    if (!win) return
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Bio Indices</title>
      <style>body{font-family: 'Noto Sans Thai', Arial, sans-serif;} table{border-collapse:collapse;width:100%;font-size:12px;} th{background:#f5f5f5;}</style>
      </head><body>
      <h2>Length-Frequency & Bio Indices</h2>
      <table><tr><th>Lmean</th><th>L95</th><th>%<Lm50</th><th>LFI</th></tr>
      <tr><td>${bioStats.lmean.toFixed(2)}</td><td>${bioStats.l95.toFixed(2)}</td><td>${bioStats.pctJuvenile.toFixed(2)}%</td><td>${bioStats.lfi.toFixed(3)}</td></tr>
      </table>
      <script>window.print();</script>
      </body></html>`)
    win.document.close()
  }

  return (
    <div>
      <Header title={t('len.title')} desc={t('len.desc')} icon={<Ruler className="h-6 w-6" />} />
      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
      {!data && !error && <div className="text-sm text-muted-foreground">{t('loading.demo')}</div>}
      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Species</Label>
              <Select defaultValue={species} onValueChange={setSpecies}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {filterOptions.species.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Month</Label>
              <Select defaultValue={month} onValueChange={setMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {filterOptions.months.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Zone</Label>
              <Select defaultValue={zone} onValueChange={setZone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {filterOptions.zones.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <div className="rounded-xl border bg-background p-3">
              <div className="text-sm font-medium mb-2">Length Frequency Histogram</div>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={aggregated}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="length" label={{ value: 'Length (cm)', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 pt-3 border-t flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Lmean:</span>
                  <span className="font-medium">{bioStats.lmean.toFixed(2)} cm</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">L95:</span>
                  <span className="font-medium">{bioStats.l95.toFixed(2)} cm</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">%&lt;Lm50:</span>
                  <span className={`font-medium ${warning ? 'text-orange-600' : ''}`}>{bioStats.pctJuvenile.toFixed(2)}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">LFI:</span>
                  <span className="font-medium">{bioStats.lfi.toFixed(3)}</span>
                </div>
                {warning && (
                  <div className="text-orange-600 text-sm font-medium">⚠️ {lang === 'th' ? 'Tỷ lệ cá non cao (≥60%)' : 'High juvenile rate (≥60%)'}</div>
                )}
                <div className="ml-auto">
                  <Button className="bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs h-7 px-3" onClick={exportBioPdf}>{t('header.export')} PDF</Button>
                </div>
              </div>
            </div>
          </div>

          {/* Details table */}
          {(() => {
            const details = filtered.map((r: any) => {
              const s = calcBioIndices(r.freqPairs)
              return [r.link, r.speciesCode, r.zone, r.monthLabel, s.lmean.toFixed(2), s.l95.toFixed(2), s.pctJuvenile.toFixed(2) + '%']
            })
            return (
              <div className="rounded-xl border bg-background p-3">
                <div className="text-sm font-medium mb-2">Details (Top 100)</div>
                <Table
                  columns={["Link","Species","Zone","Month","Lmean","L95","%<Lm50"]}
                  maxHeight={320}
                  rows={details.slice(0, 100)}
                />
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
