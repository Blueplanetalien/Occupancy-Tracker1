import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Trophy, TrendingUp, TrendingDown, Minus, Download, ExternalLink } from 'lucide-react';
import { downloadCSV } from '../utils/export';

const RANK_COLORS = ['#F5C518', '#C0C0C0', '#CD7F32'];
const getColor = (pct) => pct >= 75 ? '#556B2F' : pct >= 50 ? '#F5C518' : '#ef4444';
const getBg = (pct) => pct >= 75 ? 'bg-green-100 text-green-700' : pct >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600';

export default function PropertyPerformance() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/performance/properties')
      .then(res => setProperties(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const top3 = properties.slice(0, 3);

  // Competition ranking: tied avg occupancy gets the same rank number
  const ranks = properties.map((_, idx) => {
    const target = properties[idx].all_time_avg;
    return properties.findIndex(p => p.all_time_avg === target) + 1;
  });
  const getMedalColor = (rank) =>
    rank === 1 ? RANK_COLORS[0] : rank === 2 ? RANK_COLORS[1] : rank === 3 ? RANK_COLORS[2] : '#6b7280';

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-[#FAFAF9] animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-[#1A1C18]">Property Performance</h1>
          <p className="text-sm text-stone-400 mt-0.5">All-time occupancy rankings across all properties</p>
        </div>
        {properties.length > 0 && (
          <button
            data-testid="prop-perf-export-csv"
            onClick={() => downloadCSV(properties, [
              { key: 'property_name', label: 'Property' },
              { key: 'manager_name', label: 'Current Manager' },
              { key: 'total_beds', label: 'Total Beds' },
              { key: 'all_time_avg', label: 'All-Time Avg %' },
              { key: 'current_month_avg', label: 'Current Month %' },
              { key: 'total_days_tracked', label: 'Days Tracked' },
            ], `Yube1_Property_Performance_${new Date().toISOString().split('T')[0]}.csv`)}
            className="flex items-center gap-1.5 px-3 py-2 border border-stone-200 bg-white rounded-lg text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors"
          >
            <Download size={13} /> Export CSV
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-[#556B2F] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {top3.map((prop, idx) => (
                <div
                  key={prop.property_id}
                  data-testid={`top-property-${idx + 1}`}
                  onClick={() => navigate(`/performance/properties/${prop.property_id}`)}
                  className={`bg-white rounded-xl border shadow-sm p-5 cursor-pointer hover:shadow-md transition-all group ${ranks[idx] === 1 ? 'border-[#F5C518] shadow-yellow-100' : 'border-stone-100'}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{ backgroundColor: getMedalColor(ranks[idx]) + '22', color: getMedalColor(ranks[idx]) }}>
                        {ranks[idx]}
                      </div>
                      {ranks[idx] === 1 && <Trophy size={16} className="text-[#F5C518]" />}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[#556B2F] opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink size={11} /> Detail
                    </div>
                  </div>
                  <div className="font-bold font-heading text-[#1A1C18] text-base truncate">
                    {prop.property_name.replace('Yube1 ', '')}
                  </div>
                  <div className="text-[10px] text-stone-400 mb-1">{prop.property_name}</div>
                  <div className="text-xs text-stone-400 mb-3">{prop.manager_name || 'No manager'} · {prop.total_beds} beds</div>
                  <div className="text-3xl font-bold font-heading" style={{ color: getColor(prop.all_time_avg) }}>
                    {prop.total_days_tracked > 0 ? `${prop.all_time_avg}%` : '—'}
                  </div>
                  <div className="text-xs text-stone-400 mt-0.5">All-time avg occupancy</div>
                  {prop.current_month_avg > 0 && (
                    <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                      <span className="text-stone-400">This month</span>
                      <span className="font-bold" style={{ color: getColor(prop.current_month_avg) }}>{prop.current_month_avg}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Full Leaderboard Table */}
          <div className="bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100">
              <h3 className="text-sm font-bold font-heading text-[#1A1C18]">Full Property Rankings</h3>
              <p className="text-xs text-stone-400 mt-0.5">Sorted by all-time average occupancy — click any row to view detailed analytics</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Rank</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Property</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Manager</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Beds</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">All-Time Avg</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">This Month</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Trend</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Days</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map((prop, idx) => (
                    <tr
                      key={prop.property_id}
                      className="border-b border-stone-50 hover:bg-stone-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/performance/properties/${prop.property_id}`)}
                    >
                      <td className="px-5 py-3">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold inline-flex"
                          style={ranks[idx] <= 3
                            ? { backgroundColor: getMedalColor(ranks[idx]) + '22', color: getMedalColor(ranks[idx]) }
                            : { backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                          {ranks[idx]}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-stone-800">{prop.property_name.replace('Yube1 ', '')}</div>
                        <div className="text-[10px] text-stone-400">{prop.property_name}</div>
                      </td>
                      <td className="px-5 py-3 text-xs text-stone-500">{prop.manager_name || '—'}</td>
                      <td className="px-4 py-3 text-center text-stone-600 text-xs font-medium">{prop.total_beds}</td>
                      <td className="px-4 py-3 text-center">
                        {prop.total_days_tracked > 0 ? (
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${getBg(prop.all_time_avg)}`}>
                            {prop.all_time_avg}%
                          </span>
                        ) : <span className="text-stone-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {prop.current_month_avg > 0 ? (
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${getBg(prop.current_month_avg)}`}>
                            {prop.current_month_avg}%
                          </span>
                        ) : <span className="text-stone-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {prop.trend === 'up'
                          ? <TrendingUp size={14} className="text-green-500 mx-auto" />
                          : prop.trend === 'down'
                            ? <TrendingDown size={14} className="text-red-400 mx-auto" />
                            : <Minus size={14} className="text-stone-300 mx-auto" />}
                      </td>
                      <td className="px-4 py-3 text-center text-stone-500 text-xs">{prop.total_days_tracked || 0}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          data-testid={`view-property-${idx}`}
                          onClick={e => { e.stopPropagation(); navigate(`/performance/properties/${prop.property_id}`); }}
                          className="p-1.5 rounded-md hover:bg-[#556B2F]/10 text-stone-400 hover:text-[#556B2F] transition-colors"
                          title="View detailed analytics"
                        >
                          <ExternalLink size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-stone-100 bg-stone-50 text-xs text-stone-400">
              {properties.length} properties total
            </div>
          </div>
        </>
      )}
    </div>
  );
}
