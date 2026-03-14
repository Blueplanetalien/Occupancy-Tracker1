import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Building2, BedDouble, TrendingUp, Activity, ArrowUpRight, AlertTriangle, Bell, Clock } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend
} from 'recharts';
import { format } from 'date-fns';

const COLORS = ['#556B2F', '#F5C518', '#A3B18A', '#D4A373', '#6B7C4E', '#8B9A6E'];

const StatCard = ({ icon: Icon, label, value, sub, color = '#556B2F', testId }) => (
  <div data-testid={testId} className="bg-white rounded-xl border border-stone-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow animate-fade-in">
    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '18' }}>
      <Icon size={20} style={{ color }} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-xs text-stone-400 font-medium uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold font-heading text-[#1A1C18] mt-0.5">{value}</div>
      {sub && <div className="text-xs text-stone-400 mt-0.5">{sub}</div>}
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-stone-200 rounded-lg p-3 shadow-lg text-xs">
        <div className="font-semibold text-stone-600 mb-1">{label}</div>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-stone-600">{p.value != null ? `${Number(p.value).toFixed(1)}%` : 'No data'}</span>
          </div>
        ))}
      </div>
    );
  }
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
    const load = async () => {
      try {
        const [ovRes, drRes, alRes] = await Promise.all([
          api.get('/dashboard/overview'),
          api.get(`/reports/daily?date=${today}`),
          api.get('/alerts/low-occupancy?threshold=50')
        ]);
        setOverview(ovRes.data);
        setDailyReport(drRes.data);
        setAlerts(alRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [today]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-[#556B2F] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const trendData = (overview?.trend || []).filter(d => d.occupancy != null);
  const topProps = (dailyReport?.properties || [])
    .filter(p => p.has_entry)
    .sort((a, b) => b.occupancy_percentage - a.occupancy_percentage)
    .slice(0, 10);

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-[#FAFAF9] animate-fade-in">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold font-heading text-[#1A1C18]">Dashboard</h1>
        <p className="text-sm text-stone-400 mt-0.5">
          Welcome back, {user?.name} — {format(new Date(), 'EEEE, dd MMM yyyy')}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          testId="stat-total-properties"
          icon={Building2} label="Total Properties"
          value={overview?.total_properties || 34}
          sub="Active properties" color="#556B2F"
        />
        <StatCard
          testId="stat-total-beds"
          icon={BedDouble} label="Total Beds"
          value={(overview?.total_beds || 0).toLocaleString()}
          sub="Across all properties" color="#6B7C4E"
        />
        <StatCard
          testId="stat-today-occupancy"
          icon={TrendingUp} label="Today's Occupancy"
          value={overview?.reporting_today > 0 ? `${overview.today_occupancy_percentage}%` : 'No data'}
          sub={`${overview?.today_occupied_beds || 0} beds occupied`}
          color="#F5C518"
        />
        <StatCard
          testId="stat-reporting-count"
          icon={Activity} label="Reporting Today"
          value={`${overview?.reporting_today || 0}/${overview?.total_properties || 34}`}
          sub="Properties submitted" color="#A3B18A"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 mb-5">
        {/* Trend Chart */}
        <div data-testid="trend-chart" className="xl:col-span-3 bg-white rounded-xl border border-stone-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold font-heading text-[#1A1C18]">Occupancy Trend</h3>
              <p className="text-xs text-stone-400 mt-0.5">Last 30 days consolidated</p>
            </div>
          </div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ee" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="occupancy" stroke="#556B2F" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#556B2F' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-stone-400 text-sm">
              No occupancy data yet. Start by entering daily occupancy.
            </div>
          )}
        </div>

        {/* Status breakdown */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-stone-100 shadow-sm p-5">
          <h3 className="text-sm font-bold font-heading text-[#1A1C18] mb-1">Today's Status</h3>
          <p className="text-xs text-stone-400 mb-5">Property reporting breakdown</p>
          <div className="space-y-3">
            {[
              { label: 'Reported', count: dailyReport?.reporting_properties || 0, color: '#556B2F' },
              { label: 'Pending', count: (dailyReport?.total_properties || 34) - (dailyReport?.reporting_properties || 0), color: '#e5e7eb' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-stone-500">{item.label}</span>
                  <span className="font-semibold text-stone-700">{item.count}</span>
                </div>
                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${((item.count / (dailyReport?.total_properties || 34)) * 100)}%`,
                      backgroundColor: item.color
                    }}
                  />
                </div>
              </div>
            ))}
            <div className="mt-4 pt-4 border-t border-stone-100">
              <div className="text-xs text-stone-400 mb-1">Overall today</div>
              <div className="text-3xl font-bold font-heading text-[#556B2F]">
                {overview?.reporting_today > 0 ? `${overview.today_occupancy_percentage}%` : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Top Properties Bar Chart */}
      {topProps.length > 0 && (
        <div data-testid="property-bar-chart" className="bg-white rounded-xl border border-stone-100 shadow-sm p-5 mb-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold font-heading text-[#1A1C18]">Property Occupancy Today</h3>
              <p className="text-xs text-stone-400 mt-0.5">Top 10 reporting properties</p>
            </div>
            <a href="/reports/daily" className="flex items-center gap-1 text-xs text-[#556B2F] hover:underline font-medium">
              Full report <ArrowUpRight size={12} />
            </a>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topProps} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ee" vertical={false} />
              <XAxis dataKey="property_name" tick={{ fontSize: 9, fill: '#a8a29e' }} axisLine={false} tickLine={false}
                tickFormatter={v => v.replace('Yube1 ', '')} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="occupancy_percentage" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {topProps.map((entry, index) => (
                  <Cell key={index} fill={entry.occupancy_percentage >= 75 ? '#556B2F' : entry.occupancy_percentage >= 50 ? '#F5C518' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Alerts Section */}
      {alerts && (alerts.low_today.length > 0 || alerts.consecutive_low.length > 0 || alerts.not_reported_today.length > 0) && (
        <div data-testid="alerts-section" className="space-y-4">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-[#1A1C18]" />
            <h3 className="text-sm font-bold font-heading text-[#1A1C18]">Low Occupancy Alerts</h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">
              {alerts.low_today.length + alerts.consecutive_low.length} alerts
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Low today */}
            {alerts.low_today.length > 0 && (
              <div className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-red-500" />
                  <span className="text-xs font-bold text-red-700">Low Occupancy Today</span>
                  <span className="ml-auto text-xs text-red-500 font-semibold">{alerts.low_today.length} properties</span>
                </div>
                <div className="divide-y divide-stone-50 max-h-64 overflow-y-auto scrollbar-thin">
                  {alerts.low_today.map(p => (
                    <div key={p.property_id} className="px-4 py-2.5 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-medium text-stone-700">{p.property_name.replace('Yube1 ', '')}</div>
                        <div className="text-[10px] text-stone-400">{p.manager_name || '—'}</div>
                      </div>
                      <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                        {p.occupancy_percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Consecutive low */}
            {alerts.consecutive_low.length > 0 && (
              <div className="bg-white rounded-xl border border-orange-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-orange-50 border-b border-orange-100 flex items-center gap-2">
                  <TrendingUp size={14} className="text-orange-500" />
                  <span className="text-xs font-bold text-orange-700">3+ Consecutive Days Low</span>
                  <span className="ml-auto text-xs text-orange-500 font-semibold">{alerts.consecutive_low.length}</span>
                </div>
                <div className="divide-y divide-stone-50 max-h-64 overflow-y-auto scrollbar-thin">
                  {alerts.consecutive_low.map(p => (
                    <div key={p.property_id} className="px-4 py-2.5 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-medium text-stone-700">{p.property_name.replace('Yube1 ', '')}</div>
                        <div className="text-[10px] text-stone-400">{p.manager_name || '—'} · {p.consecutive_days} days</div>
                      </div>
                      <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">
                        avg {p.avg_occupancy}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Not reported */}
            {alerts.not_reported_today.length > 0 && (
              <div className="bg-white rounded-xl border border-amber-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                  <Clock size={14} className="text-amber-500" />
                  <span className="text-xs font-bold text-amber-700">Not Reported Today</span>
                  <span className="ml-auto text-xs text-amber-500 font-semibold">{alerts.not_reported_today.length}</span>
                </div>
                <div className="divide-y divide-stone-50 max-h-64 overflow-y-auto scrollbar-thin">
                  {alerts.not_reported_today.map(p => (
                    <div key={p.property_id} className="px-4 py-2.5 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-medium text-stone-700">{p.property_name.replace('Yube1 ', '')}</div>
                        <div className="text-[10px] text-stone-400">{p.manager_name || '—'}</div>
                      </div>
                      <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                        Pending
                      </span>
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
