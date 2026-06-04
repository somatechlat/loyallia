'use client';
import { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useI18n } from '@/lib/i18n';

function ResetForm() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const uid = searchParams.get('uid') || '';
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
    if (password.length < 6) { toast.error(t('auth.resetPassword.toast.minLength')); return; }
    if (password !== confirm) { toast.error(t('auth.resetPassword.toast.passwordMismatch')); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/reset-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, token, new_password: password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || t('auth.resetPassword.toast.invalidLink'));
      }
      setDone(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('auth.resetPassword.toast.genericError');
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
        <h2 className="text-xl font-bold text-surface-900 dark:text-white">{t('auth.resetPassword.invalidTitle')}</h2>
        <p className="text-surface-500 text-sm">{t('auth.resetPassword.invalidDescription')}</p>
        <Link href="/forgot-password" className="btn-primary inline-flex items-center gap-2 mt-2">
          {t('auth.resetPassword.invalidRequestNewLink')}
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
        <h2 className="text-xl font-bold text-surface-900 dark:text-white">{t('auth.resetPassword.successTitle')}</h2>
        <p className="text-surface-500 text-sm">{t('auth.resetPassword.successDescription')}</p>
        <Link href="/login" className="btn-primary inline-flex items-center gap-2 mt-2">
          {t('auth.resetPassword.successLoginButton')}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <h2 className="text-xl font-bold text-surface-900 dark:text-white">{t('auth.resetPassword.title')}</h2>
        <p className="text-surface-500 text-sm mt-1">{t('auth.resetPassword.subtitle')}</p>
      </div>
      <div>
        <label className="label" htmlFor="new-pw">{t('auth.resetPassword.newPasswordLabel')}</label>
        <div className="relative">
          <input id="new-pw" type={showPassword ? 'text' : 'password'} className="input pr-10" placeholder={t('auth.resetPassword.newPasswordPlaceholder')}
            value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
            aria-label={showPassword ? t('auth.resetPassword.hidePassword') : t('auth.resetPassword.showPassword')}>
            {showPassword ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="confirm-pw">{t('auth.resetPassword.confirmPasswordLabel')}</label>
        <div className="relative">
          <input id="confirm-pw" type={showConfirm ? 'text' : 'password'} className="input pr-10" placeholder={t('auth.resetPassword.confirmPasswordPlaceholder')}
            value={confirm} onChange={e => setConfirm(e.target.value)} required />
          <button type="button" onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
            aria-label={showConfirm ? t('auth.resetPassword.hideConfirmPassword') : t('auth.resetPassword.showConfirmPassword')}>
            {showConfirm ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>
      </div>
      <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading} id="reset-pw-btn">
        {loading ? <span className="spinner w-4 h-4" /> : t('auth.resetPassword.submitButton')}
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
