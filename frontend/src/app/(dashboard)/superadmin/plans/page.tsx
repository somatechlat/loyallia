'use client';
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface PlanData {
  id: string; name: string; slug: string; description: string;
  price_monthly: number; price_annual: number;
  max_locations: number; max_users: number; max_customers: number; max_programs: number;
  max_notifications_month: number; max_transactions_month: number;
  max_whatsapp_day: number; max_emails_month: number; max_sms_day: number;
  max_wallet_pushes_month: number;
  max_automations: number; max_automation_executions_day: number;
  max_ai_queries_month: number; max_api_calls_day: number; max_exports_month: number;
  features: string[]; is_active: boolean; is_featured: boolean; trial_days: number; sort_order: number;
}

const PREDEFINED_FEATURES = [
  { id: 'whatsapp_campaigns', label: 'Campañas de WhatsApp', icon: '📱' },
  { id: 'sms_campaigns', label: 'Campañas de SMS', icon: '💬' },
  { id: 'email_campaigns', label: 'Campañas de Email', icon: '📧' },
  { id: 'wallet_campaigns', label: 'Apple/Google Wallet', icon: '💳' },
  { id: 'geo_fencing', label: 'Geo-Fencing', icon: '📍' },
  { id: 'automation', label: 'Automatización', icon: '⚡' },
  { id: 'advanced_analytics', label: 'Analítica Avanzada', icon: '📊' },
  { id: 'ai_assistant', label: 'Asistente IA', icon: '🤖' },
  { id: 'agent_api', label: 'Acceso API Agente', icon: '🔌' },
  { id: 'priority_support', label: 'Soporte Prioritario', icon: '⭐' },
  { id: 'custom_branding', label: 'Marca Personalizada', icon: '🎨' },
  { id: 'data_export', label: 'Exportación de Datos', icon: '📤' },
];

