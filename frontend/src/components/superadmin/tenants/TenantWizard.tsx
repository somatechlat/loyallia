'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
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

const PROVINCES = [
  'azuay','bolivar','canar','carchi','chimborazo','cotopaxi','el_oro','esmeraldas',
  'galapagos','guayas','imbabura','loja','los_rios','manabi','morona_santiago','napo',
  'orellana','pastaza','pichincha','santa_elena','santo_domingo','sucumbios','tungurahua','zamora_chinchipe',
];

const formatProvince = (p: string) => p.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

/**
 * Represents a location entry in the wizard.
 */
type LocEntry = { name: string; address: string; city: string; latitude: number | null; longitude: number | null; is_primary: boolean; };

/**
 * Represents a subscription plan option.
 */
interface Plan {
  slug: string;
  name: string;
  price_monthly: number;
  trial_days: number;
  is_active: boolean;
}

/**
 * Result returned after successful tenant creation.
 */
interface CreationResult {
  tenant_id?: string;
  owner_email?: string;
  temp_password?: string;
}

/**
 * Props for the TenantWizard component.
 */
interface TenantWizardProps {
  /** Whether the wizard is open */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Available subscription plans */
  plans: Plan[];
  /** Success callback with creation result */
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

/**
 * @description Multi-step wizard for registering a new tenant with locations.
 * @param {TenantWizardProps} props - Component props
 * @returns JSX.Element | null
 */
export default function TenantWizard({ open, onClose, plans, onSuccess }: TenantWizardProps) {
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [entityType, setEntityType] = useState<'natural'|'juridica'>('juridica');
  const [company, setCompany] = useState({ name: '', legal_name: '', ruc: '', cedula: '', industry: 'food_beverage', province: 'pichincha', city: '', address: '', phone: '', email: '', website: '' });
  const [owner, setOwner] = useState({ owner_email: '', owner_first_name: '', owner_last_name: '', owner_cedula: '' });
  const [wLocs, setWLocs] = useState<LocEntry[]>([{ name: t('superadmin.tenants.wizard.primaryLocation'), address: '', city: '', latitude: null, longitude: null, is_primary: true }]);
  const [planSlug, setPlanSlug] = useState('professional');
  const [billingCycle, setBillingCycle] = useState('monthly');

  const INDUSTRIES = [
    { value: 'food_beverage', label: t('superadmin.industries.food_beverage') },
    { value: 'retail', label: t('superadmin.industries.retail') },
    { value: 'fashion', label: t('superadmin.industries.fashion') },
    { value: 'health_beauty', label: t('superadmin.industries.health_beauty') },
    { value: 'entertainment', label: t('superadmin.industries.entertainment') },
    { value: 'services', label: t('superadmin.industries.services') },
    { value: 'education', label: t('superadmin.industries.education') },
    { value: 'automotive', label: t('superadmin.industries.automotive') },
    { value: 'hospitality', label: t('superadmin.industries.hospitality') },
    { value: 'technology', label: t('superadmin.industries.technology') },
    { value: 'other', label: t('superadmin.industries.other') },
  ];

  const WIZARD_STEPS = [
    { n: 1, l: t('superadmin.tenants.wizard.stepPlan') },
    { n: 2, l: t('superadmin.tenants.wizard.stepTypeData') },
    { n: 3, l: t('superadmin.tenants.wizard.stepOwner') },
    { n: 4, l: t('superadmin.tenants.wizard.stepLocations') },
  ];

  useEffect(() => {
    if (open) {
      setStep(1);
      setEntityType('juridica');
      setCompany({ name: '', legal_name: '', ruc: '', cedula: '', industry: 'food_beverage', province: 'pichincha', city: '', address: '', phone: '', email: '', website: '' });
      setOwner({ owner_email: '', owner_first_name: '', owner_last_name: '', owner_cedula: '' });
      setWLocs([{ name: t('superadmin.tenants.wizard.primaryLocation'), address: '', city: '', latitude: null, longitude: null, is_primary: true }]);
      setPlanSlug('professional');
      setBillingCycle('monthly');
    }
  }, [open, t]);

  const addWLoc = () => setWLocs([...wLocs, { name: '', address: '', city: '', latitude: null, longitude: null, is_primary: false }]);
  const rmWLoc = (i: number) => setWLocs(wLocs.filter((_, j) => j !== i));
  const upWLoc = (i: number, f: keyof LocEntry, v: LocEntry[keyof LocEntry]) => {
    const u = [...wLocs];
    const current = u[i];
    if (!current) return;
    if (f === 'latitude' || f === 'longitude') {
      const num = v === null || v === '' ? null : Number(v);
      if (num !== null && (Number.isNaN(num) || !Number.isFinite(num))) {
        toast.error(`${f === 'latitude' ? t('superadmin.tenants.wizard.validation.latitudeInvalidNumber') : t('superadmin.tenants.wizard.validation.longitudeInvalidNumber')}`);
        return;
      }
      if (f === 'latitude' && num !== null && (num < -90 || num > 90)) {
        toast.error(t('superadmin.tenants.wizard.validation.latitudeRange'));
        return;
      }
      if (f === 'longitude' && num !== null && (num < -180 || num > 180)) {
        toast.error(t('superadmin.tenants.wizard.validation.longitudeRange'));
        return;
      }
      u[i] = { ...current, [f]: num };
    } else {
      u[i] = { ...current, [f]: v };
    }
    setWLocs(u);
  };

  const validateForm = (): string | null => {
    if (!company.name.trim()) return t('superadmin.tenants.wizard.validation.nameRequired');
    if (!company.legal_name.trim()) return t('superadmin.tenants.wizard.validation.legalNameRequired');
    if (entityType === 'juridica' && !company.ruc.trim()) return t('superadmin.tenants.wizard.validation.rucRequired');
    if (entityType === 'natural' && !company.cedula.trim()) return t('superadmin.tenants.wizard.validation.idCardRequired');
    if (!owner.owner_email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner.owner_email)) return t('superadmin.tenants.wizard.validation.emailInvalid');
    if (!owner.owner_first_name.trim()) return t('superadmin.tenants.wizard.validation.firstNameRequired');
    if (!owner.owner_last_name.trim()) return t('superadmin.tenants.wizard.validation.lastNameRequired');
    const validLocs = wLocs.filter(l => l.name.trim());
    if (validLocs.length === 0) return t('superadmin.tenants.wizard.validation.minOneBranch');
    for (const loc of validLocs) {
      if (loc.latitude !== null && (loc.latitude < -90 || loc.latitude > 90)) return t('superadmin.tenants.wizard.validation.invalidLatitude', { name: loc.name });
      if (loc.longitude !== null && (loc.longitude < -180 || loc.longitude > 180)) return t('superadmin.tenants.wizard.validation.invalidLongitude', { name: loc.name });
    }
    return null;
  };

