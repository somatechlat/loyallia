'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useGoogleScript } from '@/lib/useGoogleScript';

const COUNTRY_CODES = [
  { code: '+593', country: 'Ecuador', flag: '🇪🇨' },
  { code: '+57',  country: 'Colombia', flag: '🇨🇴' },
  { code: '+51',  country: 'Perú', flag: '🇵🇪' },
  { code: '+56',  country: 'Chile', flag: '🇨🇱' },
  { code: '+54',  country: 'Argentina', flag: '🇦🇷' },
  { code: '+52',  country: 'México', flag: '🇲🇽' },
  { code: '+55',  country: 'Brasil', flag: '🇧🇷' },
  { code: '+58',  country: 'Venezuela', flag: '🇻🇪' },
  { code: '+591', country: 'Bolivia', flag: '🇧🇴' },
  { code: '+595', country: 'Paraguay', flag: '🇵🇾' },
  { code: '+598', country: 'Uruguay', flag: '🇺🇾' },
  { code: '+507', country: 'Panamá', flag: '🇵🇦' },
  { code: '+506', country: 'Costa Rica', flag: '🇨🇷' },
  { code: '+503', country: 'El Salvador', flag: '🇸🇻' },
  { code: '+502', country: 'Guatemala', flag: '🇬🇹' },
  { code: '+504', country: 'Honduras', flag: '🇭🇳' },
  { code: '+505', country: 'Nicaragua', flag: '🇳🇮' },
  { code: '+1',   country: 'EE.UU.', flag: '🇺🇸' },
  { code: '+34',  country: 'España', flag: '🇪🇸' },
  { code: '+44',  country: 'Reino Unido', flag: '🇬🇧' },
  { code: '+49',  country: 'Alemania', flag: '🇩🇪' },
  { code: '+33',  country: 'Francia', flag: '🇫🇷' },
  { code: '+39',  country: 'Italia', flag: '🇮🇹' },
  { code: '+86',  country: 'China', flag: '🇨🇳' },
  { code: '+81',  country: 'Japón', flag: '🇯🇵' },
];

