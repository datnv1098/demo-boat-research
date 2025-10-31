import { useMemo, useState, useEffect } from 'react';
import { Header, Label, Table, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/common';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function WaterQualityPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState('all');
  const [zone, setZone] = useState('all');

  useEffect(() => {
    fetch(new URL('../../cmdec_mock.json', import.meta.url).href)
      .then(r => r.json())
      .then(setData)
      .catch((e) => setError(String(e)));
  }, []);

  // Parse water quality rows
  const waterRows = useMemo(() => {
    if (!data) return [];
    const lower = {} as Record<string, any>;
    Object.keys(data).forEach((k) => (lower[k.toLowerCase()] = data[k]));
    return Array.isArray(lower['water_ql']) ? lower['water_ql'] : [];
  }, [data]);

  // Collect filter options
  const filterOptions = useMemo(() => {
    const months = Array.from(new Set(waterRows.map(r => r.Month || r.month))).sort();
    const zones = Array.from(new Set(waterRows.map(r => r.Zone || r.zone)));
    return { months, zones };
  }, [waterRows]);

  // Filtered data
  const filtered = useMemo(() => {
    return waterRows.filter((r) =>
      (month === 'all' || String(r.Month || r.month) === month) &&
      (zone === 'all' || String(r.Zone || r.zone) === zone)
    );
  }, [waterRows, month, zone]);

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const means = useMemo(() => {
    if (!filtered.length) return { temp: 0, do: 0, ph: 0, salinity: 0 };
    return {
      temp: avg(filtered.map(r => Number(r.Temp))).toFixed(2),
      do: avg(filtered.map(r => Number(r.DO))).toFixed(2),
      ph: avg(filtered.map(r => Number(r.pH))).toFixed(2),
      salinity: avg(filtered.map(r => Number(r.Salinity))).toFixed(2),
    };
  }, [filtered]);

  // Radar chart data
  const radarData = [
    { param: 'Temp', value: Number(means.temp) },
    { param: 'DO', value: Number(means.do) },
    { param: 'pH', value: Number(means.ph) },
    { param: 'Salinity', value: Number(means.salinity) },
  ];

  // Line chart data
  const trendByMonth = useMemo(() => {
    const map: Record<string, { month: string, temp: number[], do: number[], ph: number[], salinity: number[] }> = {};
    for (const r of waterRows) {
      const m = String(r.Month || r.month);
      if (!map[m]) map[m] = { month: m, temp: [], do: [], ph: [], salinity: [] };
      map[m].temp.push(Number(r.Temp));
      map[m].do.push(Number(r.DO));
      map[m].ph.push(Number(r.pH));
      map[m].salinity.push(Number(r.Salinity));
    }
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).map(x => ({
      month: x.month,
      Temp: avg(x.temp),
      DO: avg(x.do),
      pH: avg(x.ph),
      Salinity: avg(x.salinity),
    }));
  }, [waterRows]);

  // Alert table: giá trị bất thường theo rule
  const alertRows = useMemo(() => filtered.filter(r => (Number(r.Temp) > 30 || Number(r.DO) < 3 || Number(r.pH) < 7 || Number(r.Salinity) > 35)), [filtered]);

  function exportXLSX() {
    // Nếu triển khai SheetJS thì ở đây load dynamic, ví dụ chỉ placeholder:
    alert('Xuất file sẽ được bổ sung (cần cài SheetJS/xlsx)');
  }

  return (
    <div>
      <Header title="Water Quality" desc="Dashboard các chỉ số môi trường theo tháng/khu vực" sticky exportLabel="Export .xlsx" onExport={exportXLSX} />
      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 my-2">
        <div>
          <Label>Month</Label>
          <Select defaultValue={month} onValueChange={setMonth}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {filterOptions.months.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Zone</Label>
          <Select defaultValue={zone} onValueChange={setZone}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {filterOptions.zones.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-xl border p-3 bg-gradient-to-tr from-blue-100 to-green-50">
          <div className="text-xs font-medium text-gray-600 mb-1">Avg Temp (°C)</div>
          <div className="text-2xl font-bold text-blue-700">{means.temp}</div>
        </div>
        <div className="rounded-xl border p-3 bg-gradient-to-tr from-blue-100 to-green-50">
          <div className="text-xs font-medium text-gray-600 mb-1">Avg DO (mg/L)</div>
          <div className="text-2xl font-bold text-green-700">{means.do}</div>
        </div>
        <div className="rounded-xl border p-3 bg-gradient-to-tr from-blue-100 to-green-50">
          <div className="text-xs font-medium text-gray-600 mb-1">Avg pH</div>
          <div className="text-2xl font-bold text-lime-600">{means.ph}</div>
        </div>
        <div className="rounded-xl border p-3 bg-gradient-to-tr from-blue-100 to-green-50">
          <div className="text-xs font-medium text-gray-600 mb-1">Avg Salinity (PSU)</div>
          <div className="text-2xl font-bold text-cyan-700">{means.salinity}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
        <div className="rounded-xl border bg-background p-3">
          <div className="text-sm font-medium mb-2">Radar: Water Quality mean</div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius={80} data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="param" />
                <PolarRadiusAxis />
                <Radar name="Mean" dataKey="value" stroke="#1e40af" fill="#38bdf8" fillOpacity={0.55} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border bg-background p-3">
          <div className="text-sm font-medium mb-2">Line: Water Quality Trend</div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="Temp" stroke="#60a5fa" />
                <Line type="monotone" dataKey="DO" stroke="#22c55e" />
                <Line type="monotone" dataKey="pH" stroke="#d97706" />
                <Line type="monotone" dataKey="Salinity" stroke="#06b6d4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="rounded-xl border bg-background p-3 mt-6">
        <div className="text-sm font-medium mb-2">Alert Table (Anomalies)</div>
        <Table
          columns={["Month","Zone","Temp","DO","pH","Salinity"]}
          rows={alertRows.map((r) => [r.Month||r.month, r.Zone||r.zone, r.Temp, r.DO, r.pH, r.Salinity])}
          maxHeight={240}
        />
      </div>
    </div>
  );
}