  const handleSubmit = async () => {
    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }
    const tid = toast.loading(t('superadmin.tenants.wizard.toast.registering'));
    try {
      const payload = { ...company, ...owner, entity_type: entityType, locations: wLocs.filter(l => l.name.trim()), plan_slug: planSlug, billing_cycle: billingCycle };
      const res = await api('/tenants/', { method: 'POST', body: JSON.stringify(payload) });
      const data = res.data;
      if (!res.data) throw new Error(t('superadmin.tenants.wizard.toast.registerError'));
      toast.success(t('superadmin.tenants.wizard.toast.registered'), { id: tid });
      onSuccess({ ...data, owner_email: owner.owner_email });
      onClose();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : t('superadmin.tenants.wizard.toast.registerError')); }
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
            <h2 className="text-xl font-black text-surface-900 dark:text-white">{t('superadmin.tenants.wizard.title')}</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-surface-100 hover:bg-surface-200 flex items-center justify-center">{XIcon}</button>
          </div>
          <div className="flex gap-2">{WIZARD_STEPS.map(s => (<div key={s.n} className="flex-1"><div className={`h-1.5 rounded-full transition-all ${step >= s.n ? 'bg-brand-500' : 'bg-surface-200'}`} /><p className={`text-xs mt-1 ${step >= s.n ? 'text-brand-600 font-semibold' : 'text-surface-400'}`}>{s.n}. {s.l}</p></div>))}</div>
        </div>
        <div className="p-6">
          {/* STEP 1: Plan */}
          {step === 1 && (<div className="space-y-6"><h3 className="font-bold text-surface-800 dark:text-surface-100 text-lg">{t('superadmin.tenants.wizard.planAndBilling')}</h3>
            <div className="grid grid-cols-3 gap-3">{plans.filter((p) => p.is_active).map((plan) => (<button key={plan.slug} onClick={() => setPlanSlug(plan.slug)} className={`text-left p-4 rounded-xl border-2 transition-all ${planSlug === plan.slug ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100' : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'}`}><p className="font-bold text-surface-900 dark:text-white text-sm">{plan.name}</p><p className="text-2xl font-black text-surface-900 dark:text-white mt-1">${plan.price_monthly}<span className="text-xs text-surface-400">{t('superadmin.tenants.wizard.perMonth')}</span></p><p className="text-xs text-surface-500 mt-1">{t('superadmin.tenants.wizard.freeDays', { days: plan.trial_days })}</p></button>))}</div>
            <div><label className="label">{t('superadmin.tenants.wizard.billingCycle')}</label><div className="flex gap-3"><button onClick={() => setBillingCycle('monthly')} className={`px-4 py-2 rounded-xl text-sm font-medium border-2 ${billingCycle === 'monthly' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-surface-200 dark:border-surface-700'}`}>{t('superadmin.tenants.wizard.monthly')}</button><button onClick={() => setBillingCycle('annual')} className={`px-4 py-2 rounded-xl text-sm font-medium border-2 ${billingCycle === 'annual' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-surface-200 dark:border-surface-700'}`}>{t('superadmin.tenants.wizard.annualWithDiscount')}</button></div></div>
          </div>)}
          {/* STEP 2: Entity Type + Company */}
          {step === 2 && (<div className="space-y-5">
            <div>
              <h3 className="font-bold text-surface-800 dark:text-surface-100 text-lg mb-3">{t('superadmin.tenants.wizard.entityType')}</h3>
              <div className="grid grid-cols-2 gap-3">
                <button id="entity-juridica" onClick={() => setEntityType('juridica')} className={`p-4 rounded-xl border-2 text-left transition-all ${entityType === 'juridica' ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100' : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'}`}>
                  <div className="flex items-center gap-2 mb-1">{BldgIcon}<span className="font-bold text-surface-900 dark:text-white">{t('superadmin.tenants.wizard.legalEntity')}</span></div>
                  <p className="text-xs text-surface-500">{t('superadmin.tenants.wizard.legalEntityDesc')}</p>
                </button>
                <button id="entity-natural" onClick={() => setEntityType('natural')} className={`p-4 rounded-xl border-2 text-left transition-all ${entityType === 'natural' ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100' : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'}`}>
                  <div className="flex items-center gap-2 mb-1">{UserIcon}<span className="font-bold text-surface-900 dark:text-white">{t('superadmin.tenants.wizard.naturalPerson')}</span></div>
                  <p className="text-xs text-surface-500">{t('superadmin.tenants.wizard.naturalPersonDesc')}</p>
                </button>
              </div>
            </div>
            <h3 className="font-bold text-surface-800 dark:text-surface-100 text-lg">{t('superadmin.tenants.wizard.businessData')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">{t('superadmin.tenants.wizard.tradeName')} *</label><input id="wiz-name" required className="input" placeholder={entityType === 'natural' ? t('superadmin.tenants.wizard.tradeNamePlaceholderNatural') : t('superadmin.tenants.wizard.tradeNamePlaceholderLegal')} value={company.name} onChange={e => setCompany({...company, name: e.target.value})} /></div>
              {entityType === 'juridica' ? (
                <div><label className="label">{t('superadmin.tenants.wizard.legalName')}</label><input id="wiz-legal" className="input" placeholder={t('superadmin.tenants.wizard.legalNamePlaceholder')} value={company.legal_name} onChange={e => setCompany({...company, legal_name: e.target.value})} /></div>
              ) : (
                <div><label className="label">{t('superadmin.tenants.wizard.fullName')}</label><input id="wiz-legal" className="input" placeholder={t('superadmin.tenants.wizard.fullNamePlaceholder')} value={company.legal_name} onChange={e => setCompany({...company, legal_name: e.target.value})} /></div>
              )}
              {entityType === 'juridica' ? (
                <div><label className="label">{t('superadmin.tenants.wizard.ruc')}</label><input id="wiz-ruc" className="input font-mono" maxLength={13} placeholder={t('superadmin.tenants.wizard.rucPlaceholder')} value={company.ruc} onChange={e => setCompany({...company, ruc: e.target.value.replace(/\D/g, '')})} />{company.ruc && company.ruc.length !== 13 && <p className="text-xs text-red-500 mt-1">{t('superadmin.tenants.wizard.rucError')}</p>}</div>
              ) : (
                <div><label className="label">{t('superadmin.tenants.wizard.idCard')}</label><input id="wiz-cedula" className="input font-mono" maxLength={10} placeholder={t('superadmin.tenants.wizard.idCardPlaceholder')} value={company.cedula} onChange={e => setCompany({...company, cedula: e.target.value.replace(/\D/g, '')})} />{company.cedula && company.cedula.length !== 10 && <p className="text-xs text-red-500 mt-1">{t('superadmin.tenants.wizard.idCardError')}</p>}</div>
              )}
              <div><label className="label">{t('superadmin.tenants.wizard.industry')}</label><select id="wiz-industry" className="input" value={company.industry} onChange={e => setCompany({...company, industry: e.target.value})}>{INDUSTRIES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}</select></div>
              <div><label className="label">{t('superadmin.tenants.wizard.province')}</label><select className="input" value={company.province} onChange={e => setCompany({...company, province: e.target.value})}>{PROVINCES.map(p => <option key={p} value={p}>{formatProvince(p)}</option>)}</select></div>
              <div><label className="label">{t('superadmin.tenants.wizard.city')}</label><input className="input" placeholder={t('superadmin.tenants.wizard.cityPlaceholder')} value={company.city} onChange={e => setCompany({...company, city: e.target.value})} /></div>
              <div className="col-span-2"><label className="label">{t('superadmin.tenants.wizard.address')}</label><input className="input" placeholder={t('superadmin.tenants.wizard.addressPlaceholder')} value={company.address} onChange={e => setCompany({...company, address: e.target.value})} /></div>
              <div><label className="label">{t('superadmin.tenants.wizard.phone')}</label><input className="input" placeholder={t('superadmin.tenants.wizard.phonePlaceholder')} value={company.phone} onChange={e => setCompany({...company, phone: e.target.value})} /></div>
              <div><label className="label">{t('superadmin.tenants.wizard.corporateEmail')}</label><input type="email" className="input" placeholder={t('superadmin.tenants.wizard.corporateEmailPlaceholder')} value={company.email} onChange={e => setCompany({...company, email: e.target.value})} /></div>
            </div>
          </div>)}
          {/* STEP 3: Owner */}
          {step === 3 && (<div className="space-y-4"><h3 className="font-bold text-surface-800 dark:text-surface-100 text-lg">{t('superadmin.tenants.wizard.owner')}</h3><p className="text-sm text-surface-500">{t('superadmin.tenants.wizard.ownerDesc')}</p><div className="grid grid-cols-2 gap-4">
            <div><label className="label">{t('superadmin.tenants.wizard.firstName')} *</label><input id="wiz-owner-fn" required className="input" placeholder={t('superadmin.tenants.wizard.firstNamePlaceholder')} value={owner.owner_first_name} onChange={e => setOwner({...owner, owner_first_name: e.target.value})} /></div>
            <div><label className="label">{t('superadmin.tenants.wizard.lastName')} *</label><input id="wiz-owner-ln" required className="input" placeholder={t('superadmin.tenants.wizard.lastNamePlaceholder')} value={owner.owner_last_name} onChange={e => setOwner({...owner, owner_last_name: e.target.value})} /></div>
            <div className="col-span-2"><label className="label">{t('superadmin.tenants.wizard.email')} *</label><input id="wiz-owner-email" required type="email" className="input" placeholder={t('superadmin.tenants.wizard.emailPlaceholder')} value={owner.owner_email} onChange={e => setOwner({...owner, owner_email: e.target.value})} /></div>
            <div><label className="label">{t('superadmin.tenants.wizard.ownerIdCard')}</label><input className="input font-mono" maxLength={10} placeholder={t('superadmin.tenants.wizard.idCardPlaceholder')} value={owner.owner_cedula} onChange={e => setOwner({...owner, owner_cedula: e.target.value.replace(/\D/g, '')})} /></div>
          </div><div className="bg-surface-50 rounded-xl p-4 border border-surface-100 mt-4"><p className="text-xs text-surface-500">{t('superadmin.tenants.wizard.tempPasswordGenerated')}</p></div></div>)}
          {/* STEP 4: Locations */}
          {step === 4 && (<div className="space-y-4"><div className="flex justify-between items-center"><div><h3 className="font-bold text-surface-800 dark:text-surface-100 text-lg">{t('superadmin.tenants.wizard.locations')}</h3><p className="text-sm text-surface-500">{t('superadmin.tenants.wizard.locationsDesc')}</p></div><button onClick={addWLoc} className="text-sm text-brand-600 hover:text-brand-800 font-semibold flex items-center gap-1">{PlusIcon} {t('superadmin.tenants.wizard.add')}</button></div>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">{wLocs.map((loc, idx) => (<div key={idx} className="bg-surface-50/80 backdrop-blur-sm rounded-xl p-4 border border-surface-200 dark:border-surface-700/50 space-y-3"><div className="flex justify-between items-center"><span className="text-xs font-semibold text-surface-500">{t('superadmin.tenants.wizard.branchNumber', { number: idx+1 })} {loc.is_primary && t('superadmin.tenants.wizard.primary')}</span>{idx > 0 && <button onClick={() => rmWLoc(idx)} className="text-xs text-red-500 hover:text-red-700">{t('common.delete')}</button>}</div><div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-surface-600 mb-1 block">{t('superadmin.tenants.wizard.locationName')} *</label><input className="input text-sm" placeholder={t('superadmin.tenants.wizard.locationNamePlaceholder')} value={loc.name} onChange={e => upWLoc(idx, 'name', e.target.value)} /></div>
              <div><label className="text-xs font-medium text-surface-600 mb-1 block">{t('superadmin.tenants.wizard.locationCity')}</label><input className="input text-sm" placeholder={t('superadmin.tenants.wizard.locationCityPlaceholder')} value={loc.city} onChange={e => upWLoc(idx, 'city', e.target.value)} /></div>
              <div className="col-span-2"><label className="text-xs font-medium text-surface-600 mb-1 block">{t('superadmin.tenants.wizard.locationAddress')}</label><input className="input text-sm" value={loc.address} onChange={e => upWLoc(idx, 'address', e.target.value)} /></div>
              <div className="col-span-2"><label className="text-xs font-semibold text-surface-500 mb-1 block">{t('superadmin.tenants.wizard.mapLocation')}</label><LocationPicker lat={loc.latitude ?? null} lng={loc.longitude ?? null} onChange={(lat, lng, addr) => { upWLoc(idx, 'latitude', lat); upWLoc(idx, 'longitude', lng); if (addr && !loc.address) upWLoc(idx, 'address', addr.split(',').slice(0, 3).join(',')); }} /></div>
              <div className="col-span-2 grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-surface-600 mb-1 block">{t('superadmin.tenants.wizard.latitude')}</label><input type="number" step="0.000001" className="input text-sm font-mono" placeholder={t('superadmin.tenants.wizard.latitudePlaceholder')} value={loc.latitude ?? ''} onChange={e => upWLoc(idx, 'latitude', e.target.value ? +e.target.value : null)} /></div>
                <div><label className="text-xs font-medium text-surface-600 mb-1 block">{t('superadmin.tenants.wizard.longitude')}</label><input type="number" step="0.000001" className="input text-sm font-mono" placeholder={t('superadmin.tenants.wizard.longitudePlaceholder')} value={loc.longitude ?? ''} onChange={e => upWLoc(idx, 'longitude', e.target.value ? +e.target.value : null)} /></div>
              </div>
            </div></div>))}</div>
            <div className="bg-surface-50/80 backdrop-blur-sm rounded-xl p-5 border border-surface-200 dark:border-surface-700/50 space-y-2 text-sm mt-4"><h4 className="font-bold text-surface-900 dark:text-white mb-3">{t('superadmin.tenants.wizard.summary')}</h4><div className="grid grid-cols-2 gap-y-2"><span className="text-surface-500">{t('superadmin.tenants.wizard.type')}:</span><span className="font-medium">{entityType === 'natural' ? t('superadmin.tenants.wizard.naturalPerson') : t('superadmin.tenants.wizard.legalEntity')}</span><span className="text-surface-500">{t('superadmin.tenants.wizard.company')}:</span><span className="font-medium">{company.name||'—'}</span><span className="text-surface-500">{entityType === 'juridica' ? t('superadmin.tenants.wizard.ruc') : t('superadmin.tenants.wizard.idCard')}:</span><span className="font-mono">{entityType === 'juridica' ? company.ruc||'—' : company.cedula||'—'}</span><span className="text-surface-500">{t('superadmin.tenants.wizard.ownerLabel')}:</span><span>{owner.owner_first_name} {owner.owner_last_name}</span><span className="text-surface-500">{t('superadmin.tenants.wizard.email')}:</span><span>{owner.owner_email}</span><span className="text-surface-500">{t('superadmin.tenants.wizard.branches')}:</span><span>{wLocs.filter(l => l.name.trim()).length}</span><span className="text-surface-500">{t('superadmin.tenants.wizard.plan')}:</span><span className="font-semibold text-brand-600">{selPlan?.name || planSlug}</span></div></div>
          </div>)}
        </div>
        <div className="px-6 py-4 border-t border-surface-100 flex justify-between">
          <button onClick={() => step > 1 ? setStep(step-1) : onClose()} className="px-4 py-2 text-surface-600 hover:text-surface-900 dark:text-white font-medium">{step === 1 ? t('common.cancel') : t('superadmin.tenants.wizard.previous')}</button>
          {step < 4 ? <button id="wiz-next" onClick={() => setStep(step+1)} className="btn-primary" disabled={step === 2 && !company.name.trim()}>{t('superadmin.tenants.wizard.next')}</button> : <button id="wiz-submit" onClick={handleSubmit} className="btn-primary">{t('superadmin.tenants.wizard.registerBusinessAction')}</button>}
        </div>
      </div>
    </div>
  );
}
