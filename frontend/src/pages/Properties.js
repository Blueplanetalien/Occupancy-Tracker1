import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Building2, Edit2, X, Check, Search } from 'lucide-react';

export default function Properties() {
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(null);
  const [newManagerId, setNewManagerId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [pRes, mRes] = await Promise.all([api.get('/properties'), api.get('/managers')]);
      setProperties(pRes.data);
      setManagers(mRes.data);
    } catch (e) { toast.error('Failed to load properties'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openEdit = (prop) => {
    setEditModal(prop);
    setNewManagerId(prop.current_manager?.id || '');
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
  };

  const handleAssign = async () => {
    if (!newManagerId || !startDate) { toast.warning('Select a manager and start date'); return; }
    if (newManagerId === editModal.current_manager?.id) { toast.info('Same manager, no change needed'); return; }
    setSaving(true);
    try {
      await api.post('/assignments', {
        manager_id: newManagerId,
        property_id: editModal.id,
        start_date: startDate,
        end_current: true
      });
      toast.success('Manager assignment updated');
      setEditModal(null);
      load();
    } catch (e) { toast.error('Failed to update assignment'); }
    finally { setSaving(false); }
  };

  const filtered = properties.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.current_manager?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalBeds = properties.reduce((s, p) => s + p.total_beds, 0);

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-[#FAFAF9] animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-[#1A1C18]">Properties</h1>
          <p className="text-sm text-stone-400 mt-0.5">
            {properties.length} properties · {totalBeds.toLocaleString()} total beds
          </p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search properties..."
            data-testid="property-search"
            className="pl-8 pr-4 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30 focus:border-[#556B2F] w-64"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-[#556B2F] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">#</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Property</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Total Beds</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Current Manager</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Since</th>
                  {user?.role === 'admin' && (
                    <th className="text-center px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((prop, idx) => (
                  <tr key={prop.id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                    <td className="px-5 py-3 text-stone-400 text-xs">{idx + 1}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#556B2F]/10 flex items-center justify-center flex-shrink-0">
                          <Building2 size={13} className="text-[#556B2F]" />
                        </div>
                        <div>
                          <div className="font-medium text-stone-800">{prop.name.replace('Yube1 ', '')}</div>
                          <div className="text-[10px] text-stone-400">{prop.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#556B2F]/10 text-[#556B2F]">
                        {prop.total_beds}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {prop.current_manager ? (
                        <div>
                          <div className="font-medium text-stone-700">{prop.current_manager.name}</div>
                          <div className="text-[10px] text-stone-400">{prop.current_manager.phone}</div>
                        </div>
                      ) : (
                        <span className="text-stone-300 text-xs">Unassigned</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-stone-500 text-xs">{prop.assignment_start || '—'}</td>
                    {user?.role === 'admin' && (
                      <td className="px-5 py-3 text-center">
                        <button
                          data-testid={`edit-property-${idx}`}
                          onClick={() => openEdit(prop)}
                          className="p-1.5 rounded-md hover:bg-[#556B2F]/10 text-stone-400 hover:text-[#556B2F] transition-colors"
                          title="Change Manager"
                        >
                          <Edit2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-stone-100 bg-stone-50 text-xs text-stone-400">
            {filtered.length} of {properties.length} properties shown
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
              <div>
                <h3 className="font-bold font-heading text-[#1A1C18]">Change Manager</h3>
                <p className="text-xs text-stone-400 mt-0.5">{editModal.name}</p>
              </div>
              <button onClick={() => setEditModal(null)} className="p-1.5 rounded-md hover:bg-stone-100 text-stone-400">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {editModal.current_manager && (
                <div className="p-3 rounded-lg bg-stone-50 border border-stone-100">
                  <div className="text-xs text-stone-400 mb-0.5">Current Manager</div>
                  <div className="font-medium text-stone-700 text-sm">{editModal.current_manager.name}</div>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wide">New Manager</label>
                <select
                  value={newManagerId}
                  onChange={e => setNewManagerId(e.target.value)}
                  data-testid="manager-select"
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30 focus:border-[#556B2F]"
                >
                  <option value="">Select a manager</option>
                  {managers.map(m => (
                    <option key={m.id} value={m.id}>{m.name} — {m.phone}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wide">Assignment Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  data-testid="assignment-date"
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30 focus:border-[#556B2F]"
                />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-stone-100">
              <button onClick={() => setEditModal(null)}
                className="flex-1 py-2.5 border border-stone-200 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors">
                Cancel
              </button>
              <button
                data-testid="confirm-assignment-btn"
                onClick={handleAssign}
                disabled={saving}
                className="flex-1 py-2.5 bg-[#556B2F] hover:bg-[#435425] text-white text-sm font-semibold rounded-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                <Check size={14} />
                {saving ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
