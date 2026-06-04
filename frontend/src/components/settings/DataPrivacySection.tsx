'use client';
import { useState } from 'react';
import { AlertTriangle } from '@/components/ui/LucideIcons';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import { UserRole } from '@/types';
import { APP_CONFIG } from '@/lib/constants';
import toast from 'react-hot-toast';
import { useI18n } from '@/lib/i18n';

/**
 * Props for the DataPrivacySection component.
 */
interface DataPrivacySectionProps {
  /** Role of the current user */
  userRole: string | undefined;
}

/**
 * @description LOPDP Data Rights Section for exporting and deleting account data.
 * LYL-FR-DPR-020 / LYL-FR-DPR-025: LOPDP Data Rights Section
 * Settings sidebar — OWNER only.
 * - Export all tenant data (Art. 17/20)
 * - Delete account with confirmation (Art. 18)
 */
export default function DataPrivacySection({ userRole }: DataPrivacySectionProps) {
  const { t } = useI18n();
  const [exporting, setExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const DELETION_PHRASE = t('settings.privacy.deletionPhrase');

  if (userRole !== UserRole.OWNER) return null;

  const handleExportData = async () => {
    setExporting(true);
    const toastId = toast.loading(t('settings.privacy.exportLoading'));
    try {
      const response = await api.get('/api/v1/tenants/data-export/', {
        responseType: 'blob',
        timeout: APP_CONFIG.LONG_OPERATION_TIMEOUT,
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toISOString().slice(0, 10);
      link.setAttribute('download', `loyallia_datos_completos_${date}.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(t('settings.privacy.exportSuccess'), { id: toastId });
    } catch {
      toast.error(t('settings.privacy.exportError'), { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deletePhrase !== DELETION_PHRASE) {
      toast.error(t('settings.privacy.phraseMismatchError'));
      return;
    }
    if (!deletePassword) {
      toast.error(t('settings.privacy.passwordRequiredError'));
      return;
    }
    setDeleting(true);
    const toastId = toast.loading(t('settings.privacy.deleteLoading'));
    try {
      const response = await api.post('/api/v1/tenants/delete-account/', {
        confirmation_phrase: deletePhrase,
        current_password: deletePassword,
      }, { responseType: 'blob', timeout: 120_000 });

      // Download the final data export ZIP
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toISOString().slice(0, 10);
      link.setAttribute('download', `loyallia_datos_finales_${date}.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(t('settings.privacy.deleteSuccess'), { id: toastId, duration: 10000 });
      setShowDeleteModal(false);

      // Clear auth cookies immediately so token refresh cannot re-authenticate
      Cookies.remove('access_token');
      Cookies.remove('refresh_token');

      // Redirect to login after short delay
      setTimeout(() => {
        window.location.replace('/login');
      }, 3000);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string; message?: string } } })?.response?.data?.detail ||
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('settings.privacy.deleteProcessError');
      toast.error(detail, { id: toastId });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-surface-900 dark:text-white mb-1">{t('settings.privacy.sectionTitle')}</h3>
      <p className="text-xs text-surface-400 mb-4">{t('settings.privacy.lopdpLabel')}</p>

      <div className="space-y-3">
        {/* Export All Data — LYL-FR-DPR-020 */}
        <button
          onClick={handleExportData}
          disabled={exporting}
          className="btn-secondary w-full text-sm flex items-center justify-center gap-2"
          id="export-all-data-btn"
        >
          {exporting ? (
            <><span className="spinner w-4 h-4" /> {t('settings.privacy.exportingButton')}</>
          ) : (
            <>📦 {t('settings.privacy.exportAllDataButton')}</>
          )}
        </button>
        <p className="text-[10px] text-surface-400 leading-tight">
          {t('settings.privacy.exportArticleLabel')}
        </p>

        {/* Delete Account — LYL-FR-DPR-025 */}
        <div className="pt-3 border-t border-surface-200 dark:border-surface-700">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full text-sm px-4 py-2 rounded-lg border border-red-300 dark:border-red-500/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors font-medium"
            id="delete-account-btn"
          >
            🗑️ {t('settings.privacy.deleteAccountButton')}
          </button>
          <p className="text-[10px] text-surface-400 leading-tight mt-2">
            {t('settings.privacy.deleteArticleLabel')}
          </p>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-surface-900 p-6 rounded-2xl shadow-2xl w-full max-w-md space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
              </div>
              <h3 className="font-semibold text-red-600 text-lg">{t('settings.privacy.deleteModalTitle')}</h3>
            </div>

            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-2 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {t('settings.privacy.irreversibleWarning')}</p>
              <ul className="text-xs text-red-600/80 dark:text-red-400/80 space-y-1 list-disc list-inside">
                <li>{t('settings.privacy.deleteConsequence1')}</li>
                <li>{t('settings.privacy.deleteConsequence2')}</li>
                <li>{t('settings.privacy.deleteConsequence3')}</li>
                <li>{t('settings.privacy.deleteConsequence4')}</li>
                <li>{t('settings.privacy.deleteConsequence5')}</li>
              </ul>
            </div>

            <p className="text-xs text-surface-500">
              {t('settings.privacy.preDeleteZipNotice')}
            </p>

            <div>
              <label className="label text-xs" htmlFor="delete-phrase">
                {t('settings.privacy.typeExactlyLabel')} <strong className="text-red-500">{DELETION_PHRASE}</strong>
              </label>
              <input
                id="delete-phrase"
                type="text"
                className="input text-sm"
                value={deletePhrase}
                onChange={e => setDeletePhrase(e.target.value)}
                placeholder={DELETION_PHRASE}
                autoComplete="off"
              />
            </div>

            <div>
              <label className="label text-xs" htmlFor="delete-password">{t('settings.privacy.currentPasswordLabel')}</label>
              <input
                id="delete-password"
                type="password"
                className="input text-sm"
                value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setShowDeleteModal(false); setDeletePhrase(''); setDeletePassword(''); }}
                className="btn-ghost text-sm flex-1"
                id="cancel-delete-btn"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting || deletePhrase !== DELETION_PHRASE || !deletePassword}
                className="flex-1 text-sm px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                id="confirm-delete-btn"
              >
                {deleting ? <span className="spinner w-4 h-4" /> : t('settings.privacy.confirmDeleteButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
