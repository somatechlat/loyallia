'use client';
import { useEffect, useState, useCallback } from 'react';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import centralizedApi from '@/lib/api';

const LocationMap = dynamic(() => import('@/components/maps/LocationMap'), { ssr: false });
const LocationPicker = dynamic(() => import('@/components/maps/LocationPicker'), { ssr: false });

/** Admin API helper — uses centralized axios instance (auto-attaches auth token) */
const api = (path: string, opts?: { method?: string; body?: string }) => {
  const url = `/api/v1/admin${path}`;
  const method = (opts?.method || 'GET').toLowerCase();
  const body = opts?.body ? JSON.parse(opts.body) : undefined;
  return centralizedApi({ url, method, data: body });
};

const INDUSTRIES = [
  { value: 'food_beverage', label: 'Alimentos y Bebidas' },
  { value: 'retail', label: 'Comercio Minorista' },
  { value: 'fashion', label: 'Moda y Textiles' },
  { value: 'health_beauty', label: 'Salud y Belleza' },
  { value: 'entertainment', label: 'Entretenimiento' },
  { value: 'services', label: 'Servicios Profesionales' },
  { value: 'education', label: 'Educación' },
  { value: 'automotive', label: 'Automotriz' },
  { value: 'hospitality', label: 'Hotelería y Turismo' },
  { value: 'technology', label: 'Tecnología' },
  { value: 'other', label: 'Otro' },
];
const PROVINCES = [
  'azuay','bolivar','canar','carchi','chimborazo','cotopaxi','el_oro','esmeraldas',
  'galapagos','guayas','imbabura','loja','los_rios','manabi','morona_santiago','napo',
  'orellana','pastaza','pichincha','santa_elena','santo_domingo','sucumbios','tungurahua','zamora_chinchipe',
];

type LocEntry = { name: string; address: string; city: string; latitude: number | null; longitude: number | null; is_primary: boolean; };

interface Tenant {
  id: string;
  name: string;
  slug?: string;
  legal_name?: string;
  ruc?: string;
  cedula?: string;
  entity_type?: string;
  industry?: string;
  province?: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  plan: string;
  is_active: boolean;
  user_count: number;
  location_count: number;
  trial_days_remaining?: number;
  created_at: string;
}

interface Plan {
  slug: string;
  name: string;
  price_monthly: number;
  trial_days: number;
  is_active: boolean;
}

interface CreationResult {
  tenant_id?: string;
  owner_email?: string;
  temp_password?: string;
}

interface TenantLocation {
  id: string;
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  latitude?: number | null;
  longitude?: number | null;
  is_active?: boolean;
  is_primary?: boolean;
}

// Flat SVG icons (no emojis)
const IC = {
  info: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  pin: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  bolt: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  edit: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
  plus: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
  x: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
  pause: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  play: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  key: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>,
  star: <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>,
  check: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  bldg: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  user: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  arrow: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>,
};

