import React, { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Save, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

const getOccColor = (val) => {
  if (val == null || val === '') return '';
  const n = Number(val);
  if (n >= 75) return 'text-green-600 bg-green-50 border-green-200';
  if (n >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  return 'text-red-500 bg-red-50 border-red-200';
};

export default function OccupancyEntry() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [properties, setProperties] = useState([]);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/occupancy?date=${date}`);
      setProperties(res.data);
      const vals = {};
      res.data.forEach(p => {
        vals[p.property_id] = p.occupancy_percentage != null ? String(p.occupancy_percentage) : '';
      });
      setValues(vals);
      setDirty(false);
    } catch (e) {
      toast.error('Failed to load occupancy data');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleChange = (propId, val) => {
    if (val !== '' && (isNaN(val) || Number(val) < 0 || Number(val) > 100)) return;
    setValues(prev => ({ ...prev, [propId]: val }));
    setDirty(true);
  };

  const handleSave = async () => {
    const entries = Object.entries(values)
      .filter(([, v]) => v !== '' && v != null)
      .map(([property_id, occupancy_percentage]) => ({ property_id, occupancy_percentage: Number(occupancy_percentage) }));
    if (entries.length === 0) {
      toast.warning('No data to save');
      return;
    }
    setSaving(true);
    try {
      await api.post('/occupancy/bulk', { date, entries });
      toast.success(`Saved ${entries.length} entries for ${format(new Date(date), 'dd MMM yyyy')}`);
      setDirty(false);
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const fillAll = (val) => {
    const vals = {};
    properties.forEach(p => { vals[p.property_id] = String(val); });
    setValues(vals);
    setDirty(true);
  };

  const filledCount = Object.values(values).filter(v => v !== '').length;

  const changeDate = (delta) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(format(d, 'yyyy-MM-dd'));
  };

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-[#FAFAF9] animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-[#1A1C18]">Occupancy Entry</h1>
          <p className="text-sm text-stone-400 mt-0.5">Enter daily occupancy percentage for each property</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => loadData()} className="p-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-500 transition-colors" title="Refresh">
            <RefreshCw size={15} />
          </button>
          <button
            data-testid="save-occupancy-btn"
            onClick={handleSave}
            disabled={saving || !dirty}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#556B2F] hover:bg-[#435425] text-white text-sm font-semibold rounded-lg transition-all active:scale-95 disabled:opacity-50 shadow-sm"
          >
            <Save size={15} />
            {saving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </div>

      {/* Date Picker Row */}
      <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-4 mb-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <button onClick={() => changeDate(-1)} className="p-1.5 rounded-md border border-stone-200 hover:bg-stone-50 text-stone-500">
            <ChevronLeft size={15} />
          </button>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            data-testid="date-picker"
            className="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30 focus:border-[#556B2F]"
          />
          <button onClick={() => changeDate(1)} disabled={date === format(new Date(), 'yyyy-MM-dd')}
            className="p-1.5 rounded-md border border-stone-200 hover:bg-stone-50 text-stone-500 disabled:opacity-30">
            <ChevronRight size={15} />
          </button>
        </div>
        <div className="flex items-center gap-3 text-sm text-stone-500">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#556B2F]/10 text-[#556B2F] font-semibold text-xs">
            {filledCount}/{properties.length} filled
          </span>
        </div>
        <div className="flex gap-2 ml-auto">
          <button onClick={() => fillAll(100)} className="px-3 py-1.5 text-xs font-medium border border-stone-200 rounded-lg hover:bg-stone-50 text-stone-600">
            Set All 100%
          </button>
          <button onClick={() => setValues({})} className="px-3 py-1.5 text-xs font-medium border border-stone-200 rounded-lg hover:bg-stone-50 text-stone-600">
            Clear All
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-[#556B2F] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">#</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Property</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Manager</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Total Beds</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Occupancy %</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Occupied Beds</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((prop, idx) => {
                  const val = values[prop.property_id] ?? '';
                  const occBeds = val !== '' ? Math.round(prop.total_beds * Number(val) / 100) : null;
                  return (
                    <tr key={prop.property_id} className={`border-b border-stone-50 hover:bg-stone-50 transition-colors ${idx % 2 === 0 ? '' : 'bg-stone-25'}`}>
                      <td className="px-5 py-3 text-stone-400 text-xs">{idx + 1}</td>
                      <td className="px-5 py-3 font-medium text-stone-800">
                        {prop.property_name.replace('Yube1 ', '')}
                        <div className="text-[10px] text-stone-400 font-normal">{prop.property_name}</div>
                      </td>
                      <td className="px-5 py-3 text-stone-500">{prop.manager_name || '—'}</td>
                      <td className="px-5 py-3 text-center text-stone-600 font-medium">{prop.total_beds}</td>
                      <td className="px-5 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={val}
                          onChange={e => handleChange(prop.property_id, e.target.value)}
                          data-testid={`occ-input-${idx}`}
                          placeholder="0–100"
                          className={`w-24 text-center px-2.5 py-1.5 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#556B2F]/30 transition-all ${getOccColor(val) || 'border-stone-200 focus:border-[#556B2F]'}`}
                        />
                      </td>
                      <td className="px-5 py-3 text-center text-stone-600 font-medium">
                        {occBeds != null ? occBeds : '—'}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {prop.entry_id ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">Saved</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-400">Pending</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Footer */}
          <div className="px-5 py-3 border-t border-stone-100 bg-stone-50 flex items-center justify-between text-xs text-stone-500">
            <span>{properties.length} properties total</span>
            {dirty && <span className="text-amber-500 font-medium">Unsaved changes</span>}
          </div>
        </div>
      )}
    </div>
  );
}
