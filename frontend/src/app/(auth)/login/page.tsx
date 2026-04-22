'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
        <h2 className="text-xl font-bold text-surface-900">Iniciar sesión</h2>
        <p className="text-surface-500 text-sm mt-1">Accede a tu panel de administración</p>
      </div>
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
