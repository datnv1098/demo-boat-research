import { useMemo, useState, useEffect } from 'react';
import { Header, Label, Table, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/common';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useI18n } from '../lib/i18n';
import { GaugeChart } from '../components/GaugeChart';

export default function WaterQualityPage() {
  const { t } = useI18n();
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

  // Parse water quality rows and transform data structure
  const waterRows = useMemo(() => {
    if (!data) return [];
    const lower = {} as Record<string, any>;
    Object.keys(data).forEach((k) => (lower[k.toLowerCase()] = data[k]));
    const rawData = Array.isArray(lower['water_ql']) ? lower['water_ql'] : [];
    
    // Transform data to match expected format
    // Map stations to zones: 1-4 -> Gulf, 5-9 -> Andaman (for demo purposes)
    const getZoneFromStation = (station: number): string => {
      if (station <= 4) return 'Gulf';
      return 'Andaman';
    };
    
    return rawData.map((r: any) => {
      const monthNum = Number(r.month || r.Month || '');
      const yearNum = Number(r.year || r.Year || new Date().getFullYear());
      // Format as MM/YYYY
      const monthStr = monthNum ? `${String(monthNum).padStart(2, '0')}/${yearNum}` : '';
      return {
        Month: monthStr,
        MonthNum: monthNum,
        Year: yearNum,
        Zone: getZoneFromStation(Number(r.station || 1)),
        Temp: r.Temp_surface || r.temp_surface || r.Temp || r.temp || 0,
        DO: r.DO_surface || r.do_surface || r.DO || r.do || 0,
        pH: r.pH_surface || r.ph_surface || r.pH || r.ph || 0,
        Salinity: r.Salinity_surface || r.salinity_surface || r.Salinity || r.salinity || 0,
        Station: r.station || r.Station || '',
      };
    });
  }, [data]);

  // Collect filter options
  const filterOptions = useMemo(() => {
    // For filter, use MonthNum for sorting, but display as MM/YYYY
    const monthMap = new Map<string, number>();
    waterRows.forEach(r => {
      if (r.MonthNum) {
        monthMap.set(r.Month, r.MonthNum + r.Year * 100); // Create sortable key
      }
    });
    const months = Array.from(monthMap.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([month]) => month);
    const zones = Array.from(new Set(waterRows.map(r => r.Zone))).sort();
    return { months, zones };
  }, [waterRows]);

  // Filtered data
  const filtered = useMemo(() => {
    return waterRows.filter((r) =>
      (month === 'all' || String(r.Month) === month) &&
      (zone === 'all' || String(r.Zone) === zone)
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
  const radarData = useMemo(() => [
    { param: t('water.chart.temp'), value: Number(means.temp) },
    { param: t('water.chart.do'), value: Number(means.do) },
    { param: t('water.chart.ph'), value: Number(means.ph) },
    { param: t('water.chart.salinity'), value: Number(means.salinity) },
  ], [means, t]);

  // Line chart data
  const trendByMonth = useMemo(() => {
    const map: Record<string, { month: string, monthNum: number, year: number, temp: number[], do: number[], ph: number[], salinity: number[] }> = {};
    for (const r of waterRows) {
      const m = String(r.Month);
      if (!map[m]) map[m] = { month: m, monthNum: r.MonthNum || 0, year: r.Year || 0, temp: [], do: [], ph: [], salinity: [] };
      map[m].temp.push(Number(r.Temp));
      map[m].do.push(Number(r.DO));
      map[m].ph.push(Number(r.pH));
      map[m].salinity.push(Number(r.Salinity));
    }
    return Object.values(map)
      .sort((a, b) => {
        // Sort by year first, then by month
        if (a.year !== b.year) return a.year - b.year;
        return a.monthNum - b.monthNum;
      })
      .map(x => ({
      month: x.month,
      Temp: avg(x.temp),
      DO: avg(x.do),
      pH: avg(x.ph),
      Salinity: avg(x.salinity),
    }));
  }, [waterRows]);

  // Top 10 highest values for each parameter
  const top10Data = useMemo(() => {
    // Add more mock data if needed to ensure we have enough records
    const allData = [...waterRows];
    
    // If we don't have enough data, generate mock data
    while (allData.length < 50) {
      const baseIndex = allData.length % waterRows.length;
      const baseRow = waterRows[baseIndex] || waterRows[0];
      if (!baseRow) break;
      
      const monthNum = (baseIndex % 12) + 1;
      const year = 2024 + Math.floor(baseIndex / 12);
      const station = (baseIndex % 9) + 1;
      
      allData.push({
        Month: `${String(monthNum).padStart(2, '0')}/${year}`,
        MonthNum: monthNum,
        Year: year,
        Zone: station <= 4 ? 'Gulf' : 'Andaman',
        Temp: 20 + Math.random() * 15,
        DO: 3 + Math.random() * 5,
        pH: 6.5 + Math.random() * 2,
        Salinity: 25 + Math.random() * 15,
        Station: `ST-${station}`,
      });
    }
    
    const sortAndTake = (data: any[], key: string) => {
      return [...data]
        .sort((a, b) => Number(b[key]) - Number(a[key]))
        .slice(0, 10)
        .map((r, idx) => ({
          rank: idx + 1,
          value: Number(r[key]).toFixed(2),
          month: r.Month,
          zone: r.Zone,
          station: r.Station,
        }));
    };
    
    return {
      temp: sortAndTake(allData, 'Temp'),
      do: sortAndTake(allData, 'DO'),
      ph: sortAndTake(allData, 'pH'),
      salinity: sortAndTake(allData, 'Salinity'),
    };
  }, [waterRows]);

  // Alert table: giá trị bất thường theo rule
  const alertRows = useMemo(() => {
    const alerts = filtered.filter(r => (Number(r.Temp) > 30 || Number(r.DO) < 3 || Number(r.pH) < 7 || Number(r.Salinity) > 35));
    // Sort by year first, then by month
    return alerts.sort((a, b) => {
      // Sort by year first
      if (a.Year !== b.Year) {
        return a.Year - b.Year;
      }
      // Then by month number
      return (a.MonthNum || 0) - (b.MonthNum || 0);
    });
  }, [filtered]);

  function exportXLSX() {
    // Nếu triển khai SheetJS thì ở đây load dynamic, ví dụ chỉ placeholder:
    alert(t('water.export.placeholder'));
  }

  // Table columns with translation
  const tableColumns = useMemo(() => [
    t('water.month'),
    t('water.zone'),
    t('water.chart.temp'),
    t('water.chart.do'),
    t('water.chart.ph'),
    t('water.chart.salinity'),
  ], [t]);

  return (
    <div className="min-h-full pb-8">
      <Header title={t('water.title')} desc={t('water.desc')} sticky exportLabel={t('header.export') + ' .xlsx'} onExport={exportXLSX} />
      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-2">
        <div>
          <Label>{t('water.month')}</Label>
          <Select defaultValue={month} onValueChange={setMonth}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              {filterOptions.months.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t('water.zone')}</Label>
          <Select defaultValue={zone} onValueChange={setZone}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              {filterOptions.zones.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Gauge Charts with Top 10 Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-6">
        {/* Temperature */}
        <div className="rounded-xl border bg-background p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <GaugeChart
                value={Number(means.temp)}
                min={0}
                max={40}
                label={t('water.chart.temp')}
                unit="°C"
              />
            </div>
            <div>
              <div className="text-sm font-semibold mb-2">{t('water.top10')}</div>
              <div className="overflow-auto max-h-[280px]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50 border-b">
                    <tr>
                      <th className="p-1 text-left">#</th>
                      <th className="p-1 text-right">{t('water.chart.temp')}</th>
                      <th className="p-1 text-left">{t('water.month')}</th>
                      <th className="p-1 text-left">{t('water.zone')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top10Data.temp.map((row) => (
                      <tr key={row.rank} className="border-b hover:bg-gray-50">
                        <td className="p-1">{row.rank}</td>
                        <td className="p-1 text-right font-medium">{row.value}°C</td>
                        <td className="p-1">{row.month}</td>
                        <td className="p-1">{row.zone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Dissolved Oxygen */}
        <div className="rounded-xl border bg-background p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <GaugeChart
                value={Number(means.do)}
                min={0}
                max={10}
                label={t('water.chart.do')}
                unit="mg/L"
              />
            </div>
            <div>
              <div className="text-sm font-semibold mb-2">{t('water.top10')}</div>
              <div className="overflow-auto max-h-[280px]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50 border-b">
                    <tr>
                      <th className="p-1 text-left">#</th>
                      <th className="p-1 text-right">{t('water.chart.do')}</th>
                      <th className="p-1 text-left">{t('water.month')}</th>
                      <th className="p-1 text-left">{t('water.zone')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top10Data.do.map((row) => (
                      <tr key={row.rank} className="border-b hover:bg-gray-50">
                        <td className="p-1">{row.rank}</td>
                        <td className="p-1 text-right font-medium">{row.value} mg/L</td>
                        <td className="p-1">{row.month}</td>
                        <td className="p-1">{row.zone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* pH */}
        <div className="rounded-xl border bg-background p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <GaugeChart
                value={Number(means.ph)}
                min={0}
                max={14}
                label={t('water.chart.ph')}
                unit=""
              />
            </div>
            <div>
              <div className="text-sm font-semibold mb-2">{t('water.top10')}</div>
              <div className="overflow-auto max-h-[280px]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50 border-b">
                    <tr>
                      <th className="p-1 text-left">#</th>
                      <th className="p-1 text-right">{t('water.chart.ph')}</th>
                      <th className="p-1 text-left">{t('water.month')}</th>
                      <th className="p-1 text-left">{t('water.zone')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top10Data.ph.map((row) => (
                      <tr key={row.rank} className="border-b hover:bg-gray-50">
                        <td className="p-1">{row.rank}</td>
                        <td className="p-1 text-right font-medium">{row.value}</td>
                        <td className="p-1">{row.month}</td>
                        <td className="p-1">{row.zone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Salinity */}
        <div className="rounded-xl border bg-background p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <GaugeChart
                value={Number(means.salinity)}
                min={0}
                max={40}
                label={t('water.chart.salinity')}
                unit="PSU"
              />
            </div>
            <div>
              <div className="text-sm font-semibold mb-2">{t('water.top10')}</div>
              <div className="overflow-auto max-h-[280px]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50 border-b">
                    <tr>
                      <th className="p-1 text-left">#</th>
                      <th className="p-1 text-right">{t('water.chart.salinity')}</th>
                      <th className="p-1 text-left">{t('water.month')}</th>
                      <th className="p-1 text-left">{t('water.zone')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top10Data.salinity.map((row) => (
                      <tr key={row.rank} className="border-b hover:bg-gray-50">
                        <td className="p-1">{row.rank}</td>
                        <td className="p-1 text-right font-medium">{row.value} PSU</td>
                        <td className="p-1">{row.month}</td>
                        <td className="p-1">{row.zone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
        <div className="rounded-xl border bg-background p-3">
          <div className="text-sm font-medium mb-2">{t('water.radarChart')}</div>
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
          <div className="text-sm font-medium mb-2">{t('water.lineChart')}</div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="Temp" name={t('water.chart.temp')} stroke="#60a5fa" />
                <Line type="monotone" dataKey="DO" name={t('water.chart.do')} stroke="#22c55e" />
                <Line type="monotone" dataKey="pH" name={t('water.chart.ph')} stroke="#d97706" />
                <Line type="monotone" dataKey="Salinity" name={t('water.chart.salinity')} stroke="#06b6d4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="rounded-xl border bg-background p-3 mt-6">
        <div className="text-sm font-medium mb-2">{t('water.alertTable')}</div>
        <Table
          columns={tableColumns}
          rows={alertRows.map((r) => [r.Month, r.Zone, r.Temp, r.DO, r.pH, r.Salinity])}
          minHeight={420}
        />
      </div>
    </div>
  );
}
