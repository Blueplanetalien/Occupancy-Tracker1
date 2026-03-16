import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { format, subDays, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Download, FileText, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts';
import { downloadCSV, exportDailyReportPDF } from '../utils/export';

const getColor = (pct) => pct >= 75 ? '#556B2F' : pct >= 50 ? '#F5C518' : '#ef4444';
const getBg = (pct) => pct >= 75 ? 'bg-green-100 text-green-700' : pct >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600';

const BarTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-3 shadow-lg text-xs max-w-48">
      <div className="font-semibold text-stone-700 mb-1.5">{d.property_name}</div>
      <div className="space-y-0.5">
        <div className="flex justify-between gap-4"><span className="text-stone-400">Manager</span><span className="font-medium">{d.manager_name || '—'}</span></div>
        <div className="flex justify-between gap-4"><span className="text-stone-400">Occupancy</span><span className="font-bold" style={{ color: getColor(d.occupancy_percentage) }}>{d.occupancy_percentage}%</span></div>
        <div className="flex justify-between gap-4"><span className="text-stone-400">Occupied</span><span className="font-medium">{d.occupied_beds} / {d.total_beds} beds</span></div>
      </div>
    </div>
  );
};

export default function DailyReport() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/reports/daily?date=${date}`)
      .then(res => setReport(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [date]);

  const changeDate = (delta) => {
    const d = new Date(date + 'T00:00:00');
    setDate(format(delta > 0 ? addDays(d, 1) : subDays(d, 1), 'yyyy-MM-dd'));
  };

  const handleExportCSV = () => report && downloadCSV(report.properties, [
    { key: 'property_name', label: 'Property' },
    { key: 'cluster_manager_name', label: 'Cluster Manager' },
    { key: 'manager_name', label: 'Property Manager' },
    { key: 'total_beds', label: 'Total Beds' },
    { key: 'occupied_beds', label: 'Occupied Beds' },
    { key: 'occupancy_percentage', label: 'Occupancy %' },
  ], `Yube1_Daily_Report_${date}.csv`, [['Date', date], ['Generated', new Date().toLocaleString('en-IN')]]);

  const handleExportPDF = () => report && exportDailyReportPDF(report);

  const reporting = (report?.properties || []).filter(p => p.has_entry);
  const sortedByOcc = [...reporting].sort((a, b) => b.occupancy_percentage - a.occupancy_percentage);

  const highCount = reporting.filter(p => p.occupancy_percentage >= 75).length;
  const midCount = reporting.filter(p => p.occupancy_percentage >= 50 && p.occupancy_percentage < 75).length;
  const lowCount = reporting.filter(p => p.occupancy_percentage < 50).length;

  const pieData = report ? [
    { name: 'Occupied', value: report.total_occupied, fill: '#556B2F' },
    { name: 'Vacant', value: report.total_beds - report.total_occupied, fill: '#e5e7eb' }
  ] : [];

  const allProps = (report?.properties || []).slice().sort((a, b) => (b.has_entry ? b.occupancy_percentage : -1) - (a.has_entry ? a.occupancy_percentage : -1));

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-[#FAFAF9] animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-[#1A1C18]">Daily Report</h1>
          <p className="text-sm text-stone-400 mt-0.5">Consolidated daily occupancy — {format(new Date(date + 'T00:00:00'), 'EEEE, dd MMM yyyy')}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => changeDate(-1)} className="p-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-500"><ChevronLeft size={15} /></button>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} data-testid="daily-date-picker"
            className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30" />
          <button onClick={() => changeDate(1)} className="p-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-500"><ChevronRight size={15} /></button>
          {report && (
            <>
              <button data-testid="export-csv-btn" onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-2 border border-stone-200 bg-white rounded-lg text-xs font-medium text-stone-600 hover:bg-stone-50">
                <Download size={12} /> CSV
              </button>
              <button data-testid="export-pdf-btn" onClick={handleExportPDF}
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
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
            {[
              { label: 'Overall Occupancy', value: reporting.length > 0 ? `${report.overall_occupancy_percentage}%` : '—', color: '#556B2F' },
              { label: 'Occupied / Total Beds', value: `${report.total_occupied} / ${report.total_beds}`, color: '#6B7C4E' },
              { label: 'Properties Reporting', value: `${report.reporting_properties} / ${report.total_properties}`, color: '#A3B18A' },
              { label: 'Vacant Beds', value: (report.total_beds - report.total_occupied).toLocaleString(), color: '#F5C518' },
            ].map(item => (
              <div key={item.label} data-testid={`daily-stat-${item.label.toLowerCase().replace(/ \/ /g,'-').replace(/ /g, '-')}`}
                className="bg-white rounded-xl border border-stone-100 shadow-sm p-4">
                <div className="text-xs text-stone-400 font-medium mb-1">{item.label}</div>
                <div className="text-2xl font-bold font-heading" style={{ color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Occupancy Band Summary Bar */}
          {reporting.length > 0 && (
            <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-5 mb-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold font-heading text-[#1A1C18]">Occupancy Distribution</h3>
                <span className="text-xs text-stone-400">{reporting.length} properties with data</span>
              </div>
              <div className="flex h-8 rounded-lg overflow-hidden gap-0.5">
                {highCount > 0 && <div className="bg-[#556B2F] flex items-center justify-center text-white text-xs font-bold transition-all" style={{ width: `${(highCount / reporting.length) * 100}%` }}>{highCount > 2 ? `${highCount} High` : highCount}</div>}
                {midCount > 0 && <div className="bg-[#F5C518] flex items-center justify-center text-stone-800 text-xs font-bold" style={{ width: `${(midCount / reporting.length) * 100}%` }}>{midCount > 2 ? `${midCount} Mid` : midCount}</div>}
                {lowCount > 0 && <div className="bg-red-400 flex items-center justify-center text-white text-xs font-bold" style={{ width: `${(lowCount / reporting.length) * 100}%` }}>{lowCount > 2 ? `${lowCount} Low` : lowCount}</div>}
              </div>
              <div className="flex gap-4 mt-2 text-xs text-stone-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#556B2F]" />{highCount} High (≥75%)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#F5C518]" />{midCount} Mid (50–74%)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />{lowCount} Low (&lt;50%)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-stone-200" />{report.total_properties - reporting.length} No Data</span>
              </div>
            </div>
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
            <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-5">
              <h3 className="text-sm font-bold font-heading text-[#1A1C18] mb-1">Bed Utilisation</h3>
              <p className="text-xs text-stone-400 mb-3">Occupied vs vacant across all beds</p>
              {reporting.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={170}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value">
                        {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v} beds`]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {pieData.map(p => (
                      <div key={p.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.fill }} />
                          <span className="text-stone-500">{p.name}</span>
                        </div>
                        <span className="font-bold text-stone-700">{p.value} beds ({Math.round(p.value / (report.total_beds || 1) * 100)}%)</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-44 flex items-center justify-center text-stone-300 text-xs">No data for this date</div>
              )}
            </div>

            {/* Horizontal Bar chart — all properties */}
            <div className="xl:col-span-2 bg-white rounded-xl border border-stone-100 shadow-sm p-5">
              <h3 className="text-sm font-bold font-heading text-[#1A1C18] mb-1">All Properties — Ranked by Occupancy</h3>
              <p className="text-xs text-stone-400 mb-3">{format(new Date(date + 'T00:00:00'), 'dd MMM yyyy')}</p>
              {sortedByOcc.length > 0 ? (
                <div className="space-y-1.5 max-h-72 overflow-y-auto scrollbar-thin pr-1">
                  {sortedByOcc.map((p, i) => (
                    <div key={p.property_id} className="flex items-center gap-2">
                      <span className="text-[10px] text-stone-400 w-5 flex-shrink-0">{i + 1}</span>
                      <span className="text-xs text-stone-600 w-36 flex-shrink-0 truncate">{p.property_name.replace('Yube1 ', '')}</span>
                      <div className="flex-1 h-4 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${p.occupancy_percentage}%`, backgroundColor: getColor(p.occupancy_percentage) }} />
                      </div>
                      <span className="text-xs font-bold w-10 text-right flex-shrink-0" style={{ color: getColor(p.occupancy_percentage) }}>{p.occupancy_percentage}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-stone-300 text-xs">No data submitted for this date</div>
              )}
            </div>
          </div>

          {/* Detailed Table */}
          <div className="bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-sm font-bold font-heading text-[#1A1C18]">Complete Property Report</h3>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 font-semibold">High ≥75%</span>
                <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-semibold">Mid 50–75%</span>
                <span className="px-2 py-1 rounded-full bg-red-100 text-red-600 font-semibold">Low &lt;50%</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">#</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Property</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Cluster Mgr</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Manager</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Beds</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Occupied</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Vacant</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide min-w-[140px]">Occupancy</th>
                  </tr>
                </thead>
                <tbody>
                  {allProps.map((prop, idx) => (
                    <tr key={prop.property_id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                      <td className="px-5 py-3 text-stone-400 text-xs">{idx + 1}</td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-stone-800 text-sm">{prop.property_name.replace('Yube1 ', '')}</div>
                        <div className="text-[10px] text-stone-400">{prop.property_name}</div>
                      </td>
                      <td className="px-5 py-3 text-stone-500 text-xs">{prop.cluster_manager_name || '—'}</td>
                      <td className="px-5 py-3 text-stone-500 text-xs">{prop.manager_name || '—'}</td>
                      <td className="px-4 py-3 text-center text-stone-600 font-medium text-xs">{prop.total_beds}</td>
                      <td className="px-4 py-3 text-center font-semibold text-xs" style={{ color: prop.has_entry ? getColor(prop.occupancy_percentage) : '#9ca3af' }}>
                        {prop.has_entry ? prop.occupied_beds : '—'}
                      </td>
                      <td className="px-4 py-3 text-center text-stone-400 text-xs">
                        {prop.has_entry ? prop.total_beds - prop.occupied_beds : '—'}
                      </td>
                      <td className="px-5 py-3">
                        {prop.has_entry ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden max-w-20">
                              <div className="h-full rounded-full" style={{ width: `${prop.occupancy_percentage}%`, backgroundColor: getColor(prop.occupancy_percentage) }} />
                            </div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getBg(prop.occupancy_percentage)}`}>
                              {prop.occupancy_percentage}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-stone-300 text-xs">No data</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-stone-100 bg-stone-50 flex items-center justify-between text-xs text-stone-400">
              <span>{report?.total_properties} properties total</span>
              <span className="font-semibold text-[#556B2F]">
                {reporting.length > 0 ? `Overall: ${report.overall_occupancy_percentage}% · ${report.total_occupied}/${report.total_beds} beds` : 'No submissions yet'}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
