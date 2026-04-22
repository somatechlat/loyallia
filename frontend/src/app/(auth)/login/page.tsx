'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth';
import { authApi } from '@/lib/api';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, config: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

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

  // Load Google Identity Services script and render button
  useEffect(() => {
    if (!googleEnabled || !googleClientId) return;

    const scriptId = 'google-gsi-script';
    if (document.getElementById(scriptId)) {
      initGoogleButton();
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => initGoogleButton();
    document.head.appendChild(script);
  }, [googleEnabled, googleClientId]);

  const initGoogleButton = () => {
    const el = document.getElementById('google-login-btn-container');
    if (!el || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleCallback,
      auto_select: false,
      context: 'signin',
      ux_mode: 'popup',
    });
    window.google.accounts.id.renderButton(el, {
      theme: 'outline',
      size: 'large',
      width: '100%',
      text: 'signin_with',
      shape: 'pill',
      logo_alignment: 'center',
    });
  };

  const handleGoogleCallback = async (response: { credential: string }) => {
    setGoogleLoading(true);
    try {
      const user = await loginWithGoogle(response.credential);
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Completa todos los campos'); return; }
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
          value={email} onChange={e => setEmail(e.target.value)} required />
      </div>
      <div>
        <label className="label" htmlFor="password">Contraseña</label>
        <input id="password" type="password" className="input" placeholder="••••••••"
          value={password} onChange={e => setPassword(e.target.value)} required />
        <div className="text-right mt-1">
          <Link href="/forgot-password" className="text-xs text-brand-500 hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </div>
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
