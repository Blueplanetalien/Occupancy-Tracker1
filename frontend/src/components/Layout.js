import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  LayoutDashboard, ClipboardEdit, CalendarDays, BarChart3,
  Users, Building2, ShieldCheck, LogOut, ChevronLeft, ChevronRight, UserCog, BarChart2, Users2, KeyRound, X, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/occupancy-entry', icon: ClipboardEdit, label: 'Occupancy Entry', adminOnly: true },
  { to: '/reports/daily', icon: CalendarDays, label: 'Daily Report' },
  { to: '/reports/monthly', icon: BarChart3, label: 'Monthly Report' },
  { to: '/performance', icon: Users, label: 'PM Performance' },
  { to: '/performance/cluster-managers', icon: Users2, label: 'CM Performance' },
  { to: '/performance/properties', icon: BarChart2, label: 'Property Analytics' },
  { to: '/managers', icon: UserCog, label: 'Managers', adminOnly: true },
  { to: '/properties', icon: Building2, label: 'Properties' },
  { to: '/users', icon: ShieldCheck, label: 'User Management', adminOnly: true },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const handleChangePwd = async (e) => {
    e.preventDefault();
    if (pwdForm.next !== pwdForm.confirm) { toast.error('New passwords do not match'); return; }
    if (pwdForm.next.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    setPwdLoading(true);
    try {
      await api.put('/auth/change-password', { current_password: pwdForm.current, new_password: pwdForm.next });
      toast.success('Password changed successfully');
      setShowPwd(false);
      setPwdForm({ current: '', next: '', confirm: '' });
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to change password');
    } finally {
      setPwdLoading(false);
    }
  };

  const visible = navItems.filter(item => !item.adminOnly || user?.role === 'admin');

  return (
    <div className="flex min-h-screen bg-[#FAFAF9]">
      {/* Sidebar */}
      <aside
        data-testid="sidebar"
        className={`fixed left-0 top-0 h-full bg-white border-r border-stone-200 z-50 flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-stone-100">
          {!collapsed && (
            <div className="animate-fade-in">
              <div className="text-base font-bold font-heading text-[#556B2F] leading-tight">Yube1 Stays</div>
              <div className="text-[10px] text-stone-400 uppercase tracking-widest mt-0.5">Occupancy Hub</div>
            </div>
          )}
          <button
            data-testid="sidebar-toggle"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors ml-auto"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto scrollbar-thin">
          {visible.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to ||
              (item.to !== '/dashboard' && item.to !== '/performance' && item.to !== '/performance/cluster-managers' && item.to !== '/performance/properties' && location.pathname.startsWith(item.to)) ||
              (item.to === '/performance' && location.pathname === '/performance') ||
              (item.to === '/performance/cluster-managers' && location.pathname.startsWith('/performance/cluster-managers')) ||
              (item.to === '/performance/properties' && location.pathname.startsWith('/performance/properties'));
            return (
              <Link
                key={item.to}
                to={item.to}
                data-testid={`nav-${item.label.toLowerCase().replace(/ /g, '-')}`}
                title={collapsed ? item.label : ''}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-[#556B2F] text-white shadow-sm'
                    : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'
                }`}
              >
                <Icon size={17} className="flex-shrink-0" />
                {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
                {isActive && !collapsed && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#F5C518]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-stone-100">
          {!collapsed && (
            <div className="px-3 py-2 mb-1 animate-fade-in">
              <div className="text-xs font-semibold text-stone-700 truncate">{user?.name}</div>
              <div className="text-[10px] text-stone-400 capitalize mt-0.5">
                {user?.role === 'admin' ? 'Administrator' : 'Cluster Manager'}
              </div>
            </div>
          )}
          <button
            data-testid="change-password-btn"
            onClick={() => setShowPwd(true)}
            title={collapsed ? 'Change Password' : ''}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-all duration-200 mb-0.5"
          >
            <KeyRound size={15} className="flex-shrink-0" />
            {!collapsed && <span className="text-xs font-medium">Change Password</span>}
          </button>
          <button
            data-testid="logout-button"
            onClick={handleLogout}
            title={collapsed ? 'Logout' : ''}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-500 transition-all duration-200"
          >
            <LogOut size={17} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Change Password Modal */}
      {showPwd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowPwd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold font-heading text-[#1A1C18]">Change Password</h2>
                <p className="text-xs text-stone-400 mt-0.5">Update your account password</p>
              </div>
              <button onClick={() => setShowPwd(false)} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleChangePwd} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wide">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={pwdForm.current}
                    onChange={e => setPwdForm(p => ({ ...p, current: e.target.value }))}
                    required
                    placeholder="Enter current password"
                    className="w-full px-3 py-2.5 pr-9 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30 focus:border-[#556B2F]"
                  />
                  <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400">
                    {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wide">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={pwdForm.next}
                    onChange={e => setPwdForm(p => ({ ...p, next: e.target.value }))}
                    required
                    minLength={6}
                    placeholder="Min 6 characters"
                    className="w-full px-3 py-2.5 pr-9 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30 focus:border-[#556B2F]"
                  />
                  <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400">
                    {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wide">Confirm New Password</label>
                <input
                  type="password"
                  value={pwdForm.confirm}
                  onChange={e => setPwdForm(p => ({ ...p, confirm: e.target.value }))}
                  required
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30 focus:border-[#556B2F]"
                />
              </div>
              <button
                type="submit"
                disabled={pwdLoading}
                data-testid="submit-change-pwd"
                className="w-full py-2.5 bg-[#556B2F] hover:bg-[#435425] text-white text-sm font-semibold rounded-lg transition-all active:scale-95 disabled:opacity-50 mt-1"
              >
                {pwdLoading ? 'Saving...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main */}
      <main className={`flex-1 transition-all duration-300 min-h-screen ${collapsed ? 'ml-16' : 'ml-64'}`}>
        <Outlet />
      </main>
    </div>
  );
}
