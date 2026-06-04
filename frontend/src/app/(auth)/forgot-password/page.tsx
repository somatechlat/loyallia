'use client';
import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useI18n } from '@/lib/i18n';

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error(t('auth.forgotPassword.toast.emailRequired')); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/forgot-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error(t('auth.forgotPassword.toast.sendError'));
      setSent(true);
    } catch {
      toast.error(t('auth.forgotPassword.toast.genericError'));
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
        <h2 className="text-xl font-bold text-surface-900 dark:text-white">{t('auth.forgotPassword.sentTitle')}</h2>
        <p className="text-surface-500 text-sm">
          {t('auth.forgotPassword.sentDescription', { email })}
        </p>
        <p className="text-surface-400 text-xs">{t('auth.forgotPassword.sentSpamNote')}</p>
        <Link href="/login" className="btn-primary inline-flex items-center gap-2 mt-4">
          {t('auth.forgotPassword.sentBackButton')}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <h2 className="text-xl font-bold text-surface-900 dark:text-white">{t('auth.forgotPassword.title')}</h2>
        <p className="text-surface-500 text-sm mt-1">
          {t('auth.forgotPassword.subtitle')}
        </p>
      </div>
      <div>
        <label className="label" htmlFor="reset-email">{t('auth.forgotPassword.emailLabel')}</label>
        <input
          id="reset-email"
          type="email"
          className="input"
          placeholder={t('auth.forgotPassword.emailPlaceholder')}
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading} id="forgot-pw-btn">
        {loading ? <span className="spinner w-4 h-4" /> : t('auth.forgotPassword.submitButton')}
      </button>
      <p className="text-center text-sm text-surface-500">
        <Link href="/login" className="text-brand-500 font-medium hover:underline">{t('auth.forgotPassword.backToLogin')}</Link>
      </p>
    </form>
  );
}
