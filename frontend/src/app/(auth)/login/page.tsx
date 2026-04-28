'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth';
import { authApi } from '@/lib/api';
import { useGoogleScript } from '@/lib/useGoogleScript';

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

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
    setGoogleLoading(true);
    try {
      const user = await loginWithGoogle(response.credential, undefined, true);
      if (user.role === 'STAFF') {
        router.replace('/scanner/scan');
      } else {
        router.replace('/');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Error al iniciar sesión con Google');
    } finally {
      setGoogleLoading(false);
    }
  }, [loginWithGoogle, router]);

  // Load Google Identity Services script and render button
  useGoogleScript({
    enabled: googleEnabled,
    clientId: googleClientId,
    containerId: 'google-login-btn-container',
    context: 'signin',
    text: 'signin_with',
    onCallback: handleGoogleCallback,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { email?: string; password?: string; general?: string } = {};
    if (!email) newErrors.email = 'El correo electrónico es obligatorio';
    if (!password) newErrors.password = 'La contraseña es obligatoria';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'STAFF') {
        router.replace('/scanner/scan');
      } else {
        router.replace('/');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setErrors({ general: msg || 'Credenciales incorrectas' });
      toast.error(msg || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <h2 className="text-xl font-bold text-surface-900 dark:text-white">Iniciar sesión</h2>
        <p className="text-surface-500 text-sm mt-1">Accede a tu panel de administración</p>
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
            <div id="google-login-btn-container" className="flex justify-center" />
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

      <div>
        <label className="label" htmlFor="email">Correo electrónico</label>
        <input id="email" type="email" className="input" placeholder="tu@negocio.com"
          value={email} onChange={e => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: undefined })); }}
          aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined}
          required />
        {errors.email && <p id="email-error" role="alert" className="text-xs text-red-500 mt-1">{errors.email}</p>}
      </div>
      <div>
        <label className="label" htmlFor="password">Contraseña</label>
        <div className="relative">
          <input id="password" type={showPassword ? 'text' : 'password'} className="input pr-10" placeholder="••••••••"
            value={password} onChange={e => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: undefined })); }}
            aria-invalid={!!errors.password} aria-describedby={errors.password ? 'password-error' : undefined}
            required />
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}>
            {showPassword ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>
        {errors.password && <p id="password-error" role="alert" className="text-xs text-red-500 mt-1">{errors.password}</p>}
        <div className="text-right mt-1">
          <Link href="/forgot-password" className="text-xs text-brand-500 hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </div>
      {errors.general && <p role="alert" className="text-sm text-red-500 text-center">{errors.general}</p>}
      <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading} id="login-btn">
        {loading ? <span className="spinner w-4 h-4" /> : 'Iniciar sesión'}
      </button>
      <p className="text-center text-sm text-surface-500">
        ¿No tienes cuenta?{' '}
        <Link href="/register" className="text-brand-500 font-medium hover:underline">Regístrate gratis</Link>
      </p>
    </form>
  );
}
