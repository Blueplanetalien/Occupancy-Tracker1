import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { ChevronLeft, BedDouble, TrendingUp, Calendar, Users2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';

const getHeatColor = (pct) => {
  if (pct === null || pct === undefined) return '#E5E7EB';
  if (pct >= 90) return '#1E3D0E';
  if (pct >= 80) return '#2D5A16';
  if (pct >= 75) return '#3D7020';
  if (pct >= 65) return '#556B2F';
  if (pct >= 55) return '#7A9A40';
  if (pct >= 50) return '#F5C518';
  if (pct >= 40) return '#F5A018';
  if (pct >= 30) return '#F06030';
  return '#EF4444';
};

const getBarColor = (pct) => pct >= 75 ? '#556B2F' : pct >= 50 ? '#F5C518' : '#ef4444';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function MonthGrid({ year, monthIdx, heatmap, today }) {
  const month = monthIdx + 1;
  const firstDay = new Date(year, monthIdx, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const monthEntries = Object.entries(heatmap).filter(([d]) => d.startsWith(monthStr));
  const monthAvg = monthEntries.length > 0
    ? Math.round(monthEntries.reduce((sum, [, v]) => sum + v.pct, 0) / monthEntries.length)
    : null;

  const emptyCells = Array(firstDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const cells = [...emptyCells, ...days];

  return (
    <div className="bg-stone-50 rounded-xl border border-stone-100 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-stone-700">{MONTH_ABBR[monthIdx]}</span>
        {monthAvg !== null ? (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
            style={{ backgroundColor: getHeatColor(monthAvg) }}
          >
            {monthAvg}%
          </span>
        ) : (
          <span className="text-[10px] text-stone-300">—</span>
        )}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="h-3 flex items-center justify-center text-[7px] text-stone-400 font-medium">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} className="w-4 h-4" />;
          const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const data = heatmap[date];
          const isFuture = date > today;
          const bgColor = isFuture ? '#F3F4F6' : (data ? getHeatColor(data.pct) : '#E5E7EB');
          const tipText = data
            ? `${date}: ${data.pct}% (${data.beds} beds occupied)`
            : isFuture ? `${date}: Future date` : `${date}: No data`;
          return (
            <div
              key={day}
              title={tipText}
              className="w-4 h-4 rounded-sm cursor-default hover:ring-1 hover:ring-stone-400 hover:scale-110 transition-transform"
              style={{ backgroundColor: bgColor, opacity: isFuture ? 0.35 : 1 }}
            />
          );
        })}
      </div>
    </div>
  );
}

const BarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length || payload[0].value == null) return null;
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-2.5 shadow-lg text-xs">
      <div className="font-semibold text-stone-600 mb-1">{label}</div>
      <div className="font-bold" style={{ color: getBarColor(payload[0].value) }}>
        {payload[0].value}% avg occupancy
      </div>
      <div className="text-stone-400 mt-0.5">{payload[1]?.value || 0} days with data</div>
    </div>
  );
};

