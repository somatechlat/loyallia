'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import centralizedApi from '@/lib/api';

const LocationMap = dynamic(() => import('@/components/maps/LocationMap'), { ssr: false });
const LocationPicker = dynamic(() => import('@/components/maps/LocationPicker'), { ssr: false });

const api = (path: string, opts?: { method?: string; body?: string }) => {
  const url = `/api/v1/admin${path}`;
  const method = (opts?.method || 'GET').toLowerCase();
  const body = opts?.body ? JSON.parse(opts.body) : undefined;
  return centralizedApi({ url, method, data: body });
};

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

interface TenantDetailModalProps {
  tenant: Tenant | null;
  onClose: () => void;
  onUpdate: () => void;
}

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

export default function TenantDetailModal({ tenant, onClose, onUpdate }: TenantDetailModalProps) {
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

  useEffect(() => {
    if (!tenant) {
      setDtTab('info');
      setDtEdit(false);
      setEditLoc(null);
      setImpersonationPin('');
      setImpersonationJustification('');
      setImpersonating(false);
      setDeleteJustification('');
      setDeleteConfirmOpen(false);
      setDeleteConfirmPhrase('');
      setDeletingTenant(false);
      setDtLocs([]);
      return;
    }
    setDtTab('info');
    setDtEdit(false);
    setEditLoc(null);
    setImpersonationPin('');
    setImpersonationJustification('');
    setImpersonating(false);
    setDeleteJustification('');
    setDeleteConfirmOpen(false);
    setDeleteConfirmPhrase('');
    setDeletingTenant(false);
    setDtForm({ name: tenant.name, legal_name: tenant.legal_name||'', ruc: tenant.ruc||'', industry: tenant.industry||'other', province: tenant.province||'', city: tenant.city||'', phone: tenant.phone||'', email: tenant.email||'' });
    setDtLocs([]);
    setDtLocsLoading(true);
    api(`/tenants/${tenant.id}/locations/`)
      .then(({ data }) => setDtLocs(Array.isArray(data) ? data : []))
      .catch(() => setDtLocs([]))
      .finally(() => setDtLocsLoading(false));
  }, [tenant]);

  if (!tenant) return null;

  const saveDetail = async () => {
    setDtSaving(true);
    try { await api(`/tenants/${tenant.id}/`, { method: 'PATCH', body: JSON.stringify(dtForm) }); toast.success('Negocio actualizado'); onClose(); onUpdate(); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); } finally { setDtSaving(false); }
  };
  const doSuspend = async () => { if (!confirm(`¿Suspender "${tenant.name}"?`)) return; await api(`/tenants/${tenant.id}/suspend/`, { method: 'POST' }); toast.success('Suspendido'); onClose(); onUpdate(); };
  const doReactivate = async () => { await api(`/tenants/${tenant.id}/reactivate/`, { method: 'POST' }); toast.success('Reactivado'); onClose(); onUpdate(); };
  const openDeleteConfirm = () => {
    if (deleteJustification.trim().length < 10) {
      toast.error('Ingresa una justificación de al menos 10 caracteres');
      return;
    }
    setDeleteConfirmPhrase('');
    setDeleteConfirmOpen(true);
  };
  const doDelete = async () => {
    const justification = deleteJustification.trim();
    if (justification.length < 10) {
      toast.error('Ingresa una justificación de al menos 10 caracteres');
      return;
    }
    if (deleteConfirmPhrase !== 'ELIMINAR') {
      toast.error('Frase de confirmación incorrecta. No se eliminó el negocio.');
      return;
    }
    const tenantName = tenant.name;
    setDeletingTenant(true);
    try {
      await api(`/tenants/${tenant.id}/`, { method: 'DELETE', body: JSON.stringify({ justification }) });
      toast.success(`"${tenantName}" fue eliminado permanentemente`);
      onClose();
      onUpdate();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'No se pudo eliminar el negocio';
      toast.error(message);
    } finally {
      setDeletingTenant(false);
    }
  };
  const doImpersonate = async () => {
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
    if (!confirm(`¿Impersonar a "${tenant.name}"? Podrás volver al panel de admin.`)) return;

    setImpersonating(true);
    try {
      const currentToken = Cookies.get('access_token') || '';
      const { data: d } = await api(`/tenants/${tenant.id}/impersonate/`, {
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
    try {
      if (editLoc === 'new') {
        await api(`/tenants/${tenant.id}/locations/`, { method: 'POST', body: JSON.stringify(locForm) });
        toast.success('Sucursal creada');
      }
      setEditLoc(null);
      const { data } = await api(`/tenants/${tenant.id}/locations/`);
      setDtLocs(data);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-2xl bg-white/85 backdrop-blur-xl border border-white/30 rounded-3xl shadow-2xl max-h-[90vh] flex flex-col animate-fade-in" onClick={e => e.stopPropagation()} style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.18)' }}>
        <div className="h-1.5 bg-gradient-to-r from-brand-400 via-emerald-400 to-purple-500 flex-shrink-0" />
        <div className="px-6 pt-5 pb-3 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-black text-surface-900 dark:text-white">{tenant.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${tenant.is_active?'bg-green-500':'bg-red-400'}`} />
              <span className="text-xs text-surface-400">{tenant.is_active?'Activo':'Suspendido'}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${tenant.plan==='full'?'bg-brand-100 text-brand-700':tenant.plan==='trial'?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700'}`}>{tenant.plan.toUpperCase()}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-surface-100 text-surface-600">{tenant.entity_type === 'natural' ? 'Persona Natural' : 'Jurídica'}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-surface-100 hover:bg-surface-200 flex items-center justify-center">{IC.x}</button>
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
                <DRow l="Razón Social" v={tenant.legal_name||'—'} full /><DRow l={tenant.entity_type==='natural'?'Cédula':'RUC'} v={tenant.ruc || tenant.cedula || '—'} mono />
                <DRow l="Industria" v={(tenant.industry||'—').replace(/_/g,' ')} /><DRow l="Provincia" v={(tenant.province||'—').replace(/_/g,' ')} />
                <DRow l="Ciudad" v={tenant.city||'—'} /><DRow l="Email" v={tenant.email||'—'} />
                <DRow l="Teléfono" v={tenant.phone||'—'} /><DRow l="País" v="Ecuador" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <StatBox v={tenant.user_count ?? 0} l="Usuarios" /><StatBox v={tenant.location_count ?? 0} l="Sucursales" /><StatBox v={tenant.trial_days_remaining ?? 0} l="Días Trial" />
              </div>
              <div className="bg-surface-50/80 rounded-xl p-3"><p className="text-[10px] font-semibold text-surface-400 uppercase">Registrado</p><p className="text-sm text-surface-700">{new Date(tenant.created_at).toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' })}</p></div>
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
                  <LocationMap locations={dtLocs.filter(l => l.latitude && l.longitude).map(l => ({ id: l.id, name: l.name, lat: l.latitude!, lng: l.longitude!, city: l.city, address: l.address, phone: l.phone, is_active: l.is_active, is_primary: l.is_primary, tenant_name: tenant.name }))} />
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
                <p className="text-xs text-surface-500 mb-3">{tenant.is_active ? 'El negocio está activo y operativo.' : 'El negocio está suspendido.'}</p>
                {tenant.is_active ? (
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
                  <p>ID: {tenant.id}</p><p>Slug: {tenant.slug || '—'}</p><p>Creado: {tenant.created_at}</p>
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
                Se eliminará <span className="font-semibold">{tenant.name}</span> y sus datos asociados. Esta acción no se puede deshacer.
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
