'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { whatsappApi } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { Smartphone, AlertTriangle, Link2 } from '@/components/ui/LucideIcons';

/**
 * Props for the WhatsAppLinkModal component.
 */
interface WhatsAppLinkModalProps {
  /** Whether the modal is visible. */
  isOpen: boolean;
  /** Close handler. */
  onClose: () => void;
  /** Called after a session is fully connected. */
  onConnected: () => void;
}

type LinkStep = 'consent' | 'qr' | 'waiting';

/**
 * @description Consent-first modal that links a new WhatsApp session via QR.
 * Consent is captured before any QR is requested (LYL-SRS-007 multi-account).
 */
export default function WhatsAppLinkModal({ isOpen, onClose, onConnected }: WhatsAppLinkModalProps) {
  const { t } = useI18n();
  const [step, setStep] = useState<LinkStep>('consent');
  const [consentChecked, setConsentChecked] = useState(false);
  const [label, setLabel] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrSecondsLeft, setQrSecondsLeft] = useState(20);
  const connectedRef = useRef(false);
  const qrFetchLock = useRef(false);

  const reset = useCallback(() => {
    setStep('consent');
    setConsentChecked(false);
    setLabel('');
    setSessionId(null);
    setQr(null);
    setLoading(false);
    setError(null);
    setQrSecondsLeft(20);
    connectedRef.current = false;
    qrFetchLock.current = false;
  }, []);

  useEffect(() => {
    if (isOpen) reset();
  }, [isOpen, reset]);

  // Stable refs so poll intervals are NOT torn down every parent render.
  const onConnectedRef = useRef(onConnected);
  onConnectedRef.current = onConnected;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const tRef = useRef(t);
  tRef.current = t;

  // Status poll + 20s QR refresh (WhatsApp pairing QR expires ~20s).
  // QR is fetched at most once per window — never a tight loop.
  useEffect(() => {
    if (step !== 'qr' || !sessionId) return;
    setQrSecondsLeft(20);

    const tick = setInterval(() => {
      setQrSecondsLeft((s) => {
        if (s <= 1) return 0;
        return s - 1;
      });
    }, 1000);

    const poll = setInterval(async () => {
      if (connectedRef.current) return;
      try {
        const { data } = await whatsappApi.sessionStatus(sessionId);
        const connected = Boolean(
          (data as { is_connected?: boolean; connected?: boolean }).is_connected ||
            (data as { connected?: boolean }).connected
        );
        if (connected) {
          connectedRef.current = true;
          setStep('waiting');
          toast.success(tRef.current('settings.integrations.whatsapp.connectedToast'));
          onConnectedRef.current();
          onCloseRef.current();
          return;
        }
      } catch { /* ignore */ }

      // Every 20s: pull a fresh QR (WhatsApp pairing window).
      if (qrFetchLock.current) return;
      qrFetchLock.current = true;
      try {
        const qrRes = await whatsappApi.sessionQr(sessionId);
        if (qrRes.data.qr) {
          setQr(qrRes.data.qr);
          setQrSecondsLeft(20);
        }
      } catch { /* ignore */ }
      finally {
        qrFetchLock.current = false;
      }
    }, 20000);

    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [step, sessionId]);

  const handleAcceptConsent = async () => {
    if (!consentChecked) return;
    setLoading(true);
    setError(null);
    try {
      const payload: { consent: boolean; label?: string } = { consent: true };
      if (label.trim()) payload.label = label.trim();
      // Create is lightweight — no QR in this response.
      const { data } = await whatsappApi.createSession(payload);
      setSessionId(data.session_id);
      setStep('qr');
      // One QR fetch after create (not a poll).
      try {
        const qrRes = await whatsappApi.sessionQr(data.session_id);
        setQr(qrRes.data.qr || null);
      } catch {
        setError(t('settings.integrations.whatsapp.qrRegenerateError'));
      }
    } catch {
      setError(t('settings.integrations.whatsapp.serviceUnavailableError'));
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshQr = async () => {
    if (!sessionId || qrFetchLock.current) return;
    setLoading(true);
    qrFetchLock.current = true;
    try {
      const { data } = await whatsappApi.sessionQr(sessionId);
      setQr(data.qr || null);
      setQrSecondsLeft(20);
      if (data.connected && !connectedRef.current) {
        connectedRef.current = true;
        toast.success(t('settings.integrations.whatsapp.connectedToast'));
        onConnected();
        onClose();
      }
    } catch {
      toast.error(t('settings.integrations.whatsapp.qrRegenerateError'));
    } finally {
      setLoading(false);
      qrFetchLock.current = false;
    }
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" id="wa-link-modal">
      <div className="card p-6 max-w-lg w-full mx-4 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
        {step === 'consent' && (
          <>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Link2 className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-surface-900 dark:text-white">
                {t('settings.integrations.whatsapp.consentModalTitle')}
              </h3>
            </div>

            <div className="space-y-3 text-sm text-surface-600 dark:text-surface-400">
              <p>{t('settings.integrations.whatsapp.consentModalIntro')}</p>
              <div className="p-3 rounded-lg bg-surface-100 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 space-y-2">
                <p className="flex items-start gap-2">
                  <Smartphone className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  {t('settings.integrations.whatsapp.consentPersonalNumber')}
                </p>
                <p className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  {t('settings.integrations.whatsapp.consentAntiBanLimits')}
                </p>
                <p className="flex items-start gap-2">
                  <Link2 className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
                  {t('settings.integrations.whatsapp.consentDisconnectAnytime')}
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-surface-500 mb-1 block" htmlFor="wa-link-label">
                  {t('settings.integrations.whatsapp.linkLabelField')}
                </label>
                <input
                  id="wa-link-label"
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  maxLength={60}
                  placeholder={t('settings.integrations.whatsapp.linkLabelPlaceholder')}
                  className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-sm text-surface-800 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-400/40"
                />
              </div>

              <label className="flex items-start gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-surface-300 text-brand-600 focus:ring-brand-400"
                  id="wa-consent-checkbox"
                />
                <span className="text-xs text-surface-600 dark:text-surface-400">
                  {t('settings.integrations.whatsapp.consentCheckboxLabel')}
                </span>
              </label>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button type="button" onClick={handleCancel} className="btn-ghost text-sm flex-1" id="wa-link-cancel-btn">
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleAcceptConsent}
                disabled={!consentChecked || loading}
                className="flex-1 text-sm px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                id="wa-link-accept-btn"
              >
                {loading ? <span className="spinner w-4 h-4" /> : t('settings.integrations.whatsapp.consentAcceptButton')}
              </button>
            </div>
          </>
        )}

        {step === 'qr' && (
          <div className="space-y-4" id="wa-wizard-content">
            <div className="p-5 rounded-xl border border-brand-500/20 bg-brand-500/5">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="flex-shrink-0">
                  {qr ? (
                    <div className="p-3 bg-white rounded-2xl shadow-lg">
                      <img
                        src={qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`}
                        alt={t('settings.integrations.qrAltText')}
                        className="w-48 h-48 object-contain"
                        id="wa-qr-image"
                      />
                    </div>
                  ) : (
                    <div className="w-48 h-48 rounded-2xl border-2 border-dashed border-surface-300 flex items-center justify-center">
                      <span className="spinner w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <h3 className="font-semibold text-surface-900 dark:text-white text-sm">{t('settings.integrations.qrWizardTitle')}</h3>
                  <ol className="space-y-2 text-xs text-surface-600 dark:text-surface-400">
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-500/10 text-brand-600 flex items-center justify-center text-[10px] font-bold">1</span>
                      {t('settings.integrations.qrStep1')}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-500/10 text-brand-600 flex items-center justify-center text-[10px] font-bold">2</span>
                      {t('settings.integrations.qrStep2')}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-500/10 text-brand-600 flex items-center justify-center text-[10px] font-bold">3</span>
                      {t('settings.integrations.qrStep3')}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-500/10 text-brand-600 flex items-center justify-center text-[10px] font-bold">4</span>
                      {t('settings.integrations.qrStep4')}
                    </li>
                  </ol>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs text-surface-500">
                    {t('settings.integrations.waitingForScan')}
                    <span className="ml-1 font-mono font-semibold text-surface-700 dark:text-surface-300" data-testid="qr-countdown">
                      {qrSecondsLeft}s
                    </span>
                  </span>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={handleRefreshQr} disabled={loading} className="btn-secondary text-xs px-3 py-1.5" id="wa-refresh-qr-btn">
                    {loading ? <span className="spinner w-3 h-3" /> : t('settings.integrations.regenerateQrButton')}
                  </button>
                  <button type="button" onClick={handleCancel} className="btn-ghost text-xs px-3 py-1.5" id="wa-cancel-btn">
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">{t('settings.integrations.qrSessionWarning')}</p>
            </div>
          </div>
        )}

        {step === 'waiting' && (
          <div className="flex items-center justify-center gap-3 p-8">
            <span className="spinner w-5 h-5" />
            <span className="text-sm text-surface-500">{t('settings.integrations.whatsapp.connectingAccount')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
