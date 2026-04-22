'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';

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
  const [form, setForm] = useState({
    business_name: '', email: '', password: '', first_name: '', last_name: '', phone_number: '',
  });

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
    const el = document.getElementById('google-register-btn-container');
    if (!el || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleCallback,
      auto_select: false,
      context: 'signup',
      ux_mode: 'popup',
    });
    window.google.accounts.id.renderButton(el, {
      theme: 'outline',
      size: 'large',
      width: '100%',
      text: 'signup_with',
      shape: 'pill',
      logo_alignment: 'center',
    });
  };

  const handleGoogleCallback = async (response: { credential: string }) => {
    // Show business name input for new Google registrations
    setGoogleCredential(response.credential);
    setShowGoogleBizName(true);
  };

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
      await authApi.register(form);
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
        { id: 'phone_number',  label: 'Teléfono (opcional)', placeholder: '+593991234567',   type: 'tel', autoComplete: 'tel' },
        { id: 'password',      label: 'Contraseña',         placeholder: '••••••••',         type: 'password', autoComplete: 'new-password' },
      ].map(({ id, label, placeholder, type, autoComplete }) => (
        <div key={id}>
          <label className="label" htmlFor={`register-${id}`}>{label}</label>
          <input id={`register-${id}`} name={id} type={type} className="input" placeholder={placeholder}
            autoComplete={autoComplete}
            value={form[id as keyof typeof form]} onChange={set(id)} required />
        </div>
      ))}
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
