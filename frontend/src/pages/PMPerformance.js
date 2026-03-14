import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Trophy, Phone, Building2, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';

const RANK_COLORS = ['#F5C518', '#C0C0C0', '#CD7F32'];
const getColor = (pct) => pct >= 75 ? '#556B2F' : pct >= 50 ? '#F5C518' : '#ef4444';

export default function PMPerformance() {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.get('/performance/managers')
      .then(res => setManagers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const topManagers = managers.slice(0, 3);
  const restManagers = managers.slice(3);

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-[#FAFAF9] animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading text-[#1A1C18]">PM Performance</h1>
        <p className="text-sm text-stone-400 mt-0.5">
          Lifetime performance tracking for all property managers
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-[#556B2F] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          {topManagers.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {topManagers.map((mgr, idx) => (
                <div key={mgr.manager_id}
                  data-testid={`top-manager-${idx + 1}`}
                  className={`bg-white rounded-xl border shadow-sm p-5 relative overflow-hidden ${idx === 0 ? 'border-[#F5C518] shadow-yellow-100' : 'border-stone-100'}`}>
                  {/* Rank Badge */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{ backgroundColor: RANK_COLORS[idx] + '22', color: RANK_COLORS[idx] }}>
                        {idx + 1}
                      </div>
                      {idx === 0 && <Trophy size={16} className="text-[#F5C518]" />}
                    </div>
                    <div className="text-xs text-stone-400">
                      {mgr.total_days_tracked > 0 ? `${mgr.total_days_tracked} days` : 'No data'}
                    </div>
                  </div>
                  <div className="font-bold font-heading text-[#1A1C18] text-base mb-0.5">{mgr.manager_name}</div>
                  <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-3">
                    <Phone size={10} />
                    {mgr.manager_phone}
                  </div>
                  <div className="text-3xl font-bold font-heading" style={{ color: getColor(mgr.lifetime_avg_occupancy) }}>
                    {mgr.total_days_tracked > 0 ? `${mgr.lifetime_avg_occupancy}%` : '—'}
                  </div>
                  <div className="text-xs text-stone-400 mt-0.5">Lifetime avg occupancy</div>
                  {mgr.current_properties.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-stone-100">
                      <div className="text-[10px] text-stone-400 uppercase tracking-wide mb-1.5">Current Properties</div>
                      {mgr.current_properties.map(p => (
                        <div key={p} className="text-xs text-stone-600 truncate">{p.replace('Yube1 ', '')}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Full Leaderboard */}
          <div className="bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden mb-5">
            <div className="px-5 py-4 border-b border-stone-100">
              <h3 className="text-sm font-bold font-heading text-[#1A1C18]">Full Leaderboard</h3>
              <p className="text-xs text-stone-400 mt-0.5">Ranked by lifetime average occupancy</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Rank</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Manager</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Current Properties</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Lifetime Avg</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Days Tracked</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {managers.map((mgr, idx) => (
                    <React.Fragment key={mgr.manager_id}>
                      <tr className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                              style={idx < 3 ? { backgroundColor: RANK_COLORS[idx] + '22', color: RANK_COLORS[idx] } : { backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                              {idx + 1}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="font-medium text-stone-800">{mgr.manager_name}</div>
                          <div className="flex items-center gap-1 text-[10px] text-stone-400 mt-0.5">
                            <Phone size={9} />{mgr.manager_phone}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-1">
                            {mgr.current_properties.slice(0, 2).map(p => (
                              <span key={p} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-[#556B2F]/10 text-[#556B2F]">
                                <Building2 size={9} />{p.replace('Yube1 ', '')}
                              </span>
                            ))}
                            {mgr.current_properties.length > 2 && (
                              <span className="text-[10px] text-stone-400">+{mgr.current_properties.length - 2} more</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-center">
                          {mgr.total_days_tracked > 0 ? (
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                              mgr.lifetime_avg_occupancy >= 75 ? 'bg-green-100 text-green-700' :
                              mgr.lifetime_avg_occupancy >= 50 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-600'
                            }`}>
                              {mgr.lifetime_avg_occupancy}%
                            </span>
                          ) : <span className="text-stone-300 text-xs">—</span>}
                        </td>
                        <td className="px-5 py-3 text-center text-stone-500 text-sm">{mgr.total_days_tracked || 0}</td>
                        <td className="px-5 py-3 text-center">
                          <button
                            data-testid={`expand-manager-${idx}`}
                            onClick={() => setExpanded(expanded === mgr.manager_id ? null : mgr.manager_id)}
                            className="p-1.5 rounded-md hover:bg-stone-100 text-stone-400 transition-colors"
                          >
                            {expanded === mgr.manager_id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                      </tr>
                      {/* Expanded detail */}
                      {expanded === mgr.manager_id && (
                        <tr className="border-b border-stone-100 bg-stone-25">
                          <td colSpan={6} className="px-5 py-4">
                            <div className="bg-stone-50 rounded-lg p-4">
                              <div className="text-xs font-semibold text-stone-600 uppercase tracking-wide mb-3">
                                Property History — {mgr.manager_name}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {mgr.property_performance.map(pp => (
                                  <div key={pp.property_id} className={`bg-white rounded-lg border p-3 ${pp.is_current ? 'border-[#556B2F]/30' : 'border-stone-100'}`}>
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="text-xs font-medium text-stone-700">{pp.property_name.replace('Yube1 ', '')}</div>
                                      {pp.is_current && <span className="text-[10px] bg-[#556B2F]/10 text-[#556B2F] px-1.5 py-0.5 rounded-full font-medium">Current</span>}
                                    </div>
                                    <div className="text-xl font-bold font-heading" style={{ color: getColor(pp.avg_occupancy) }}>
                                      {pp.days_with_data > 0 ? `${pp.avg_occupancy}%` : '—'}
                                    </div>
                                    <div className="text-[10px] text-stone-400 mt-0.5">
                                      {pp.beds} beds · {pp.start_date} → {pp.end_date || 'present'}
                                    </div>
                                    <div className="text-[10px] text-stone-400">{pp.days_with_data} days tracked</div>
                                  </div>
                                ))}
                              </div>
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
        </>
      )}
    </div>
  );
}
