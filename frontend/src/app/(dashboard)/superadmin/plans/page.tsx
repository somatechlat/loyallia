'use client';
import { useEffect, useState, useCallback } from 'react';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

const apiFetch = (path: string, opts?: RequestInit) => {
  const token = Cookies.get('access_token');
  return fetch(`/api/v1/admin${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...opts?.headers },
  });
};

interface PlanData {
  id: string; name: string; slug: string; description: string;
  price_monthly: number; price_annual: number;
  max_locations: number; max_users: number; max_customers: number; max_programs: number;
  features: string[]; is_active: boolean; is_featured: boolean; trial_days: number; sort_order: number;
}

const emptyPlan = {
  name: '', slug: '', description: '',
  price_monthly: 0, price_annual: 0,
  max_locations: 1, max_users: 3, max_customers: 500, max_programs: 1,
  features: [] as string[], is_featured: false, trial_days: 14, sort_order: 0,
};

export default function SuperAdminPlans() {
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PlanData | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyPlan);
  const [saving, setSaving] = useState(false);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await apiFetch('/plans/');
      setPlans(await res.json());
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const openDetail = (p: PlanData) => {
    setSelected(p);
    setEditMode(false);
    setForm({
      name: p.name, slug: p.slug, description: p.description,
      price_monthly: p.price_monthly, price_annual: p.price_annual,
      max_locations: p.max_locations, max_users: p.max_users,
      max_customers: p.max_customers, max_programs: p.max_programs,
      features: p.features || [],
      is_featured: p.is_featured, trial_days: p.trial_days, sort_order: p.sort_order,
    });
  };

  const closeModal = () => { setSelected(null); setShowCreate(false); setEditMode(false); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = { ...form, features: form.features };

      if (showCreate) {
        const res = await apiFetch('/plans/', { method: 'POST', body: JSON.stringify(body) });
        if (!res.ok) throw new Error(await res.text());
        toast.success('Plan creado exitosamente');
      } else if (selected) {
        const res = await apiFetch(`/plans/${selected.id}/`, { method: 'PATCH', body: JSON.stringify(body) });
        if (!res.ok) throw new Error(await res.text());
        toast.success('Plan actualizado');
      }
      closeModal();
      await fetchPlans();
    } catch (e: any) { toast.error(e.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async (p: PlanData) => {
    if (!confirm(`¿Desactivar el plan "${p.name}"?`)) return;
    try {
      await apiFetch(`/plans/${p.id}/`, { method: 'DELETE' });
      toast.success('Plan desactivado');
      closeModal();
      await fetchPlans();
    } catch { toast.error('Error al desactivar'); }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-surface-200 rounded-xl w-48" />
        <div className="grid grid-cols-3 gap-6">{[1,2,3].map(i => <div key={i} className="h-64 bg-surface-200 rounded-2xl" />)}</div>
      </div>
    );
  }

  const activePlans = plans.filter(p => p.is_active);
  const inactivePlans = plans.filter(p => !p.is_active);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-surface-900 tracking-tight">Planes de Suscripción</h1>
          <p className="text-surface-500 mt-1">{activePlans.length} activos · {inactivePlans.length} inactivos</p>
        </div>
        <button onClick={() => { setShowCreate(true); setForm({ ...emptyPlan }); }}
          className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-brand-200 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nuevo Plan
        </button>
      </div>

      {/* Active Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {activePlans.map(plan => (
          <div key={plan.id}
            onClick={() => openDetail(plan)}
            className={`bg-white/80 backdrop-blur-xl rounded-2xl border-2 shadow-sm p-6 flex flex-col cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-200 group ${
              plan.is_featured ? 'border-brand-400 ring-2 ring-brand-100' : 'border-white/30'
            }`}
            style={{ boxShadow: '0 4px 30px rgba(0,0,0,0.06)' }}>
            {plan.is_featured && (
              <span className="self-start bg-gradient-to-r from-brand-500 to-purple-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full mb-3">
                RECOMENDADO
              </span>
            )}
            <h3 className="text-xl font-black text-surface-900 group-hover:text-brand-600 transition-colors">{plan.name}</h3>
            <p className="text-sm text-surface-500 mt-1 mb-4 line-clamp-2">{plan.description || 'Sin descripción'}</p>
            <div className="mb-4">
              <span className="text-4xl font-black text-surface-900">${plan.price_monthly}</span>
              <span className="text-surface-500 text-sm">/mes</span>
              <p className="text-xs text-surface-400 mt-0.5">o ${plan.price_annual}/año</p>
            </div>
            <div className="border-t border-surface-100 pt-4 space-y-2 flex-1">
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2">Incluye:</p>
              {(plan.features || []).slice(0, 5).map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-surface-700">
                  <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-surface-100 grid grid-cols-2 gap-2 text-xs text-surface-400">
              <p>{plan.max_locations} sucursales</p>
              <p>{plan.max_users} usuarios</p>
              <p>{plan.max_customers.toLocaleString()} clientes</p>
              <p>{plan.trial_days}d prueba</p>
            </div>
            <div className="mt-3 pt-3 border-t border-surface-100 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs text-brand-500 font-semibold">Editar plan →</span>
            </div>
          </div>
        ))}
      </div>

      {/* Inactive Plans */}
      {inactivePlans.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-surface-400 mb-3">Planes Inactivos</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {inactivePlans.map(plan => (
              <div key={plan.id} onClick={() => openDetail(plan)}
                className="bg-surface-50 p-4 rounded-2xl border border-surface-200 cursor-pointer hover:bg-surface-100 transition-all opacity-60">
                <p className="font-bold text-surface-600">{plan.name}</p>
                <p className="text-sm text-surface-400">${plan.price_monthly}/mes — Desactivado</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* GLASSMORPHISM MODAL                                       */}
      {/* ══════════════════════════════════════════════════════════ */}
      {(selected || showCreate) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg bg-white/80 backdrop-blur-xl border border-white/30 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto animate-fade-in"
            onClick={e => e.stopPropagation()}
            style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.15)' }}>

            <div className="h-1.5 bg-gradient-to-r from-brand-400 via-purple-400 to-indigo-500" />

            <div className="px-6 pt-5 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-surface-900">
                  {showCreate ? 'Nuevo Plan' : editMode ? `Editar: ${selected?.name}` : selected?.name}
                </h2>
                {selected && !editMode && !showCreate && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2 h-2 rounded-full ${selected.is_active ? 'bg-green-500' : 'bg-red-400'}`} />
                    <span className="text-xs text-surface-400">{selected.is_active ? 'Activo' : 'Inactivo'}</span>
                    {selected.is_featured && <span className="text-[10px] bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-semibold">Destacado</span>}
                  </div>
                )}
              </div>
              <button onClick={closeModal} className="w-8 h-8 rounded-xl bg-surface-100 hover:bg-surface-200 flex items-center justify-center transition-colors">
                <svg className="w-4 h-4 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* READ MODE */}
            {selected && !editMode && !showCreate && (
              <div className="px-6 pb-6 space-y-4">
                <p className="text-sm text-surface-600">{selected.description || 'Sin descripción'}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface-50/80 rounded-xl p-3">
                    <p className="text-[10px] font-semibold text-surface-400 uppercase">Precio Mensual</p>
                    <p className="text-2xl font-black text-surface-900">${selected.price_monthly}</p>
                  </div>
                  <div className="bg-surface-50/80 rounded-xl p-3">
                    <p className="text-[10px] font-semibold text-surface-400 uppercase">Precio Anual</p>
                    <p className="text-2xl font-black text-surface-900">${selected.price_annual}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoRow label="Máx. Sucursales" value={String(selected.max_locations)} />
                  <InfoRow label="Máx. Usuarios" value={String(selected.max_users)} />
                  <InfoRow label="Máx. Clientes" value={selected.max_customers.toLocaleString()} />
                  <InfoRow label="Máx. Programas" value={String(selected.max_programs)} />
                  <InfoRow label="Días de Prueba" value={String(selected.trial_days)} />
                  <InfoRow label="Orden" value={String(selected.sort_order)} />
                </div>
                {(selected.features || []).length > 0 && (
                  <div className="bg-surface-50/80 rounded-xl p-3">
                    <p className="text-[10px] font-semibold text-surface-400 uppercase mb-2">Características</p>
                    <div className="space-y-1">
                      {selected.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-sm text-surface-700">
                          <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> {f}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setEditMode(true)}
                    className="flex-1 bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-brand-200">
                    Editar Plan
                  </button>
                  <button onClick={() => handleDeactivate(selected)}
                    className="px-4 py-2.5 rounded-xl font-semibold text-sm bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-all">
                    Desactivar
                  </button>
                </div>
              </div>
            )}

            {/* EDIT / CREATE MODE */}
            {(editMode || showCreate) && (
              <div className="px-6 pb-6 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Nombre" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Professional" />
                  <FormField label="Slug" value={form.slug} onChange={v => setForm(f => ({ ...f, slug: v }))} placeholder="professional" disabled={!!selected && !showCreate} />
                </div>
                <FormField label="Descripción" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="Plan ideal para negocios en crecimiento" />
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Precio Mensual (USD)" value={String(form.price_monthly)} onChange={v => setForm(f => ({ ...f, price_monthly: +v || 0 }))} placeholder="49" type="number" />
                  <FormField label="Precio Anual (USD)" value={String(form.price_annual)} onChange={v => setForm(f => ({ ...f, price_annual: +v || 0 }))} placeholder="470" type="number" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Máx. Sucursales" value={String(form.max_locations)} onChange={v => setForm(f => ({ ...f, max_locations: +v || 1 }))} type="number" />
                  <FormField label="Máx. Usuarios" value={String(form.max_users)} onChange={v => setForm(f => ({ ...f, max_users: +v || 1 }))} type="number" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Máx. Clientes" value={String(form.max_customers)} onChange={v => setForm(f => ({ ...f, max_customers: +v || 100 }))} type="number" />
                  <FormField label="Días de Prueba" value={String(form.trial_days)} onChange={v => setForm(f => ({ ...f, trial_days: +v || 0 }))} type="number" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-surface-500 mb-1 block">Características del Plan</label>
                  <FeatureTagInput
                  features={form.features}
                  onChange={features => setForm(f => ({ ...f, features }))}
                />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_featured}
                    onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))}
                    className="w-4 h-4 rounded border-surface-300 text-brand-500 focus:ring-brand-400" />
                  <span className="text-sm text-surface-700 font-medium">Plan destacado</span>
                </label>
                <div className="flex gap-2 pt-3">
                  <button onClick={handleSave} disabled={saving || !form.name.trim() || (!showCreate && !form.slug.trim())}
                    className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:bg-surface-300 text-white py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-brand-200">
                    {saving ? 'Guardando...' : showCreate ? 'Crear Plan' : 'Guardar Cambios'}
                  </button>
                  <button onClick={closeModal}
                    className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-surface-100 text-surface-600 hover:bg-surface-200 transition-all">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-surface-800 font-medium">{value}</p>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, type = 'text', disabled }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-surface-500 mb-1 block">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} disabled={disabled}
        className="w-full px-3 py-2 rounded-xl border border-surface-200 bg-white/60 backdrop-blur-sm text-sm text-surface-800 placeholder:text-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed" />
    </div>
  );
}

function FeatureTagInput({ features, onChange }: { features: string[]; onChange: (f: string[]) => void }) {
  const [input, setInput] = useState('');
  const add = () => { const v = input.trim(); if (v && !features.includes(v)) { onChange([...features, v]); } setInput(''); };
  const remove = (i: number) => onChange(features.filter((_, j) => j !== i));
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {features.map((f, i) => (
          <span key={i} className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 text-xs font-medium px-2.5 py-1 rounded-lg border border-brand-200">
            {f}
            <button type="button" onClick={() => remove(i)} className="text-brand-400 hover:text-red-500 transition-colors">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </span>
        ))}
        {features.length === 0 && <span className="text-xs text-surface-300 italic">Sin características</span>}
      </div>
      <div className="flex gap-2">
        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Ej: Google Wallet, Push Notifications..."
          className="flex-1 px-3 py-2 rounded-xl border border-surface-200 bg-white/60 backdrop-blur-sm text-sm text-surface-800 placeholder:text-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-300 transition-all" />
        <button type="button" onClick={add} disabled={!input.trim()}
          className="px-3 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-surface-200 text-white disabled:text-surface-400 rounded-xl text-sm font-semibold transition-all">
          +
        </button>
      </div>
    </div>
  );
}
