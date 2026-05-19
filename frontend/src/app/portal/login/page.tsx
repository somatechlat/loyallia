'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import { portalApiClient } from '@/lib/portal-api';

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'generate' | 'login'>('generate');
  const [showPassword, setShowPassword] = useState(false);

  const handleGeneratePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Ingresa tu correo electrónico');
      return;
    }
    setLoading(true);
    try {
      const { data } = await portalApiClient.generatePassword(email.trim().toLowerCase());
      toast.success(data.message || 'Si tu correo está registrado, recibirás una contraseña temporal.');
      setStep('login');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(msg || 'No se pudo enviar el correo. Intenta más tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Ingresa tu correo y contraseña');
      return;
    }
    setLoading(true);
    try {
      const { data } = await portalApiClient.login(email.trim().toLowerCase(), password);
      if (data.access_token) {
        const isSecure = window.location.protocol === 'https:';
        Cookies.set('portal_token', data.access_token, { expires: 1, secure: isSecure, sameSite: 'strict' });
        toast.success(data.message || 'Bienvenido a tu portal de cliente.');
        router.replace('/portal');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(msg || 'Correo o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-600 via-brand-500 to-purple-600 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur rounded-2xl mb-4 border border-white/30">
            <span className="text-2xl font-black text-white">L</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Loyallia</h1>
          <p className="text-white/70 mt-1 text-sm">Portal de Cliente</p>
        </div>

        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-2xl p-8">
          {step === 'generate' ? (
            <form onSubmit={handleGeneratePassword} className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-surface-900 dark:text-white">Generar contraseña</h2>
                <p className="text-surface-500 text-sm mt-1">
                  Ingresa tu correo y te enviaremos una contraseña temporal para acceder a tus tarjetas.
                </p>
              </div>
              <div>
                <label className="label" htmlFor="email">Correo electrónico</label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading}>
                {loading ? <span className="spinner w-4 h-4" /> : 'Enviar contraseña'}
              </button>
              <p className="text-center text-sm text-surface-500">
                ¿Ya tienes contraseña?{' '}
                <button type="button" onClick={() => setStep('login')} className="text-brand-500 font-medium hover:underline">
                  Iniciar sesión
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-surface-900 dark:text-white">Iniciar sesión</h2>
                <p className="text-surface-500 text-sm mt-1">
                  Accede a todas tus tarjetas de fidelización en un solo lugar.
                </p>
              </div>
              <div>
                <label className="label" htmlFor="email">Correo electrónico</label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="password">Contraseña</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading}>
                {loading ? <span className="spinner w-4 h-4" /> : 'Iniciar sesión'}
              </button>
              <p className="text-center text-sm text-surface-500">
                ¿No tienes contraseña?{' '}
                <button type="button" onClick={() => setStep('generate')} className="text-brand-500 font-medium hover:underline">
                  Generar contraseña
                </button>
              </p>
            </form>
          )}
        </div>

        <div className="text-center mt-6 space-y-2">
          <p className="text-[10px] text-white/50 space-x-3">
            <Link href="/legal/privacy" className="hover:text-white transition-colors">Política de Privacidad</Link>
          </p>
          <p className="text-[10px] text-white/30 tracking-wide">
            <span className="font-semibold text-white/50">Loyallia</span> · Intelligent Rewards
          </p>
        </div>
      </div>
    </div>
  );
}
