'use client';
/**
 * LYL-H-FE-004: Register form using react-hook-form + zod.
 * LYL-M-FE-020: Client-side validation with zod schemas.
 * LYL-M-FE-032: Form validation feedback (inline error messages).
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useGoogleScript } from '@/lib/useGoogleScript';
import { registerSchema, type RegisterFormData } from '@/lib/validations';

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

/** Field wrapper with label and error message — LYL-M-FE-032 */
function FormField({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>{label}</label>
      {children}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
          <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

export default function RegisterPage() {
  const { loginWithGoogle } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showGoogleBizName, setShowGoogleBizName] = useState(false);
  const [googleCredential, setGoogleCredential] = useState('');
  const [googleBizName, setGoogleBizName] = useState('');
  const [countryCode, setCountryCode] = useState('+593');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const countryRef = useRef<HTMLDivElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Phone verification state
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyStep, setVerifyStep] = useState<'idle' | 'sent' | 'verified'>('idle');
  const [verifySid, setVerifySid] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [verifyError, setVerifyError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      business_name: '',
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      phone_number: '',
    },
  });

  const phoneNumber = watch('phone_number');
  const fullPhone = phoneNumber ? `${countryCode}${phoneNumber.replace(/^0+/, '')}` : '';

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

  useEffect(() => {
    authApi.googleConfig()
      .then(({ data }) => {
        if (data.enabled && data.client_id) {
          // LYL-H-FE-004b: Skip Google OAuth on localhost to avoid
          // "origin not allowed" console errors in development/E2E.
          const isLocalhost = typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
          if (isLocalhost) {
            setGoogleEnabled(false);
            return;
          }
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

  const handleSendOtp = async () => {
    if (!fullPhone) {
      toast.error('Ingresa tu número de teléfono primero');
      return;
    }
    setVerifyLoading(true);
    setVerifyError('');
    try {
      const resp = await authApi.phoneVerifyStart(fullPhone, 'sms');
      if (resp.data.success) {
        setVerifyStep('sent');
        setVerifySid(resp.data.sid);
        toast.success('Código enviado. Revisa tu teléfono.');
      } else {
        setVerifyError(resp.data.message || 'Error al enviar código');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setVerifyError(msg || 'Error al enviar código');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleCheckOtp = async () => {
    if (!otpInput || otpInput.length < 4) {
      toast.error('Ingresa el código completo');
      return;
    }
    setVerifyLoading(true);
    setVerifyError('');
    try {
      const resp = await authApi.phoneVerifyCheck(fullPhone, otpInput, verifySid);
      if (resp.data.valid) {
        setPhoneVerified(true);
        setVerifyStep('verified');
        toast.success('¡Teléfono verificado!');
      } else {
        setVerifyError(resp.data.message || 'Código inválido');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setVerifyError(msg || 'Error al verificar código');
    } finally {
      setVerifyLoading(false);
    }
  };

  const onSubmit = async (data: RegisterFormData) => {
    // Require phone verification if phone is provided
    if (fullPhone && !phoneVerified) {
      toast.error('Verifica tu teléfono antes de continuar');
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        ...data,
        phone_number: fullPhone,
        phone_verification_sid: verifySid,
      };
      await authApi.register(submitData);
      toast.success('¡Cuenta creada! Redirigiendo al inicio de sesión...');
      setTimeout(() => router.push('/login'), 1500);
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: Record<string, string | string[]> } })?.response?.data;
      if (errData) {
        const msg = typeof errData.error === 'string'
          ? errData.error
          : Object.values(errData).flat().join(' ');
        toast.error(msg);
      } else {
        toast.error('Error al registrarse. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Google Business Name step
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <h2 className="text-xl font-bold text-surface-900 dark:text-surface-100">Crear cuenta gratuita</h2>
        <p className="text-surface-500 text-sm mt-1">5 días de prueba sin tarjeta de crédito</p>
      </div>

      {/* Google OAuth Button */}
      {googleEnabled && (
        <>
          <div className="relative">
            {googleLoading && (
              <div className="absolute inset-0 bg-white dark:bg-surface-900/80 flex items-center justify-center z-10 rounded-xl">
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

      <FormField label="Nombre del negocio" htmlFor="register-business_name" error={errors.business_name?.message}>
        <input
          id="register-business_name"
          type="text"
          className={`input ${errors.business_name ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}`}
          placeholder="Mi Negocio S.A."
          autoComplete="organization"
          aria-invalid={!!errors.business_name}
          {...register('business_name')}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Nombre" htmlFor="register-first_name" error={errors.first_name?.message}>
          <input
            id="register-first_name"
            type="text"
            className={`input ${errors.first_name ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}`}
            placeholder="Juan"
            autoComplete="given-name"
            aria-invalid={!!errors.first_name}
            {...register('first_name')}
          />
        </FormField>
        <FormField label="Apellido" htmlFor="register-last_name" error={errors.last_name?.message}>
          <input
            id="register-last_name"
            type="text"
            className={`input ${errors.last_name ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}`}
            placeholder="Pérez"
            autoComplete="family-name"
            aria-invalid={!!errors.last_name}
            {...register('last_name')}
          />
        </FormField>
      </div>

      <FormField label="Correo electrónico" htmlFor="register-email" error={errors.email?.message}>
        <input
          id="register-email"
          type="email"
          className={`input ${errors.email ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}`}
          placeholder="tu@negocio.com"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
      </FormField>

      <FormField label="Contraseña" htmlFor="register-password" error={errors.password?.message}>
        <div className="relative">
          <input
            id="register-password"
            type={showPassword ? 'text' : 'password'}
            className={`input pr-10 ${errors.password ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}`}
            placeholder="••••••••"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
            {showPassword ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>
      </FormField>

      {/* Phone with country prefix selector + Verification */}
      <div>
        <label className="label" htmlFor="register-phone_number">Teléfono <span className="text-red-400">*</span></label>
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
            type="tel"
            className="input flex-1"
            placeholder="991234567"
            autoComplete="tel"
            {...register('phone_number')}
            disabled={phoneVerified}
          />
        </div>
        {errors.phone_number && (
          <p className="text-xs text-red-500 mt-1">{errors.phone_number.message}</p>
        )}

        {/* Verification UI */}
        <div className="mt-2 space-y-2">
          {verifyStep === 'idle' && (
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={verifyLoading || !fullPhone || phoneVerified}
              className="btn-secondary w-full justify-center text-sm py-2"
            >
              {verifyLoading ? <span className="spinner w-3 h-3" /> : '📱 Verificar teléfono'}
            </button>
          )}

          {verifyStep === 'sent' && !phoneVerified && (
            <div className="space-y-2">
              <p className="text-xs text-surface-500">Ingresa el código de 6 dígitos enviado a tu teléfono</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="123456"
                  className="input flex-1 text-center tracking-widest font-mono"
                  value={otpInput}
                  onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
                />
                <button
                  type="button"
                  onClick={handleCheckOtp}
                  disabled={verifyLoading || otpInput.length < 4}
                  className="btn-primary px-4"
                >
                  {verifyLoading ? <span className="spinner w-3 h-3" /> : 'Verificar'}
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={verifyLoading}
                  className="text-xs text-brand-500 hover:underline"
                >
                  Reenviar código
                </button>
                <button
                  type="button"
                  onClick={() => { setVerifyStep('idle'); setOtpInput(''); setVerifyError(''); }}
                  className="text-xs text-surface-400 hover:underline"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {phoneVerified && (
            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-xl text-sm">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              <span className="font-medium">Teléfono verificado</span>
            </div>
          )}

          {verifyError && (
            <p className="text-xs text-red-500">{verifyError}</p>
          )}
        </div>
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
