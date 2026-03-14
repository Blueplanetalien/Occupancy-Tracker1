import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Building2, BedDouble, TrendingUp, Activity, ArrowUpRight, AlertTriangle, Bell, Clock, TrendingDown } from 'lucide-react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import { format } from 'date-fns';

const getColor = (pct) => pct >= 75 ? '#556B2F' : pct >= 50 ? '#F5C518' : '#ef4444';

const StatCard = ({ icon: Icon, label, value, sub, color = '#556B2F', badge, testId }) => (
  <div data-testid={testId} className="bg-white rounded-xl border border-stone-100 shadow-sm p-5 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between mb-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '18' }}>
        <Icon size={18} style={{ color }} />
      </div>
      {badge && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: color + '18', color }}>{badge}</span>}
    </div>
    <div className="text-2xl font-bold font-heading text-[#1A1C18]">{value}</div>
    <div className="text-xs text-stone-400 font-medium mt-0.5">{label}</div>
    {sub && <div className="text-[10px] text-stone-400 mt-1 border-t border-stone-100 pt-1">{sub}</div>}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) return (
    <div className="bg-white border border-stone-200 rounded-lg p-2.5 shadow-lg text-xs">
      <div className="font-semibold text-stone-600 mb-1">Day {label}</div>
      {payload.map((p, i) => p.value != null && (
        <div key={i} className="text-stone-600">{Number(p.value).toFixed(1)}% occupancy</div>
      ))}
    </div>
  );
  return null;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [dailyReport, setDailyReport] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/overview'),
      api.get(`/reports/daily?date=${today}`),
      api.get('/alerts/low-occupancy?threshold=50')
    ]).then(([ov, dr, al]) => {
      setOverview(ov.data);
      setDailyReport(dr.data);
      setAlerts(al.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [today]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#556B2F] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const trendData = (overview?.trend || []).filter(d => d.occupancy != null);
  const props = dailyReport?.properties || [];
  const reporting = props.filter(p => p.has_entry);
  const topProps = [...reporting].sort((a, b) => b.occupancy_percentage - a.occupancy_percentage).slice(0, 10);
  const bottomProps = [...reporting].sort((a, b) => a.occupancy_percentage - b.occupancy_percentage).slice(0, 5);

  const highCount = reporting.filter(p => p.occupancy_percentage >= 75).length;
  const midCount = reporting.filter(p => p.occupancy_percentage >= 50 && p.occupancy_percentage < 75).length;
  const lowCount = reporting.filter(p => p.occupancy_percentage < 50).length;
  const noDataCount = (dailyReport?.total_properties || 34) - reporting.length;

  const distPie = [
    { name: `High (≥75%) — ${highCount}`, value: highCount, fill: '#556B2F' },
    { name: `Mid (50–74%) — ${midCount}`, value: midCount, fill: '#F5C518' },
    { name: `Low (<50%) — ${lowCount}`, value: lowCount, fill: '#ef4444' },
    { name: `No Data — ${noDataCount}`, value: noDataCount, fill: '#e5e7eb' },
  ].filter(d => d.value > 0);

  const totalBeds = overview?.total_beds || 0;
  const filledPct = reporting.length > 0
    ? Math.round((reporting.length / (dailyReport?.total_properties || 34)) * 100)
    : 0;

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-[#FAFAF9] animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading text-[#1A1C18]">Dashboard</h1>
        <p className="text-sm text-stone-400 mt-0.5">
          {user?.name} — {format(new Date(), 'EEEE, dd MMM yyyy')}
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatCard testId="stat-total-properties" icon={Building2} label="Total Properties"
          value={overview?.total_properties || 34} sub={`${totalBeds.toLocaleString()} total beds`} color="#556B2F" />
        <StatCard testId="stat-today-occupancy" icon={TrendingUp} label="Today's Occupancy"
          value={reporting.length > 0 ? `${overview?.today_occupancy_percentage}%` : 'No data yet'}
          sub={reporting.length > 0 ? `${overview?.today_occupied_beds} of ${totalBeds} beds occupied` : 'Enter today\'s occupancy'}
          color="#F5C518" badge={reporting.length > 0 ? `${overview?.today_occupancy_percentage >= 75 ? 'GOOD' : overview?.today_occupancy_percentage >= 50 ? 'MID' : 'LOW'}` : null} />
        <StatCard testId="stat-reporting" icon={Activity} label="Properties Reporting"
          value={`${overview?.reporting_today || 0} / ${overview?.total_properties || 34}`}
          sub={`${filledPct}% submitted today`} color="#6B7C4E" />
        <StatCard testId="stat-distribution" icon={BedDouble} label="Occupancy Breakdown"
          value={reporting.length > 0 ? `${highCount} High` : '—'}
          sub={reporting.length > 0 ? `${midCount} Mid · ${lowCount} Low · ${noDataCount} Pending` : 'No data yet'}
          color="#A3B18A" />
      </div>

      {/* Progress Bar for today's reporting */}
      <div className="bg-white rounded-xl border border-stone-100 shadow-sm px-5 py-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-stone-600">Today's Data Submission Progress</span>
          <span className="text-xs font-bold text-[#556B2F]">{reporting.length}/{dailyReport?.total_properties || 34} properties</span>
        </div>
        <div className="h-3 bg-stone-100 rounded-full overflow-hidden flex">
          <div className="h-full bg-[#556B2F] transition-all duration-700 rounded-full" style={{ width: `${filledPct}%` }} />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-stone-400">
          <span>{highCount} properties ≥75% · {midCount} between 50–75% · {lowCount} below 50%</span>
          <span>{noDataCount} yet to report</span>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        {/* 30-day Trend Area Chart */}
        <div data-testid="trend-chart" className="xl:col-span-2 bg-white rounded-xl border border-stone-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold font-heading text-[#1A1C18]">30-Day Occupancy Trend</h3>
              <p className="text-xs text-stone-400 mt-0.5">Consolidated occupancy across all properties</p>
            </div>
            {trendData.length > 1 && (
              <div className="text-right">
                <div className="text-lg font-bold font-heading text-[#556B2F]">
                  {trendData[trendData.length - 1]?.occupancy?.toFixed(1)}%
                </div>
                <div className="text-[10px] text-stone-400">Latest</div>
              </div>
            )}
          </div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="occ-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#556B2F" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#556B2F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ee" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="occupancy" stroke="#556B2F" strokeWidth={2.5} fill="url(#occ-gradient)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-stone-400 text-sm">No data yet — start entering daily occupancy</div>
          )}
        </div>

        {/* Distribution Donut */}
        <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-5">
          <h3 className="text-sm font-bold font-heading text-[#1A1C18] mb-1">Today's Distribution</h3>
          <p className="text-xs text-stone-400 mb-3">Properties by occupancy band</p>
          {distPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={distPie} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2} dataKey="value">
                  {distPie.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v + ' properties', n.split('—')[0]]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-stone-300 text-xs">No data today</div>
          )}
          <div className="space-y-1 mt-1">
            {[['#556B2F', `High ≥75%`, highCount], ['#F5C518', 'Mid 50–74%', midCount], ['#ef4444', 'Low <50%', lowCount], ['#e5e7eb', 'No Data', noDataCount]].map(([c, l, v]) => (
              <div key={l} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c }} />
                  <span className="text-stone-500">{l}</span>
                </div>
                <span className="font-semibold text-stone-700">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top & Bottom Properties */}
      {reporting.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
          {/* Top Performers */}
          <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold font-heading text-[#1A1C18]">Top Performing Today</h3>
                <p className="text-xs text-stone-400 mt-0.5">Highest occupancy properties</p>
              </div>
              <a href="/reports/daily" className="flex items-center gap-1 text-xs text-[#556B2F] hover:underline font-medium">
                Full report <ArrowUpRight size={11} />
              </a>
            </div>
            <div className="space-y-2.5">
              {topProps.map((p, i) => (
                <div key={p.property_id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-stone-400 w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-stone-700 truncate">{p.property_name.replace('Yube1 ', '')}</span>
                      <span className="text-xs font-bold ml-2 flex-shrink-0" style={{ color: getColor(p.occupancy_percentage) }}>{p.occupancy_percentage}%</span>
                    </div>
                    <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${p.occupancy_percentage}%`, backgroundColor: getColor(p.occupancy_percentage) }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Needs Attention */}
          <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold font-heading text-[#1A1C18]">Needs Attention</h3>
                <p className="text-xs text-stone-400 mt-0.5">Lowest occupancy today</p>
              </div>
              <TrendingDown size={14} className="text-red-400" />
            </div>
            <div className="space-y-2.5">
              {bottomProps.map((p, i) => (
                <div key={p.property_id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-stone-400 w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-stone-700 truncate">{p.property_name.replace('Yube1 ', '')}</span>
                      <span className="text-xs font-bold ml-2 flex-shrink-0" style={{ color: getColor(p.occupancy_percentage) }}>{p.occupancy_percentage}%</span>
                    </div>
                    <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${p.occupancy_percentage}%`, backgroundColor: getColor(p.occupancy_percentage) }} />
                    </div>
                    <div className="text-[10px] text-stone-400 mt-0.5">{p.manager_name || '—'} · {p.occupied_beds}/{p.total_beds} beds</div>
                  </div>
                </div>
              ))}
              {bottomProps.length === 0 && (
                <div className="text-center py-6 text-stone-400 text-xs">No data submitted yet today</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Alerts Section */}
      {alerts && (alerts.low_today.length > 0 || alerts.consecutive_low.length > 0 || alerts.not_reported_today.length > 0) && (
        <div data-testid="alerts-section">
          <div className="flex items-center gap-2 mb-3">
            <Bell size={15} className="text-[#1A1C18]" />
            <h3 className="text-sm font-bold font-heading text-[#1A1C18]">Alerts</h3>
            {(alerts.low_today.length + alerts.consecutive_low.length) > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">
                {alerts.low_today.length + alerts.consecutive_low.length} issues
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {alerts.low_today.length > 0 && (
              <div className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2">
                  <AlertTriangle size={13} className="text-red-500" />
                  <span className="text-xs font-bold text-red-700">Low Today (&lt;50%)</span>
                  <span className="ml-auto text-xs font-bold text-red-600">{alerts.low_today.length}</span>
                </div>
                <div className="max-h-56 overflow-y-auto scrollbar-thin">
                  {alerts.low_today.map(p => (
                    <div key={p.property_id} className="px-4 py-2.5 border-b border-stone-50 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-medium text-stone-700">{p.property_name.replace('Yube1 ', '')}</div>
                        <div className="text-[10px] text-stone-400">{p.manager_name || '—'}</div>
                      </div>
                      <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg">{p.occupancy_percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {alerts.consecutive_low.length > 0 && (
              <div className="bg-white rounded-xl border border-orange-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-orange-50 border-b border-orange-100 flex items-center gap-2">
                  <TrendingDown size={13} className="text-orange-500" />
                  <span className="text-xs font-bold text-orange-700">3+ Days Low</span>
                  <span className="ml-auto text-xs font-bold text-orange-600">{alerts.consecutive_low.length}</span>
                </div>
                <div className="max-h-56 overflow-y-auto scrollbar-thin">
                  {alerts.consecutive_low.map(p => (
                    <div key={p.property_id} className="px-4 py-2.5 border-b border-stone-50 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-medium text-stone-700">{p.property_name.replace('Yube1 ', '')}</div>
                        <div className="text-[10px] text-stone-400">{p.manager_name} · {p.consecutive_days}d</div>
                      </div>
                      <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg">avg {p.avg_occupancy}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {alerts.not_reported_today.length > 0 && (
              <div className="bg-white rounded-xl border border-amber-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                  <Clock size={13} className="text-amber-500" />
                  <span className="text-xs font-bold text-amber-700">Not Reported Today</span>
                  <span className="ml-auto text-xs font-bold text-amber-600">{alerts.not_reported_today.length}</span>
                </div>
                <div className="max-h-56 overflow-y-auto scrollbar-thin">
                  {alerts.not_reported_today.map(p => (
                    <div key={p.property_id} className="px-4 py-2.5 border-b border-stone-50 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-medium text-stone-700">{p.property_name.replace('Yube1 ', '')}</div>
                        <div className="text-[10px] text-stone-400">{p.manager_name || '—'}</div>
                      </div>
                      <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg font-medium">Pending</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
