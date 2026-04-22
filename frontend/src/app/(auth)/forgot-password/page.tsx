'use client';
import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Ingresa tu correo electrónico'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/forgot-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('Error al enviar solicitud');
      setSent(true);
    } catch {
      toast.error('Error al enviar la solicitud. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <div className="w-14 h-14 mx-auto bg-emerald-50 rounded-full flex items-center justify-center">
          <svg className="w-7 h-7 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-surface-900">Correo enviado</h2>
        <p className="text-surface-500 text-sm">
          Si <strong>{email}</strong> está registrado, recibirás un enlace para restablecer tu contraseña.
        </p>
        <p className="text-surface-400 text-xs">Revisa también tu carpeta de spam.</p>
        <Link href="/login" className="btn-primary inline-flex items-center gap-2 mt-4">
          ← Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <h2 className="text-xl font-bold text-surface-900">¿Olvidaste tu contraseña?</h2>
        <p className="text-surface-500 text-sm mt-1">
          Ingresa tu correo y te enviaremos un enlace para restablecerla.
        </p>
      </div>
      <div>
        <label className="label" htmlFor="reset-email">Correo electrónico</label>
        <input
          id="reset-email"
          type="email"
          className="input"
          placeholder="tu@negocio.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading} id="forgot-pw-btn">
        {loading ? <span className="spinner w-4 h-4" /> : 'Enviar enlace de restablecimiento'}
      </button>
      <p className="text-center text-sm text-surface-500">
        <Link href="/login" className="text-brand-500 font-medium hover:underline">← Volver a iniciar sesión</Link>
      </p>
    </form>
  );
}
