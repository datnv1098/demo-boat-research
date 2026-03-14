import { useMemo, useState, useEffect } from 'react';
import { Header, Label, Table, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/common';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useI18n } from '../lib/i18n';
import { GaugeChart } from '../components/GaugeChart';
import { fetchApiRows } from '../lib/mockApi';

function toZoneLabel(regionCode: string): string {
  const code = String(regionCode || '').toUpperCase().trim();
  if (code === 'ADM') return 'Andaman';
  if (code === 'GOT') return 'Gulf';
  return code || 'Unknown';
}

function parseMonthFromDate(dateRaw: string): { monthStr: string; monthNum: number; year: number } {
  const d = new Date(String(dateRaw || ''));
  if (isNaN(d.getTime())) return { monthStr: '', monthNum: 0, year: 0 };
  const monthNum = d.getUTCMonth() + 1;
  const year = d.getUTCFullYear();
  return {
    monthStr: `${String(monthNum).padStart(2, '0')}/${year}`,
    monthNum,
    year,
  };
}

interface WaterRow {
  Month: string;
  MonthNum: number;
  Year: number;
  Zone: string;
  Temp: number;
  DO: number;
  pH: number;
  Salinity: number;
  Date: string;
  RegionCode: string;
}

interface TopRow {
  rank: number;
  value: string;
  month: string;
  zone: string;
}

export default function WaterQualityPage() {
  const { t } = useI18n();
  const [waterRows, setWaterRows] = useState<WaterRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'previous' | 'month'>('previous');
  const [valueFilter, setValueFilter] = useState('all');
  const [zone, setZone] = useState('all');

  useEffect(() => {
    let cancelled = false;

    async function loadFromApi() {
      setError(null);
      try {
        const envRows = await fetchApiRows('/api/environment/daily', 1000);
        const normalized: WaterRow[] = envRows.map((r: any) => {
          const { monthStr, monthNum, year } = parseMonthFromDate(String(r.date ?? ''));
          return {
            Month: monthStr,
            MonthNum: monthNum,
            Year: year,
            Zone: toZoneLabel(String(r.region_code ?? '')),
            Temp: Number(r.temp_c ?? 0),
            DO: Number(r.do_mg_l_approx ?? 0),
            pH: Number(r.ph_total_scale ?? 0),
            Salinity: Number(r.salinity_psu ?? 0),
            Date: String(r.date ?? ''),
            RegionCode: String(r.region_code ?? ''),
          };
        }).filter((r: WaterRow) => r.Month && (r.Zone === 'Andaman' || r.Zone === 'Gulf'));

        if (!cancelled) setWaterRows(normalized);
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    }

    loadFromApi();
    return () => {
      cancelled = true;
    };
  }, []);

  // Collect filter options
  const filterOptions = useMemo(() => {
    // For filter, use MonthNum for sorting, but display as MM/YYYY
    const monthMap = new Map<string, number>();
    waterRows.forEach((r: WaterRow) => {
      if (r.MonthNum) {
        monthMap.set(r.Month, r.MonthNum + r.Year * 100); // Create sortable key
      }
    });
    const months = Array.from(monthMap.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([month]) => month);
    const years = Array.from(new Set(waterRows.map((r: WaterRow) => String(r.Year)))).sort();
    const zones = Array.from(new Set(waterRows.map((r: WaterRow) => r.Zone))).sort();
    return { months, years, zones };
  }, [waterRows]);

  const valueOptions = useMemo(() => {
    if (typeFilter === 'previous') return ['1', '2', '3', '4'];
    return ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  }, [typeFilter]);

  useEffect(() => {
    setValueFilter('all');
  }, [typeFilter]);

  // Filtered data
  const filtered = useMemo(() => {
    return waterRows.filter((r: WaterRow) =>
      (yearFilter === 'all' || String(r.Year) === yearFilter) &&
      (valueFilter === 'all' || (typeFilter === 'previous'
        ? Math.floor((r.MonthNum - 1) / 3) + 1 === Number(valueFilter)
        : r.MonthNum === Number(valueFilter))) &&
      (zone === 'all' || String(r.Zone) === zone)
    );
  }, [waterRows, yearFilter, typeFilter, valueFilter, zone]);

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const means = useMemo(() => {
    if (!filtered.length) return { temp: 0, do: 0, ph: 0, salinity: 0 };
    return {
      temp: avg(filtered.map((r: WaterRow) => Number(r.Temp))).toFixed(2),
      do: avg(filtered.map((r: WaterRow) => Number(r.DO))).toFixed(2),
      ph: avg(filtered.map((r: WaterRow) => Number(r.pH))).toFixed(2),
      salinity: avg(filtered.map((r: WaterRow) => Number(r.Salinity))).toFixed(2),
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
    for (const r of filtered) {
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
  }, [filtered]);

  // Top 10 highest values for each parameter
  const top10Data = useMemo(() => {
    const allData = [...filtered];
    
    const sortAndTake = (data: WaterRow[], key: keyof WaterRow): TopRow[] => {
      return [...data]
        .sort((a: WaterRow, b: WaterRow) => Number(b[key]) - Number(a[key]))
        .slice(0, 10)
        .map((r: WaterRow, idx: number) => ({
          rank: idx + 1,
          value: Number(r[key]).toFixed(2),
          month: r.Month,
          zone: r.Zone,
        }));
    };
    
    return {
      temp: sortAndTake(allData, 'Temp'),
      do: sortAndTake(allData, 'DO'),
      ph: sortAndTake(allData, 'pH'),
      salinity: sortAndTake(allData, 'Salinity'),
    };
  }, [filtered]);

  // Alert table: giá trị bất thường theo rule
  const alertRows = useMemo(() => {
    const alerts = filtered.filter((r: WaterRow) => (Number(r.Temp) > 30 || Number(r.DO) < 3 || Number(r.pH) < 7 || Number(r.Salinity) > 35));
    // Sort by year first, then by month
    return alerts.sort((a: WaterRow, b: WaterRow) => {
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 my-2">
        <div>
          <Label>{t('filter.year')}</Label>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              {filterOptions.years.map((y: string) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t('filter.type')}</Label>
          <Select value={typeFilter} onValueChange={(v: 'previous' | 'month') => setTypeFilter(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="previous">{t('filter.type.previous')}</SelectItem>
              <SelectItem value="month">{t('filter.type.month')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t('filter.value')}</Label>
          <Select value={valueFilter} onValueChange={setValueFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              {valueOptions.map((v: string) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t('water.zone')}</Label>
          <Select value={zone} onValueChange={setZone}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              {filterOptions.zones.map((z: string) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
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
                    {top10Data.temp.map((row: TopRow) => (
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
                    {top10Data.do.map((row: TopRow) => (
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
                    {top10Data.ph.map((row: TopRow) => (
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
                    {top10Data.salinity.map((row: TopRow) => (
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
