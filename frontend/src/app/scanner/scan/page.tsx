'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { scannerApi } from '@/lib/api';
import Cookies from 'js-cookie';
import { useI18n } from '@/lib/i18n';

interface RuleEvaluated {
  rule_code: string;
  message: string;
}

interface ScanResult {
  success: boolean;
  transaction_id: string;
  message: string;
  reward_earned: boolean;
  reward_description: string;
  pass_updated: boolean;
  customer_name?: string;
  new_balance?: string;
  transaction_type?: string;
  intent_resolved?: string;
  remaining_uses?: number;
  denial_reasons?: string[];
  rules_evaluated?: RuleEvaluated[];
}

interface RecentScan {
  id: string;
  customer_name: string;
  type: string;
  amount: string;
  time: string;
  success: boolean;
}

function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

export default function ScannerPage() {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [amount, setAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [pendingQr, setPendingQr] = useState<string | null>(null);
  const [manualQr, setManualQr] = useState('');
  const [cameraError, setCameraError] = useState(false);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerDivId = 'qr-reader';

  function formatDenialReason(code: string): string {
    const map: Record<string, string> = {
      usage_limit_exceeded: t('scanner.errors.denial.usageLimitExceeded'),
      time_window_invalid: t('scanner.errors.denial.timeWindowInvalid'),
      location_invalid: t('scanner.errors.denial.locationInvalid'),
      min_purchase_not_met: t('scanner.errors.denial.minPurchaseNotMet'),
      cooldown_active: t('scanner.errors.denial.cooldownActive'),
      insufficient_balance: t('scanner.errors.denial.insufficientBalance'),
      reward_not_ready: t('scanner.errors.denial.rewardNotReady'),
      staff_role_denied: t('scanner.errors.denial.staffRoleDenied'),
      card_not_published: t('scanner.errors.denial.cardNotPublished'),
      pass_expired: t('scanner.errors.denial.passExpired'),
      pass_inactive: t('scanner.errors.denial.passInactive'),
      pass_not_found: t('scanner.errors.denial.passNotFound'),
      no_strategy: t('scanner.errors.denial.noStrategy'),
    };
    return map[code] || code;
  }

  // Check auth after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    setIsAuthenticated(!!Cookies.get('access_token'));
  }, []);

  const processTransaction = useCallback(async (qrCode: string) => {
    setStatus('scanning');
    try {
      const idempotencyKey = generateIdempotencyKey();
      const { data } = await scannerApi.transact({
        qr_code: qrCode,
        amount: parseFloat(amount) || 0,
        notes: notes,
        idempotency_key: idempotencyKey,
      });
      setResult(data);
      setStatus('success');
      setRecentScans(prev => [{
        id: data.transaction_id || Date.now().toString(),
        customer_name: data.customer_name || t('scanner.defaults.customerName'),
        type: data.transaction_type || t('scanner.defaults.transactionType'),
        amount: amount || '0',
        time: new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
        success: true,
      }, ...prev.slice(0, 4)]);
    } catch (err: unknown) {
      const responseData = (err as unknown as { response?: { data?: unknown } }).response?.data;

      let denialReasons: string[] | undefined;
      let rulesEvaluated: RuleEvaluated[] | undefined;
      let message = t('scanner.errors.generic');

      if (responseData && typeof responseData === 'object') {
        const data = responseData as Record<string, unknown>;

        // V2 engine denial format (422)
        if (Array.isArray(data.denial_reasons) && data.denial_reasons.length > 0) {
          denialReasons = data.denial_reasons as string[];
          message = denialReasons.map(formatDenialReason).join(', ');
        }
        if (Array.isArray(data.rules_evaluated)) {
          rulesEvaluated = data.rules_evaluated as RuleEvaluated[];
        }

        // Legacy error format (detail string)
        if (typeof data.detail === 'string' && data.detail) {
          message = data.detail;
        }
      }

      setResult({
        success: false,
        transaction_id: '',
        message,
        reward_earned: false,
        reward_description: '',
        pass_updated: false,
        denial_reasons: denialReasons,
        rules_evaluated: rulesEvaluated,
      });
      setStatus('error');
    }
  }, [amount, notes]);

  useEffect(() => {
    if (!isAuthenticated || !mounted) return;

    // Small delay to ensure DOM element exists
    const timer = setTimeout(() => {
      try {
        scannerRef.current = new Html5QrcodeScanner(
          scannerDivId,
          { fps: 10, qrbox: { width: 280, height: 280 }, supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA] },
          false
        );

        scannerRef.current.render(
          (decodedText) => {
            setPendingQr(decodedText);
            scannerRef.current?.clear().catch(() => {});
          },
          () => {}
        );
      } catch {
        setCameraError(true);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      scannerRef.current?.clear().catch(() => {});
    };
  }, [isAuthenticated, mounted]);

  const handleConfirm = () => {
    if (pendingQr) processTransaction(pendingQr);
  };

  const reset = () => {
    setStatus('idle');
    setResult(null);
    setPendingQr(null);
    setAmount('0');
    setNotes('');
    // Re-initialize scanner after a short delay
    setTimeout(() => {
      try {
        scannerRef.current = new Html5QrcodeScanner(
          scannerDivId,
          { fps: 10, qrbox: { width: 280, height: 280 }, supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA] },
          false
        );
        scannerRef.current.render(
          (decodedText) => {
            setPendingQr(decodedText);
            scannerRef.current?.clear().catch(() => {});
          },
          () => {}
        );
      } catch {
        setCameraError(true);
      }
    }, 300);
  };

  // Prevent hydration mismatch: render a loading shell during SSR
  if (!mounted) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center p-6">
        <div className="card p-8 text-center max-w-sm w-full">
          <div className="w-12 h-12 mx-auto mb-4 bg-surface-100 rounded-full flex items-center justify-center text-surface-400">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          </div>
          <h2 className="font-bold text-surface-900 dark:text-white mb-2">{t('scanner.auth.title')}</h2>
          <p className="text-surface-500 text-sm mb-4">{t('scanner.auth.description')}</p>
          <a href="/login" className="btn-primary w-full justify-center" id="login-redirect-btn">{t('scanner.auth.loginButton')}</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-950 text-white flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-sm">
            L
          </div>
          <span className="font-semibold">Scanner Loyallia</span>
        </div>
        <button
          onClick={() => { Cookies.remove('access_token'); Cookies.remove('refresh_token'); window.location.replace('/login'); }}
          className="text-white/50 text-sm hover:text-red-400 transition-colors flex items-center gap-1.5"
          id="scanner-logout-btn"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          {t('scanner.nav.logout')}
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start p-6 gap-6 max-w-md mx-auto w-full">
        {/* Amount input */}
        {!pendingQr && status === 'idle' && (
          <div className="w-full space-y-3">
            <div>
              <label className="label text-white/70" htmlFor="amount-input">{t('scanner.form.amountLabel')}</label>
              <input id="amount-input" type="number" min="0" step="0.01"
                className="input bg-white/10 border-white/20 text-white placeholder-white/40 focus:border-brand-400"
                value={amount} onChange={e => { const v = e.target.value; if (v === '' || parseFloat(v) >= 0) setAmount(v); }} placeholder={t('scanner.form.amountPlaceholder')} />
            </div>
            <div>
              <label className="label text-white/70" htmlFor="notes-input">{t('scanner.form.notesLabel')}</label>
              <input id="notes-input" type="text"
                className="input bg-white/10 border-white/20 text-white placeholder-white/40 focus:border-brand-400"
                value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('scanner.form.notesPlaceholder')} />
            </div>
          </div>
        )}

        {/* QR Scanner */}
        {!pendingQr && status === 'idle' && (
          <div className="w-full">
            <p className="text-center text-white/60 text-sm mb-4">{t('scanner.scan.cameraHint')}</p>
            {!cameraError && <div id={scannerDivId} className="rounded-2xl overflow-hidden w-full" />}
            {cameraError && (
              <div className="text-center p-4 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-white/60 text-sm mb-3">{t('scanner.scan.cameraError')}</p>
              </div>
            )}
            <div className="mt-4">
              <label className="label text-white/70" htmlFor="manual-qr-input">{t('scanner.form.manualQrLabel')}</label>
              <div className="flex gap-2">
                <input id="manual-qr-input" type="text"
                  className="input flex-1 bg-white/10 border-white/20 text-white placeholder-white/40 focus:border-brand-400"
                  placeholder={t('scanner.form.manualQrPlaceholder')}
                  value={manualQr} onChange={e => setManualQr(e.target.value)}
                  aria-describedby="manual-qr-hint" />
                <button onClick={() => { if (manualQr.trim()) { setPendingQr(manualQr.trim()); } }}
                  className="btn-primary px-4" disabled={!manualQr.trim()}
                  id="manual-qr-submit-btn">
                  {t('scanner.form.manualQrSubmit')}
                </button>
              </div>
              <p id="manual-qr-hint" className="text-[10px] text-white/40 mt-1">{t('scanner.form.manualQrHint')}</p>
            </div>
          </div>
        )}

        {/* Confirm transaction */}
        {pendingQr && status === 'idle' && (
          <div className="w-full card p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
            </div>
            <p className="font-bold text-surface-900 dark:text-white text-lg mb-1">{t('scanner.scan.scannedTitle')}</p>
            <p className="text-surface-500 text-sm mb-2 font-mono text-xs break-all">{pendingQr.slice(0, 32)}...</p>
            <div className="text-left mb-4 p-3 bg-surface-50 rounded-xl">
              <p className="text-sm"><span className="text-surface-500">{t('scanner.scan.confirm.amountLabel')}</span> <strong>${!isNaN(parseFloat(amount)) && parseFloat(amount) >= 0 ? parseFloat(amount).toFixed(2) : '0.00'}</strong></p>
              {notes && <p className="text-sm"><span className="text-surface-500">{t('scanner.scan.confirm.notesLabel')}</span> {notes}</p>}
            </div>
            <div className="flex gap-3">
              <button onClick={reset} className="btn-secondary flex-1" id="cancel-scan-btn">Cancelar</button>
              <button onClick={handleConfirm} className="btn-primary flex-1" id="confirm-transaction-btn">
                {t('scanner.scan.confirm.button')}
              </button>
            </div>
          </div>
        )}

        {/* Scanning state */}
        {status === 'scanning' && (
          <div className="card p-10 text-center w-full">
            <div className="spinner w-12 h-12 mx-auto mb-4" />
            <p className="text-surface-600">{t('scanner.scan.processing')}</p>
          </div>
        )}

        {/* Success */}
        {status === 'success' && result && (
          <div className="card p-8 text-center w-full animate-slide-up">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
            </div>
            <h3 className="font-bold text-emerald-700 text-xl mb-2">{t('scanner.success.title')}</h3>
            {result.customer_name && (
              <p className="text-surface-700 font-medium mb-1">{result.customer_name}</p>
            )}
            <p className="text-surface-500 text-sm mb-3">{result.message}</p>
            {result.new_balance && (
              <p className="text-brand-600 font-semibold text-sm mb-3">{t('scanner.success.newBalance')} {result.new_balance}</p>
            )}
            {typeof result.remaining_uses === 'number' && (
              <p className="text-brand-600 font-semibold text-sm mb-3">{t('scanner.success.remainingUses')} {result.remaining_uses}</p>
            )}
            {result.reward_earned && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                <p className="text-amber-700 font-semibold text-sm flex items-center gap-1.5"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg> {result.reward_description}</p>
              </div>
            )}
            {result.intent_resolved && result.intent_resolved !== 'none' && (
              <p className="text-xs text-surface-400 uppercase tracking-wide mb-2">
                {t('scanner.success.actionLabel')} {result.intent_resolved === 'earn' ? t('scanner.success.action.earn') : result.intent_resolved === 'redeem' ? t('scanner.success.action.redeem') : result.intent_resolved}
              </p>
            )}
            <p className="text-xs text-surface-400 font-mono">{t('scanner.success.txPrefix')} {result.transaction_id.slice(0, 16)}...</p>
            <button onClick={reset} className="btn-primary w-full mt-5" id="scan-again-btn">
              {t('scanner.success.scanAgain')}
            </button>
          </div>
        )}

        {/* Error */}
        {status === 'error' && result && (
          <div className="card p-8 text-center w-full animate-slide-up">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
            </div>
            <h3 className="font-bold text-red-700 text-xl mb-2">{t('scanner.error.title')}</h3>
            <p className="text-surface-500 text-sm mb-4">{result.message}</p>

            {/* Rule evaluation details (v2 engine) */}
            {result.rules_evaluated && result.rules_evaluated.length > 0 && (
              <div className="text-left mb-4 p-3 bg-red-50/50 rounded-xl border border-red-100">
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">{t('scanner.error.rulesTitle')}</p>
                <ul className="space-y-1.5">
                  {result.rules_evaluated.map((rule, i) => (
                    <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                      <span>{rule.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button onClick={reset} className="btn-danger w-full" id="retry-scan-btn">{t('scanner.error.retryButton')}</button>
          </div>
        )}

        {/* Recent Scans */}
        {recentScans.length > 0 && status === 'idle' && !pendingQr && (
          <div className="w-full">
            <h4 className="text-sm font-semibold text-white/60 mb-3">{t('scanner.recent.title')}</h4>
            <div className="space-y-2">
              {recentScans.map((scan, i) => (
                <div key={scan.id + i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${scan.success ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    <div>
                      <p className="text-sm font-medium text-white">{scan.customer_name}</p>
                      <p className="text-xs text-white/50">{scan.type} · ${!isNaN(parseFloat(scan.amount)) && parseFloat(scan.amount) >= 0 ? parseFloat(scan.amount).toFixed(2) : '0.00'}</p>
                    </div>
                  </div>
                  <span className="text-xs text-white/40">{scan.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <footer className="py-3 text-center">
        <p className="text-[10px] text-surface-400 tracking-wide">
          <span className="font-semibold text-surface-400">Loyallia</span> · Intelligent Rewards · <span className="text-[9px] opacity-50">powered by Yachaq.ai</span>
        </p>
      </footer>
    </div>
  );
}
