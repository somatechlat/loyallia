'use client';
/**
 * LYL-H-FE-004: Login form using react-hook-form + zod.
 * LYL-M-FE-020: Client-side validation with zod schemas.
 * LYL-M-FE-032: Form validation feedback (inline error messages).
 */
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth';
import { authApi } from '@/lib/api';
import { useGoogleScript } from '@/lib/useGoogleScript';
import { loginSchema, type LoginFormData } from '@/lib/validations';

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

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

  useGoogleScript({
    enabled: googleEnabled,
    clientId: googleClientId,
    containerId: 'google-login-btn-container',
    context: 'signin',
    text: 'signin_with',
    onCallback: handleGoogleCallback,
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      const user = await login(data.email, data.password);
      if (user.role === 'STAFF') {
        router.replace('/scanner/scan');
      } else {
        router.replace('/');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      const errorMsg = msg || 'Credenciales incorrectas';
      setError('root', { message: errorMsg });
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
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

      {/* LYL-M-FE-032: Inline validation feedback */}
      <div>
        <label className="label" htmlFor="email">Correo electrónico</label>
        <input
          id="email"
          type="email"
          className={`input ${errors.email ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}`}
          placeholder="tu@negocio.com"
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          {...register('email')}
        />
        {errors.email && (
          <p id="email-error" role="alert" className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
            <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label className="label" htmlFor="password">Contraseña</label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            className={`input pr-10 ${errors.password ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}`}
            placeholder="••••••••"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
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
        {errors.password && (
          <p id="password-error" role="alert" className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
            <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {errors.password.message}
          </p>
        )}
        <div className="text-right mt-1">
          <Link href="/forgot-password" className="text-xs text-brand-500 hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </div>

      {errors.root && (
        <p role="alert" className="text-sm text-red-500 text-center bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
          {errors.root.message}
        </p>
      )}

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
