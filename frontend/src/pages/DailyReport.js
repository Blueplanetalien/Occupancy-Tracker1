import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { format, subDays, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Download, FileText } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import { downloadCSV, exportDailyReportPDF } from '../utils/export';

const COLORS = { high: '#556B2F', mid: '#F5C518', low: '#ef4444' };

const getColor = (pct) => pct >= 75 ? COLORS.high : pct >= 50 ? COLORS.mid : COLORS.low;

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-stone-200 rounded-lg p-3 shadow-lg text-xs max-w-[200px]">
        <div className="font-semibold text-stone-700 mb-1">{d.property_name}</div>
        <div className="text-stone-500">Manager: {d.manager_name || '—'}</div>
        <div className="text-stone-500">Occupancy: <span className="font-semibold" style={{ color: getColor(d.occupancy_percentage) }}>{d.occupancy_percentage}%</span></div>
        <div className="text-stone-500">Occupied: {d.occupied_beds}/{d.total_beds} beds</div>
      </div>
    );
  }
  return null;
};

export default function DailyReport() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/reports/daily?date=${date}`);
        setReport(res.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [date]);

  const changeDate = (delta) => {
    const d = new Date(date + 'T00:00:00');
    setDate(format(delta > 0 ? addDays(d, 1) : subDays(d, 1), 'yyyy-MM-dd'));
  };

  const handleExportCSV = () => {
    if (!report) return;
    downloadCSV(
      report.properties,
      [
        { key: 'property_name', label: 'Property' },
        { key: 'manager_name', label: 'Manager' },
        { key: 'total_beds', label: 'Total Beds' },
        { key: 'occupied_beds', label: 'Occupied Beds' },
        { key: 'occupancy_percentage', label: 'Occupancy %' },
      ],
      `Yube1_Daily_Report_${date}.csv`
    );
  };

  const handleExportPDF = () => {
    if (!report) return;
    exportDailyReportPDF(report);
  };

  const pieData = report ? [
    { name: 'Occupied', value: report.total_occupied, fill: '#556B2F' },
    { name: 'Vacant', value: report.total_beds - report.total_occupied, fill: '#e5e7eb' }
  ] : [];

  const reportingProps = (report?.properties || []).filter(p => p.has_entry);
  const notReporting = (report?.properties || []).filter(p => !p.has_entry);

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-[#FAFAF9] animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-[#1A1C18]">Daily Report</h1>
          <p className="text-sm text-stone-400 mt-0.5">Consolidated occupancy for a selected date</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => changeDate(-1)} className="p-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-500">
            <ChevronLeft size={15} />
          </button>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            data-testid="daily-date-picker"
            className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30 focus:border-[#556B2F]"
          />
          <button onClick={() => changeDate(1)} className="p-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-500">
            <ChevronRight size={15} />
          </button>
          {report && (
            <div className="flex gap-1.5 ml-2">
              <button data-testid="export-csv-btn" onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-2 border border-stone-200 bg-white rounded-lg text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors">
                <Download size={13} /> CSV
              </button>
              <button data-testid="export-pdf-btn" onClick={handleExportPDF}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#556B2F] text-white rounded-lg text-xs font-medium hover:bg-[#435425] transition-colors">
                <FileText size={13} /> PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-[#556B2F] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Overall Occupancy', value: `${report?.overall_occupancy_percentage || 0}%`, color: '#556B2F' },
              { label: 'Occupied Beds', value: report?.total_occupied?.toLocaleString() || 0, color: '#6B7C4E' },
              { label: 'Total Beds', value: report?.total_beds?.toLocaleString() || 0, color: '#A3B18A' },
              { label: 'Reporting', value: `${report?.reporting_properties || 0}/${report?.total_properties || 34}`, color: '#F5C518' },
            ].map(item => (
              <div key={item.label} data-testid={`daily-stat-${item.label.toLowerCase().replace(/ /g, '-')}`}
                className="bg-white rounded-xl border border-stone-100 shadow-sm p-4">
                <div className="text-xs text-stone-400 uppercase tracking-wide font-medium">{item.label}</div>
                <div className="text-2xl font-bold font-heading mt-1" style={{ color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
            {/* Pie Chart */}
            <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-5">
              <h3 className="text-sm font-bold font-heading text-[#1A1C18] mb-1">Occupancy Split</h3>
              <p className="text-xs text-stone-400 mb-3">Occupied vs vacant beds</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(val, name) => [`${val} beds`, name]} />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Bar Chart */}
            <div className="xl:col-span-2 bg-white rounded-xl border border-stone-100 shadow-sm p-5">
              <h3 className="text-sm font-bold font-heading text-[#1A1C18] mb-1">Property Occupancy</h3>
              <p className="text-xs text-stone-400 mb-3">All properties with data for {format(new Date(date + 'T00:00:00'), 'dd MMM')}</p>
              {reportingProps.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={reportingProps} margin={{ left: 0, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ee" vertical={false} />
                    <XAxis dataKey="property_name" tick={{ fontSize: 9, fill: '#a8a29e' }} axisLine={false} tickLine={false}
                      tickFormatter={v => v.replace('Yube1 ', '').substring(0, 10)} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="occupancy_percentage" radius={[4, 4, 0, 0]} maxBarSize={35}>
                      {reportingProps.map((p, i) => <Cell key={i} fill={getColor(p.occupancy_percentage)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-stone-400 text-sm">No data for this date</div>
              )}
            </div>
          </div>

          {/* Full Table */}
          <div className="bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-sm font-bold font-heading text-[#1A1C18]">Detailed Report</h3>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">High ≥75%</span>
                <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-medium">Mid 50–75%</span>
                <span className="px-2 py-1 rounded-full bg-red-100 text-red-600 font-medium">Low &lt;50%</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">#</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Property</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Manager</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Beds</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Occupied</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Occupancy %</th>
                  </tr>
                </thead>
                <tbody>
                  {(report?.properties || []).map((prop, idx) => (
                    <tr key={prop.property_id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                      <td className="px-5 py-3 text-stone-400 text-xs">{idx + 1}</td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-stone-800">{prop.property_name.replace('Yube1 ', '')}</div>
                        <div className="text-[10px] text-stone-400">{prop.property_name}</div>
                      </td>
                      <td className="px-5 py-3 text-stone-500 text-xs">{prop.manager_name || '—'}</td>
                      <td className="px-5 py-3 text-center text-stone-600">{prop.total_beds}</td>
                      <td className="px-5 py-3 text-center text-stone-600">{prop.has_entry ? prop.occupied_beds : '—'}</td>
                      <td className="px-5 py-3 text-center">
                        {prop.has_entry ? (
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                            prop.occupancy_percentage >= 75 ? 'bg-green-100 text-green-700' :
                            prop.occupancy_percentage >= 50 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-600'
                          }`}>
                            {prop.occupancy_percentage}%
                          </span>
                        ) : (
                          <span className="text-stone-300 text-xs">No data</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
