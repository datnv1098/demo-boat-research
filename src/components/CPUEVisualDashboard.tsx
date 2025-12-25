import { useMemo } from 'react'
import Chart from 'react-apexcharts'
import { ApexOptions } from 'apexcharts'
import { MapPin, Target, Anchor, Fish, ChevronDown, Calendar, ArrowDownUp } from 'lucide-react'

interface CPUEVisualDashboardProps {
    data: any[]
    month?: string
    area?: string
    zone?: string
}

export function CPUEVisualDashboard({ data }: CPUEVisualDashboardProps) {
    // Main CPUE Bar Chart Data
    const barChartSeries = useMemo(() => {
        const mockValues = [1.2, 1.8, 2.5, 3.8, 4.2, 5.5, 6.8, 7.5]

        // In real app, we would calculate this from 'data' prop
        return [
            {
                name: 'CPUE (kg/hr)',
                data: data.length > 0 ? Array.from({ length: 8 }, (_, i) => {
                    const val = data.slice(i * 10, (i + 1) * 10).reduce((acc, curr) => acc + curr.cpue, 0) / 10
                    return val || mockValues[i]
                }) : mockValues
            }
        ]
    }, [data])

    const barChartOptions: ApexOptions = {
        chart: {
            type: 'bar',
            toolbar: { show: false },
            fontFamily: 'Inter, system-ui, sans-serif'
        },
        plotOptions: {
            bar: {
                borderRadius: 4,
                columnWidth: '60%',
                dataLabels: { position: 'top' }
            }
        },
        colors: ['#0056b3'],
        dataLabels: {
            enabled: false
        },
        xaxis: {
            categories: ['Q1', 'Q2', 'Q3', 'Q4', 'Q1-25', 'Q2-25', 'Q3-25', 'Q4-25'],
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
            labels: {
                formatter: (val) => val.toFixed(1)
            }
        },
        grid: {
            borderColor: '#f1f1f1',
            strokeDashArray: 4
        }
    }

    // Box Plot Data (CPUE distribution by area or species)
    const boxPlotSeries = useMemo(() => {
        return [
            {
                type: 'boxPlot',
                data: Array.from({ length: 15 }, (_, i) => ({
                    x: `Area ${i + 1}`,
                    y: Array.from({ length: 5 }, () => 30 + Math.random() * 50).sort((a, b) => a - b)
                }))
            }
        ]
    }, [])

    const boxPlotOptions: ApexOptions = {
        chart: {
            type: 'boxPlot',
            toolbar: { show: true }
        },
        colors: ['#0056b3'],
        plotOptions: {
            boxPlot: {
                colors: {
                    upper: '#0056b3',
                    lower: '#0056b3'
                }
            }
        },
        xaxis: {
            labels: {
                rotate: -45,
                style: { fontSize: '12px' }
            }
        },
        yaxis: {
            max: 80,
            labels: {
                formatter: (val) => val.toFixed(2)
            }
        },
        tooltip: {
            y: {
                formatter: (val) => val.toFixed(2)
            }
        }
    }

    // Lmean Bell Curve Data
    const lmeanSeries = useMemo(() => {
        const points = []
        const mean = 50
        const dev = 15
        for (let x = 0; x <= 100; x += 2) {
            const y = (1 / (dev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / dev, 2))
            points.push({ x, y })
        }
        return [{
            name: 'Distribution',
            data: points.map(p => p.y)
        }]
    }, [])

    const lmeanOptions: ApexOptions = {
        chart: {
            type: 'area',
            toolbar: { show: false },
            sparkline: { enabled: true }
        },
        stroke: { curve: 'smooth', width: 2 },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.45,
                opacityTo: 0.05,
                stops: [20, 100, 100, 100]
            }
        },
        colors: ['#0056b3'],
        xaxis: {
            labels: { show: false },
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
            labels: { show: false }
        },
        tooltip: { enabled: false }
    }

    return (
        <div className="bg-[#f0f7ff] p-6 rounded-3xl border border-[#0056b3] shadow-2xl overflow-hidden font-sans max-w-7xl mx-auto my-8">
            {/* Top Navigation / Filters */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div className="flex bg-white rounded-xl shadow-sm border p-1 overflow-hidden">
                    {[
                        { Icon: MapPin, label: 'Area' },
                        { Icon: Target, label: 'Zone' },
                        { Icon: Anchor, label: 'Station' },
                        { Icon: Fish, label: 'Species' },
                        { Icon: ArrowDownUp, label: 'Depth' },
                        { Icon: Calendar, label: 'Date' }
                    ].map((item, i) => (
                        <button key={i} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 border-r last:border-0 transition-colors">
                            <item.Icon className="h-5 w-5 text-blue-800" />
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                        </button>
                    ))}
                </div>

                {/*<div className="bg-[#1b7c43] text-white px-6 py-2 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-[#166436] transition-all shadow-md active:scale-95">*/}
                {/*    <div className="p-1.5 bg-white/20 rounded-md">*/}
                {/*        <FileDown className="h-6 w-6" />*/}
                {/*    </div>*/}
                {/*    <div>*/}
                {/*        <div className="text-[10px] leading-tight opacity-80 uppercase tracking-widest font-bold">Download Report</div>*/}
                {/*        <div className="text-lg font-black leading-tight tracking-tighter italic">EXCEL</div>*/}
                {/*    </div>*/}
                {/*    <ChevronDown className="h-5 w-5 ml-2" />*/}
                {/*</div>*/}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-12 gap-8 items-start">

                {/* Left Measurement Box */}
                <div className="col-span-12 lg:col-span-4 space-y-8">
                    <div className="bg-white rounded-[2rem] p-8 shadow-xl border-blue-600 relative overflow-hidden group hover:shadow-2xl transition-all duration-500">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Fish className="h-32 w-32 rotate-12" />
                        </div>
                        <img
                            src="/fish_measurement.png"
                            alt="Fish Measurement"
                            className="w-full object-contain mb-8 group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="flex justify-between items-end border-t border-slate-100 pt-6">
                            <div>
                                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Mean Length</div>
                                <div className="text-4xl font-black text-blue-900 leading-none">42.5 <span className="text-xl">cm</span></div>
                            </div>
                            <div className="text-right">
                                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Stock Status</div>
                                <div className="text-xl font-bold text-green-600">HEALTHY</div>
                            </div>
                        </div>
                    </div>

                    {/* Lmean Distribution */}
                    <div className="bg-white rounded-[2rem] p-8 shadow-xl border-blue-400">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-extrabold text-blue-900 tracking-tight italic">Lmean Distribution</h3>
                            <div className="bg-blue-50 p-2 rounded-lg"><Target className="h-5 w-5 text-blue-600" /></div>
                        </div>
                        <div className="h-40 relative">
                            <Chart options={lmeanOptions} series={lmeanSeries} type="area" height="100%" />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-0.5 h-full bg-blue-600/30 border-r border-dashed border-blue-600"></div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-6">
                            <div className="bg-slate-50 p-4 rounded-2xl text-center">
                                <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Median</div>
                                <div className="text-2xl font-black text-blue-900">48.2</div>
                            </div>
                            <div className="bg-blue-900 p-4 rounded-2xl text-center text-white">
                                <div className="text-[10px] text-white/60 uppercase font-black tracking-widest mb-1">Peak Value</div>
                                <div className="text-2xl font-black">50.0</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Charts Box */}
                <div className="col-span-12 lg:col-span-8 space-y-8">

                    {/* Main Bar Chart */}
                    <div className="bg-white rounded-[2.5rem] p-10 shadow-xl relative border-blue-800">
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h2 className="text-3xl font-black text-blue-900 tracking-tighter italic">CPUE TREND ANALYSIS</h2>
                                <p className="text-slate-400 font-medium">Catch Per Unit Effort by Quarterly Periods</p>
                            </div>
                            <div className="flex gap-2">
                                <div className="h-3 w-8 bg-blue-800 rounded-full"></div>
                                <div className="h-3 w-3 bg-blue-200 rounded-full"></div>
                            </div>
                        </div>
                        <div className="h-80">
                            <Chart options={barChartOptions} series={barChartSeries} type="bar" height="100%" />
                        </div>
                    </div>

                    {/* Leaderboard Section */}
                    <div className="bg-blue-900 rounded-[2rem] p-8 shadow-xl text-white overflow-hidden relative">
                        <div className="absolute -bottom-4 -right-4 opacity-5">
                            <Target className="h-40 w-40" />
                        </div>
                        <h3 className="text-xl font-extrabold mb-6 italic flex items-center justify-between">
                            TOP 100 STATIONS
                            <span className="text-[10px] bg-white/20 px-2 py-1 rounded tracking-widest">LIVE</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                            {[
                                { id: 'ST-204', val: '8.42', trend: '+12%' },
                                { id: 'ST-112', val: '7.95', trend: '+5%' },
                                { id: 'ST-045', val: '7.61', trend: '-2%' },
                                { id: 'ST-289', val: '7.44', trend: '+8%' },
                                { id: 'ST-103', val: '7.12', trend: '+1%' },
                                { id: 'ST-012', val: '6.98', trend: '+3%' },
                                { id: 'ST-156', val: '6.75', trend: '+9%' },
                                { id: 'ST-099', val: '6.42', trend: '-4%' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between border-b border-white/10 pb-3 last:border-0 md:last:border-b">
                                    <div className="flex items-center gap-4">
                                        <span className="text-white/40 font-black italic">{i + 1}</span>
                                        <span className="font-bold tracking-tight">{item.id}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-mono text-lg font-black">{item.val}</span>
                                        <span className={`text-[10px] font-black ${item.trend.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                                            {item.trend}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-black text-xs tracking-widest uppercase transition-all">
                            View Full Leaderboard
                        </button>
                    </div>

                </div>
            </div>

            {/* Separate Full Width Variation by Zone Section */}
            <div className="mt-8 bg-white rounded-[2rem] p-8 shadow-xl border border-blue-600">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-2xl font-black text-blue-900 italic uppercase">Variation by Area & Zone</h3>
                        <p className="text-slate-400 font-medium text-sm">Detailed CPUE Distribution across 15 priority research areas</p>
                    </div>
                    <div className="flex gap-4 items-center">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Current Period</span>
                        </div>
                    </div>
                </div>
                <div className="h-80">
                    <Chart options={boxPlotOptions} series={boxPlotSeries} type="boxPlot" height="100%" />
                </div>
            </div>
        </div>
    )
}
