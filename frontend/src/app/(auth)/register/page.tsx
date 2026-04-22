'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    business_name: '', email: '', password: '', first_name: '', last_name: '',
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/auth/register/', form);
      toast.success('¡Cuenta creada! Redirigiendo...');
      setTimeout(() => router.push('/login'), 1500);
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, string[]> } })?.response?.data;
      const msg = data ? Object.values(data).flat().join(' ') : 'Error al registrarse';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <h2 className="text-xl font-bold text-surface-900">Crear cuenta gratuita</h2>
        <p className="text-surface-500 text-sm mt-1">14 días de prueba sin tarjeta de crédito</p>
      </div>
      {[
        { id: 'business_name', label: 'Nombre del negocio', placeholder: 'Mi Negocio S.A.', type: 'text' },
        { id: 'first_name',    label: 'Nombre',             placeholder: 'Juan',             type: 'text' },
        { id: 'last_name',     label: 'Apellido',           placeholder: 'Pérez',            type: 'text' },
        { id: 'email',         label: 'Correo electrónico', placeholder: 'tu@negocio.com',   type: 'email' },
        { id: 'password',      label: 'Contraseña',         placeholder: '••••••••',         type: 'password' },
      ].map(({ id, label, placeholder, type }) => (
        <div key={id}>
          <label className="label" htmlFor={id}>{label}</label>
          <input id={id} type={type} className="input" placeholder={placeholder}
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
