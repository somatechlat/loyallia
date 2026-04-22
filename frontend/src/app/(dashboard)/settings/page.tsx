'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

interface TenantProfile {
  id: string; name: string; slug: string; plan: string;
  is_active: boolean; logo_url: string; primary_color: string;
  secondary_color: string; country: string; timezone: string;
  phone: string; website: string; address: string;
  trial_days_remaining: number;
}

const TIMEZONES = [
  { value: 'America/Guayaquil', label: 'Ecuador (GMT-5)' },
  { value: 'America/Bogota', label: 'Colombia (GMT-5)' },
  { value: 'America/Lima', label: 'Peru (GMT-5)' },
  { value: 'America/Mexico_City', label: 'Mexico (GMT-6)' },
  { value: 'America/New_York', label: 'USA Eastern (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'USA Pacific (GMT-8)' },
  { value: 'Europe/Madrid', label: 'Spain (GMT+1)' },
];

export default function SettingsPage() {
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
    logo_url: '',
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);


  const token = Cookies.get('access_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const loadTenant = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/tenants/me/', { headers });
      const data = await res.json();
      setTenant(data);
      setForm({
        name: data.name || '',
        phone: data.phone || '',
        website: data.website || '',
        address: data.address || '',
        timezone: data.timezone || 'America/Guayaquil',
        primary_color: data.primary_color || '#6366f1',
        secondary_color: data.secondary_color || '#f59e0b',
        logo_url: data.logo_url || '',
      });
      if (data.logo_url) setLogoPreview(data.logo_url);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadTenant(); }, [loadTenant]);

  const handleSave = async () => {
    setSaving(true);
    const toastId = toast.loading('Guardando cambios...');
    try {
      const res = await fetch('/api/v1/tenants/me/', {
        method: 'PATCH', headers,
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Error al guardar');
      const updated = await res.json();
      setTenant(updated);
      toast.success('Configuración actualizada', { id: toastId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar';
      toast.error(msg, { id: toastId });
    } finally { setSaving(false); }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (passwordForm.new_password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setChangingPw(true);
    const toastId = toast.loading('Actualizando contraseña...');
    try {
      const res = await fetch('/api/v1/auth/change-password/', {
        method: 'POST', headers,
        body: JSON.stringify({
          current_password: passwordForm.current,
          new_password: passwordForm.new_password,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || data.message || 'Error al cambiar contraseña');
      }
      toast.success('Contraseña actualizada', { id: toastId });
      setPasswordForm({ current: '', new_password: '', confirm: '' });
      setShowPwSection(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cambiar contraseña';
      toast.error(msg, { id: toastId });
    } finally { setChangingPw(false); }
  };

  if (loading) return <div className="flex justify-center p-12"><div className="spinner w-8 h-8" /></div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuración</h1>
          <p className="text-surface-500 text-sm mt-1">Ajustes de tu negocio y tu cuenta</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Business info */}
          <div className="card p-6 space-y-4">
            <h2 className="text-base font-semibold text-surface-900">Informacion del negocio</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="biz-name">Nombre del negocio</label>
                <input id="biz-name" className="input" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="label" htmlFor="biz-phone">Telefono</label>
                <input id="biz-phone" className="input" value={form.phone} placeholder="+593 999 999 999"
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="label" htmlFor="biz-website">Sitio web</label>
                <input id="biz-website" className="input" value={form.website} placeholder="https://minegocio.com"
                  onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="biz-address">Direccion</label>
                <input id="biz-address" className="input" value={form.address} placeholder="Av. Principal y Calle 1"
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div>
                <label className="label" htmlFor="biz-tz">Zona horaria</label>
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
            <h2 className="text-base font-semibold text-surface-900">Identidad visual</h2>

            {/* Logo Upload */}
            <div>
              <label className="label">Logo del negocio</label>
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
                    {logoPreview ? 'Logo cargado' : 'Sin logo'}
                  </p>
                  <p className="text-xs text-surface-400 mt-0.5">PNG, JPG o SVG. Recomendado: 256×256px</p>
                  {logoUploading && (
                    <p className="text-xs text-brand-600 mt-1 flex items-center gap-1">
                      <span className="w-3 h-3 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
                      Subiendo...
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
                  const reader = new FileReader();
                  reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
                  reader.readAsDataURL(file);
                  setLogoUploading(true);
                  try {
                    const fd = new FormData();
                    fd.append('file', file);
                    const res = await fetch('/api/v1/upload/', {
                      method: 'POST', body: fd,
                      headers: { Authorization: `Bearer ${Cookies.get('access_token')}` },
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setForm(f => ({ ...f, logo_url: data.url || '' }));
                      toast.success('Logo subido correctamente');
                    }
                  } catch { toast('Logo guardado localmente', { icon: 'i' }); }
                  finally { setLogoUploading(false); }
                }} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Color primario</label>
                <div className="flex items-center gap-3">
                  <input type="color" className="w-10 h-8 rounded-lg cursor-pointer border border-surface-200"
                    value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} />
                  <span className="text-xs font-mono text-surface-500">{form.primary_color}</span>
                </div>
              </div>
              <div>
                <label className="label">Color secundario</label>
                <div className="flex items-center gap-3">
                  <input type="color" className="w-10 h-8 rounded-lg cursor-pointer border border-surface-200"
                    value={form.secondary_color} onChange={e => setForm(f => ({ ...f, secondary_color: e.target.value }))} />
                  <span className="text-xs font-mono text-surface-500">{form.secondary_color}</span>
                </div>
              </div>
            </div>
            {/* Preview */}
            <div className="p-4 rounded-xl border border-surface-200 flex items-center gap-4 bg-surface-50">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg"
                style={{ backgroundColor: form.primary_color }}>
                {form.name?.[0] || 'L'}
              </div>
              <div>
                <p className="font-semibold text-surface-900">{form.name || 'Tu Negocio'}</p>
                <p className="text-xs text-surface-500">Vista previa de tu marca</p>
              </div>
            </div>
          </div>

          <button onClick={handleSave} disabled={saving} className="btn-primary w-full sm:w-auto" id="save-settings-btn">
            {saving ? <span className="spinner w-4 h-4" /> : 'Guardar cambios'}
          </button>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Account info */}
          <div className="card p-5">
            <h3 className="font-semibold text-surface-900 mb-3">Tu cuenta</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-surface-500">Nombre</span><span className="font-medium">{user?.full_name}</span></div>
              <div className="flex justify-between"><span className="text-surface-500">Email</span><span className="font-medium text-xs">{user?.email}</span></div>
              <div className="flex justify-between"><span className="text-surface-500">Rol</span><span className="badge-blue">{user?.role}</span></div>
            </div>
          </div>

          {/* Plan info */}
          {tenant && (
            <div className="card p-5">
              <h3 className="font-semibold text-surface-900 mb-3">Plan actual</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-surface-500">Plan</span>
                  <span className="badge-purple capitalize">{tenant.plan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500">Slug</span>
                  <span className="font-mono text-xs text-surface-600">{tenant.slug}</span>
                </div>
                {tenant.trial_days_remaining > 0 && (
                  <div className="flex justify-between">
                    <span className="text-surface-500">Prueba</span>
                    <span className="font-semibold text-brand-600">{tenant.trial_days_remaining} dias</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Password change */}
          <div className="card p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-surface-900">Seguridad</h3>
            </div>
            {!showPwSection ? (
              <button onClick={() => setShowPwSection(true)} className="btn-secondary text-sm w-full" id="show-password-btn">
                Cambiar contraseña
              </button>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-3">
                <div>
                  <label className="label text-xs" htmlFor="current-pw">Contraseña actual</label>
                  <input id="current-pw" type="password" className="input text-sm" required
                    value={passwordForm.current} onChange={e => setPasswordForm(f => ({ ...f, current: e.target.value }))} />
                </div>
                <div>
                  <label className="label text-xs" htmlFor="new-pw">Nueva contraseña</label>
                  <input id="new-pw" type="password" className="input text-sm" required minLength={6}
                    value={passwordForm.new_password} onChange={e => setPasswordForm(f => ({ ...f, new_password: e.target.value }))} />
                </div>
                <div>
                  <label className="label text-xs" htmlFor="confirm-pw">Confirmar nueva contraseña</label>
                  <input id="confirm-pw" type="password" className="input text-sm" required
                    value={passwordForm.confirm} onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowPwSection(false)} className="btn-ghost text-sm flex-1">Cancelar</button>
                  <button type="submit" disabled={changingPw} className="btn-primary text-sm flex-1" id="change-password-btn">
                    {changingPw ? <span className="spinner w-4 h-4" /> : 'Actualizar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
