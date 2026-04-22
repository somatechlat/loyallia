'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';

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
    if (!form.business_name.trim() || !form.email.trim() || !form.password.trim()
      || !form.first_name.trim() || !form.last_name.trim()) {
      toast.error('Todos los campos son obligatorios');
      return;
    }
    if (form.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <h2 className="text-xl font-bold text-surface-900 dark:text-surface-100">Crear cuenta gratuita</h2>
        <p className="text-surface-500 text-sm mt-1">5 días de prueba sin tarjeta de crédito</p>
      </div>
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
