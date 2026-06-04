'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import { portalApiClient } from '@/lib/portal-api';
import { useI18n } from '@/lib/i18n';

export default function PortalPrivacyPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [loadingExport, setLoadingExport] = useState(false);
  const [loadingDeleteData, setLoadingDeleteData] = useState(false);
  const [loadingDeleteAccount, setLoadingDeleteAccount] = useState(false);

  useEffect(() => {
    const token = Cookies.get('portal_token');
    if (!token) {
      router.replace('/portal/login');
    }
  }, [router]);

  const handleExport = async () => {
    setLoadingExport(true);
    try {
      const { data } = await portalApiClient.exportData();
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `loyallia-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('portal.privacy.toast.exportSuccess'));
    } catch {
      toast.error(t('portal.privacy.toast.exportError'));
    } finally {
      setLoadingExport(false);
    }
  };

  const handleDeleteData = async () => {
    if (!password) {
      toast.error(t('portal.privacy.validation.passwordRequired'));
      return;
    }
    if (!confirm(t('portal.privacy.confirm.deleteData'))) return;
    setLoadingDeleteData(true);
    try {
      const { data } = await portalApiClient.deleteData(password);
      toast.success(data.message || t('portal.privacy.toast.dataDeleted'));
      setPassword('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(msg || t('portal.privacy.toast.dataDeleteError'));
    } finally {
      setLoadingDeleteData(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!password) {
      toast.error(t('portal.privacy.validation.passwordRequired'));
      return;
    }
    if (confirmPhrase.trim().toUpperCase() !== t('portal.privacy.confirmPhrase')) {
      toast.error(t('portal.privacy.toast.confirmPhraseError'));
      return;
    }
    if (!confirm(t('portal.privacy.confirm.deleteAccount'))) return;
    setLoadingDeleteAccount(true);
    try {
      const { data } = await portalApiClient.deleteAccount(password, confirmPhrase.trim());
      toast.success(data.message || t('portal.privacy.toast.accountDeleted'));
      Cookies.remove('portal_token');
      router.replace('/portal/login');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(msg || t('portal.privacy.toast.accountDeleteError'));
    } finally {
      setLoadingDeleteAccount(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      <header className="bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-lg">L</span>
            </div>
            <div>
              <h1 className="font-bold text-surface-900 dark:text-white text-lg leading-tight">{t('portal.privacy.title')}</h1>
              <p className="text-xs text-surface-500">{t('portal.privacy.subtitle')}</p>
            </div>
          </div>
          <Link
            href="/portal"
            className="text-sm text-brand-600 hover:text-brand-700 px-3 py-2 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
          >
            {t('portal.privacy.backToCards')}
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Export Data */}
        <section className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 p-6">
          <h2 className="text-lg font-bold text-surface-900 dark:text-white mb-2">{t('portal.privacy.exportSection.title')}</h2>
          <p className="text-sm text-surface-500 mb-4">
            {t('portal.privacy.exportSection.description')}
          </p>
          <button
            onClick={handleExport}
            disabled={loadingExport}
            className="btn-primary px-5 py-2.5 text-sm"
          >
            {loadingExport ? <span className="spinner w-4 h-4" /> : t('portal.privacy.exportSection.downloadButton')}
          </button>
        </section>

        {/* Delete Data */}
        <section className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 p-6">
          <h2 className="text-lg font-bold text-surface-900 dark:text-white mb-2">{t('portal.privacy.deleteDataSection.title')}</h2>
          <p className="text-sm text-surface-500 mb-4">
            {t('portal.privacy.deleteDataSection.description')}
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              className="input flex-1"
              placeholder={t('portal.privacy.deleteDataSection.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              onClick={handleDeleteData}
              disabled={loadingDeleteData}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loadingDeleteData ? <span className="spinner w-4 h-4" /> : t('portal.privacy.deleteDataSection.button')}
            </button>
          </div>
        </section>

        {/* Delete Account */}
        <section className="bg-white dark:bg-surface-900 rounded-2xl border border-red-200 dark:border-red-900/30 p-6">
          <h2 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">{t('portal.privacy.deleteAccountSection.title')}</h2>
          <p className="text-sm text-surface-500 mb-4">
            {t('portal.privacy.deleteAccountSection.description')}
          </p>
          <div className="space-y-3">
            <input
              type="password"
              className="input w-full"
              placeholder={t('portal.privacy.deleteAccountSection.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              type="text"
              className="input w-full"
              placeholder={t('portal.privacy.deleteAccountSection.confirmPlaceholder')}
              value={confirmPhrase}
              onChange={(e) => setConfirmPhrase(e.target.value)}
            />
            <button
              onClick={handleDeleteAccount}
              disabled={loadingDeleteAccount}
              className="w-full px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loadingDeleteAccount ? <span className="spinner w-4 h-4" /> : t('portal.privacy.deleteAccountSection.button')}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
