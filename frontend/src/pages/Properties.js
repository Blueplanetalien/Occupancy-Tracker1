import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Building2, Edit2, X, Check, Search, PlusCircle, UserX, Pencil, Trash2, Plus } from 'lucide-react';

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
  const [addingNew, setAddingNew] = useState(false);
  const [newMgr, setNewMgr] = useState({ name: '', phone: '' });
  const [editingBeds, setEditingBeds] = useState(null);
  const [bedsValue, setBedsValue] = useState('');
  const [savingBeds, setSavingBeds] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [addPropModal, setAddPropModal] = useState(false);
  const [newProp, setNewProp] = useState({ name: '', total_beds: '', manager_id: '', start_date: '' });

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
    setAddingNew(false);
    setNewMgr({ name: '', phone: '' });
  };

  const handleAssign = async () => {
    if (!startDate) { toast.warning('Select a start date'); return; }
    setSaving(true);
    try {
      let managerId = newManagerId;
      if (addingNew) {
        if (!newMgr.name || !newMgr.phone) { toast.warning('Enter name and phone for new manager'); setSaving(false); return; }
        const res = await api.post('/managers', { name: newMgr.name, phone: newMgr.phone });
        managerId = res.data.id;
        toast.success(`New manager "${newMgr.name}" created`);
      }
      if (!managerId) { toast.warning('Select or create a manager'); setSaving(false); return; }
      if (!addingNew && managerId === editModal.current_manager?.id) { toast.info('Same manager, no change needed'); setSaving(false); return; }
      await api.post('/assignments', { manager_id: managerId, property_id: editModal.id, start_date: startDate, end_current: true });
      toast.success('Manager assignment updated');
      setEditModal(null);
      load();
    } catch (e) { toast.error('Failed to update assignment'); }
    finally { setSaving(false); }
  };

  // Inline bed save
  const saveBeds = async (propId) => {
    const val = parseInt(bedsValue);
    if (isNaN(val) || val < 1) { toast.warning('Enter a valid number of beds'); return; }
    setSavingBeds(true);
    try {
      await api.put(`/properties/${propId}`, { total_beds: val });
      toast.success('Bed count updated');
      setEditingBeds(null);
      load();
    } catch (e) { toast.error('Failed to update beds'); }
    finally { setSavingBeds(false); }
  };

  // Unassign manager from property
  const handleUnassign = async (prop) => {
    if (!window.confirm(`Remove ${prop.current_manager?.name} from ${prop.name}?`)) return;
    try {
      await api.delete(`/assignments/property/${prop.id}`);
      toast.success('Manager unassigned from property');
      load();
    } catch (e) { toast.error('Failed to unassign manager'); }
  };

  // Delete property completely
  const handleDeleteProperty = async (prop) => {
    if (!window.confirm(`DELETE "${prop.name}" permanently?\n\nThis will remove ALL occupancy history and manager assignments for this property. This cannot be undone.`)) return;
    setDeleting(prop.id);
    try {
      await api.delete(`/properties/${prop.id}`);
      toast.success(`"${prop.name}" deleted`);
      load();
    } catch (e) { toast.error('Failed to delete property'); }
    finally { setDeleting(null); }
  };

  // Add new property
  const handleAddProperty = async (e) => {
    e.preventDefault();
    if (!newProp.name || !newProp.total_beds) { toast.warning('Name and bed count required'); return; }
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await api.post('/properties', {
        name: newProp.name,
        total_beds: parseInt(newProp.total_beds),
        manager_id: newProp.manager_id || null,
        start_date: newProp.start_date || today
      });
      toast.success(`"${newProp.name}" added`);
      setAddPropModal(false);
      setNewProp({ name: '', total_beds: '', manager_id: '', start_date: '' });
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to add property'); }
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
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search properties..." data-testid="property-search"
              className="pl-8 pr-4 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30 focus:border-[#556B2F] w-64" />
          </div>
          {user?.role === 'admin' && (
            <button data-testid="add-property-btn" onClick={() => setAddPropModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#556B2F] hover:bg-[#435425] text-white text-sm font-semibold rounded-lg transition-all active:scale-95 shadow-sm">
              <Plus size={15} /> New Property
            </button>
          )}
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
                  <tr key={prop.id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors group">
                    <td className="px-5 py-3 text-stone-400 text-xs">{idx + 1}</td>

                    {/* Property Name */}
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

                    {/* Total Beds — inline editable */}
                    <td className="px-5 py-3 text-center">
                      {user?.role === 'admin' && editingBeds === prop.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min="1"
                            value={bedsValue}
                            onChange={e => setBedsValue(e.target.value)}
                            data-testid={`beds-input-${idx}`}
                            className="w-16 text-center px-2 py-1 border border-[#556B2F] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30"
                            onKeyDown={e => { if (e.key === 'Enter') saveBeds(prop.id); if (e.key === 'Escape') setEditingBeds(null); }}
                            autoFocus
                          />
                          <button
                            data-testid={`beds-save-${idx}`}
                            onClick={() => saveBeds(prop.id)}
                            disabled={savingBeds}
                            className="p-1 rounded text-green-600 hover:bg-green-50 transition-colors"
                          >
                            <Check size={13} />
                          </button>
                          <button onClick={() => setEditingBeds(null)} className="p-1 rounded text-stone-400 hover:bg-stone-100 transition-colors">
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 group">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#556B2F]/10 text-[#556B2F]">
                            {prop.total_beds}
                          </span>
                          {user?.role === 'admin' && (
                            <button
                              data-testid={`edit-beds-${idx}`}
                              onClick={() => { setEditingBeds(prop.id); setBedsValue(String(prop.total_beds)); }}
                              className="p-1 rounded opacity-0 group-hover:opacity-100 text-stone-400 hover:text-[#556B2F] hover:bg-[#556B2F]/10 transition-all"
                              title="Edit bed count"
                            >
                              <Pencil size={11} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Current Manager */}
                    <td className="px-5 py-3">
                      {prop.current_manager ? (
                        <div className="flex items-center gap-2 group">
                          <div>
                            <div className="font-medium text-stone-700">{prop.current_manager.name}</div>
                            <div className="text-[10px] text-stone-400">{prop.current_manager.phone}</div>
                          </div>
                          {user?.role === 'admin' && (
                            <button
                              data-testid={`unassign-manager-${idx}`}
                              onClick={() => handleUnassign(prop)}
                              title="Remove manager from this property"
                              className="ml-1 p-1 rounded opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-500 hover:bg-red-50 transition-all"
                            >
                              <UserX size={13} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-stone-300 text-xs italic">Unassigned</span>
                      )}
                    </td>

                    <td className="px-5 py-3 text-stone-400 text-xs">{prop.assignment_start || '—'}</td>

                    {user?.role === 'admin' && (
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button data-testid={`edit-property-${idx}`} onClick={() => openEdit(prop)}
                            className="p-1.5 rounded-md hover:bg-[#556B2F]/10 text-stone-400 hover:text-[#556B2F] transition-colors" title="Assign / Change Manager">
                            <Edit2 size={13} />
                          </button>
                          <button data-testid={`delete-property-${idx}`} onClick={() => handleDeleteProperty(prop)}
                            disabled={deleting === prop.id}
                            className="p-1.5 rounded-md hover:bg-red-50 text-stone-400 hover:text-red-500 transition-colors disabled:opacity-40" title="Delete property">
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
          <div className="px-5 py-3 border-t border-stone-100 bg-stone-50 text-xs text-stone-400 flex items-center gap-4">
            <span>{filtered.length} of {properties.length} properties</span>
            {user?.role === 'admin' && (
              <span className="text-stone-300">Hover a row to edit beds or remove manager</span>
            )}
          </div>
        </div>
      )}

      {/* Add Property Modal */}
      {addPropModal && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
              <div>
                <h3 className="font-bold font-heading text-[#1A1C18]">Add New Property</h3>
                <p className="text-xs text-stone-400 mt-0.5">Create a new property in the system</p>
              </div>
              <button onClick={() => setAddPropModal(false)} className="p-1.5 rounded-md hover:bg-stone-100 text-stone-400">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddProperty} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wide">Property Name</label>
                <input type="text" value={newProp.name} onChange={e => setNewProp({ ...newProp, name: e.target.value })}
                  placeholder="e.g. Yube1 Skyline" required data-testid="new-prop-name"
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30 focus:border-[#556B2F]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wide">Total Beds</label>
                <input type="number" min="1" value={newProp.total_beds} onChange={e => setNewProp({ ...newProp, total_beds: e.target.value })}
                  placeholder="Number of beds" required data-testid="new-prop-beds"
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30 focus:border-[#556B2F]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wide">Assign Manager (optional)</label>
                <select value={newProp.manager_id} onChange={e => setNewProp({ ...newProp, manager_id: e.target.value })} data-testid="new-prop-manager"
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30 focus:border-[#556B2F]">
                  <option value="">No manager yet</option>
                  {managers.map(m => <option key={m.id} value={m.id}>{m.name} — {m.phone}</option>)}
                </select>
              </div>
              {newProp.manager_id && (
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wide">Assignment Start Date</label>
                  <input type="date" value={newProp.start_date} onChange={e => setNewProp({ ...newProp, start_date: e.target.value })}
                    className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30 focus:border-[#556B2F]" />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setAddPropModal(false)}
                  className="flex-1 py-2.5 border border-stone-200 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-50">Cancel</button>
                <button type="submit" disabled={saving} data-testid="add-prop-submit"
                  className="flex-1 py-2.5 bg-[#556B2F] hover:bg-[#435425] text-white text-sm font-semibold rounded-lg active:scale-95 disabled:opacity-50">
                  {saving ? 'Adding...' : 'Add Property'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {editModal && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
              <div>
                <h3 className="font-bold font-heading text-[#1A1C18]">Assign Manager</h3>
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
                  <div className="text-xs text-stone-400">{editModal.current_manager.phone}</div>
                </div>
              )}

              {/* Toggle */}
              <div className="flex rounded-lg border border-stone-200 overflow-hidden">
                <button
                  onClick={() => setAddingNew(false)}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${!addingNew ? 'bg-[#556B2F] text-white' : 'bg-white text-stone-500 hover:bg-stone-50'}`}
                >
                  Existing Manager
                </button>
                <button
                  data-testid="add-new-manager-toggle"
                  onClick={() => setAddingNew(true)}
                  className={`flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${addingNew ? 'bg-[#556B2F] text-white' : 'bg-white text-stone-500 hover:bg-stone-50'}`}
                >
                  <PlusCircle size={12} /> Add New Manager
                </button>
              </div>

              {!addingNew ? (
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wide">Select Manager</label>
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
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wide">New Manager Name</label>
                    <input
                      type="text"
                      value={newMgr.name}
                      onChange={e => setNewMgr({ ...newMgr, name: e.target.value })}
                      placeholder="Full name"
                      data-testid="new-manager-name"
                      className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30 focus:border-[#556B2F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wide">Phone Number</label>
                    <input
                      type="text"
                      value={newMgr.phone}
                      onChange={e => setNewMgr({ ...newMgr, phone: e.target.value })}
                      placeholder="Phone number"
                      data-testid="new-manager-phone"
                      className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30 focus:border-[#556B2F]"
                    />
                  </div>
                </div>
              )}

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
