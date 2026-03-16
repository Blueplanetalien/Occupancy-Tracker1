import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { ChevronLeft, ChevronRight, Download, FileText, TrendingUp } from 'lucide-react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend
} from 'recharts';
import { downloadCSV, exportMonthlyReportPDF, buildClusterGroups } from '../utils/export';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const getColor = (pct) => pct >= 75 ? '#556B2F' : pct >= 50 ? '#F5C518' : '#ef4444';
const getBg = (pct) => pct >= 75 ? 'bg-green-100 text-green-700' : pct >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600';

const TrendTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-2.5 shadow-lg text-xs">
      <div className="font-semibold text-stone-600 mb-1">Day {label}</div>
      <div className="text-[#556B2F] font-bold">{payload[0]?.value?.toFixed(1)}% occupancy</div>
    </div>
  );
};

export default function MonthlyReport() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comparison, setComparison] = useState(null);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/reports/monthly?year=${year}&month=${month}`)
      .then(res => setReport(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year, month]);

  const changeMonth = (delta) => {
    let m = month + delta, y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m); setYear(y);
    setComparison(null); setShowComparison(false);
  };

  const loadComparison = () => {
    if (comparison) { setShowComparison(true); return; }
    setLoadingComparison(true);
    api.get(`/reports/trend-comparison?year=${year}`)
      .then(res => { setComparison(res.data); setShowComparison(true); })
      .catch(console.error)
      .finally(() => setLoadingComparison(false));
  };

  const sorted = (report?.properties || []).slice().sort((a, b) => b.avg_occupancy_percentage - a.avg_occupancy_percentage);
  const withData = sorted.filter(p => p.days_with_data > 0);
  const highCount = withData.filter(p => p.avg_occupancy_percentage >= 75).length;
  const midCount = withData.filter(p => p.avg_occupancy_percentage >= 50 && p.avg_occupancy_percentage < 75).length;
  const lowCount = withData.filter(p => p.avg_occupancy_percentage < 50).length;
  const [viewMode, setViewMode] = useState('all');
  const clusterGroups = buildClusterGroups(sorted, 'monthly');

  const handleExportCSV = () => {
    if (!report) return;
    downloadCSV(
      sorted,
      [
        { key: 'property_name', label: 'Property' },
        { key: 'cluster_manager_name', label: 'Cluster Manager' },
        { key: 'manager_name', label: 'Property Manager' },
        { key: 'total_beds', label: 'Total Beds' },
        { key: 'avg_occupancy_percentage', label: 'Avg Occupancy %' },
        { key: 'days_with_data', label: 'Days with Data' },
      ],
      `Yube1_Monthly_${year}_${String(month).padStart(2,'0')}.csv`,
      [['Period', `${MONTHS[month-1]} ${year}`], ['Generated', new Date().toLocaleString('en-IN')]],
      {
        title: 'CLUSTER SUMMARY',
        columns: [
          { key: 'name', label: 'Cluster Manager' },
          { key: 'total', label: 'Total Properties' },
          { key: 'reporting', label: 'Properties with Data' },
          { key: 'total_beds', label: 'Total Beds' },
          { key: 'avg_occupancy', label: 'Avg Occupancy %' },
        ],
        rows: clusterGroups,
      }
    );
  };

  const handleExportPDF = () => report && exportMonthlyReportPDF(report);

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-[#FAFAF9] animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-[#1A1C18]">Monthly Report</h1>
          <p className="text-sm text-stone-400 mt-0.5">{MONTHS[month - 1]} {year} — consolidated monthly analysis</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-500"><ChevronLeft size={15} /></button>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} data-testid="month-select"
            className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30">
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))} data-testid="year-select"
            className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => changeMonth(1)} className="p-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-500"><ChevronRight size={15} /></button>
          {report && (
            <>
              <button data-testid="monthly-export-csv" onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-2 border border-stone-200 bg-white rounded-lg text-xs font-medium text-stone-600 hover:bg-stone-50">
                <Download size={12} /> CSV
              </button>
              <button data-testid="monthly-export-pdf" onClick={handleExportPDF}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#556B2F] text-white rounded-lg text-xs font-medium hover:bg-[#435425]">
                <FileText size={12} /> PDF
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-[#556B2F] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
            {[
              { label: 'Avg Monthly Occupancy', value: report?.days_with_data > 0 ? `${report.overall_avg_occupancy}%` : '—', color: '#556B2F' },
              { label: 'Total Beds', value: (report?.total_beds || 0).toLocaleString(), color: '#6B7C4E' },
              { label: 'Days with Data', value: `${report?.days_with_data || 0} / ${report?.days_in_month || 30}`, color: '#A3B18A' },
              { label: 'Properties with Data', value: `${withData.length} / ${(report?.properties || []).length}`, color: '#F5C518' },
            ].map(item => (
              <div key={item.label} className="bg-white rounded-xl border border-stone-100 shadow-sm p-4">
                <div className="text-xs text-stone-400 font-medium mb-1">{item.label}</div>
                <div className="text-2xl font-bold font-heading" style={{ color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Occupancy Band Summary */}
          {withData.length > 0 && (
            <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-5 mb-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold font-heading text-[#1A1C18]">Monthly Performance Distribution</h3>
                <span className="text-xs text-stone-400">{withData.length} properties with data</span>
              </div>
              <div className="flex h-7 rounded-lg overflow-hidden gap-0.5">
                {highCount > 0 && <div className="bg-[#556B2F] flex items-center justify-center text-white text-xs font-bold" style={{ width: `${(highCount / withData.length) * 100}%` }}>{highCount > 1 ? `${highCount} High` : highCount}</div>}
                {midCount > 0 && <div className="bg-[#F5C518] flex items-center justify-center text-stone-800 text-xs font-bold" style={{ width: `${(midCount / withData.length) * 100}%` }}>{midCount > 1 ? `${midCount} Mid` : midCount}</div>}
                {lowCount > 0 && <div className="bg-red-400 flex items-center justify-center text-white text-xs font-bold" style={{ width: `${(lowCount / withData.length) * 100}%` }}>{lowCount > 1 ? `${lowCount} Low` : lowCount}</div>}
              </div>
              <div className="flex gap-4 mt-2 text-xs text-stone-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#556B2F]" />{highCount} High (≥75%)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#F5C518]" />{midCount} Mid (50–74%)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />{lowCount} Low (&lt;50%)</span>
              </div>
            </div>
          )}

          {/* Daily Trend Area Chart */}
          <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold font-heading text-[#1A1C18]">Daily Occupancy Trend</h3>
                <p className="text-xs text-stone-400 mt-0.5">{MONTHS[month - 1]} {year} — day-by-day consolidated %</p>
              </div>
              {report?.daily_trend?.length > 0 && (
                <div className="text-right">
                  <div className="text-base font-bold font-heading text-[#556B2F]">{report.overall_avg_occupancy}%</div>
                  <div className="text-[10px] text-stone-400">Month avg</div>
                </div>
              )}
            </div>
            {report?.daily_trend?.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={report.daily_trend}>
                  <defs>
                    <linearGradient id="monthly-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#556B2F" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#556B2F" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ee" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<TrendTooltip />} />
                  <Area type="monotone" dataKey="occupancy" stroke="#556B2F" strokeWidth={2.5} fill="url(#monthly-gradient)" dot={{ r: 3, fill: '#556B2F', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-stone-300 text-sm">No data for {MONTHS[month - 1]} {year}</div>
            )}
          </div>

          {/* Property Rankings — horizontal bars */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
            {/* Top 10 */}
            <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-5">
              <h3 className="text-sm font-bold font-heading text-[#1A1C18] mb-1">Top Performers</h3>
              <p className="text-xs text-stone-400 mb-4">Highest avg occupancy this month</p>
              <div className="space-y-2">
                {sorted.filter(p => p.days_with_data > 0).slice(0, 10).map((p, i) => (
                  <div key={p.property_id} className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-stone-400 w-4">{i + 1}</span>
                    <span className="text-xs text-stone-600 w-28 flex-shrink-0 truncate">{p.property_name.replace('Yube1 ', '')}</span>
                    <div className="flex-1 h-3 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${p.avg_occupancy_percentage}%`, backgroundColor: getColor(p.avg_occupancy_percentage) }} />
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${getBg(p.avg_occupancy_percentage)}`}>
                      {p.avg_occupancy_percentage}%
                    </span>
                  </div>
                ))}
                {withData.length === 0 && <div className="text-center py-6 text-stone-300 text-xs">No data this month</div>}
              </div>
            </div>

            {/* Bottom performers */}
            <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-5">
              <h3 className="text-sm font-bold font-heading text-[#1A1C18] mb-1">Needs Improvement</h3>
              <p className="text-xs text-stone-400 mb-4">Lowest avg occupancy this month</p>
              <div className="space-y-2">
                {[...sorted].reverse().filter(p => p.days_with_data > 0).slice(0, 10).map((p, i) => (
                  <div key={p.property_id} className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-stone-400 w-4">{i + 1}</span>
                    <span className="text-xs text-stone-600 w-28 flex-shrink-0 truncate">{p.property_name.replace('Yube1 ', '')}</span>
                    <div className="flex-1 h-3 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${p.avg_occupancy_percentage}%`, backgroundColor: getColor(p.avg_occupancy_percentage) }} />
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${getBg(p.avg_occupancy_percentage)}`}>
                      {p.avg_occupancy_percentage}%
                    </span>
                  </div>
                ))}
                {withData.length === 0 && <div className="text-center py-6 text-stone-300 text-xs">No data this month</div>}
              </div>
            </div>
          </div>

          {/* Full Table — tabbed: All Properties / By Cluster */}
          <div className="bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold font-heading text-[#1A1C18]">Complete Monthly Summary — {MONTHS[month - 1]} {year}</h3>
                <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-0.5">
                  <button
                    data-testid="monthly-tab-all"
                    onClick={() => setViewMode('all')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${viewMode === 'all' ? 'bg-white text-[#556B2F] shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                  >All Properties</button>
                  <button
                    data-testid="monthly-tab-cluster"
                    onClick={() => setViewMode('cluster')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${viewMode === 'cluster' ? 'bg-white text-[#556B2F] shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                  >By Cluster</button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">{viewMode === 'all' ? 'Rank' : '#'}</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Property</th>
                    {viewMode === 'all' && <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Cluster Mgr</th>}
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Manager</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Beds</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Days with Data</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide min-w-[160px]">Avg Occupancy</th>
                  </tr>
                </thead>
                <tbody>
                  {viewMode === 'all' && sorted.map((prop, idx) => (
                    <tr key={prop.property_id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                      <td className="px-5 py-3 text-stone-400 text-xs">{idx + 1}</td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-stone-800 text-sm">{prop.property_name.replace('Yube1 ', '')}</div>
                        <div className="text-[10px] text-stone-400">{prop.property_name}</div>
                      </td>
                      <td className="px-5 py-3 text-stone-500 text-xs">{prop.cluster_manager_name || '—'}</td>
                      <td className="px-5 py-3 text-stone-500 text-xs">{prop.manager_name || '—'}</td>
                      <td className="px-4 py-3 text-center text-stone-600 text-xs font-medium">{prop.total_beds}</td>
                      <td className="px-4 py-3 text-center text-stone-500 text-xs">{prop.days_with_data}</td>
                      <td className="px-5 py-3">
                        {prop.days_with_data > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden max-w-24">
                              <div className="h-full rounded-full" style={{ width: `${prop.avg_occupancy_percentage}%`, backgroundColor: getColor(prop.avg_occupancy_percentage) }} />
                            </div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getBg(prop.avg_occupancy_percentage)}`}>
                              {prop.avg_occupancy_percentage}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-stone-300 text-xs">No data</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {viewMode === 'cluster' && clusterGroups.map(group => (
                    <React.Fragment key={group.name}>
                      {/* Cluster header row */}
                      <tr className="border-y-2 border-[#556B2F]/20 bg-[#556B2F]/5">
                        <td colSpan={6} className="px-5 py-2.5">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2.5">
                              <span className="text-xs font-bold text-[#1A1C18]">{group.name}</span>
                              <span className="text-[10px] text-stone-500 bg-stone-200 px-2 py-0.5 rounded-full">{group.total} properties</span>
                              <span className="text-[10px] text-stone-400">{group.reporting} with data</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <span className="text-[10px] text-stone-500">{group.total_beds} total beds</span>
                              {group.avg_occupancy != null ? (
                                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${getBg(group.avg_occupancy)}`}>
                                  avg {group.avg_occupancy}%
                                </span>
                              ) : (
                                <span className="text-[10px] text-stone-300 italic">No data this month</span>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                      {/* Property rows within cluster */}
                      {[...group.properties].sort((a, b) => b.avg_occupancy_percentage - a.avg_occupancy_percentage).map((prop, pidx) => (
                        <tr key={prop.property_id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                          <td className="px-5 py-3 text-stone-400 text-xs">{pidx + 1}</td>
                          <td className="px-5 py-3">
                            <div className="font-medium text-stone-800 text-sm">{prop.property_name.replace('Yube1 ', '')}</div>
                          </td>
                          <td className="px-5 py-3 text-stone-500 text-xs">{prop.manager_name || '—'}</td>
                          <td className="px-4 py-3 text-center text-stone-600 text-xs font-medium">{prop.total_beds}</td>
                          <td className="px-4 py-3 text-center text-stone-500 text-xs">{prop.days_with_data}</td>
                          <td className="px-5 py-3">
                            {prop.days_with_data > 0 ? (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden max-w-24">
                                  <div className="h-full rounded-full" style={{ width: `${prop.avg_occupancy_percentage}%`, backgroundColor: getColor(prop.avg_occupancy_percentage) }} />
                                </div>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getBg(prop.avg_occupancy_percentage)}`}>
                                  {prop.avg_occupancy_percentage}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-stone-300 text-xs">No data</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Year-over-Year Comparison */}
          <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-5 mt-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold font-heading text-[#1A1C18]">Year-over-Year Comparison</h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  {year} vs {year - 1} — monthly average occupancy across all properties
                </p>
              </div>
              {!showComparison ? (
                <button
                  data-testid="load-yoy-btn"
                  onClick={loadComparison}
                  disabled={loadingComparison}
                  className="flex items-center gap-2 px-4 py-2 bg-[#556B2F] text-white text-xs font-semibold rounded-lg hover:bg-[#435425] transition-all active:scale-95 disabled:opacity-50"
                >
                  <TrendingUp size={13} />
                  {loadingComparison ? 'Loading…' : 'Compare with Last Year'}
                </button>
              ) : (
                <button
                  onClick={() => setShowComparison(false)}
                  className="text-xs text-stone-400 hover:text-stone-600 px-3 py-1.5 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  Hide
                </button>
              )}
            </div>
            {showComparison && comparison && (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={comparison.comparison} margin={{ top: 5, right: 20, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ee" />
                    <XAxis dataKey="month_name" tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                    <Tooltip
                      formatter={(v, n) => [v != null ? `${v}%` : 'No data', n]}
                      labelFormatter={l => `Month: ${l}`}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Line
                      type="monotone"
                      dataKey={`y${year - 1}`}
                      name={String(year - 1)}
                      stroke="#a8a29e"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 3, fill: '#a8a29e' }}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey={`y${year}`}
                      name={String(year)}
                      stroke="#556B2F"
                      strokeWidth={2.5}
                      dot={{ r: 3.5, fill: '#556B2F' }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
                {/* Mini table: side-by-side month values */}
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-stone-100">
                        <th className="text-left py-1.5 text-stone-400 font-medium">Month</th>
                        {comparison.comparison.map(d => (
                          <th key={d.month} className="text-center py-1.5 text-stone-400 font-medium w-12">{d.month_name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-stone-50">
                        <td className="py-1.5 text-stone-500 font-medium">{year - 1}</td>
                        {comparison.comparison.map(d => (
                          <td key={d.month} className="text-center py-1.5 font-bold text-stone-400">
                            {d[`y${year - 1}`] != null ? `${d[`y${year - 1}`]}%` : '—'}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-1.5 font-semibold text-[#556B2F]">{year}</td>
                        {comparison.comparison.map(d => {
                          const v = d[`y${year}`];
                          return (
                            <td key={d.month} className={`text-center py-1.5 font-bold ${v != null ? (v >= 75 ? 'text-green-700' : v >= 50 ? 'text-yellow-600' : 'text-red-500') : 'text-stone-200'}`}>
                              {v != null ? `${v}%` : '—'}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {!showComparison && (
              <div className="h-32 flex items-center justify-center text-stone-300 text-sm border-2 border-dashed border-stone-100 rounded-xl">
                Click "Compare with Last Year" to load the comparison chart
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
