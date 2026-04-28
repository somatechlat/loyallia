'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import { useTheme } from '@/lib/theme';
import { LOYALLIA_LOGO, LOYALLIA_LOGO_DARK } from '@/lib/loyalliaLogo';

interface ScanResult {
  success: boolean; transaction_id: string; message: string;
  reward_earned: boolean; reward_description: string;
  pass_updated: boolean;
}

export default function ScannerPage() {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [amount, setAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [pendingQr, setPendingQr] = useState<string | null>(null);
  const [manualQr, setManualQr] = useState('');
  const [cameraError, setCameraError] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerDivId = 'qr-reader';
  const { theme } = useTheme();
  const logoSrc = theme === 'dark' ? LOYALLIA_LOGO_DARK : LOYALLIA_LOGO;

  const isAuthenticated = !!Cookies.get('access_token');

  const processTransaction = useCallback(async (qrCode: string) => {
    setStatus('scanning');
    try {
      const { data } = await api.post('/api/v1/scanner/transact/', {
        qr_code: qrCode,
        amount: parseFloat(amount) || 0,
        notes: notes,
      });
      setResult(data);
      setStatus('success');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setResult({ success: false, transaction_id: '', message: msg || 'Error procesando transacción', reward_earned: false, reward_description: '', pass_updated: false });
      setStatus('error');
    }
  }, [amount, notes]);

  useEffect(() => {
    if (!isAuthenticated) return;

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

    return () => { scannerRef.current?.clear().catch(() => {}); };
  }, [isAuthenticated]);

  const handleConfirm = () => {
    if (pendingQr) processTransaction(pendingQr);
  };

  const reset = () => {
    setStatus('idle');
    setResult(null);
    setPendingQr(null);
    setAmount('0');
    setNotes('');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center p-6">
        <div className="card p-8 text-center max-w-sm w-full">
          <div className="w-12 h-12 mx-auto mb-4 bg-surface-100 rounded-full flex items-center justify-center text-surface-400">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          </div>
          <h2 className="font-bold text-surface-900 mb-2">Autenticación requerida</h2>
          <p className="text-surface-500 text-sm mb-4">Debes iniciar sesión para usar el scanner</p>
          <a href="/login" className="btn-primary w-full justify-center" id="login-redirect-btn">Iniciar sesión</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-950 text-white flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logoSrc} alt="Loyallia" className="w-8 h-8 object-contain" />
          <span className="font-semibold">Scanner Loyallia</span>
        </div>
        <button
          onClick={() => { Cookies.remove('access_token'); Cookies.remove('refresh_token'); window.location.replace('/login'); }}
          className="text-white/50 text-sm hover:text-red-400 transition-colors flex items-center gap-1.5"
          id="scanner-logout-btn"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Salir
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start p-6 gap-6 max-w-md mx-auto w-full">
        {/* Amount input */}
        {!pendingQr && status === 'idle' && (
          <div className="w-full space-y-3">
            <div>
              <label className="label text-white/70" htmlFor="amount-input">Monto de la compra ($)</label>
              <input id="amount-input" type="number" min="0" step="0.01"
                className="input bg-white/10 border-white/20 text-white placeholder-white/40 focus:border-brand-400"
                value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="label text-white/70" htmlFor="notes-input">Notas (opcional)</label>
              <input id="notes-input" type="text"
                className="input bg-white/10 border-white/20 text-white placeholder-white/40 focus:border-brand-400"
                value={notes} onChange={e => setNotes(e.target.value)} placeholder="Descripción de la compra..." />
            </div>
          </div>
        )}

        {/* QR Scanner */}
        {!pendingQr && status === 'idle' && (
          <div className="w-full">
            <p className="text-center text-white/60 text-sm mb-4">Apunta la cámara al código QR del cliente</p>
            {!cameraError && <div id={scannerDivId} className="rounded-2xl overflow-hidden w-full" />}
            {cameraError && (
              <div className="text-center p-4 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-white/60 text-sm mb-3">Cámara no disponible. Ingresa el código QR manualmente.</p>
              </div>
            )}
            <div className="mt-4">
              <label className="label text-white/70" htmlFor="manual-qr-input">Código QR manual</label>
              <div className="flex gap-2">
                <input id="manual-qr-input" type="text"
                  className="input flex-1 bg-white/10 border-white/20 text-white placeholder-white/40 focus:border-brand-400"
                  placeholder="Ingresa el código QR del cliente..."
                  value={manualQr} onChange={e => setManualQr(e.target.value)}
                  aria-describedby="manual-qr-hint" />
                <button onClick={() => { if (manualQr.trim()) { setPendingQr(manualQr.trim()); } }}
                  className="btn-primary px-4" disabled={!manualQr.trim()}
                  id="manual-qr-submit-btn">
                  Enviar
                </button>
              </div>
              <p id="manual-qr-hint" className="text-[10px] text-white/40 mt-1">Usa esta opción si no puedes escanear el código QR con la cámara</p>
            </div>
          </div>
        )}

        {/* Confirm transaction */}
        {pendingQr && status === 'idle' && (
          <div className="w-full card p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
            </div>
            <p className="font-bold text-surface-900 text-lg mb-1">QR escaneado</p>
            <p className="text-surface-500 text-sm mb-2 font-mono text-xs break-all">{pendingQr.slice(0, 32)}...</p>
            <div className="text-left mb-4 p-3 bg-surface-50 rounded-xl">
              <p className="text-sm"><span className="text-surface-500">Monto:</span> <strong>${parseFloat(amount).toFixed(2)}</strong></p>
              {notes && <p className="text-sm"><span className="text-surface-500">Notas:</span> {notes}</p>}
            </div>
            <div className="flex gap-3">
              <button onClick={reset} className="btn-secondary flex-1" id="cancel-scan-btn">Cancelar</button>
              <button onClick={handleConfirm} className="btn-primary flex-1" id="confirm-transaction-btn">
                Confirmar transacción
              </button>
            </div>
          </div>
        )}

        {/* Scanning state */}
        {status === 'scanning' && (
          <div className="card p-10 text-center w-full">
            <div className="spinner w-12 h-12 mx-auto mb-4" />
            <p className="text-surface-600">Procesando transacción...</p>
          </div>
        )}

        {/* Success */}
        {status === 'success' && result && (
          <div className="card p-8 text-center w-full animate-slide-up">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
            </div>
            <h3 className="font-bold text-emerald-700 text-xl mb-2">¡Transacción exitosa!</h3>
            <p className="text-surface-500 text-sm mb-3">{result.message}</p>
            {result.reward_earned && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                <p className="text-amber-700 font-semibold text-sm flex items-center gap-1.5"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg> {result.reward_description}</p>
              </div>
            )}
            <p className="text-xs text-surface-400 font-mono">TX: {result.transaction_id.slice(0, 16)}...</p>
            <button onClick={reset} className="btn-primary w-full mt-5" id="scan-again-btn">
              Escanear otro cliente
            </button>
          </div>
        )}

        {/* Error */}
        {status === 'error' && result && (
          <div className="card p-8 text-center w-full animate-slide-up">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
            </div>
            <h3 className="font-bold text-red-700 text-xl mb-2">Error</h3>
            <p className="text-surface-500 text-sm mb-4">{result.message}</p>
            <button onClick={reset} className="btn-danger w-full" id="retry-scan-btn">Intentar de nuevo</button>
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
