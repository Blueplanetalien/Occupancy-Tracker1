import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Trophy, Phone, Building2, ChevronDown, ChevronUp, Download, FileText, Trash2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import { downloadCSV, exportPMPerformancePDF } from '../utils/export';
import { toast } from 'sonner';

const RANK_COLORS = ['#F5C518', '#C0C0C0', '#CD7F32'];
const getColor = (pct) => pct >= 75 ? '#556B2F' : pct >= 50 ? '#F5C518' : '#ef4444';

export default function PMPerformance() {
  const { user } = useAuth();
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const loadManagers = () => {
    api.get('/performance/managers')
      .then(res => setManagers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadManagers(); }, []);

  const handleDelete = async (mgr) => {
    if (mgr.current_properties.length > 0) {
      toast.error(`Cannot delete — ${mgr.manager_name} is currently assigned to ${mgr.current_properties.length} property(s). Unassign them first from the Properties page.`);
      return;
    }
    if (!window.confirm(`Permanently delete ${mgr.manager_name} from the system? Their performance history will also be removed.`)) return;
    setDeleting(mgr.manager_id);
    try {
      await api.delete(`/managers/${mgr.manager_id}`);
      toast.success(`${mgr.manager_name} removed`);
      loadManagers();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to delete manager');
    } finally {
      setDeleting(null);
    }
  };

  // Competition ranking: tied percentages get the same rank number
  const ranks = managers.map((_, idx) => {
    const target = managers[idx].lifetime_avg_occupancy;
    return managers.findIndex(m => m.lifetime_avg_occupancy === target) + 1;
  });
  const getMedalColor = (rank) =>
    rank === 1 ? RANK_COLORS[0] : rank === 2 ? RANK_COLORS[1] : rank === 3 ? RANK_COLORS[2] : '#6b7280';

  const topManagers = managers.slice(0, 3);
  const restManagers = managers.slice(3);

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-[#FAFAF9] animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-heading text-[#1A1C18]">PM Performance</h1>
            <p className="text-sm text-stone-400 mt-0.5">
              Lifetime performance tracking for all property managers
            </p>
          </div>
          {managers.length > 0 && (
            <div className="flex gap-1.5">
              <button data-testid="pm-export-csv"
                onClick={() => downloadCSV(managers, [
                  { key: 'manager_name', label: 'Manager' },
                  { key: 'manager_phone', label: 'Phone' },
                  { key: 'lifetime_avg_occupancy', label: 'Lifetime Avg %' },
                  { key: 'total_days_tracked', label: 'Days Tracked' },
                  { key: 'properties_count', label: 'Properties Count' },
                ], `Yube1_PM_Performance_${new Date().toISOString().split('T')[0]}.csv`)}
                className="flex items-center gap-1.5 px-3 py-2 border border-stone-200 bg-white rounded-lg text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors">
                <Download size={13} /> CSV
              </button>
              <button data-testid="pm-export-pdf"
                onClick={() => exportPMPerformancePDF(managers)}
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
          {/* Top 3 Podium */}
          {topManagers.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {topManagers.map((mgr, idx) => (
                <div key={mgr.manager_id}
                  data-testid={`top-manager-${idx + 1}`}
                  className={`bg-white rounded-xl border shadow-sm p-5 relative overflow-hidden ${ranks[idx] === 1 ? 'border-[#F5C518] shadow-yellow-100' : 'border-stone-100'}`}>
                  {/* Rank Badge */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{ backgroundColor: getMedalColor(ranks[idx]) + '22', color: getMedalColor(ranks[idx]) }}>
                        {ranks[idx]}
                      </div>
                      {ranks[idx] === 1 && <Trophy size={16} className="text-[#F5C518]" />}
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
                    {user?.role === 'admin' && (
                      <th className="text-center px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Remove</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {managers.map((mgr, idx) => (
                    <React.Fragment key={mgr.manager_id}>
                      <tr className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                              style={ranks[idx] <= 3 ? { backgroundColor: getMedalColor(ranks[idx]) + '22', color: getMedalColor(ranks[idx]) } : { backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                              {ranks[idx]}
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
                        {user?.role === 'admin' && (
                          <td className="px-5 py-3 text-center">
                            <button
                              data-testid={`delete-manager-${idx}`}
                              onClick={() => handleDelete(mgr)}
                              disabled={deleting === mgr.manager_id}
                              title={mgr.current_properties.length > 0 ? 'Unassign from properties first' : 'Delete manager'}
                              className={`p-1.5 rounded-md transition-colors disabled:opacity-40 ${mgr.current_properties.length > 0 ? 'text-stone-300 cursor-not-allowed' : 'text-stone-400 hover:text-red-500 hover:bg-red-50'}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        )}
                      </tr>
                      {/* Expanded detail */}
                      {expanded === mgr.manager_id && (
                        <tr className="border-b border-stone-100 bg-stone-25">
                          <td colSpan={user?.role === 'admin' ? 7 : 6} className="px-5 py-4">
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
                                      {pp.total_beds} beds · {pp.start_date} → {pp.end_date || 'present'}
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
