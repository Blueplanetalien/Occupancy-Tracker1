import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Phone, Edit2, Trash2, UserPlus, Search, X, Check, Building2, Users } from 'lucide-react';

const initials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
const COLORS = ['#556B2F', '#6B7C4E', '#8FA070', '#A3B18A', '#435425', '#334019'];
const avatarColor = (name) => COLORS[name.charCodeAt(0) % COLORS.length];

export default function Managers() {
  const { user } = useAuth();
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);

  // Modals
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/managers');
      setManagers(res.data);
    } catch (e) { toast.error('Failed to load managers'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm({ name: '', phone: '' }); setAddModal(true); };
  const openEdit = (mgr) => { setForm({ name: mgr.name, phone: mgr.phone }); setEditModal(mgr); };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) { toast.warning('Name and phone are required'); return; }
    setSaving(true);
    try {
      await api.post('/managers', form);
      toast.success(`Manager "${form.name}" added`);
      setAddModal(false);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to create manager'); }
    finally { setSaving(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) { toast.warning('Name and phone required'); return; }
    setSaving(true);
    try {
      await api.put(`/managers/${editModal.id}`, form);
      toast.success('Manager updated');
      setEditModal(null);
      load();
    } catch (e) { toast.error('Failed to update'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (mgr) => {
    const propCount = mgr.current_properties?.length || 0;
    const msg = propCount > 0
      ? `${mgr.name} is currently managing ${propCount} property(s).\n\nDeleting will remove them from ALL properties and permanently delete their record.\n\nContinue?`
      : `Permanently delete ${mgr.name}? This cannot be undone.`;
    if (!window.confirm(msg)) return;
    setDeleting(mgr.id);
    try {
      await api.delete(`/managers/${mgr.id}`);
      toast.success(`${mgr.name} removed from system`);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to delete'); }
    finally { setDeleting(null); }
  };

  const filtered = managers.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.phone.includes(search)
  );

  const totalAssigned = managers.filter(m => m.current_properties?.length > 0).length;
  const totalUnassigned = managers.length - totalAssigned;

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-[#FAFAF9] animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-[#1A1C18]">Managers</h1>
          <p className="text-sm text-stone-400 mt-0.5">{managers.length} property managers in system</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or phone..." data-testid="manager-search"
              className="pl-8 pr-4 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30 w-60" />
          </div>
          {user?.role === 'admin' && (
            <button data-testid="add-manager-btn" onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-[#556B2F] hover:bg-[#435425] text-white text-sm font-semibold rounded-lg transition-all active:scale-95 shadow-sm">
              <UserPlus size={15} /> Add Manager
            </button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Managers', value: managers.length, icon: Users, color: '#556B2F' },
          { label: 'Assigned to Properties', value: totalAssigned, icon: Building2, color: '#6B7C4E' },
          { label: 'Unassigned', value: totalUnassigned, icon: Users, color: '#A3B18A' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-stone-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: stat.color + '18' }}>
              <stat.icon size={17} style={{ color: stat.color }} />
            </div>
            <div>
              <div className="text-xs text-stone-400 font-medium">{stat.label}</div>
              <div className="text-xl font-bold font-heading text-[#1A1C18]">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Manager Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-[#556B2F] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Table view */}
          <div className="bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">#</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Manager</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Phone</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Current Properties</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Status</th>
                    {user?.role === 'admin' && (
                      <th className="text-center px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((mgr, idx) => (
                    <tr key={mgr.id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                      <td className="px-5 py-3.5 text-stone-400 text-xs">{idx + 1}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: avatarColor(mgr.name) }}>
                            {initials(mgr.name)}
                          </div>
                          <div className="font-semibold text-stone-800">{mgr.name}</div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-stone-500">
                          <Phone size={12} className="text-stone-400" />
                          {mgr.phone}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {mgr.current_properties?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {mgr.current_properties.slice(0, 3).map(p => (
                              <span key={p.id} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-[#556B2F]/10 text-[#556B2F] font-medium">
                                {p.name.replace('Yube1 ', '')}
                              </span>
                            ))}
                            {mgr.current_properties.length > 3 && (
                              <span className="text-[10px] text-stone-400">+{mgr.current_properties.length - 3}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-stone-300 text-xs italic">No active assignment</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {mgr.current_properties?.length > 0 ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">Active</span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-500">Unassigned</span>
                        )}
                      </td>
                      {user?.role === 'admin' && (
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-center gap-1">
                            <button data-testid={`edit-manager-${idx}`} onClick={() => openEdit(mgr)}
                              className="p-1.5 rounded-md hover:bg-[#556B2F]/10 text-stone-400 hover:text-[#556B2F] transition-colors" title="Edit">
                              <Edit2 size={13} />
                            </button>
                            <button data-testid={`delete-manager-${idx}`} onClick={() => handleDelete(mgr)}
                              disabled={deleting === mgr.id}
                              className="p-1.5 rounded-md hover:bg-red-50 text-stone-400 hover:text-red-500 transition-colors disabled:opacity-40" title="Delete from system">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-stone-100 bg-stone-50 text-xs text-stone-400">
              {filtered.length} of {managers.length} managers shown
            </div>
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      {(addModal || editModal) && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-fade-in">
            <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
              <h3 className="font-bold font-heading text-[#1A1C18]">
                {addModal ? 'Add New Manager' : `Edit — ${editModal?.name}`}
              </h3>
              <button onClick={() => { setAddModal(false); setEditModal(null); }}
                className="p-1.5 rounded-md hover:bg-stone-100 text-stone-400">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={addModal ? handleCreate : handleEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wide">Full Name</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Manager name" required data-testid="manager-form-name"
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30 focus:border-[#556B2F]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wide">Phone Number</label>
                <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="Phone number" required data-testid="manager-form-phone"
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30 focus:border-[#556B2F]" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setAddModal(false); setEditModal(null); }}
                  className="flex-1 py-2.5 border border-stone-200 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-50">Cancel</button>
                <button type="submit" disabled={saving} data-testid="manager-form-submit"
                  className="flex-1 py-2.5 bg-[#556B2F] hover:bg-[#435425] text-white text-sm font-semibold rounded-lg transition-all active:scale-95 disabled:opacity-50">
                  {saving ? 'Saving...' : (addModal ? 'Add Manager' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
