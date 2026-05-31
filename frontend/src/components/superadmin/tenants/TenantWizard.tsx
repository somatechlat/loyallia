'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import centralizedApi from '@/lib/api';

const LocationPicker = dynamic(() => import('@/components/maps/LocationPicker'), { ssr: false });

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

const WIZARD_STEPS = [{ n: 1, l: 'Plan' }, { n: 2, l: 'Tipo & Datos' }, { n: 3, l: 'Propietario' }, { n: 4, l: 'Sucursales' }];
const formatProvince = (p: string) => p.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

type LocEntry = { name: string; address: string; city: string; latitude: number | null; longitude: number | null; is_primary: boolean; };

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

interface TenantWizardProps {
  open: boolean;
  onClose: () => void;
  plans: Plan[];
  onSuccess: (result: CreationResult) => void;
}

const XIcon = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
);

const PlusIcon = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
);

const BldgIcon = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
);

const UserIcon = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
);

export default function TenantWizard({ open, onClose, plans, onSuccess }: TenantWizardProps) {
  const [step, setStep] = useState(1);
  const [entityType, setEntityType] = useState<'natural'|'juridica'>('juridica');
  const [company, setCompany] = useState({ name: '', legal_name: '', ruc: '', cedula: '', industry: 'food_beverage', province: 'pichincha', city: '', address: '', phone: '', email: '', website: '' });
  const [owner, setOwner] = useState({ owner_email: '', owner_first_name: '', owner_last_name: '', owner_cedula: '' });
  const [wLocs, setWLocs] = useState<LocEntry[]>([{ name: 'Sede Principal', address: '', city: '', latitude: null, longitude: null, is_primary: true }]);
  const [planSlug, setPlanSlug] = useState('professional');
  const [billingCycle, setBillingCycle] = useState('monthly');

  useEffect(() => {
    if (open) {
      setStep(1);
      setEntityType('juridica');
      setCompany({ name: '', legal_name: '', ruc: '', cedula: '', industry: 'food_beverage', province: 'pichincha', city: '', address: '', phone: '', email: '', website: '' });
      setOwner({ owner_email: '', owner_first_name: '', owner_last_name: '', owner_cedula: '' });
      setWLocs([{ name: 'Sede Principal', address: '', city: '', latitude: null, longitude: null, is_primary: true }]);
      setPlanSlug('professional');
      setBillingCycle('monthly');
    }
  }, [open]);

  const addWLoc = () => setWLocs([...wLocs, { name: '', address: '', city: '', latitude: null, longitude: null, is_primary: false }]);
  const rmWLoc = (i: number) => setWLocs(wLocs.filter((_, j) => j !== i));
  const upWLoc = (i: number, f: keyof LocEntry, v: LocEntry[keyof LocEntry]) => {
    const u = [...wLocs];
    const current = u[i];
    if (!current) return;
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
      onSuccess({ ...data, owner_email: owner.owner_email });
      onClose();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error al registrar'); }
  };

  const selPlan = plans.find((p) => p.slug === planSlug);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-3xl bg-white/90 backdrop-blur-xl border border-white/30 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-fade-in" onClick={e => e.stopPropagation()} style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.15)' }}>
        <div className="h-1.5 bg-gradient-to-r from-brand-400 via-purple-400 to-brand-600" />
        <div className="p-6 border-b border-surface-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-surface-900 dark:text-white">Registrar Nuevo Negocio</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-surface-100 hover:bg-surface-200 flex items-center justify-center">{XIcon}</button>
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
                  <div className="flex items-center gap-2 mb-1">{BldgIcon}<span className="font-bold text-surface-900 dark:text-white">Persona Jurídica</span></div>
                  <p className="text-xs text-surface-500">Empresa, sociedad o compañía con RUC</p>
                </button>
                <button id="entity-natural" onClick={() => setEntityType('natural')} className={`p-4 rounded-xl border-2 text-left transition-all ${entityType === 'natural' ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100' : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'}`}>
                  <div className="flex items-center gap-2 mb-1">{UserIcon}<span className="font-bold text-surface-900 dark:text-white">Persona Natural</span></div>
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
          {step === 4 && (<div className="space-y-4"><div className="flex justify-between items-center"><div><h3 className="font-bold text-surface-800 dark:text-surface-100 text-lg">Sucursales</h3><p className="text-sm text-surface-500">Registra las tiendas/locales del negocio.</p></div><button onClick={addWLoc} className="text-sm text-brand-600 hover:text-brand-800 font-semibold flex items-center gap-1">{PlusIcon} Agregar</button></div>
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
          <button onClick={() => step > 1 ? setStep(step-1) : onClose()} className="px-4 py-2 text-surface-600 hover:text-surface-900 dark:text-white font-medium">{step === 1 ? 'Cancelar' : 'Anterior'}</button>
          {step < 4 ? <button id="wiz-next" onClick={() => setStep(step+1)} className="btn-primary" disabled={step === 2 && !company.name.trim()}>Siguiente</button> : <button id="wiz-submit" onClick={handleSubmit} className="btn-primary">Registrar Negocio</button>}
        </div>
      </div>
    </div>
  );
}
