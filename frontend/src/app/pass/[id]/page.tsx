'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

interface PassData {
  pass_id: string;
  program_name: string;
  tenant_name: string;
  card_type: string;
  background_color: string;
  text_color: string;
  logo_url: string;
  strip_image_url: string;
  qr_code: string;
  member_name: string;
  wallet_urls: {
    apple: string;
    google: string;
    status: string;
  };
}

function getBaseUrl() {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

function isIOS() {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isAndroid() {
  if (typeof window === 'undefined') return false;
  return /Android/.test(navigator.userAgent);
}

export default function PassPage() {
  const params = useParams();
  const passId = params.id as string;

  const [pass, setPass] = useState<PassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [walletStatus, setWalletStatus] = useState<{ apple_wallet_available: boolean; google_wallet_available: boolean } | null>(null);

  useEffect(() => {
    const baseUrl = getBaseUrl();
    fetch(`${baseUrl}/api/v1/pass/public/${passId}/`)
      .then(res => {
        if (!res.ok) throw new Error('Pass not found');
        return res.json();
      })
      .then(data => {
        setPass(data);
        // Also fetch wallet status
        return fetch(`${baseUrl}/api/v1/wallet/status/${passId}/`);
      })
      .then(res => res.ok ? res.json() : null)
      .then(status => {
        if (status) setWalletStatus(status);
      })
      .catch(() => setPass(null))
      .finally(() => setLoading(false));
  }, [passId]);

  const handleAppleWallet = () => {
    if (!pass?.wallet_urls?.apple) return;
    window.location.href = `${getBaseUrl()}${pass.wallet_urls.apple}`;
  };

  const handleGoogleWallet = () => {
    if (!pass?.wallet_urls?.google) return;
    window.location.href = `${getBaseUrl()}${pass.wallet_urls.google}?redirect=true`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!pass) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Pase no encontrado</h2>
          <p className="text-white/60">El enlace no es válido o el pase ha sido desactivado.</p>
        </div>
      </div>
    );
  }

  const bgColor = pass.background_color || '#1A1A2E';
  const txtColor = pass.text_color || '#FFFFFF';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 shadow-lg ring-2 ring-white/10"
            style={{ backgroundColor: bgColor }}
          >
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M6 8h.01M6 12h.01M6 16h.01" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">{pass.program_name}</h1>
          <p className="text-white/60 text-sm mt-1">por {pass.tenant_name}</p>
        </div>

        <div className="bg-white dark:bg-surface-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10 backdrop-blur-xl">
          {/* Member Card */}
          <div
            className="relative rounded-2xl p-5 mb-6 overflow-hidden"
            style={{ backgroundColor: bgColor, color: txtColor }}
          >
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                {pass.logo_url ? (
                  <img src={pass.logo_url} alt="Logo" className="w-12 h-12 rounded-xl object-cover border border-white/20" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                    <span className="text-xl font-bold">{pass.tenant_name.charAt(0)}</span>
                  </div>
                )}
                <div>
                  <p className="text-[10px] uppercase tracking-widest opacity-60">Programa de lealtad</p>
                  <h3 className="text-base font-bold leading-tight">{pass.program_name}</h3>
                </div>
              </div>

              <div className="flex items-end justify-between">
                <div className="space-y-1.5">
                  <div>
                    <p className="text-[9px] uppercase tracking-widest opacity-40">Miembro</p>
                    <p className="text-sm font-semibold">{pass.member_name}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest opacity-40">Código</p>
                    <p className="text-xs font-mono tracking-wider opacity-80">{pass.qr_code}</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-surface-900 rounded-lg p-2 shadow-inner">
                  <QRCodeSVG value={pass.qr_code} size={72} bgColor="#ffffff" fgColor="#111111" level="M" />
                </div>
              </div>
            </div>
          </div>

          {/* Wallet Buttons */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
              Agregar a billetera digital
            </p>

            {/* Device-specific wallet buttons */}
            {isIOS() && (
              <>
                {(walletStatus?.apple_wallet_available || !walletStatus) ? (
                  <button
                    onClick={handleAppleWallet}
                    className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-3 shadow-md"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    Añadir a Apple Wallet
                  </button>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 flex items-start gap-2.5">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <div>
                      <p className="font-semibold text-xs">Apple Wallet no disponible</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed">Tu tarjeta ya está activa. Muestra el código QR en tu próxima visita.</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {isAndroid() && (
              <>
                {(walletStatus?.google_wallet_available || !walletStatus) ? (
                  <button
                    onClick={handleGoogleWallet}
                    className="w-full bg-white dark:bg-surface-900 hover:bg-surface-50 text-surface-800 dark:text-surface-100 font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-3 shadow-md border border-surface-200 dark:border-surface-700"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Guardar en Google Wallet
                  </button>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 flex items-start gap-2.5">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <div>
                      <p className="font-semibold text-xs">Google Wallet no disponible</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed">Tu tarjeta ya está activa. Muestra el código QR en tu próxima visita.</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Desktop / unknown device — show both if available */}
            {!isIOS() && !isAndroid() && (
              <>
                {walletStatus?.apple_wallet_available && (
                  <button
                    onClick={handleAppleWallet}
                    className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-3 shadow-md"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    Añadir a Apple Wallet
                  </button>
                )}
                {walletStatus?.google_wallet_available && (
                  <button
                    onClick={handleGoogleWallet}
                    className="w-full bg-white dark:bg-surface-900 hover:bg-surface-50 text-surface-800 dark:text-surface-100 font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-3 shadow-md border border-surface-200 dark:border-surface-700"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Guardar en Google Wallet
                  </button>
                )}
                {walletStatus && !walletStatus.apple_wallet_available && !walletStatus.google_wallet_available && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 flex items-start gap-2.5">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <div>
                      <p className="font-semibold text-xs">Billetera digital en configuración</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed">Tu tarjeta ya está activa. Muestra el código QR en tu próxima visita.</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <p className="text-center text-[10px] text-white/30 mt-5">
          <span className="font-semibold text-white/50">Loyallia</span> · Intelligent Rewards
        </p>
      </div>
    </div>
  );
}
