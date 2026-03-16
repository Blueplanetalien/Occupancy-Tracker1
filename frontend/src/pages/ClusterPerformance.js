import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Users2, TrendingUp, TrendingDown, Minus, BedDouble, Building2, ChevronDown, ChevronUp } from 'lucide-react';

const RANK_COLORS = ['#F5C518', '#C0C0C0', '#CD7F32'];
const getBg = (pct) => pct >= 75 ? 'bg-green-100 text-green-700' : pct >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600';
const getColor = (pct) => pct >= 75 ? '#556B2F' : pct >= 50 ? '#F5C518' : '#ef4444';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function ClusterPerformance() {
  const now = new Date();
  const [lifetime, setLifetime] = useState([]);
  const [monthly, setMonthly] = useState(null);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    api.get('/performance/cluster-managers')
      .then(res => setLifetime(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const loadMonthly = () => {
    setLoadingMonthly(true);
    api.get(`/performance/cluster-managers/monthly?year=${year}&month=${month}`)
      .then(res => setMonthly(res.data))
      .catch(console.error)
      .finally(() => setLoadingMonthly(false));
  };

  useEffect(() => { loadMonthly(); }, [year, month]); // eslint-disable-line

  // Dense ranking
  const uniqueAvgs = [...new Set(lifetime.map(c => c.all_time_avg))].sort((a, b) => b - a);
  const ranks = lifetime.map(c => uniqueAvgs.indexOf(c.all_time_avg) + 1);
  const getMedalColor = (rank) =>
    rank === 1 ? RANK_COLORS[0] : rank === 2 ? RANK_COLORS[1] : rank === 3 ? RANK_COLORS[2] : '#6b7280';

  const monthlyUniqueAvgs = monthly ? [...new Set(monthly.data.map(c => c.avg_occupancy))].sort((a, b) => b - a) : [];
  const monthlyRanks = monthly ? monthly.data.map(c => monthlyUniqueAvgs.indexOf(c.avg_occupancy) + 1) : [];

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-[#FAFAF9] animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading text-[#1A1C18]">Cluster Manager Performance</h1>
        <p className="text-sm text-stone-400 mt-0.5">Lifetime and monthly occupancy performance across assigned properties</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-[#556B2F] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : lifetime.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-12 text-center">
          <Users2 size={40} className="text-stone-200 mx-auto mb-3" />
          <div className="text-stone-400 text-sm font-medium">No Cluster Managers with assigned properties yet</div>
          <div className="text-stone-300 text-xs mt-1">Assign Cluster Managers to properties from the Properties page</div>
        </div>
      ) : (
        <>
          {/* ── LIFETIME SECTION ── */}
          <div className="mb-7">
            <h2 className="text-sm font-bold font-heading text-stone-500 uppercase tracking-wide mb-4">Lifetime Performance</h2>

            {/* Top 3 Podium */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              {lifetime.slice(0, 3).map((cm, idx) => (
                <div key={cm.cm_id}
                  data-testid={`top-cm-${idx + 1}`}
                  className={`bg-white rounded-xl border shadow-sm p-5 ${ranks[idx] === 1 ? 'border-[#F5C518] shadow-yellow-100' : 'border-stone-100'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ backgroundColor: getMedalColor(ranks[idx]) + '22', color: getMedalColor(ranks[idx]) }}>
                      {ranks[idx]}
                    </div>
                    <div className="text-xs text-stone-400">{cm.properties_count} properties</div>
                  </div>
                  <div className="font-bold font-heading text-[#1A1C18] text-base mb-0.5">{cm.cm_name}</div>
                  <div className="text-[10px] text-stone-400 mb-3">{cm.cm_email}</div>
                  <div className="text-3xl font-bold font-heading" style={{ color: getColor(cm.all_time_avg) }}>
                    {cm.total_days_tracked > 0 ? `${cm.all_time_avg}%` : '—'}
                  </div>
                  <div className="text-xs text-stone-400 mt-0.5">Lifetime avg occupancy</div>
                  <div className="mt-2 pt-2 border-t border-stone-100 flex gap-3 text-xs text-stone-500">
                    <span><span className="font-semibold text-stone-700">{cm.total_beds}</span> beds</span>
                    {cm.current_month_avg > 0 && (
                      <span>This month: <span className="font-semibold" style={{ color: getColor(cm.current_month_avg) }}>{cm.current_month_avg}%</span></span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Lifetime Table */}
            <div className="bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-stone-100">
                <h3 className="text-sm font-bold font-heading text-[#1A1C18]">Full Leaderboard</h3>
                <p className="text-xs text-stone-400 mt-0.5">Ranked by lifetime average occupancy — click to see assigned properties</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Rank</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Cluster Manager</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Properties</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Beds</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Lifetime Avg</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">This Month</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Trend</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lifetime.map((cm, idx) => (
                      <React.Fragment key={cm.cm_id}>
                        <tr className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                          <td className="px-5 py-3">
                            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold inline-flex"
                              style={ranks[idx] <= 3
                                ? { backgroundColor: getMedalColor(ranks[idx]) + '22', color: getMedalColor(ranks[idx]) }
                                : { backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                              {ranks[idx]}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="font-medium text-stone-800">{cm.cm_name}</div>
                            <div className="text-[10px] text-stone-400">{cm.cm_email}</div>
                          </td>
                          <td className="px-4 py-3 text-center text-stone-600 text-xs font-medium">{cm.properties_count}</td>
                          <td className="px-4 py-3 text-center text-stone-600 text-xs font-medium">{cm.total_beds}</td>
                          <td className="px-4 py-3 text-center">
                            {cm.total_days_tracked > 0 ? (
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${getBg(cm.all_time_avg)}`}>
                                {cm.all_time_avg}%
                              </span>
                            ) : <span className="text-stone-300 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {cm.current_month_avg > 0 ? (
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${getBg(cm.current_month_avg)}`}>
                                {cm.current_month_avg}%
                              </span>
                            ) : <span className="text-stone-300 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {cm.trend === 'up' ? <TrendingUp size={14} className="text-green-500 mx-auto" />
                              : cm.trend === 'down' ? <TrendingDown size={14} className="text-red-400 mx-auto" />
                              : <Minus size={14} className="text-stone-300 mx-auto" />}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {cm.properties_count > 0 && (
                              <button onClick={() => toggle(cm.cm_id)}
                                className="p-1 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors">
                                {expanded[cm.cm_id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            )}
                          </td>
                        </tr>
                        {expanded[cm.cm_id] && (
                          <tr className="border-b border-stone-50 bg-stone-50/60">
                            <td colSpan={8} className="px-8 py-3">
                              <div className="text-xs text-stone-500 font-semibold mb-2 uppercase tracking-wide">Assigned Properties</div>
                              <div className="flex flex-wrap gap-1.5">
                                {cm.property_names.map(name => (
                                  <span key={name} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-stone-200 rounded-full text-xs text-stone-600">
                                    <Building2 size={9} className="text-[#556B2F]" />
                                    {name.replace('Yube1 ', '')}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── MONTHLY SECTION ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold font-heading text-stone-500 uppercase tracking-wide">Monthly Performance</h2>
              <div className="flex items-center gap-2">
                <select value={month} onChange={e => setMonth(Number(e.target.value))}
                  className="px-3 py-1.5 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30">
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <select value={year} onChange={e => setYear(Number(e.target.value))}
                  className="px-3 py-1.5 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30">
                  {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-stone-100">
                <h3 className="text-sm font-bold font-heading text-[#1A1C18]">
                  {MONTHS[month - 1]} {year} — Cluster Manager Summary
                </h3>
              </div>
              {loadingMonthly ? (
                <div className="py-12 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-[#556B2F] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : monthly && monthly.data.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-stone-50 border-b border-stone-100">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Rank</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Cluster Manager</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Properties</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Total Beds</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide min-w-[160px]">Monthly Avg</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Days with Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthly.data.map((cm, idx) => (
                        <tr key={cm.cm_id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                          <td className="px-5 py-3">
                            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold inline-flex"
                              style={monthlyRanks[idx] <= 3
                                ? { backgroundColor: getMedalColor(monthlyRanks[idx]) + '22', color: getMedalColor(monthlyRanks[idx]) }
                                : { backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                              {monthlyRanks[idx]}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="font-medium text-stone-800">{cm.cm_name}</div>
                            <div className="text-[10px] text-stone-400">{cm.cm_email}</div>
                          </td>
                          <td className="px-4 py-3 text-center text-stone-600 text-xs">{cm.properties_count}</td>
                          <td className="px-4 py-3 text-center text-stone-600 text-xs">{cm.total_beds}</td>
                          <td className="px-5 py-3">
                            {cm.days_with_data > 0 ? (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden max-w-24">
                                  <div className="h-full rounded-full" style={{ width: `${cm.avg_occupancy}%`, backgroundColor: getColor(cm.avg_occupancy) }} />
                                </div>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getBg(cm.avg_occupancy)}`}>
                                  {cm.avg_occupancy}%
                                </span>
                              </div>
                            ) : <span className="text-stone-300 text-xs">No data</span>}
                          </td>
                          <td className="px-4 py-3 text-center text-stone-500 text-xs">{cm.days_with_data}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-stone-300 text-sm">No data for {MONTHS[month - 1]} {year}</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
