import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, ClipboardEdit, CalendarDays, BarChart3,
  Users, Building2, ShieldCheck, LogOut, ChevronLeft, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/occupancy-entry', icon: ClipboardEdit, label: 'Occupancy Entry', adminOnly: true },
  { to: '/reports/daily', icon: CalendarDays, label: 'Daily Report' },
  { to: '/reports/monthly', icon: BarChart3, label: 'Monthly Report' },
  { to: '/performance', icon: Users, label: 'PM Performance' },
  { to: '/properties', icon: Building2, label: 'Properties' },
  { to: '/users', icon: ShieldCheck, label: 'User Management', adminOnly: true },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
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
            const isActive = location.pathname === item.to || (item.to !== '/dashboard' && location.pathname.startsWith(item.to));
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

      {/* Main */}
      <main className={`flex-1 transition-all duration-300 min-h-screen ${collapsed ? 'ml-16' : 'ml-64'}`}>
        <Outlet />
      </main>
    </div>
  );
}
