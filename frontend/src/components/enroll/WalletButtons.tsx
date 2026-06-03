'use client';

/**
 * Result data after a successful enrollment.
 */
interface EnrollResult {
  id: string;
  card_name: string;
  card_type: string;
  qr_code: string;
  wallet_urls: {
    apple: string;
    google: string;
    status: string;
  };
  already_enrolled?: boolean;
}

/**
 * Status of digital wallet pass availability.
 */
interface WalletStatus {
  pass_id: string;
  apple_wallet_available: boolean;
  google_wallet_available: boolean;
  apple_url: string;
  google_url: string;
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

function IconAlertTriangle({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" />
    </svg>
  );
}

/**
 * Props for the WalletButtons component.
 */
interface WalletButtonsProps {
  /** Enrollment result data */
  enrollResult: EnrollResult | null;
  /** Current wallet pass status */
  walletStatus: WalletStatus | null;
  /** Callback to add the pass to Apple Wallet */
  onAppleWallet: () => void;
  /** Callback to add the pass to Google Wallet */
  onGoogleWallet: () => void;
}

/**
 * @description Device-specific wallet buttons for Apple Wallet and Google Wallet.
 * @param {WalletButtonsProps} props - Component props
 * @returns JSX.Element | null
 */
export default function WalletButtons({ enrollResult, walletStatus, onAppleWallet, onGoogleWallet }: WalletButtonsProps) {
  if (!enrollResult) return null;

  return (
    <div className="space-y-2.5">
      <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
        Agregar a billetera digital
      </p>

      {/* Device-specific wallet buttons — show ONLY the wallet for the current platform */}
      {isIOS() && (
        <>
          {(walletStatus?.apple_wallet_available || !walletStatus) ? (
            <button
              onClick={onAppleWallet}
              className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-3 shadow-md"
              id="add-apple-wallet-btn"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              Añadir a Apple Wallet
            </button>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 flex items-start gap-2.5">
              <IconAlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
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
              onClick={onGoogleWallet}
              className="w-full bg-white dark:bg-surface-900 hover:bg-surface-50 text-surface-800 dark:text-surface-100 font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-3 shadow-md border border-surface-200 dark:border-surface-700"
              id="add-google-wallet-btn"
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
              <IconAlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
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
              onClick={onAppleWallet}
              className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-3 shadow-md"
              id="add-apple-wallet-btn"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              Añadir a Apple Wallet
            </button>
          )}
          {walletStatus?.google_wallet_available && (
            <button
              onClick={onGoogleWallet}
              className="w-full bg-white dark:bg-surface-900 hover:bg-surface-50 text-surface-800 dark:text-surface-100 font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-3 shadow-md border border-surface-200 dark:border-surface-700"
              id="add-google-wallet-btn"
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
              <IconAlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-xs">Billetera digital en configuración</p>
                <p className="mt-0.5 text-[11px] leading-relaxed">Tu tarjeta ya está activa. Muestra el código QR en tu próxima visita.</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
