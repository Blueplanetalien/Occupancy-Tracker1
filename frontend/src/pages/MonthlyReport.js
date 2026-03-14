import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { ChevronLeft, ChevronRight, Download, FileText } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { downloadCSV, exportMonthlyReportPDF } from '../utils/export';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const getColor = (pct) => pct >= 75 ? '#556B2F' : pct >= 50 ? '#F5C518' : '#ef4444';

export default function MonthlyReport() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/reports/monthly?year=${year}&month=${month}`);
        setReport(res.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [year, month]);

  const changeMonth = (delta) => {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m);
    setYear(y);
  };

  const sortedProps = (report?.properties || []).slice().sort((a, b) => b.avg_occupancy_percentage - a.avg_occupancy_percentage);

  const handleExportCSV = () => {
    if (!report) return;
    downloadCSV(
      sortedProps,
      [
        { key: 'property_name', label: 'Property' },
        { key: 'manager_name', label: 'Manager' },
        { key: 'total_beds', label: 'Total Beds' },
        { key: 'avg_occupancy_percentage', label: 'Avg Occupancy %' },
        { key: 'days_with_data', label: 'Days with Data' },
      ],
      `Yube1_Monthly_Report_${year}_${String(month).padStart(2,'0')}.csv`
    );
  };

  const handleExportPDF = () => {
    if (!report) return;
    exportMonthlyReportPDF(report);
  };

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-[#FAFAF9] animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-[#1A1C18]">Monthly Report</h1>
          <p className="text-sm text-stone-400 mt-0.5">Consolidated monthly occupancy analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-500">
            <ChevronLeft size={15} />
          </button>
          <div className="flex gap-1">
            <select value={month} onChange={e => setMonth(Number(e.target.value))} data-testid="month-select"
              className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30">
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))} data-testid="year-select"
              className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30">
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button onClick={() => changeMonth(1)} className="p-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-500">
            <ChevronRight size={15} />
          </button>
          {report && (
            <div className="flex gap-1.5 ml-2">
              <button data-testid="monthly-export-csv" onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-2 border border-stone-200 bg-white rounded-lg text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors">
                <Download size={13} /> CSV
              </button>
              <button data-testid="monthly-export-pdf" onClick={handleExportPDF}
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
              { label: 'Avg Occupancy', value: `${report?.overall_avg_occupancy || 0}%`, color: '#556B2F' },
              { label: 'Total Beds', value: (report?.total_beds || 0).toLocaleString(), color: '#6B7C4E' },
              { label: 'Days with Data', value: `${report?.days_with_data || 0}/${report?.days_in_month || 30}`, color: '#A3B18A' },
              { label: 'Month', value: `${report?.month_name} ${year}`, color: '#F5C518' },
            ].map(item => (
              <div key={item.label} className="bg-white rounded-xl border border-stone-100 shadow-sm p-4">
                <div className="text-xs text-stone-400 uppercase tracking-wide font-medium">{item.label}</div>
                <div className="text-xl font-bold font-heading mt-1" style={{ color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Daily Trend Chart */}
          <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-5 mb-5">
            <h3 className="text-sm font-bold font-heading text-[#1A1C18] mb-1">Daily Occupancy Trend</h3>
            <p className="text-xs text-stone-400 mb-4">{MONTHS[month - 1]} {year} — day-by-day consolidated occupancy</p>
            {report?.daily_trend?.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={report.daily_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ee" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip formatter={(v) => [`${v}%`, 'Occupancy']} />
                  <Line type="monotone" dataKey="occupancy" stroke="#556B2F" strokeWidth={2.5} dot={{ r: 3, fill: '#556B2F' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-stone-400 text-sm">
                No data available for {MONTHS[month - 1]} {year}
              </div>
            )}
          </div>

          {/* Property Bar Chart */}
          <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-5 mb-5">
            <h3 className="text-sm font-bold font-heading text-[#1A1C18] mb-1">Property Performance</h3>
            <p className="text-xs text-stone-400 mb-4">Average occupancy per property — {MONTHS[month - 1]} {year}</p>
            {sortedProps.filter(p => p.days_with_data > 0).length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={sortedProps.filter(p => p.days_with_data > 0)} margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ee" vertical={false} />
                  <XAxis dataKey="property_name" tick={{ fontSize: 9, fill: '#a8a29e' }} axisLine={false} tickLine={false}
                    tickFormatter={v => v.replace('Yube1 ', '').substring(0, 9)} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip formatter={(v, n, p) => [`${v}%`, 'Avg Occupancy']} labelFormatter={v => v} />
                  <Bar dataKey="avg_occupancy_percentage" radius={[4, 4, 0, 0]} maxBarSize={30}>
                    {sortedProps.filter(p => p.days_with_data > 0).map((p, i) => (
                      <Cell key={i} fill={getColor(p.avg_occupancy_percentage)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-stone-400 text-sm">No property data for this month</div>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100">
              <h3 className="text-sm font-bold font-heading text-[#1A1C18]">Property Summary — {MONTHS[month - 1]} {year}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">#</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Property</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Manager</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Beds</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Avg Occupancy</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Days with Data</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProps.map((prop, idx) => (
                    <tr key={prop.property_id} className="border-b border-stone-50 hover:bg-stone-50">
                      <td className="px-5 py-3 text-stone-400 text-xs">{idx + 1}</td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-stone-800">{prop.property_name.replace('Yube1 ', '')}</div>
                        <div className="text-[10px] text-stone-400">{prop.property_name}</div>
                      </td>
                      <td className="px-5 py-3 text-stone-500 text-xs">{prop.manager_name || '—'}</td>
                      <td className="px-5 py-3 text-center text-stone-600">{prop.total_beds}</td>
                      <td className="px-5 py-3 text-center">
                        {prop.days_with_data > 0 ? (
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                            prop.avg_occupancy_percentage >= 75 ? 'bg-green-100 text-green-700' :
                            prop.avg_occupancy_percentage >= 50 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-600'
                          }`}>{prop.avg_occupancy_percentage}%</span>
                        ) : <span className="text-stone-300 text-xs">No data</span>}
                      </td>
                      <td className="px-5 py-3 text-center text-stone-600 text-xs">{prop.days_with_data}</td>
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
