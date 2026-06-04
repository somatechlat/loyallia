'use client';
import { AlertTriangle, Key, Mail, Flame } from '@/components/ui/LucideIcons';
import { useI18n } from '@/lib/i18n';

/**
 * Props for the SystemOperationsPanel component.
 */
interface SystemOperationsPanelProps {
  /** Whether demo data is being seeded */
  seedingDemo: boolean;
  /** Console output from seeding */
  seedOutput: string;
  /** Current factory reset step */
  resetStep: 'idle' | 'otp_sent' | 'confirming';
  /** User-entered OTP for reset confirmation */
  resetOtp: string;
  /** Whether an OTP request is in progress */
  requestingReset: boolean;
  /** Whether reset confirmation is in progress */
  confirmingReset: boolean;
  /** Handler to seed demo data */
  onSeedDemo: () => void;
  /** Handler to request factory reset OTP */
  onFactoryResetRequest: () => void;
  /** Handler to confirm factory reset */
  onFactoryResetConfirm: () => void;
  /** OTP change handler */
  onResetOtpChange: (value: string) => void;
  /** Handler to cancel reset */
  onCancelReset: () => void;
}

/**
 * @description SuperAdmin panel for system operations (demo seeding and factory reset).
 * @param {SystemOperationsPanelProps} props - Component props
 * @returns JSX.Element
 */
export default function SystemOperationsPanel({
  seedingDemo,
  seedOutput,
  resetStep,
  resetOtp,
  requestingReset,
  confirmingReset,
  onSeedDemo,
  onFactoryResetRequest,
  onFactoryResetConfirm,
  onResetOtpChange,
  onCancelReset,
}: SystemOperationsPanelProps) {
  const { t } = useI18n();
  return (
    <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm p-6 space-y-6">
      <h2 className="text-lg font-bold text-surface-900 dark:text-white border-b border-surface-100 pb-3">{t('superadmin.settings.sysadmin.operationsTitle')}</h2>

      {/* Seed Demo Data */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl">📦</span>
          <div>
            <h3 className="font-semibold text-surface-900 dark:text-white">{t('superadmin.settings.sysadmin.demoDataTitle')}</h3>
            <p className="text-sm text-surface-500 mt-1">
              {t('superadmin.settings.sysadmin.demoDataDesc')}
            </p>
          </div>
        </div>
        <button
          id="btn-seed-demo"
          disabled={seedingDemo}
          onClick={onSeedDemo}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-surface-300 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
        >
          {seedingDemo ? t('common.loading') : '📦 ' + t('superadmin.settings.sysadmin.loadDemoData')}
        </button>
        {seedOutput && (
          <pre className="mt-3 bg-surface-100 dark:bg-surface-800 rounded-lg p-3 text-xs text-surface-600 dark:text-surface-400 max-h-40 overflow-auto whitespace-pre-wrap">
            {seedOutput}
          </pre>
        )}
      </div>

      {/* Factory Reset */}
      <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-5 border border-red-200 dark:border-red-800">
        <div className="flex items-start gap-3 mb-3">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <div>
            <h3 className="font-semibold text-red-700 dark:text-red-400">{t('superadmin.settings.sysadmin.factoryResetTitle')}</h3>
            <p className="text-sm text-surface-500 mt-1">
              {t('superadmin.settings.sysadmin.factoryResetDesc')}
            </p>
          </div>
        </div>

        {resetStep === 'idle' && (
          <button
            id="btn-factory-reset-request"
            disabled={requestingReset}
            onClick={onFactoryResetRequest}
            className="bg-red-600 hover:bg-red-700 disabled:bg-surface-300 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
          >
            {requestingReset ? t('common.sending') : <span className="flex items-center gap-1"><Key className="w-3.5 h-3.5" /> {t('superadmin.settings.sysadmin.requestResetCode')}</span>}
          </button>
        )}

        {resetStep === 'otp_sent' && (
          <div className="space-y-3">
            <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
              <Mail className="w-3.5 h-3.5 inline mr-1" />{t('superadmin.settings.sysadmin.otpSent')}
            </p>
            <div className="flex gap-3 items-center flex-wrap">
              <input
                id="input-factory-otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="w-40 px-4 py-2.5 rounded-xl border-2 border-red-300 dark:border-red-700 bg-white dark:bg-surface-800 text-center text-lg font-mono tracking-widest"
                placeholder="000000"
                value={resetOtp}
                onChange={(e) => onResetOtpChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              <button
                id="btn-factory-reset-confirm"
                disabled={confirmingReset || resetOtp.length !== 6}
                onClick={onFactoryResetConfirm}
                className="bg-red-700 hover:bg-red-800 disabled:bg-surface-300 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
              >
                {confirmingReset ? t('common.processing') : <span className="flex items-center gap-1"><Flame className="w-3.5 h-3.5" /> {t('superadmin.settings.sysadmin.confirmReset')}</span>}
              </button>
              <button
                onClick={onCancelReset}
                className="text-surface-500 hover:text-surface-700 text-sm underline"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