export default function PropertyDetail() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const today = new Date().toISOString().split('T')[0];

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/performance/properties/${propertyId}?year=${year}`)
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [propertyId, year]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#556B2F] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data) return (
    <div className="p-8 text-stone-400 text-sm">Property not found.</div>
  );

  const { property, heatmap, monthly_averages, assignment_history, all_time_avg, total_days_tracked } = data;

  const yearEntries = monthly_averages.filter(m => m.avg_occupancy !== null);
  const yearAvg = yearEntries.length > 0
    ? (yearEntries.reduce((s, m) => s + m.avg_occupancy, 0) / yearEntries.length).toFixed(1)
    : null;

  const heatLegend = [
    { color: '#E5E7EB', label: 'No Data' },
    { color: '#EF4444', label: '<50%' },
    { color: '#F5C518', label: '50–64%' },
    { color: '#556B2F', label: '65–74%' },
    { color: '#2D5A16', label: '≥75%' },
    { color: '#1E3D0E', label: '≥90%' },
  ];

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-[#FAFAF9] animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          data-testid="back-btn"
          className="p-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-500 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold font-heading text-[#1A1C18] truncate">
            {property.name.replace('Yube1 ', '')}
          </h1>
          <p className="text-sm text-stone-400 mt-0.5">{property.name} · {property.total_beds} beds</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-stone-500 font-medium">Year:</span>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            data-testid="year-selector"
            className="px-3 py-1.5 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30"
          >
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[
          { icon: BedDouble, label: 'Total Beds', value: property.total_beds.toLocaleString(), color: '#556B2F' },
          { icon: TrendingUp, label: 'All-Time Avg', value: all_time_avg > 0 ? `${all_time_avg}%` : '—', color: '#556B2F' },
          { icon: Calendar, label: `${year} Avg`, value: yearAvg !== null ? `${yearAvg}%` : '—', color: '#F5C518' },
          { icon: Users2, label: 'Days Tracked', value: total_days_tracked.toLocaleString(), color: '#6B7C4E' },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-xl border border-stone-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: item.color + '18' }}>
              <item.icon size={17} style={{ color: item.color }} />
            </div>
            <div>
              <div className="text-xs text-stone-400 font-medium">{item.label}</div>
              <div className="text-xl font-bold font-heading text-[#1A1C18]">{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Calendar Heatmap */}
      <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-5 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold font-heading text-[#1A1C18]">Occupancy Heatmap — {year}</h3>
            <p className="text-xs text-stone-400 mt-0.5">Daily occupancy at a glance — hover any day for details</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {heatLegend.map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-[10px] text-stone-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div data-testid="heatmap-grid" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {Array.from({ length: 12 }, (_, i) => (
            <MonthGrid key={i} year={year} monthIdx={i} heatmap={heatmap} today={today} />
          ))}
        </div>
      </div>

      {/* Monthly Bar Chart */}
      <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-5 mb-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold font-heading text-[#1A1C18]">Monthly Averages — {year}</h3>
          <p className="text-xs text-stone-400 mt-0.5">Average daily occupancy per month with data coverage</p>
        </div>
        {yearEntries.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthly_averages} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ee" />
                <XAxis dataKey="month_name" tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip content={<BarTooltip />} />
                <Bar dataKey="avg_occupancy" radius={[4, 4, 0, 0]}>
                  {monthly_averages.map((m, i) => (
                    <Cell key={i} fill={m.avg_occupancy !== null ? getBarColor(m.avg_occupancy) : '#E5E7EB'} />
                  ))}
                </Bar>
                <Bar dataKey="days_with_data" hide />
              </BarChart>
            </ResponsiveContainer>
            {/* Mini summary row */}
            <div className="grid grid-cols-6 lg:grid-cols-12 gap-1 mt-4 pt-4 border-t border-stone-100">
              {monthly_averages.map(m => (
                <div key={m.month} className="text-center">
                  <div className="text-[9px] text-stone-400 font-medium">{m.month_name}</div>
                  <div
                    className="text-[10px] font-bold"
                    style={{ color: m.avg_occupancy !== null ? getBarColor(m.avg_occupancy) : '#d1d5db' }}
                  >
                    {m.avg_occupancy !== null ? `${m.avg_occupancy}%` : '—'}
                  </div>
                  <div className="text-[8px] text-stone-300">{m.days_with_data}d</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="h-48 flex items-center justify-center text-stone-300 text-sm">No data recorded for {year}</div>
        )}
      </div>

      {/* Assignment History */}
      {assignment_history.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100">
            <h3 className="text-sm font-bold font-heading text-[#1A1C18]">Manager Assignment History</h3>
            <p className="text-xs text-stone-400 mt-0.5">All managers who have managed this property</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Manager</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Phone</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">From</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">To</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {assignment_history.map((a, i) => (
                  <tr key={i} className={`border-b border-stone-50 transition-colors ${a.is_current ? 'bg-[#556B2F]/5 hover:bg-[#556B2F]/10' : 'hover:bg-stone-50'}`}>
                    <td className="px-5 py-3 font-medium text-stone-800 text-sm">{a.manager_name}</td>
                    <td className="px-5 py-3 text-stone-400 text-xs">{a.manager_phone}</td>
                    <td className="px-5 py-3 text-stone-500 text-xs">{a.start_date}</td>
                    <td className="px-5 py-3 text-stone-500 text-xs">{a.end_date || '—'}</td>
                    <td className="px-5 py-3 text-center">
                      {a.is_current ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">Current</span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-500">Past</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