export default function RegisterPage() {
  const { loginWithGoogle } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGoogleBizName, setShowGoogleBizName] = useState(false);
  const [googleCredential, setGoogleCredential] = useState('');
  const [googleBizName, setGoogleBizName] = useState('');
  const [countryCode, setCountryCode] = useState('+593');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const countryRef = useRef<HTMLDivElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [form, setForm] = useState({
    business_name: '', email: '', password: '', first_name: '', last_name: '', phone_number: '',
  });

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) setShowCountryDropdown(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredCountries = COUNTRY_CODES.filter(c =>
    phoneSearch === '' || c.country.toLowerCase().includes(phoneSearch.toLowerCase()) || c.code.includes(phoneSearch)
  );

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    authApi.googleConfig()
      .then(({ data }) => {
        if (data.enabled && data.client_id) {
          setGoogleEnabled(true);
          setGoogleClientId(data.client_id);
        }
      })
      .catch(() => {/* Google OAuth not available */});
  }, []);

  const handleGoogleCallback = useCallback(async (response: { credential: string }) => {
    setGoogleCredential(response.credential);
    setShowGoogleBizName(true);
  }, []);

  // Load Google Identity Services script and render button
  useGoogleScript({
    enabled: googleEnabled,
    clientId: googleClientId,
    containerId: 'google-register-btn-container',
    context: 'signup',
    text: 'signup_with',
    onCallback: handleGoogleCallback,
  });

  const completeGoogleRegistration = async () => {
    if (!googleBizName.trim()) {
      toast.error('Ingresa el nombre de tu negocio');
      return;
    }
    setGoogleLoading(true);
    try {
      await loginWithGoogle(googleCredential, googleBizName.trim());
      toast.success('¡Cuenta creada con Google!');
      router.replace('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Error al registrarse con Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.business_name.trim() || !form.email.trim() || !form.password.trim()
      || !form.first_name.trim() || !form.last_name.trim()) {
      toast.error('Todos los campos son obligatorios');
      return;
    }
    if (form.password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setLoading(true);
    try {
      const submitData = {
        ...form,
        phone_number: form.phone_number ? `${countryCode}${form.phone_number.replace(/^0+/, '')}` : '',
      };
      await authApi.register(submitData);
      toast.success('¡Cuenta creada! Redirigiendo al inicio de sesión...');
      setTimeout(() => router.push('/login'), 1500);
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, string | string[]> } })?.response?.data;
      if (data) {
        const msg = typeof data.error === 'string'
          ? data.error
          : Object.values(data).flat().join(' ');
        toast.error(msg);
      } else {
        toast.error('Error al registrarse. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Google Business Name step (shown after Google sign-in for new users)
  if (showGoogleBizName) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-surface-900 dark:text-white">Un paso más</h2>
          <p className="text-surface-500 text-sm mt-1">
            Tu cuenta de Google fue verificada. Ahora ingresa el nombre de tu negocio para completar el registro.
          </p>
        </div>
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Cuenta de Google verificada</p>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="google-biz-name">Nombre del negocio</label>
          <input
            id="google-biz-name"
            type="text"
            className="input"
            placeholder="Mi Negocio S.A."
            value={googleBizName}
            onChange={e => setGoogleBizName(e.target.value)}
            autoFocus
            required
          />
        </div>
        <button
          type="button"
          onClick={completeGoogleRegistration}
          className="btn-primary w-full justify-center py-3"
          disabled={googleLoading}
          id="google-register-complete-btn"
        >
          {googleLoading ? <span className="spinner w-4 h-4" /> : '🚀 Crear cuenta gratis'}
        </button>
        <button
          type="button"
          onClick={() => { setShowGoogleBizName(false); setGoogleCredential(''); }}
          className="btn-secondary w-full justify-center"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <h2 className="text-xl font-bold text-surface-900 dark:text-surface-100">Crear cuenta gratuita</h2>
        <p className="text-surface-500 text-sm mt-1">5 días de prueba sin tarjeta de crédito</p>
      </div>

      {/* Google OAuth Button */}
      {googleEnabled && (
        <>
          <div className="relative">
            {googleLoading && (
              <div className="absolute inset-0 bg-white/80 dark:bg-surface-900/80 flex items-center justify-center z-10 rounded-xl">
                <span className="spinner w-5 h-5" />
              </div>
            )}
            <div id="google-register-btn-container" className="flex justify-center" />
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-surface-200 dark:border-surface-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-surface-900 px-4 text-surface-400">o con tu correo</span>
            </div>
          </div>
        </>
      )}

      {[
        { id: 'business_name', label: 'Nombre del negocio', placeholder: 'Mi Negocio S.A.', type: 'text', autoComplete: 'organization' },
        { id: 'first_name',    label: 'Nombre',             placeholder: 'Juan',             type: 'text', autoComplete: 'given-name' },
        { id: 'last_name',     label: 'Apellido',           placeholder: 'Pérez',            type: 'text', autoComplete: 'family-name' },
        { id: 'email',         label: 'Correo electrónico', placeholder: 'tu@negocio.com',   type: 'email', autoComplete: 'email' },
        { id: 'password',      label: 'Contraseña',         placeholder: '••••••••',         type: 'password', autoComplete: 'new-password' },
      ].map(({ id, label, placeholder, type, autoComplete }) => (
        <div key={id}>
          <label className="label" htmlFor={`register-${id}`}>{label}</label>
          <input id={`register-${id}`} name={id} type={type} className="input" placeholder={placeholder}
            autoComplete={autoComplete}
            value={form[id as keyof typeof form]} onChange={set(id)} required />
        </div>
      ))}

      {/* Phone with country prefix selector */}
      <div>
        <label className="label" htmlFor="register-phone_number">Teléfono (opcional)</label>
        <div className="flex gap-2">
          <div className="relative" ref={countryRef}>
            <button
              type="button"
              className="input flex items-center gap-1.5 min-w-[110px] text-sm"
              onClick={() => { setShowCountryDropdown(!showCountryDropdown); setHighlightedIndex(-1); }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setShowCountryDropdown(false); }
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowCountryDropdown(!showCountryDropdown); setHighlightedIndex(-1); }
              }}
              aria-haspopup="listbox"
              aria-expanded={showCountryDropdown}
              aria-label={`Código de país: ${COUNTRY_CODES.find(c => c.code === countryCode)?.country} ${countryCode}`}
              id="country-code-btn"
            >
              <span>{COUNTRY_CODES.find(c => c.code === countryCode)?.flag}</span>
              <span className="font-mono text-xs">{countryCode}</span>
              <svg className="w-3 h-3 ml-auto text-surface-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {showCountryDropdown && (
              <div className="absolute top-full left-0 mt-1 w-60 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-2xl z-50 max-h-60 overflow-hidden flex flex-col"
                role="listbox" aria-label="Seleccionar código de país" id="country-listbox">
                <div className="p-2 border-b border-surface-100 dark:border-surface-700">
                  <input
                    type="text"
                    className="input text-xs py-1.5"
                    placeholder="Buscar país..."
                    value={phoneSearch}
                    onChange={e => { setPhoneSearch(e.target.value); setHighlightedIndex(-1); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') { setShowCountryDropdown(false); }
                      if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIndex(0); }
                    }}
                    autoFocus
                    id="country-search"
                    aria-label="Buscar país"
                    aria-controls="country-listbox"
                  />
                </div>
                <div className="overflow-y-auto max-h-48" role="group">
                  {filteredCountries.map((c, idx) => (
                    <button
                      key={c.code}
                      type="button"
                      role="option"
                      aria-selected={countryCode === c.code}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors ${
                        countryCode === c.code ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 font-semibold' : ''
                      } ${highlightedIndex === idx ? 'bg-surface-100 dark:bg-surface-700' : ''}`}
                      onClick={() => { setCountryCode(c.code); setShowCountryDropdown(false); setPhoneSearch(''); }}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                    >
                      <span className="text-base">{c.flag}</span>
                      <span className="flex-1 text-left truncate">{c.country}</span>
                      <span className="font-mono text-xs text-surface-400">{c.code}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <input
            id="register-phone_number"
            name="phone_number"
            type="tel"
            className="input flex-1"
            placeholder="991234567"
            autoComplete="tel"
            value={form.phone_number}
            onChange={set('phone_number')}
          />
        </div>
        <p className="text-[10px] text-surface-400 mt-1">Se enviará {countryCode} + número al registrar</p>
      </div>
      <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading} id="register-btn">
        {loading ? <span className="spinner w-4 h-4" /> : 'Crear cuenta gratis'}
      </button>
      <p className="text-center text-sm text-surface-500">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-brand-500 font-medium hover:underline">Inicia sesión</Link>
      </p>
    </form>
  );
}
