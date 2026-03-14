import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { toast } from 'sonner';
import { UserPlus, Trash2, X, Eye, EyeOff, Search } from 'lucide-react';
import { format } from 'date-fns';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (e) { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { toast.warning('All fields required'); return; }
    setSaving(true);
    try {
      await api.post('/users', form);
      toast.success(`Cluster Manager "${form.name}" created`);
      setShowModal(false);
      setForm({ name: '', email: '', password: '' });
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to create user');
    } finally { setSaving(false); }
  };

  const handleDelete = async (userId, name) => {
    if (!window.confirm(`Delete account for ${name}?`)) return;
    setDeleting(userId);
    try {
      await api.delete(`/users/${userId}`);
      toast.success(`${name} removed`);
      load();
    } catch (e) { toast.error('Failed to delete user'); }
    finally { setDeleting(null); }
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-[#FAFAF9] animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-[#1A1C18]">User Management</h1>
          <p className="text-sm text-stone-400 mt-0.5">{users.length} Cluster Manager{users.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users..."
              className="pl-8 pr-4 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30 w-52"
            />
          </div>
          <button
            data-testid="create-user-btn"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#556B2F] hover:bg-[#435425] text-white text-sm font-semibold rounded-lg transition-all active:scale-95 shadow-sm"
          >
            <UserPlus size={15} />
            Add User
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-[#556B2F] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-3">
                <UserPlus size={20} className="text-stone-400" />
              </div>
              <p className="text-stone-500 font-medium">No cluster managers yet</p>
              <p className="text-stone-400 text-sm mt-1">Click "Add User" to create one</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">#</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Email</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Role</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Created</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, idx) => (
                  <tr key={u.id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                    <td className="px-5 py-3 text-stone-400 text-xs">{idx + 1}</td>
                    <td className="px-5 py-3 font-medium text-stone-800">{u.name}</td>
                    <td className="px-5 py-3 text-stone-500">{u.email}</td>
                    <td className="px-5 py-3 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-stone-100 text-stone-600">
                        Cluster Manager
                      </span>
                    </td>
                    <td className="px-5 py-3 text-stone-400 text-xs">
                      {u.created_at ? format(new Date(u.created_at), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button
                        data-testid={`delete-user-${idx}`}
                        onClick={() => handleDelete(u.id, u.name)}
                        disabled={deleting === u.id}
                        className="p-1.5 rounded-md hover:bg-red-50 text-stone-400 hover:text-red-500 transition-colors disabled:opacity-40"
                        title="Delete user"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
              <div>
                <h3 className="font-bold font-heading text-[#1A1C18]">New Cluster Manager</h3>
                <p className="text-xs text-stone-400 mt-0.5">Create a read-only dashboard account</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-md hover:bg-stone-100 text-stone-400">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wide">Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Manager name"
                  required
                  data-testid="new-user-name"
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30 focus:border-[#556B2F]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="email@yube1.in"
                  required
                  data-testid="new-user-email"
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30 focus:border-[#556B2F]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="Temporary password"
                    required
                    data-testid="new-user-password"
                    className="w-full px-4 py-2.5 pr-10 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30 focus:border-[#556B2F]"
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                    {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-stone-200 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-50">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  data-testid="create-user-submit"
                  className="flex-1 py-2.5 bg-[#556B2F] hover:bg-[#435425] text-white text-sm font-semibold rounded-lg transition-all active:scale-95 disabled:opacity-50">
                  {saving ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
