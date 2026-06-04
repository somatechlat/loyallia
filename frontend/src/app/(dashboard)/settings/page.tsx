'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useI18n } from '@/lib/i18n';
import WhatsAppWizard from '@/components/settings/WhatsAppWizard';
import DataPrivacySection from '@/components/settings/DataPrivacySection';
import AuditLogSection from '@/components/settings/AuditLogSection';
import { stripLocalMinioUrl } from '@/lib/url-utils';

interface TenantProfile {
  id: string; name: string; slug: string; plan: string;
  is_active: boolean; logo_url: string; primary_color: string;
  secondary_color: string; country: string; timezone: string;
  phone: string; website: string; address: string;
  trial_days_remaining: number;
}

export default function SettingsPage() {
  const { t } = useI18n();

  const TIMEZONES = [
    { value: 'America/Guayaquil', label: t('timezones.americaGuayaquil') },
    { value: 'America/Bogota', label: t('timezones.americaBogota') },
    { value: 'America/Lima', label: t('timezones.americaLima') },
    { value: 'America/Mexico_City', label: t('timezones.americaMexicoCity') },
    { value: 'America/New_York', label: t('timezones.americaNewYork') },
    { value: 'America/Los_Angeles', label: t('timezones.americaLosAngeles') },
    { value: 'Europe/Madrid', label: t('timezones.europeMadrid') },
  ];
  const { user } = useAuth();
  const [tenant, setTenant] = useState<TenantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new_password: '', confirm: '' });
  const [changingPw, setChangingPw] = useState(false);
  const [showPwSection, setShowPwSection] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', website: '', address: '',
    timezone: 'America/Guayaquil', primary_color: '#6366f1', secondary_color: '#f59e0b',
    logo_url: '', email: '',
  });
  const [formErrors, setFormErrors] = useState({ name: false, email: false, website: false, phone: false });
  const [pwMatchError, setPwMatchError] = useState(false);
  const [pwLengthError, setPwLengthError] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Plan Features (LYL-SRS-008)
  const [planFeatures, setPlanFeatures] = useState<string[]>([]);
  const [planLimits, setPlanLimits] = useState<Record<string, number>>({});
  const [, setPlanUsage] = useState<Record<string, number>>({});
  const [planName, setPlanName] = useState('');


  const loadTenant = useCallback(async () => {
    try {
      const { data } = await api.get('/api/v1/tenants/me/');
      setTenant(data);
      const cleanLogo = stripLocalMinioUrl(data.logo_url);
      setForm({
        name: data.name || '',
        phone: data.phone || '',
        website: data.website || '',
        address: data.address || '',
        timezone: data.timezone || 'America/Guayaquil',
        primary_color: data.primary_color || '#6366f1',
        secondary_color: data.secondary_color || '#f59e0b',
        logo_url: cleanLogo,
        email: (data as unknown as Record<string, string>).email || '',
      });
      if (cleanLogo) setLogoPreview(cleanLogo);
    } catch {
      toast.error(t("settings.loadError"));
    }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadTenant(); }, [loadTenant]);

  // Fetch plan features on mount (LYL-SRS-008)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/api/v1/tenants/me/plan-features/');
        setPlanFeatures(data.features || []);
        setPlanLimits(data.limits || {});
        setPlanUsage(data.usage || {});
        setPlanName(data.plan_name || '');
      } catch { /* no plan info — default to empty */ }
    })();
  }, []);

  const handleSave = async () => {
    const errors = {
      name: !form.name.trim(),
      email: !!form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email),
      website: !!form.website && !/^https?:\/\/.+/.test(form.website),
      phone: !!form.phone && !/^[\d\s+\-().]+$/.test(form.phone),
    };
    setFormErrors(errors);
    if (Object.values(errors).some(Boolean)) return;
    setSaving(true);
    const toastId = toast.loading(t('settings.saving'));
    try {
      const { data: updated } = await api.patch('/api/v1/tenants/me/', form);
      setTenant(updated);
      toast.success(t('settings.updated'), { id: toastId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('settings.saveError');
      toast.error(msg, { id: toastId });
    } finally { setSaving(false); }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const match = passwordForm.new_password === passwordForm.confirm;
    const len = passwordForm.new_password.length >= 8;
    setPwMatchError(!match);
    setPwLengthError(!len);
    if (!match || !len) return;
    setChangingPw(true);
    const toastId = toast.loading(t('settings.changingPassword'));
    try {
      await api.post('/api/v1/auth/change-password/', {
        current_password: passwordForm.current,
        new_password: passwordForm.new_password,
      });
      toast.success(t('settings.passwordUpdated'), { id: toastId });
      setPasswordForm({ current: '', new_password: '', confirm: '' });
      setShowPwSection(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('settings.passwordChangeError');
      toast.error(msg, { id: toastId });
    } finally { setChangingPw(false); }
  };

  if (loading) return <div className="flex justify-center p-12"><div className="spinner w-8 h-8" /></div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('nav.settings')}</h1>
          <p className="text-surface-500 text-sm mt-1">{t('settings.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Business info */}
          <div className="card p-6 space-y-4">
            <h2 className="text-base font-semibold text-surface-900 dark:text-white">{t('settings.businessInfo')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="biz-name">{t('settings.businessName')}</label>
                <input id="biz-name" className={`input ${formErrors.name ? 'border-red-500' : ''}`} value={form.name} maxLength={100} required
                  onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setFormErrors(err => ({ ...err, name: false })); }} />
                {formErrors.name && <p className="text-xs text-red-500 mt-1">{t('settings.nameRequired')}</p>}
              </div>
              <div>
                <label className="label" htmlFor="biz-email">{t('settings.email')}</label>
                <input id="biz-email" type="email" className={`input ${formErrors.email ? 'border-red-500' : ''}`} value={form.email} maxLength={254}
                  onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setFormErrors(err => ({ ...err, email: false })); }} />
                {formErrors.email && <p className="text-xs text-red-500 mt-1">{t('settings.emailInvalid')}</p>}
              </div>
              <div>
                <label className="label" htmlFor="biz-phone">{t('settings.phone')}</label>
                <input id="biz-phone" type="tel" className={`input ${formErrors.phone ? 'border-red-500' : ''}`} value={form.phone} placeholder={t('settings.placeholders.phone')} maxLength={50}
                  onChange={e => { setForm(f => ({ ...f, phone: e.target.value })); setFormErrors(err => ({ ...err, phone: false })); }} />
                {formErrors.phone && <p className="text-xs text-red-500 mt-1">{t('settings.phoneInvalid')}</p>}
              </div>
              <div>
                <label className="label" htmlFor="biz-website">{t('settings.website')}</label>
                <input id="biz-website" type="url" className={`input ${formErrors.website ? 'border-red-500' : ''}`} value={form.website} placeholder={t('settings.placeholders.website')} maxLength={200}
                  onChange={e => { setForm(f => ({ ...f, website: e.target.value })); setFormErrors(err => ({ ...err, website: false })); }} />
                {formErrors.website && <p className="text-xs text-red-500 mt-1">{t('settings.urlInvalid')}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="biz-address">{t('settings.address')}</label>
                <input id="biz-address" className="input" value={form.address} placeholder={t('settings.placeholders.address')} maxLength={200}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div>
                <label className="label" htmlFor="biz-tz">{t('settings.timezone')}</label>
                <select id="biz-tz" className="input" value={form.timezone}
                  onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}>
                  {TIMEZONES.map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Branding */}
          <div className="card p-6 space-y-4">
            <h2 className="text-base font-semibold text-surface-900 dark:text-white">{t('settings.visualIdentity')}</h2>

            {/* Logo Upload */}
            <div>
              <label className="label">{t('settings.businessLogo')}</label>
              <div className="flex items-center gap-4 mt-1">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="w-16 h-16 rounded-2xl border-2 border-dashed border-surface-300 hover:border-brand-400 flex items-center justify-center transition-all bg-surface-50 hover:bg-brand-50 group overflow-hidden"
                  id="logo-upload-settings-btn"
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-full h-full rounded-2xl object-cover" />
                  ) : (
                    <svg className="w-6 h-6 text-surface-400 group-hover:text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                  )}
                </button>
                <div className="flex-1">
                  <p className="text-sm text-surface-700 font-medium">
                    {logoPreview ? t('settings.logoLoaded') : t('settings.noLogo')}
                  </p>
                  <p className="text-xs text-surface-400 mt-0.5">{t('settings.logoFormat')}</p>
                  {logoUploading && (
                    <p className="text-xs text-brand-600 mt-1 flex items-center gap-1">
                      <span className="w-3 h-3 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
                      {t('common.uploading')}
                    </p>
                  )}
                </div>
                {logoPreview && (
                  <button type="button" onClick={() => { setLogoPreview(null); setForm(f => ({ ...f, logo_url: '' })); }}
                    className="text-red-400 hover:text-red-600 text-sm">✕</button>
                )}
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" id="logo-file-settings"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setLogoUploading(true);
                  try {
                    const fd = new FormData();
                    fd.append('file', file);
                    const { data } = await api.post('/api/v1/upload/', fd, {
                      headers: { 'Content-Type': 'multipart/form-data' },
                    });
                    setForm(f => ({ ...f, logo_url: data.url || '' }));
                    setLogoPreview(data.url || null);
                    toast.success(t('settings.logoUploadSuccess'));
                  } catch { toast.error(t('settings.logoUploadError')); }
                  finally { setLogoUploading(false); }
                }} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">{t('settings.primaryColor')}</label>
                <div className="flex items-center gap-3">
                  <input type="color" className="w-10 h-8 rounded-lg cursor-pointer border border-surface-200 dark:border-surface-700"
                    value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} />
                  <span className="text-xs font-mono text-surface-500">{form.primary_color}</span>
                </div>
              </div>
              <div>
                <label className="label">{t('settings.secondaryColor')}</label>
                <div className="flex items-center gap-3">
                  <input type="color" className="w-10 h-8 rounded-lg cursor-pointer border border-surface-200 dark:border-surface-700"
                    value={form.secondary_color} onChange={e => setForm(f => ({ ...f, secondary_color: e.target.value }))} />
                  <span className="text-xs font-mono text-surface-500">{form.secondary_color}</span>
                </div>
              </div>
            </div>
            {/* Preview */}
            <div className="p-4 rounded-xl border border-surface-200 dark:border-surface-700 flex items-center gap-4 bg-surface-50">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg"
                style={{ backgroundColor: form.primary_color }}>
                {form.name?.[0] || t('settings.brandPreview.fallbackInitial')}
              </div>
              <div>
                <p className="font-semibold text-surface-900 dark:text-white">{form.name || t('settings.yourBusiness')}</p>
                <p className="text-xs text-surface-500">{t('settings.brandPreview')}</p>
              </div>
            </div>
          </div>

          {/* WhatsApp integration (LYL-SRS-007) */}
          <WhatsAppWizard
            tenantId={user?.tenant_id}
            planFeatures={planFeatures}
            planName={planName}
            planLimits={planLimits}
          />

          <button onClick={handleSave} disabled={saving} className="btn-primary w-full sm:w-auto" id="save-settings-btn">
            {saving ? <span className="spinner w-4 h-4" /> : t('common.save')}
          </button>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Account info */}
          <div className="card p-5">
            <h3 className="font-semibold text-surface-900 dark:text-white mb-3">{t('settings.yourAccount')}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-surface-500">{t('auth.firstName')}</span><span className="font-medium">{user?.full_name}</span></div>
              <div className="flex justify-between"><span className="text-surface-500">{t('auth.email')}</span><span className="font-medium text-xs">{user?.email}</span></div>
              <div className="flex justify-between"><span className="text-surface-500">{t('team.role')}</span><span className="badge-blue">{user?.role}</span></div>
            </div>
          </div>

          {/* Plan info */}
          {tenant && (
            <div className="card p-5">
              <h3 className="font-semibold text-surface-900 dark:text-white mb-3">{t('billing.currentPlan')}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-surface-500">{t('settings.plan')}</span>
                  <span className="badge-purple capitalize">{tenant.plan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500">{t('settings.planInfo.slugLabel')}</span>
                  <span className="font-mono text-xs text-surface-600">{tenant.slug}</span>
                </div>
                {tenant.trial_days_remaining > 0 && (
                  <div className="flex justify-between">
                    <span className="text-surface-500">{t('settings.trial')}</span>
                    <span className="font-semibold text-brand-600">{t('settings.daysRemaining', { count: tenant.trial_days_remaining })}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Password change */}
          <div className="card p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-surface-900 dark:text-white">{t('settings.security')}</h3>
            </div>
            {!showPwSection ? (
              <button onClick={() => setShowPwSection(true)} className="btn-secondary text-sm w-full" id="show-password-btn">
                {t('settings.changePassword')}
              </button>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-3">
                <div>
                  <label className="label text-xs" htmlFor="current-pw">{t('settings.currentPassword')}</label>
                  <input id="current-pw" type="password" className="input text-sm" required maxLength={128}
                    value={passwordForm.current} onChange={e => setPasswordForm(f => ({ ...f, current: e.target.value }))} />
                </div>
                <div>
                  <label className="label text-xs" htmlFor="new-pw">{t('settings.newPassword')}</label>
                  <input id="new-pw" type="password" className={`input text-sm ${pwLengthError ? 'border-red-500' : ''}`} required minLength={8} maxLength={128}
                    value={passwordForm.new_password} onChange={e => { setPasswordForm(f => ({ ...f, new_password: e.target.value })); setPwLengthError(false); }} />
                  {pwLengthError && <p className="text-xs text-red-500 mt-1">{t('settings.passwordMinLength')}</p>}
                </div>
                <div>
                  <label className="label text-xs" htmlFor="confirm-pw">{t('settings.confirmNewPassword')}</label>
                  <input id="confirm-pw" type="password" className={`input text-sm ${pwMatchError ? 'border-red-500' : ''}`} required maxLength={128}
                    value={passwordForm.confirm} onChange={e => { setPasswordForm(f => ({ ...f, confirm: e.target.value })); setPwMatchError(false); }} />
                  {pwMatchError && <p className="text-xs text-red-500 mt-1">{t('settings.passwordMismatch')}</p>}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowPwSection(false)} className="btn-ghost text-sm flex-1">{t('common.cancel')}</button>
                  <button type="submit" disabled={changingPw} className="btn-primary text-sm flex-1" id="change-password-btn">
                    {changingPw ? <span className="spinner w-4 h-4" /> : t('common.update')}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* LOPDP data privacy (LYL-FR-DPR-020/025) - OWNER only */}
          <DataPrivacySection userRole={user?.role} />

          {/* Audit log - OWNER only */}
          <AuditLogSection userRole={user?.role} />
        </div>
      </div>
    </div>
  );
}