const emptyPlan = {
  name: '', slug: '', description: '',
  price_monthly: 0, price_annual: 0,
  max_locations: 1, max_users: 3, max_customers: 500, max_programs: 1,
  max_notifications_month: 1000, max_transactions_month: 5000,
  max_whatsapp_day: 0, max_emails_month: 0, max_sms_day: 0,
  max_wallet_pushes_month: 0,
  max_automations: 3, max_automation_executions_day: 100,
  max_ai_queries_month: 0, max_api_calls_day: 0, max_exports_month: 5,
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
      const { data } = await api.get('/api/v1/admin/plans/');
      setPlans(data);
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
      max_notifications_month: p.max_notifications_month || 1000,
      max_transactions_month: p.max_transactions_month || 5000,
      max_whatsapp_day: p.max_whatsapp_day || 0, max_emails_month: p.max_emails_month || 0,
      max_sms_day: p.max_sms_day || 0,
      max_wallet_pushes_month: p.max_wallet_pushes_month || 0,
      max_automations: p.max_automations || 3,
      max_automation_executions_day: p.max_automation_executions_day || 100,
      max_ai_queries_month: p.max_ai_queries_month || 0,
      max_api_calls_day: p.max_api_calls_day || 0,
      max_exports_month: p.max_exports_month || 5,
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
        await api.post('/api/v1/admin/plans/', body);
        toast.success('Plan creado exitosamente');
      } else if (selected) {
        await api.patch(`/api/v1/admin/plans/${selected.id}/`, body);
        toast.success('Plan actualizado');
      }
      closeModal();
      await fetchPlans();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async (p: PlanData) => {
    if (!confirm(`¿Desactivar el plan "${p.name}"?`)) return;
    try {
      await api.delete(`/api/v1/admin/plans/${p.id}/`);
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
          <h1 className="text-3xl font-black text-surface-900 dark:text-white tracking-tight">Planes de Suscripción</h1>
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
            <h3 className="text-xl font-black text-surface-900 dark:text-white group-hover:text-brand-600 transition-colors">{plan.name}</h3>
            <p className="text-sm text-surface-500 mt-1 mb-4 line-clamp-2">{plan.description || 'Sin descripción'}</p>
            <div className="mb-4">
              <span className="text-4xl font-black text-surface-900 dark:text-white">${plan.price_monthly}</span>
              <span className="text-surface-500 text-sm">/mes</span>
              <p className="text-xs text-surface-400 mt-0.5">o ${plan.price_annual}/año</p>
            </div>
            <div className="border-t border-surface-100 pt-4 space-y-2 flex-1">
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2">Incluye:</p>
              {(plan.features || []).slice(0, 5).map((f, i) => {
                const preset = PREDEFINED_FEATURES.find(p => p.id === f);
                const label = preset ? preset.label : f;
                return (
                  <div key={i} className="flex items-center gap-2 text-sm text-surface-700">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {label}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-surface-100 grid grid-cols-2 gap-2 text-xs text-surface-400">
              <p>{plan.max_locations} sucursales</p>
              <p>{plan.max_users} usuarios</p>
              <p>{plan.max_customers.toLocaleString()} clientes</p>
              <p>{plan.trial_days}d prueba</p>
              {plan.max_whatsapp_day > 0 && <p className="text-green-500">📱 {plan.max_whatsapp_day} WA/día</p>}
              {plan.max_emails_month > 0 && <p className="text-blue-500">📧 {plan.max_emails_month.toLocaleString()} emails/mes</p>}
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
                className="bg-surface-50 p-4 rounded-2xl border border-surface-200 dark:border-surface-700 cursor-pointer hover:bg-surface-100 transition-all opacity-60">
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
          <div className="relative w-full max-w-6xl bg-white/90 backdrop-blur-xl border border-white/30 rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col animate-fade-in"
            onClick={e => e.stopPropagation()}
            style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.15)' }}>

            <div className="h-1.5 bg-gradient-to-r from-brand-400 via-purple-400 to-indigo-500" />

            <div className="px-6 pt-5 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-surface-900 dark:text-white">
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
              <div className="px-6 pb-6 space-y-4 overflow-y-auto flex-1">
                <p className="text-sm text-surface-600">{selected.description || 'Sin descripción'}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface-50/80 rounded-xl p-3">
                    <p className="text-[10px] font-semibold text-surface-400 uppercase">Precio Mensual</p>
                    <p className="text-2xl font-black text-surface-900 dark:text-white">${selected.price_monthly}</p>
                  </div>
                  <div className="bg-surface-50/80 rounded-xl p-3">
                    <p className="text-[10px] font-semibold text-surface-400 uppercase">Precio Anual</p>
                    <p className="text-2xl font-black text-surface-900 dark:text-white">${selected.price_annual}</p>
                  </div>
                </div>
                {/* Resource Limits */}
                <div className="bg-surface-50/80 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-surface-400 uppercase mb-2">📦 Límites de Recursos</p>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <InfoRow label="Sucursales" value={String(selected.max_locations)} />
                    <InfoRow label="Usuarios" value={String(selected.max_users)} />
                    <InfoRow label="Clientes" value={selected.max_customers.toLocaleString()} />
                    <InfoRow label="Programas" value={String(selected.max_programs)} />
                    <InfoRow label="Automatizaciones" value={String(selected.max_automations)} />
                    <InfoRow label="Ejec. Autom./día" value={String(selected.max_automation_executions_day)} />
                    <InfoRow label="Notificaciones/mes" value={selected.max_notifications_month.toLocaleString()} />
                    <InfoRow label="Transacciones/mes" value={selected.max_transactions_month.toLocaleString()} />
                    <InfoRow label="Exportaciones/mes" value={String(selected.max_exports_month)} />
                  </div>
                </div>
                {/* Messaging */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-3 border border-green-200/50">
                  <p className="text-[10px] font-semibold text-surface-400 uppercase mb-2">📡 Canales de Mensajería</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div><p className="text-[10px] font-semibold text-green-600 uppercase">WhatsApp/día</p><p className="text-lg font-black text-surface-900">{selected.max_whatsapp_day > 0 ? selected.max_whatsapp_day : <span className="text-surface-300">Off</span>}</p></div>
                    <div><p className="text-[10px] font-semibold text-blue-600 uppercase">Emails/mes</p><p className="text-lg font-black text-surface-900">{selected.max_emails_month > 0 ? selected.max_emails_month.toLocaleString() : <span className="text-surface-300">Off</span>}</p></div>
                    <div><p className="text-[10px] font-semibold text-purple-600 uppercase">SMS/día</p><p className="text-lg font-black text-surface-900">{selected.max_sms_day > 0 ? selected.max_sms_day : <span className="text-surface-300">Off</span>}</p></div>
                    <div><p className="text-[10px] font-semibold text-indigo-600 uppercase">Wallet/mes</p><p className="text-lg font-black text-surface-900">{selected.max_wallet_pushes_month > 0 ? selected.max_wallet_pushes_month.toLocaleString() : <span className="text-surface-300">Off</span>}</p></div>
                  </div>
                </div>
                {/* AI & API */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-3 border border-purple-200/50">
                  <p className="text-[10px] font-semibold text-surface-400 uppercase mb-2">🤖 IA & API</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="text-[10px] font-semibold text-purple-600 uppercase">Consultas IA/mes</p><p className="text-lg font-black text-surface-900">{selected.max_ai_queries_month > 0 ? selected.max_ai_queries_month : <span className="text-surface-300">Off</span>}</p></div>
                    <div><p className="text-[10px] font-semibold text-indigo-600 uppercase">API calls/día</p><p className="text-lg font-black text-surface-900">{selected.max_api_calls_day > 0 ? selected.max_api_calls_day.toLocaleString() : <span className="text-surface-300">Off</span>}</p></div>
                  </div>
                </div>
                {/* Features */}
                {(selected.features || []).length > 0 && (
                  <div className="bg-surface-50/80 rounded-xl p-3">
                    <p className="text-[10px] font-semibold text-surface-400 uppercase mb-2">Características</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.features.map((f, i) => {
                        const preset = PREDEFINED_FEATURES.find(p => p.id === f);
                        return (
                          <span key={i} className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 text-xs font-medium px-2.5 py-1 rounded-lg border border-brand-200">
                            {preset?.icon} {preset?.label || f}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <InfoRow label="Días de Prueba" value={String(selected.trial_days)} />
                  <InfoRow label="Orden" value={String(selected.sort_order)} />
                </div>
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
              <div className="px-6 pb-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-3 gap-4">
                  {/* COLUMN 1: Info & Pricing */}
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-surface-600 uppercase tracking-wide">📋 Información</p>
                    <FormField label="Nombre" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Professional" />
                    <FormField label="Slug" value={form.slug} onChange={v => setForm(f => ({ ...f, slug: v }))} placeholder="professional" disabled={!!selected && !showCreate} />
                    <FormField label="Descripción" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="Plan ideal para negocios en crecimiento" />
                    <div className="grid grid-cols-2 gap-2">
                      <FormField label="Precio Mensual (USD)" value={String(form.price_monthly)} onChange={v => setForm(f => ({ ...f, price_monthly: +v || 0 }))} placeholder="49" type="number" />
                      <FormField label="Precio Anual (USD)" value={String(form.price_annual)} onChange={v => setForm(f => ({ ...f, price_annual: +v || 0 }))} placeholder="470" type="number" />
                    </div>

                    {/* Resource Limits */}
                    <p className="text-xs font-bold text-surface-600 uppercase tracking-wide pt-2">📦 Límites de Recursos</p>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField label="Sucursales" value={String(form.max_locations)} onChange={v => setForm(f => ({ ...f, max_locations: +v || 1 }))} type="number" />
                      <FormField label="Usuarios" value={String(form.max_users)} onChange={v => setForm(f => ({ ...f, max_users: +v || 1 }))} type="number" />
                      <FormField label="Clientes" value={String(form.max_customers)} onChange={v => setForm(f => ({ ...f, max_customers: +v || 100 }))} type="number" />
                      <FormField label="Programas" value={String(form.max_programs)} onChange={v => setForm(f => ({ ...f, max_programs: +v || 1 }))} type="number" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField label="Notificaciones/mes" value={String(form.max_notifications_month)} onChange={v => setForm(f => ({ ...f, max_notifications_month: +v || 0 }))} type="number" />
                      <FormField label="Transacciones/mes" value={String(form.max_transactions_month)} onChange={v => setForm(f => ({ ...f, max_transactions_month: +v || 0 }))} type="number" />
                    </div>
                  </div>

                  {/* COLUMN 2: Messaging & Rate Limits */}
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-surface-600 uppercase tracking-wide">📡 Canales de Mensajería</p>
                    {/* WhatsApp */}
                    <div className="bg-gradient-to-r from-green-50/80 to-emerald-50/80 rounded-xl p-3 border border-green-200/40 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.features.includes('whatsapp_campaigns')}
                          onChange={() => { const has = form.features.includes('whatsapp_campaigns'); setForm(f => ({ ...f, features: has ? f.features.filter(x => x !== 'whatsapp_campaigns') : [...f.features, 'whatsapp_campaigns'], max_whatsapp_day: has ? 0 : (f.max_whatsapp_day || 100) })); }}
                          className="w-4 h-4 rounded border-green-400 text-green-600 focus:ring-green-400" />
                        <span className="text-sm text-surface-700 font-semibold">📱 WhatsApp</span>
                      </label>
                      {form.features.includes('whatsapp_campaigns') && (
                        <div className="ml-6">
                          <FormField label="Máx. WhatsApp/día (máx: 200)" value={String(form.max_whatsapp_day)} onChange={v => setForm(f => ({ ...f, max_whatsapp_day: Math.min(+v || 0, 200) }))} type="number" />
                        </div>
                      )}
                    </div>
                    {/* Email */}
                    <div className="bg-gradient-to-r from-blue-50/80 to-sky-50/80 rounded-xl p-3 border border-blue-200/40 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.features.includes('email_campaigns')}
                          onChange={() => { const has = form.features.includes('email_campaigns'); setForm(f => ({ ...f, features: has ? f.features.filter(x => x !== 'email_campaigns') : [...f.features, 'email_campaigns'], max_emails_month: has ? 0 : (f.max_emails_month || 5000) })); }}
                          className="w-4 h-4 rounded border-blue-400 text-blue-600 focus:ring-blue-400" />
                        <span className="text-sm text-surface-700 font-semibold">📧 Email</span>
                      </label>
                      {form.features.includes('email_campaigns') && (
                        <div className="ml-6">
                          <FormField label="Máx. Emails/mes" value={String(form.max_emails_month)} onChange={v => setForm(f => ({ ...f, max_emails_month: +v || 0 }))} type="number" />
                        </div>
                      )}
                    </div>
                    {/* SMS */}
                    <div className="bg-gradient-to-r from-purple-50/80 to-violet-50/80 rounded-xl p-3 border border-purple-200/40 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.features.includes('sms_campaigns')}
                          onChange={() => { const has = form.features.includes('sms_campaigns'); setForm(f => ({ ...f, features: has ? f.features.filter(x => x !== 'sms_campaigns') : [...f.features, 'sms_campaigns'], max_sms_day: has ? 0 : (f.max_sms_day || 50) })); }}
                          className="w-4 h-4 rounded border-purple-400 text-purple-600 focus:ring-purple-400" />
                        <span className="text-sm text-surface-700 font-semibold">💬 SMS (Twilio)</span>
                      </label>
                      {form.features.includes('sms_campaigns') && (
                        <div className="ml-6">
                          <FormField label="Máx. SMS/día" value={String(form.max_sms_day)} onChange={v => setForm(f => ({ ...f, max_sms_day: +v || 0 }))} type="number" />
                        </div>
                      )}
                    </div>
                    {/* Wallet */}
                    <div className="bg-gradient-to-r from-indigo-50/80 to-slate-50/80 rounded-xl p-3 border border-indigo-200/40 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.features.includes('wallet_campaigns')}
                          onChange={() => { const has = form.features.includes('wallet_campaigns'); setForm(f => ({ ...f, features: has ? f.features.filter(x => x !== 'wallet_campaigns') : [...f.features, 'wallet_campaigns'], max_wallet_pushes_month: has ? 0 : (f.max_wallet_pushes_month || 5000) })); }}
                          className="w-4 h-4 rounded border-indigo-400 text-indigo-600 focus:ring-indigo-400" />
                        <span className="text-sm text-surface-700 font-semibold">💳 Wallet (Apple/Google)</span>
                      </label>
                      {form.features.includes('wallet_campaigns') && (
                        <div className="ml-6">
                          <FormField label="Máx. Wallet Pushes/mes" value={String(form.max_wallet_pushes_month)} onChange={v => setForm(f => ({ ...f, max_wallet_pushes_month: +v || 0 }))} type="number" />
                        </div>
                      )}
                    </div>

                    {/* AI & API Rate Limits */}
                    <p className="text-xs font-bold text-surface-600 uppercase tracking-wide pt-2">🤖 IA & API</p>
                    <div className="bg-gradient-to-r from-purple-50/80 to-indigo-50/80 rounded-xl p-3 border border-purple-200/40 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <FormField label="Consultas IA/mes" value={String(form.max_ai_queries_month)} onChange={v => setForm(f => ({ ...f, max_ai_queries_month: +v || 0 }))} type="number" />
                        <FormField label="API Calls/día" value={String(form.max_api_calls_day)} onChange={v => setForm(f => ({ ...f, max_api_calls_day: +v || 0 }))} type="number" />
                      </div>
                      <p className="text-[10px] text-surface-400">0 = deshabilitado. IA consume tokens LLM. API requiere plan Enterprise.</p>
                    </div>
                  </div>

                  {/* COLUMN 3: Features & Automation */}
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-surface-600 uppercase tracking-wide">⚡ Automatización</p>
                    <div className="bg-gradient-to-r from-amber-50/80 to-orange-50/80 rounded-xl p-3 border border-amber-200/40 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <FormField label="Máx. Automatizaciones" value={String(form.max_automations)} onChange={v => setForm(f => ({ ...f, max_automations: +v || 0 }))} type="number" />
                        <FormField label="Ejec./día" value={String(form.max_automation_executions_day)} onChange={v => setForm(f => ({ ...f, max_automation_executions_day: +v || 0 }))} type="number" />
                      </div>
                      <FormField label="Exportaciones/mes" value={String(form.max_exports_month)} onChange={v => setForm(f => ({ ...f, max_exports_month: +v || 0 }))} type="number" />
                    </div>

                    <p className="text-xs font-bold text-surface-600 uppercase tracking-wide pt-2">🏷️ Características del Plan</p>
                    <FeatureTagInput features={form.features} onChange={features => setForm(f => ({ ...f, features }))} />

                    <div className="space-y-2 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.is_featured}
                          onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))}
                          className="w-4 h-4 rounded border-surface-300 text-brand-500 focus:ring-brand-400" />
                        <span className="text-sm text-surface-700 font-medium">⭐ Plan destacado</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <FormField label="Días de Prueba" value={String(form.trial_days)} onChange={v => setForm(f => ({ ...f, trial_days: +v || 0 }))} type="number" />
                        <FormField label="Orden" value={String(form.sort_order)} onChange={v => setForm(f => ({ ...f, sort_order: +v || 0 }))} type="number" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 mt-4 border-t border-surface-200">
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
      <p className="text-sm text-surface-800 dark:text-surface-100 font-medium">{value}</p>
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
        className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white/60 backdrop-blur-sm text-sm text-surface-800 dark:text-surface-100 placeholder:text-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed" />
    </div>
  );
}

function FeatureTagInput({ features, onChange }: { features: string[]; onChange: (f: string[]) => void }) {
  const [input, setInput] = useState('');
  
  const add = () => { 
    if (input && !features.includes(input)) { 
      onChange([...features, input]); 
    } 
    setInput(''); 
  };
  
  const remove = (i: number) => onChange(features.filter((_, j) => j !== i));
  
  const availableFeatures = PREDEFINED_FEATURES.filter(f => !features.includes(f.id));

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {features.map((f, i) => {
          const preset = PREDEFINED_FEATURES.find(p => p.id === f);
          const label = preset ? preset.label : f;
          return (
            <span key={i} className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 text-xs font-medium px-2.5 py-1 rounded-lg border border-brand-200">
              {label}
              <button type="button" onClick={() => remove(i)} className="text-brand-400 hover:text-red-500 transition-colors">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </span>
          );
        })}
        {features.length === 0 && <span className="text-xs text-surface-300 italic">Sin características adicionales</span>}
      </div>
      <div className="flex gap-2">
        <select 
          value={input} 
          onChange={e => setInput(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white/60 backdrop-blur-sm text-sm text-surface-800 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-300 transition-all"
        >
          <option value="">Seleccionar característica...</option>
          {availableFeatures.map(f => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
        <button type="button" onClick={add} disabled={!input}
          className="px-3 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-surface-200 text-white disabled:text-surface-400 rounded-xl text-sm font-semibold transition-all">
          Agregar
        </button>
      </div>
    </div>
  );
}
