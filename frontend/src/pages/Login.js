import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff, Building2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
      toast.success('Welcome back!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-body">
      {/* Left Panel */}
      <div className="w-full lg:w-[42%] flex flex-col justify-center px-8 sm:px-14 lg:px-16 bg-white">
        <div className="max-w-sm w-full mx-auto">
          {/* Logo */}
          <div className="mb-10">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#556B2F] mb-5 shadow-sm">
              <Building2 size={22} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold font-heading text-[#1A1C18]">Yube1 Stays</h1>
            <p className="text-sm text-stone-400 mt-1">Occupancy Management Dashboard</p>
          </div>

          <div className="mb-7">
            <h2 className="text-xl font-bold font-heading text-[#1A1C18]">Sign in to your account</h2>
            <p className="text-sm text-stone-400 mt-1">Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@yube1.in"
                required
                data-testid="email-input"
                className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30 focus:border-[#556B2F] bg-stone-50 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  data-testid="password-input"
                  className="w-full px-4 py-2.5 pr-11 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30 focus:border-[#556B2F] bg-stone-50 transition-all"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              data-testid="login-button"
              className="w-full py-3 bg-[#556B2F] hover:bg-[#435425] text-white font-semibold rounded-lg text-sm transition-all duration-200 active:scale-95 disabled:opacity-60 mt-2 shadow-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          <p className="text-xs text-stone-400 mt-8 text-center">
            Contact your administrator to get access
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div
        className="hidden lg:flex lg:w-[58%] relative overflow-hidden"
        style={{
          backgroundImage: `url(https://images.unsplash.com/photo-1758548157747-285c7012db5b?crop=entropy&cs=srgb&fm=jpg&q=80)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#556B2F]/60 to-[#2A2F24]/50" />
        <div className="relative z-10 flex flex-col justify-end p-14 text-white">
          <h2 className="text-3xl font-bold font-heading mb-3">Manage Your Portfolio</h2>
          <p className="text-white/75 text-base leading-relaxed max-w-sm">
            Track daily occupancy across all properties, monitor manager performance, and generate consolidated reports.
          </p>
          <div className="flex gap-10 mt-10">
            {[['34', 'Properties'], ['2,600+', 'Total Beds'], ['30+', 'Managers']].map(([val, label]) => (
              <div key={label}>
                <div className="text-3xl font-bold text-[#F5C518] font-heading">{val}</div>
                <div className="text-white/60 text-xs mt-1 uppercase tracking-wide">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