const WIZARD_STEPS = [{ n: 1, l: 'Plan' }, { n: 2, l: 'Tipo & Datos' }, { n: 3, l: 'Propietario' }, { n: 4, l: 'Sucursales' }];
const formatProvince = (p: string) => p.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function SuperAdminTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  // Wizard
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [creationResult, setCreationResult] = useState<CreationResult | null>(null);
  const [entityType, setEntityType] = useState<'natural'|'juridica'>('juridica');
  const [company, setCompany] = useState({ name: '', legal_name: '', ruc: '', cedula: '', industry: 'food_beverage', province: 'pichincha', city: '', address: '', phone: '', email: '', website: '' });
  const [owner, setOwner] = useState({ owner_email: '', owner_first_name: '', owner_last_name: '', owner_cedula: '' });
  const [wLocs, setWLocs] = useState<LocEntry[]>([{ name: 'Sede Principal', address: '', city: '', latitude: null, longitude: null, is_primary: true }]);
  const [planSlug, setPlanSlug] = useState('professional');
  const [billingCycle, setBillingCycle] = useState('monthly');
  // Detail modal
  const [dt, setDt] = useState<Tenant | null>(null);
  const [dtTab, setDtTab] = useState<'info'|'locs'|'actions'>('info');
  const [dtEdit, setDtEdit] = useState(false);
  const [dtForm, setDtForm] = useState<Partial<Tenant>>({});
  const [dtSaving, setDtSaving] = useState(false);
  const [dtLocs, setDtLocs] = useState<TenantLocation[]>([]);
  const [dtLocsLoading, setDtLocsLoading] = useState(false);
  const [editLoc, setEditLoc] = useState<TenantLocation | 'new' | null>(null);
  const [locForm, setLocForm] = useState<Partial<TenantLocation>>({});
  const [impersonationPin, setImpersonationPin] = useState('');
  const [impersonationJustification, setImpersonationJustification] = useState('');
  const [impersonating, setImpersonating] = useState(false);
  const [deleteJustification, setDeleteJustification] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmPhrase, setDeleteConfirmPhrase] = useState('');
  const [deletingTenant, setDeletingTenant] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [tRes, pRes] = await Promise.all([api('/tenants/'), api('/plans/')]);
      setTenants(tRes.data);
      setPlans(pRes.data);
    } catch { /* */ }
    setLoading(false);
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  // Wizard helpers
  const openWizard = () => {
    setStep(1); setCreationResult(null); setEntityType('juridica');
    setCompany({ name: '', legal_name: '', ruc: '', cedula: '', industry: 'food_beverage', province: 'pichincha', city: '', address: '', phone: '', email: '', website: '' });
    setOwner({ owner_email: '', owner_first_name: '', owner_last_name: '', owner_cedula: '' });
    setWLocs([{ name: 'Sede Principal', address: '', city: '', latitude: null, longitude: null, is_primary: true }]);
    setPlanSlug('professional'); setBillingCycle('monthly'); setWizardOpen(true);
  };
  const addWLoc = () => setWLocs([...wLocs, { name: '', address: '', city: '', latitude: null, longitude: null, is_primary: false }]);
  const rmWLoc = (i: number) => setWLocs(wLocs.filter((_, j) => j !== i));
  const upWLoc = (i: number, f: keyof LocEntry, v: LocEntry[keyof LocEntry]) => {
    const u = [...wLocs];
    const current = u[i];
    if (!current) return;
    // Validate coordinates before accepting
    if (f === 'latitude' || f === 'longitude') {
      const num = v === null || v === '' ? null : Number(v);
      if (num !== null && (Number.isNaN(num) || !Number.isFinite(num))) {
        toast.error(`${f === 'latitude' ? 'Latitud' : 'Longitud'} debe ser un número válido`);
        return;
      }
      if (f === 'latitude' && num !== null && (num < -90 || num > 90)) {
        toast.error('La latitud debe estar entre -90 y 90');
        return;
      }
      if (f === 'longitude' && num !== null && (num < -180 || num > 180)) {
        toast.error('La longitud debe estar entre -180 y 180');
        return;
      }
      u[i] = { ...current, [f]: num };
    } else {
      u[i] = { ...current, [f]: v };
    }
    setWLocs(u);
  };

  const validateForm = (): string | null => {
    if (!company.name.trim()) return 'El nombre del negocio es obligatorio';
    if (!company.legal_name.trim()) return 'La razón social es obligatoria';
    if (entityType === 'juridica' && !company.ruc.trim()) return 'El RUC es obligatorio para personas jurídicas';
    if (entityType === 'natural' && !company.cedula.trim()) return 'La cédula es obligatoria para personas naturales';
    if (!owner.owner_email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner.owner_email)) return 'El email del propietario no es válido';
    if (!owner.owner_first_name.trim()) return 'El nombre del propietario es obligatorio';
    if (!owner.owner_last_name.trim()) return 'El apellido del propietario es obligatorio';
    const validLocs = wLocs.filter(l => l.name.trim());
    if (validLocs.length === 0) return 'Debe registrar al menos una sucursal con nombre';
    for (const loc of validLocs) {
      if (loc.latitude !== null && (loc.latitude < -90 || loc.latitude > 90)) return `Latitud inválida en "${loc.name}"`;
      if (loc.longitude !== null && (loc.longitude < -180 || loc.longitude > 180)) return `Longitud inválida en "${loc.name}"`;
    }
    return null;
  };

  const handleSubmit = async () => {
    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }
    const tid = toast.loading('Registrando negocio...');
    try {
      const payload = { ...company, ...owner, entity_type: entityType, locations: wLocs.filter(l => l.name.trim()), plan_slug: planSlug, billing_cycle: billingCycle };
      const res = await api('/tenants/', { method: 'POST', body: JSON.stringify(payload) });
      const data = res.data;
      if (!res.data) throw new Error('Error al registrar');
      toast.success('Negocio registrado', { id: tid });
      setCreationResult({ ...data, owner_email: owner.owner_email }); setWizardOpen(false); fetchData();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error al registrar'); }
  };

  // Detail modal
  const openDetail = async (t: Tenant) => {
    setDt(t); setDtTab('info'); setDtEdit(false); setEditLoc(null);
    setDtForm({ name: t.name, legal_name: t.legal_name||'', ruc: t.ruc||'', industry: t.industry||'other', province: t.province||'', city: t.city||'', phone: t.phone||'', email: t.email||'' });
    // Fetch locations for this tenant
    setDtLocs([]); setDtLocsLoading(true);
    try {
      const { data } = await api(`/tenants/${t.id}/locations/`);
      setDtLocs(Array.isArray(data) ? data : []);
    } catch {
      /* silently handle error — empty locations state shown in UI */
      setDtLocs([]);
    }
    setDtLocsLoading(false);
  };
  const closeDetail = () => {
    setDt(null);
    setDtEdit(false);
    setEditLoc(null);
    setImpersonationPin('');
    setImpersonationJustification('');
    setImpersonating(false);
    setDeleteJustification('');
    setDeleteConfirmOpen(false);
    setDeleteConfirmPhrase('');
    setDeletingTenant(false);
  };
  const saveDetail = async () => {
    if (!dt) return;
    setDtSaving(true);
    try { await api(`/tenants/${dt.id}/`, { method: 'PATCH', body: JSON.stringify(dtForm) }); toast.success('Negocio actualizado'); closeDetail(); fetchData(); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); } finally { setDtSaving(false); }
  };
  const doSuspend = async () => { if (!dt || !confirm(`¿Suspender "${dt.name}"?`)) return; await api(`/tenants/${dt.id}/suspend/`, { method: 'POST' }); toast.success('Suspendido'); closeDetail(); fetchData(); };
  const doReactivate = async () => { if (!dt) return; await api(`/tenants/${dt.id}/reactivate/`, { method: 'POST' }); toast.success('Reactivado'); closeDetail(); fetchData(); };
  const openDeleteConfirm = () => {
    if (!dt) return;
    if (deleteJustification.trim().length < 10) {
      toast.error('Ingresa una justificación de al menos 10 caracteres');
      return;
    }
    setDeleteConfirmPhrase('');
    setDeleteConfirmOpen(true);
  };
  const doDelete = async () => {
    if (!dt) return;
    const justification = deleteJustification.trim();
    if (justification.length < 10) {
      toast.error('Ingresa una justificación de al menos 10 caracteres');
      return;
    }
    if (deleteConfirmPhrase !== 'ELIMINAR') {
      toast.error('Frase de confirmación incorrecta. No se eliminó el negocio.');
      return;
    }
    const tenantName = dt.name;
    setDeletingTenant(true);
    try {
      await api(`/tenants/${dt.id}/`, { method: 'DELETE', body: JSON.stringify({ justification }) });
      toast.success(`"${tenantName}" fue eliminado permanentemente`);
      closeDetail();
      fetchData();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'No se pudo eliminar el negocio';
      toast.error(message);
    } finally {
      setDeletingTenant(false);
    }
  };
  const doImpersonate = async () => {
    if (!dt) return;
    const ownerPin = impersonationPin.replace(/\D/g, '');
    const justification = impersonationJustification.trim();
    if (ownerPin.length !== 6) {
      toast.error('Ingresa el PIN de 6 dígitos del propietario');
      return;
    }
    if (justification.length < 10) {
      toast.error('Ingresa una justificación de soporte');
      return;
    }
    if (!confirm(`¿Impersonar a "${dt.name}"? Podrás volver al panel de admin.`)) return;

    setImpersonating(true);
    try {
      const currentToken = Cookies.get('access_token') || '';
      const { data: d } = await api(`/tenants/${dt.id}/impersonate/`, {
        method: 'POST',
        body: JSON.stringify({ owner_pin: ownerPin, justification }),
      });
      if (d.access_token) {
        sessionStorage.setItem('superadmin_token', currentToken);
        sessionStorage.setItem('impersonation_started_at', String(Date.now()));
        const isProd = process.env.NODE_ENV === 'production';
        Cookies.set('access_token', d.access_token, { expires: 1/24, secure: isProd, sameSite: 'strict' });
        window.location.href = '/';
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al impersonar';
      toast.error(msg);
      sessionStorage.removeItem('superadmin_token');
      sessionStorage.removeItem('impersonation_started_at');
    } finally {
      setImpersonating(false);
    }
  };
  const openLocEdit = (loc: TenantLocation) => { setEditLoc(loc); setLocForm({ name: loc.name, address: loc.address||'', city: loc.city||'', phone: '', latitude: loc.latitude, longitude: loc.longitude, is_active: loc.is_active, is_primary: loc.is_primary }); };
  const openLocNew = () => { setEditLoc('new'); setLocForm({ name: '', address: '', city: '', phone: '', latitude: null, longitude: null, is_active: true, is_primary: false }); };
  const saveLoc = async () => {
    if (!dt) return;
    try {
      if (editLoc === 'new') {
        await api(`/tenants/${dt.id}/locations/`, { method: 'POST', body: JSON.stringify(locForm) });
        toast.success('Sucursal creada');
      }
      setEditLoc(null);
      const { data } = await api(`/tenants/${dt.id}/locations/`);
      setDtLocs(data);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
  };

  const selPlan = plans.find((p) => p.slug === planSlug);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-surface-900 dark:text-white tracking-tight">Negocios</h1>
          <p className="text-surface-500 mt-1">{tenants.length} clientes corporativos registrados</p>
        </div>
        <button id="btn-wizard-open" onClick={openWizard} className="btn-primary flex items-center gap-2">
          {IC.plus} Registrar Negocio
        </button>
      </div>

      {/* Creation Result */}
      {creationResult && (
        <div className="bg-brand-50 border border-brand-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-brand-900 mb-2">Negocio creado correctamente</h3>
          <div className="bg-white dark:bg-surface-900 rounded-xl p-4 border border-brand-100 font-mono text-sm space-y-2">
            <p><span className="font-bold text-surface-500">Tenant ID:</span> {creationResult.tenant_id}</p>
            <p><span className="font-bold text-surface-500">Email Owner:</span> {creationResult.owner_email}</p>
            <p><span className="font-bold text-surface-500">Password Temporal:</span> <span className="bg-brand-100 text-brand-800 px-2 py-0.5 rounded">{creationResult.temp_password}</span></p>
          </div>
          <button onClick={() => setCreationResult(null)} className="mt-3 text-sm text-brand-600 hover:text-brand-800 font-medium">Cerrar</button>
        </div>
      )}

      {/* Wizard */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setWizardOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-3xl bg-white/90 backdrop-blur-xl border border-white/30 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-fade-in" onClick={e => e.stopPropagation()} style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.15)' }}>
            <div className="h-1.5 bg-gradient-to-r from-brand-400 via-purple-400 to-brand-600" />
            <div className="p-6 border-b border-surface-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-surface-900 dark:text-white">Registrar Nuevo Negocio</h2>
                <button onClick={() => setWizardOpen(false)} className="w-8 h-8 rounded-xl bg-surface-100 hover:bg-surface-200 flex items-center justify-center">{IC.x}</button>
              </div>
              <div className="flex gap-2">{WIZARD_STEPS.map(s => (<div key={s.n} className="flex-1"><div className={`h-1.5 rounded-full transition-all ${step >= s.n ? 'bg-brand-500' : 'bg-surface-200'}`} /><p className={`text-xs mt-1 ${step >= s.n ? 'text-brand-600 font-semibold' : 'text-surface-400'}`}>{s.n}. {s.l}</p></div>))}</div>
            </div>
            <div className="p-6">
              {/* STEP 1: Plan */}
              {step === 1 && (<div className="space-y-6"><h3 className="font-bold text-surface-800 dark:text-surface-100 text-lg">Plan y Facturación</h3>
                <div className="grid grid-cols-3 gap-3">{plans.filter((p) => p.is_active).map((plan) => (<button key={plan.slug} onClick={() => setPlanSlug(plan.slug)} className={`text-left p-4 rounded-xl border-2 transition-all ${planSlug === plan.slug ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100' : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'}`}><p className="font-bold text-surface-900 dark:text-white text-sm">{plan.name}</p><p className="text-2xl font-black text-surface-900 dark:text-white mt-1">${plan.price_monthly}<span className="text-xs text-surface-400">/mes</span></p><p className="text-xs text-surface-500 mt-1">{plan.trial_days} días gratis</p></button>))}</div>
                <div><label className="label">Ciclo de Facturación</label><div className="flex gap-3"><button onClick={() => setBillingCycle('monthly')} className={`px-4 py-2 rounded-xl text-sm font-medium border-2 ${billingCycle === 'monthly' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-surface-200 dark:border-surface-700'}`}>Mensual</button><button onClick={() => setBillingCycle('annual')} className={`px-4 py-2 rounded-xl text-sm font-medium border-2 ${billingCycle === 'annual' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-surface-200 dark:border-surface-700'}`}>Anual (20% desc.)</button></div></div>
              </div>)}
              {/* STEP 2: Entity Type + Company */}
              {step === 2 && (<div className="space-y-5">
                <div>
                  <h3 className="font-bold text-surface-800 dark:text-surface-100 text-lg mb-3">Tipo de Entidad</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button id="entity-juridica" onClick={() => setEntityType('juridica')} className={`p-4 rounded-xl border-2 text-left transition-all ${entityType === 'juridica' ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100' : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'}`}>
                      <div className="flex items-center gap-2 mb-1">{IC.bldg}<span className="font-bold text-surface-900 dark:text-white">Persona Jurídica</span></div>
                      <p className="text-xs text-surface-500">Empresa, sociedad o compañía con RUC</p>
                    </button>
                    <button id="entity-natural" onClick={() => setEntityType('natural')} className={`p-4 rounded-xl border-2 text-left transition-all ${entityType === 'natural' ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100' : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'}`}>
                      <div className="flex items-center gap-2 mb-1">{IC.user}<span className="font-bold text-surface-900 dark:text-white">Persona Natural</span></div>
                      <p className="text-xs text-surface-500">Emprendedor individual con cédula</p>
                    </button>
                  </div>
                </div>
                <h3 className="font-bold text-surface-800 dark:text-surface-100 text-lg">Datos del Negocio</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Nombre Comercial *</label><input id="wiz-name" required className="input" placeholder={entityType === 'natural' ? 'María López — Pastelería' : 'Sweet & Coffee'} value={company.name} onChange={e => setCompany({...company, name: e.target.value})} /></div>
                  {entityType === 'juridica' ? (
                    <div><label className="label">Razón Social</label><input id="wiz-legal" className="input" placeholder="SWEETCOFFEE S.A." value={company.legal_name} onChange={e => setCompany({...company, legal_name: e.target.value})} /></div>
                  ) : (
                    <div><label className="label">Nombre Completo</label><input id="wiz-legal" className="input" placeholder="María Fernanda López García" value={company.legal_name} onChange={e => setCompany({...company, legal_name: e.target.value})} /></div>
                  )}
                  {entityType === 'juridica' ? (
                    <div><label className="label">RUC (13 dígitos)</label><input id="wiz-ruc" className="input font-mono" maxLength={13} placeholder="0992339324001" value={company.ruc} onChange={e => setCompany({...company, ruc: e.target.value.replace(/\D/g, '')})} />{company.ruc && company.ruc.length !== 13 && <p className="text-xs text-red-500 mt-1">El RUC debe tener 13 dígitos</p>}</div>
                  ) : (
                    <div><label className="label">Cédula (10 dígitos)</label><input id="wiz-cedula" className="input font-mono" maxLength={10} placeholder="1712345678" value={company.cedula} onChange={e => setCompany({...company, cedula: e.target.value.replace(/\D/g, '')})} />{company.cedula && company.cedula.length !== 10 && <p className="text-xs text-red-500 mt-1">La cédula debe tener 10 dígitos</p>}</div>
                  )}
                  <div><label className="label">Industria</label><select id="wiz-industry" className="input" value={company.industry} onChange={e => setCompany({...company, industry: e.target.value})}>{INDUSTRIES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}</select></div>
                  <div><label className="label">Provincia</label><select className="input" value={company.province} onChange={e => setCompany({...company, province: e.target.value})}>{PROVINCES.map(p => <option key={p} value={p}>{formatProvince(p)}</option>)}</select></div>
                  <div><label className="label">Ciudad</label><input className="input" placeholder="Quito" value={company.city} onChange={e => setCompany({...company, city: e.target.value})} /></div>
                  <div className="col-span-2"><label className="label">Dirección</label><input className="input" placeholder="Av. 9 de Octubre y Malecón" value={company.address} onChange={e => setCompany({...company, address: e.target.value})} /></div>
                  <div><label className="label">Teléfono</label><input className="input" placeholder="+593 4 268 8000" value={company.phone} onChange={e => setCompany({...company, phone: e.target.value})} /></div>
                  <div><label className="label">Email Corporativo</label><input type="email" className="input" placeholder="info@empresa.com.ec" value={company.email} onChange={e => setCompany({...company, email: e.target.value})} /></div>
                </div>
              </div>)}
              {/* STEP 3: Owner */}
              {step === 3 && (<div className="space-y-4"><h3 className="font-bold text-surface-800 dark:text-surface-100 text-lg">Propietario / Administrador</h3><p className="text-sm text-surface-500">Esta persona será el administrador principal (OWNER) del negocio.</p><div className="grid grid-cols-2 gap-4">
                <div><label className="label">Nombre *</label><input id="wiz-owner-fn" required className="input" placeholder="Juan" value={owner.owner_first_name} onChange={e => setOwner({...owner, owner_first_name: e.target.value})} /></div>
                <div><label className="label">Apellido *</label><input id="wiz-owner-ln" required className="input" placeholder="Pérez" value={owner.owner_last_name} onChange={e => setOwner({...owner, owner_last_name: e.target.value})} /></div>
                <div className="col-span-2"><label className="label">Email *</label><input id="wiz-owner-email" required type="email" className="input" placeholder="gerencia@empresa.com.ec" value={owner.owner_email} onChange={e => setOwner({...owner, owner_email: e.target.value})} /></div>
                <div><label className="label">Cédula del propietario</label><input className="input font-mono" maxLength={10} placeholder="1712345678" value={owner.owner_cedula} onChange={e => setOwner({...owner, owner_cedula: e.target.value.replace(/\D/g, '')})} /></div>
              </div><div className="bg-surface-50 rounded-xl p-4 border border-surface-100 mt-4"><p className="text-xs text-surface-500">Se generará una contraseña temporal automáticamente.</p></div></div>)}
              {/* STEP 4: Locations */}
              {step === 4 && (<div className="space-y-4"><div className="flex justify-between items-center"><div><h3 className="font-bold text-surface-800 dark:text-surface-100 text-lg">Sucursales</h3><p className="text-sm text-surface-500">Registra las tiendas/locales del negocio.</p></div><button onClick={addWLoc} className="text-sm text-brand-600 hover:text-brand-800 font-semibold flex items-center gap-1">{IC.plus} Agregar</button></div>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">{wLocs.map((loc, idx) => (<div key={idx} className="bg-surface-50/80 backdrop-blur-sm rounded-xl p-4 border border-surface-200 dark:border-surface-700/50 space-y-3"><div className="flex justify-between items-center"><span className="text-xs font-semibold text-surface-500">Sucursal {idx+1} {loc.is_primary && '(Principal)'}</span>{idx > 0 && <button onClick={() => rmWLoc(idx)} className="text-xs text-red-500 hover:text-red-700">Eliminar</button>}</div><div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-surface-600 mb-1 block">Nombre *</label><input className="input text-sm" placeholder="Mall del Sol" value={loc.name} onChange={e => upWLoc(idx, 'name', e.target.value)} /></div>
                  <div><label className="text-xs font-medium text-surface-600 mb-1 block">Ciudad</label><input className="input text-sm" placeholder="Guayaquil" value={loc.city} onChange={e => upWLoc(idx, 'city', e.target.value)} /></div>
                  <div className="col-span-2"><label className="text-xs font-medium text-surface-600 mb-1 block">Dirección</label><input className="input text-sm" value={loc.address} onChange={e => upWLoc(idx, 'address', e.target.value)} /></div>
                  <div className="col-span-2"><label className="text-xs font-semibold text-surface-500 mb-1 block">Ubicación en el Mapa</label><LocationPicker lat={loc.latitude ?? null} lng={loc.longitude ?? null} onChange={(lat, lng, addr) => { upWLoc(idx, 'latitude', lat); upWLoc(idx, 'longitude', lng); if (addr && !loc.address) upWLoc(idx, 'address', addr.split(',').slice(0, 3).join(',')); }} /></div>
                  <div className="col-span-2 grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-surface-600 mb-1 block">Latitud (manual)</label><input type="number" step="0.000001" className="input text-sm font-mono" placeholder="-2.1537" value={loc.latitude ?? ''} onChange={e => upWLoc(idx, 'latitude', e.target.value ? +e.target.value : null)} /></div>
                    <div><label className="text-xs font-medium text-surface-600 mb-1 block">Longitud (manual)</label><input type="number" step="0.000001" className="input text-sm font-mono" placeholder="-79.8965" value={loc.longitude ?? ''} onChange={e => upWLoc(idx, 'longitude', e.target.value ? +e.target.value : null)} /></div>
                  </div>
                </div></div>))}</div>
                <div className="bg-surface-50/80 backdrop-blur-sm rounded-xl p-5 border border-surface-200 dark:border-surface-700/50 space-y-2 text-sm mt-4"><h4 className="font-bold text-surface-900 dark:text-white mb-3">Resumen</h4><div className="grid grid-cols-2 gap-y-2"><span className="text-surface-500">Tipo:</span><span className="font-medium">{entityType === 'natural' ? 'Persona Natural' : 'Persona Jurídica'}</span><span className="text-surface-500">Empresa:</span><span className="font-medium">{company.name||'—'}</span><span className="text-surface-500">{entityType === 'juridica' ? 'RUC:' : 'Cédula:'}</span><span className="font-mono">{entityType === 'juridica' ? company.ruc||'—' : company.cedula||'—'}</span><span className="text-surface-500">Propietario:</span><span>{owner.owner_first_name} {owner.owner_last_name}</span><span className="text-surface-500">Email:</span><span>{owner.owner_email}</span><span className="text-surface-500">Sucursales:</span><span>{wLocs.filter(l => l.name.trim()).length}</span><span className="text-surface-500">Plan:</span><span className="font-semibold text-brand-600">{selPlan?.name || planSlug}</span></div></div>
              </div>)}
            </div>
            <div className="px-6 py-4 border-t border-surface-100 flex justify-between">
              <button onClick={() => step > 1 ? setStep(step-1) : setWizardOpen(false)} className="px-4 py-2 text-surface-600 hover:text-surface-900 dark:text-white font-medium">{step === 1 ? 'Cancelar' : 'Anterior'}</button>
              {step < 4 ? <button id="wiz-next" onClick={() => setStep(step+1)} className="btn-primary" disabled={step === 2 && !company.name.trim()}>Siguiente</button> : <button id="wiz-submit" onClick={handleSubmit} className="btn-primary">Registrar Negocio</button>}
            </div>
          </div>
        </div>
      )}

      {/* Tenant table */}
      <div className="bg-white dark:bg-surface-900 shadow-sm border border-surface-200 dark:border-surface-700 rounded-2xl overflow-hidden">
        {loading ? <div className="p-12 flex justify-center"><div className="spinner w-8 h-8" /></div> : (
          <table className="w-full text-left border-collapse">
            <thead><tr className="bg-surface-50 border-b border-surface-200 dark:border-surface-700 text-xs font-medium text-surface-500 uppercase tracking-wide">
              <th className="px-5 py-3">Negocio</th><th className="px-5 py-3">RUC / Cédula</th><th className="px-5 py-3">Ciudad</th><th className="px-5 py-3">Plan</th><th className="px-5 py-3 text-center">Usuarios</th><th className="px-5 py-3 text-center">Sucursales</th><th className="px-5 py-3">Estado</th><th className="px-5 py-3"></th>
            </tr></thead>
            <tbody className="divide-y divide-surface-100 text-sm text-surface-900 dark:text-white">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-surface-50 transition-colors cursor-pointer" onClick={() => openDetail(t)}>
                  <td className="px-5 py-3"><p className="font-semibold">{t.name}</p>{t.legal_name && <p className="text-xs text-surface-400 truncate max-w-[180px]">{t.legal_name}</p>}</td>
                  <td className="px-5 py-3 font-mono text-xs">{t.ruc || t.cedula || '—'}</td>
                  <td className="px-5 py-3">{t.city||'—'}</td>
                  <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${t.plan==='full'?'bg-brand-100 text-brand-700':t.plan==='trial'?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700'}`}>{t.plan.toUpperCase()}</span></td>
                  <td className="px-5 py-3 text-center">{t.user_count}</td>
                  <td className="px-5 py-3 text-center">{t.location_count}</td>
                  <td className="px-5 py-3"><span className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${t.is_active?'bg-green-500':'bg-red-500'}`} />{t.is_active?'Activo':'Suspendido'}</span></td>
                  <td className="px-5 py-3 text-brand-500">{IC.arrow}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail modal */}
      {dt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeDetail}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-2xl bg-white/85 backdrop-blur-xl border border-white/30 rounded-3xl shadow-2xl max-h-[90vh] flex flex-col animate-fade-in" onClick={e => e.stopPropagation()} style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.18)' }}>
            <div className="h-1.5 bg-gradient-to-r from-brand-400 via-emerald-400 to-purple-500 flex-shrink-0" />
            <div className="px-6 pt-5 pb-3 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-xl font-black text-surface-900 dark:text-white">{dt.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`w-2 h-2 rounded-full ${dt.is_active?'bg-green-500':'bg-red-400'}`} />
                  <span className="text-xs text-surface-400">{dt.is_active?'Activo':'Suspendido'}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${dt.plan==='full'?'bg-brand-100 text-brand-700':dt.plan==='trial'?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700'}`}>{dt.plan.toUpperCase()}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-surface-100 text-surface-600">{dt.entity_type === 'natural' ? 'Persona Natural' : 'Jurídica'}</span>
                </div>
              </div>
              <button onClick={closeDetail} className="w-8 h-8 rounded-xl bg-surface-100 hover:bg-surface-200 flex items-center justify-center">{IC.x}</button>
            </div>
            {/* Tabs */}
            <div className="px-6 flex gap-1 border-b border-surface-200 dark:border-surface-700/50 flex-shrink-0">
              {([['info', IC.info, 'Información'], ['locs', IC.pin, 'Sucursales'], ['actions', IC.bolt, 'Acciones']] as const).map(([key, icon, label]) => (
                <button key={key} onClick={() => { setDtTab(key); setDtEdit(false); setEditLoc(null); }}
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${dtTab===key?'border-brand-500 text-brand-600':'border-transparent text-surface-400 hover:text-surface-600'}`}>{icon}{label}</button>
              ))}
            </div>
            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* INFO TAB */}
              {dtTab === 'info' && !dtEdit && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <DRow l="Razón Social" v={dt.legal_name||'—'} full /><DRow l={dt.entity_type==='natural'?'Cédula':'RUC'} v={dt.ruc || dt.cedula || '—'} mono />
                    <DRow l="Industria" v={(dt.industry||'—').replace(/_/g,' ')} /><DRow l="Provincia" v={(dt.province||'—').replace(/_/g,' ')} />
                    <DRow l="Ciudad" v={dt.city||'—'} /><DRow l="Email" v={dt.email||'—'} />
                    <DRow l="Teléfono" v={dt.phone||'—'} /><DRow l="País" v="Ecuador" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <StatBox v={dt.user_count ?? 0} l="Usuarios" /><StatBox v={dt.location_count ?? 0} l="Sucursales" /><StatBox v={dt.trial_days_remaining ?? 0} l="Días Trial" />
                  </div>
                  <div className="bg-surface-50/80 rounded-xl p-3"><p className="text-[10px] font-semibold text-surface-400 uppercase">Registrado</p><p className="text-sm text-surface-700">{new Date(dt.created_at).toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' })}</p></div>
                  <button onClick={() => setDtEdit(true)} className="w-full bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-brand-200 flex items-center justify-center gap-2">{IC.edit} Editar Información</button>
                </div>
              )}
              {dtTab === 'info' && dtEdit && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <EF l="Nombre Comercial" v={dtForm.name || ''} c={v => setDtForm(f => ({...f, name: v}))} />
                    <EF l="Razón Social" v={dtForm.legal_name || ''} c={v => setDtForm(f => ({...f, legal_name: v}))} />
                    <EF l="RUC" v={dtForm.ruc || ''} c={v => setDtForm(f => ({...f, ruc: v.replace(/\D/g,'')}))} />
                    <div><label className="text-xs font-semibold text-surface-500 mb-1 block">Industria</label><select value={dtForm.industry || ''} onChange={e => setDtForm(f => ({...f, industry: e.target.value}))} className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white/60 backdrop-blur-sm text-sm">{INDUSTRIES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}</select></div>
                    <EF l="Ciudad" v={dtForm.city || ''} c={v => setDtForm(f => ({...f, city: v}))} />
                    <EF l="Teléfono" v={dtForm.phone || ''} c={v => setDtForm(f => ({...f, phone: v}))} />
                  </div>
                  <EF l="Email Corporativo" v={dtForm.email || ''} c={v => setDtForm(f => ({...f, email: v}))} />
                  <div className="flex gap-2 pt-3">
                    <button onClick={saveDetail} disabled={dtSaving} className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:bg-surface-300 text-white py-2.5 rounded-xl font-semibold text-sm">{dtSaving ? 'Guardando...' : 'Guardar Cambios'}</button>
                    <button onClick={() => setDtEdit(false)} className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-surface-100 text-surface-600 hover:bg-surface-200">Cancelar</button>
                  </div>
                </div>
              )}

              {/* SUCURSALES TAB */}
              {dtTab === 'locs' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-surface-500">{dtLocs.length} sucursales registradas</p>
                    <button onClick={openLocNew} className="text-sm text-brand-600 hover:text-brand-800 font-semibold flex items-center gap-1">{IC.plus} Agregar</button>
                  </div>
                  {dtLocs.filter(l => l.latitude && l.longitude).length > 0 && (
                    <div className="h-[200px] rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700/50">
                      <LocationMap locations={dtLocs.filter(l => l.latitude && l.longitude).map(l => ({ id: l.id, name: l.name, lat: l.latitude!, lng: l.longitude!, city: l.city, address: l.address, phone: l.phone, is_active: l.is_active, is_primary: l.is_primary, tenant_name: dt.name }))} />
                    </div>
                  )}
                  {dtLocsLoading ? <div className="flex justify-center py-8"><div className="spinner w-6 h-6" /></div> : (
                    <div className="space-y-2">
                      {dtLocs.map(loc => (
                        <div key={loc.id} onClick={() => openLocEdit(loc)}
                          className="bg-surface-50/80 backdrop-blur-sm rounded-xl p-3 border border-surface-200 dark:border-surface-700/50 flex items-center justify-between cursor-pointer hover:bg-surface-100/80 transition-all group">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${loc.is_active?'bg-green-500':'bg-red-400'}`} />
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-surface-900 dark:text-white group-hover:text-brand-600 truncate">{loc.name}{loc.is_primary && <span className="ml-1.5 text-brand-500">{IC.star}</span>}</p>
                              <p className="text-xs text-surface-400 truncate">{loc.address||loc.city||'Sin dirección'}</p>
                            </div>
                          </div>
                          <span className="text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">{IC.arrow}</span>
                        </div>
                      ))}
                      {dtLocs.length === 0 && !dtLocsLoading && <p className="text-sm text-surface-400 text-center py-8">No hay sucursales registradas</p>}
                    </div>
                  )}
                  {editLoc && (
                    <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-brand-200 shadow-lg space-y-3">
                      <h4 className="font-bold text-surface-900 dark:text-white text-sm">{editLoc === 'new' ? 'Nueva Sucursal' : `Editar: ${editLoc?.name}`}</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <EF l="Nombre" v={locForm.name || ''} c={v => setLocForm(f => ({...f, name: v}))} />
                        <EF l="Ciudad" v={locForm.city || ''} c={v => setLocForm(f => ({...f, city: v}))} />
                        <EF l="Dirección" v={locForm.address || ''} c={v => setLocForm(f => ({...f, address: v}))} />
                        <EF l="Teléfono" v={locForm.phone || ''} c={v => setLocForm(f => ({...f, phone: v}))} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-surface-500 mb-1 block">Ubicación en el Mapa</label>
                        <LocationPicker
                          lat={locForm.latitude ?? null}
                          lng={locForm.longitude ?? null}
                          onChange={(lat, lng, address) => {
                            setLocForm(f => ({ ...f, latitude: lat, longitude: lng, ...(address && !f.address ? { address: address.split(',').slice(0, 3).join(',') } : {}) }));
                          }}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveLoc} className="flex-1 bg-brand-500 hover:bg-brand-600 text-white py-2 rounded-xl font-semibold text-sm">{editLoc==='new'?'Crear':'Guardar'}</button>
                        <button onClick={() => setEditLoc(null)} className="px-4 py-2 rounded-xl text-sm bg-surface-100 text-surface-600 hover:bg-surface-200">Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ACTIONS TAB */}
              {dtTab === 'actions' && (
                <div className="space-y-4">
                  <div className="bg-surface-50/80 rounded-xl p-4 border border-surface-200 dark:border-surface-700/50">
                    <h4 className="font-bold text-surface-900 dark:text-white text-sm mb-2">Estado del Negocio</h4>
                    <p className="text-xs text-surface-500 mb-3">{dt.is_active ? 'El negocio está activo y operativo.' : 'El negocio está suspendido.'}</p>
                    {dt.is_active ? (
                      <button onClick={doSuspend} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all flex items-center gap-2">{IC.pause} Suspender Negocio</button>
                    ) : (
                      <button onClick={doReactivate} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all flex items-center gap-2">{IC.play} Reactivar Negocio</button>
                    )}
                  </div>
                  <div className="bg-red-50 rounded-xl p-4 border border-red-200 dark:border-red-900/30">
                    <h4 className="font-bold text-red-900 dark:text-red-200 text-sm mb-2">Zona Peligrosa</h4>
                    <p className="text-xs text-red-600 dark:text-red-400 mb-3">Elimina permanentemente este negocio y todos sus datos. Esta acción no se puede deshacer.</p>
                    <div className="mb-3">
                      <label htmlFor="delete-justification" className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1 block">Justificación (mínimo 10 caracteres)</label>
                      <input
                        id="delete-justification"
                        value={deleteJustification}
                        onChange={e => setDeleteJustification(e.target.value)}
                        placeholder="Solicitud del propietario para eliminar cuenta"
                        className="w-full px-3 py-2 rounded-xl border border-red-200 dark:border-red-800 bg-white/60 backdrop-blur-sm text-sm text-red-900 dark:text-red-100"
                      />
                    </div>
                    <button onClick={openDeleteConfirm} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all flex items-center gap-2">{IC.x} Eliminar Permanentemente</button>
                  </div>
                  <div className="bg-surface-50/80 rounded-xl p-4 border border-surface-200 dark:border-surface-700/50">
                    <h4 className="font-bold text-surface-900 dark:text-white text-sm mb-2">Impersonar</h4>
                    <p className="text-xs text-surface-500 mb-3">Iniciar sesión como el propietario de este negocio para soporte.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label htmlFor="impersonation-owner-pin" className="text-xs font-semibold text-surface-500 mb-1 block">PIN del propietario</label>
                        <input
                          id="impersonation-owner-pin"
                          value={impersonationPin}
                          onChange={e => setImpersonationPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          inputMode="numeric"
                          type="password"
                          maxLength={6}
                          className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white/60 backdrop-blur-sm text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="impersonation-justification" className="text-xs font-semibold text-surface-500 mb-1 block">Justificación</label>
                        <input
                          id="impersonation-justification"
                          value={impersonationJustification}
                          onChange={e => setImpersonationJustification(e.target.value)}
                          placeholder="Soporte solicitado por el propietario"
                          className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white/60 backdrop-blur-sm text-sm"
                        />
                      </div>
                    </div>
                    <button
                      onClick={doImpersonate}
                      disabled={impersonating}
                      className="bg-purple-500 hover:bg-purple-600 disabled:opacity-60 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all flex items-center gap-2"
                    >
                      {IC.key} {impersonating ? 'Impersonando...' : 'Impersonar Propietario'}
                    </button>
                  </div>
                  <div className="bg-surface-50/80 rounded-xl p-4 border border-surface-200 dark:border-surface-700/50">
                    <h4 className="font-bold text-surface-900 dark:text-white text-sm mb-1">Información Técnica</h4>
                    <div className="text-xs font-mono text-surface-500 space-y-1 mt-2">
                      <p>ID: {dt.id}</p><p>Slug: {dt.slug || '—'}</p><p>Creado: {dt.created_at}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {deleteConfirmOpen && (
              <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-surface-950/55 backdrop-blur-sm" onClick={() => !deletingTenant && setDeleteConfirmOpen(false)} />
                <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-surface-900 border border-red-200 dark:border-red-900/50 shadow-2xl p-5">
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center mb-3">{IC.x}</div>
                  <h3 className="text-lg font-black text-surface-900 dark:text-white">Eliminar permanentemente</h3>
                  <p className="text-sm text-surface-600 dark:text-surface-300 mt-2">
                    Se eliminará <span className="font-semibold">{dt.name}</span> y sus datos asociados. Esta acción no se puede deshacer.
                  </p>
                  <div className="mt-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-3">
                    <p className="text-xs font-semibold text-red-800 dark:text-red-200">Justificación</p>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-1">{deleteJustification}</p>
                  </div>
                  <label htmlFor="delete-confirm-phrase" className="text-xs font-semibold text-surface-500 mt-4 mb-1 block">
                    Escribe ELIMINAR para confirmar
                  </label>
                  <input
                    id="delete-confirm-phrase"
                    value={deleteConfirmPhrase}
                    onChange={e => setDeleteConfirmPhrase(e.target.value)}
                    disabled={deletingTenant}
                    className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-950 text-sm font-mono"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2 mt-5">
                    <button
                      onClick={() => setDeleteConfirmOpen(false)}
                      disabled={deletingTenant}
                      className="px-4 py-2 rounded-xl text-sm font-semibold bg-surface-100 text-surface-700 hover:bg-surface-200 disabled:opacity-60"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={doDelete}
                      disabled={deletingTenant || deleteConfirmPhrase !== 'ELIMINAR'}
                      className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white"
                    >
                      {deletingTenant ? 'Eliminando...' : 'Eliminar definitivamente'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DRow({ l, v, full, mono }: { l: string; v: string; full?: boolean; mono?: boolean }) {
  return (<div className={full ? 'col-span-2' : ''}><p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider mb-0.5">{l}</p><p className={`text-sm text-surface-800 dark:text-surface-100 font-medium ${mono?'font-mono':''}`}>{v}</p></div>);
}
function StatBox({ v, l }: { v: number; l: string }) {
  return (<div className="bg-surface-50/80 rounded-xl p-3 text-center"><p className="text-2xl font-black text-surface-900 dark:text-white">{v}</p><p className="text-[10px] text-surface-400 font-semibold uppercase">{l}</p></div>);
}
function EF({ l, v, c }: { l: string; v: string; c: (v: string) => void }) {
  return (<div><label className="text-xs font-semibold text-surface-500 mb-1 block">{l}</label><input type="text" value={v} onChange={e => c(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white/60 backdrop-blur-sm text-sm text-surface-800 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-300 transition-all" /></div>);
}
