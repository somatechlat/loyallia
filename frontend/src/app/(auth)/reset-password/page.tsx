'use client';
import { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

function ResetForm() {
  const searchParams = useSearchParams();
  const uid = searchParams.get('uid') || '';
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // LYL-L-SEC-020: Prevent referrer header from leaking reset token on navigation
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'referrer';
    meta.content = 'no-referrer';
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  const missingParams = !uid || !token;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return; }
    if (password !== confirm) { toast.error('Las contraseñas no coinciden'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/reset-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, token, new_password: password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || 'El enlace es inválido o ha expirado');
      }
      setDone(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al restablecer la contraseña';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (missingParams) {
    return (
      <div className="text-center space-y-4">
        <div className="w-14 h-14 mx-auto bg-red-50 rounded-full flex items-center justify-center">
          <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-surface-900">Enlace inválido</h2>
        <p className="text-surface-500 text-sm">Este enlace de restablecimiento no es válido.</p>
        <Link href="/forgot-password" className="btn-primary inline-flex items-center gap-2 mt-2">
          Solicitar nuevo enlace
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <div className="w-14 h-14 mx-auto bg-emerald-50 rounded-full flex items-center justify-center">
          <svg className="w-7 h-7 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-surface-900">Contraseña actualizada</h2>
        <p className="text-surface-500 text-sm">Tu contraseña ha sido restablecida exitosamente.</p>
        <Link href="/login" className="btn-primary inline-flex items-center gap-2 mt-2">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <h2 className="text-xl font-bold text-surface-900">Nueva contraseña</h2>
        <p className="text-surface-500 text-sm mt-1">Ingresa tu nueva contraseña.</p>
      </div>
      <div>
        <label className="label" htmlFor="new-pw">Nueva contraseña</label>
        <input id="new-pw" type="password" className="input" placeholder="Mínimo 6 caracteres"
          value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
      </div>
      <div>
        <label className="label" htmlFor="confirm-pw">Confirmar contraseña</label>
        <input id="confirm-pw" type="password" className="input" placeholder="Repite la contraseña"
          value={confirm} onChange={e => setConfirm(e.target.value)} required />
      </div>
      <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading} id="reset-pw-btn">
        {loading ? <span className="spinner w-4 h-4" /> : 'Restablecer contraseña'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><div className="spinner w-6 h-6" /></div>}>
      <ResetForm />
    </Suspense>
  );
}
