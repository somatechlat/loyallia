'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { adjustColor } from '@/components/programs/constants';

// Global helper for local host environment detection
const getBaseUrl = () => {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
};

interface Card {
  id: string; name: string; description: string; card_type: string; tenant_name: string;
  background_color: string; text_color: string; logo_url: string; strip_image_url: string;
  metadata: Record<string, unknown>;
}

interface WalletStatus {
  pass_id: string;
  apple_wallet_available: boolean;
  google_wallet_available: boolean;
  apple_url: string;
  google_url: string;
}

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
}

// ─── SVG Icon Components (Flat, Modern — No Emojis) ───────────────────────

function IconSearch({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function IconCheckCircle({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" />
    </svg>
  );
}

function IconXCircle({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" />
    </svg>
  );
}

function IconAlertTriangle({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" />
    </svg>
  );
}

function IconCardType({ cardType, className = 'w-6 h-6' }: { cardType: string; className?: string }) {
  switch (cardType) {
    case 'stamp':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 12h6" /><path d="M12 9v6" />
        </svg>
      );
    case 'cashback':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 18V6" />
        </svg>
      );
    case 'vip_membership':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z" /><path d="M3 20h18" />
        </svg>
      );
    default:
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
        </svg>
      );
  }
}

// ─── Platform Detection ───────────────────────────────────────────────────

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function EnrollPage() {
  const params = useParams();
  const cardId = params.slug as string;
  const [card, setCard] = useState<Card | null>(null);
  const [step, setStep] = useState<'form' | 'success' | 'error'>('form');
  const [loading, setLoading] = useState(false);
  const [cardLoading, setCardLoading] = useState(true);
  const [form, setForm] = useState<Record<string, string>>({ first_name: '', last_name: '', email: '', phone: '', date_of_birth: '' });
  const [enrollResult, setEnrollResult] = useState<EnrollResult | null>(null);
  const [walletStatus, setWalletStatus] = useState<WalletStatus | null>(null);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  // Fetch card info
  useEffect(() => {
    const baseUrl = getBaseUrl();
    fetch(`${baseUrl}/api/v1/cards/public/${cardId}/`)
      .then(res => {
        if (!res.ok) throw new Error('Card not found');
        return res.json();
      })
      .then(data => setCard(data))
      .catch(() => setCard(null))
      .finally(() => setCardLoading(false));
  }, [cardId]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name || !form.email) {
      toast.error('Por favor completa nombre y correo'); return;
    }
    setLoading(true);
    const baseUrl = getBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/api/v1/customers/enroll/?card_id=${cardId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || 'Error al inscribirse');
      }
      const result: EnrollResult = await res.json();
      setEnrollResult(result);

      // Check which wallets are available
      if (result.wallet_urls?.status) {
        try {
          const baseUrl = getBaseUrl();
          const statusRes = await fetch(`${baseUrl}${result.wallet_urls.status}`);
          if (statusRes.ok) {
            setWalletStatus(await statusRes.json());
          }
        } catch { /* wallet status check is optional */ }
      }

      setStep('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al inscribirse';
      toast.error(msg);
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleWallet = () => {
    if (!enrollResult?.wallet_urls?.apple) return;
    const baseUrl = getBaseUrl();
    window.location.href = `${baseUrl}${enrollResult.wallet_urls.apple}`;
  };


  const handleGoogleWallet = () => {
    if (!enrollResult?.wallet_urls?.google) {
      toast.error('URL de Google Wallet no encontrada');
      return;
    }
    
    // Build absolute URL for the backend endpoint with redirect=true
    // Direct redirect is more reliable on mobile Safari/Chrome than async fetch redirects
    const baseUrl = getBaseUrl();
    const redirectUrl = `${baseUrl}${enrollResult.wallet_urls.google}?redirect=true`;
    
    console.log(`[GoogleWallet] Redirecting directly to: ${redirectUrl}`);
    window.location.href = redirectUrl;
  };

  // ─── Loading State ────────────────────────────────────────────────────────

  if (cardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // ─── Card Not Found ───────────────────────────────────────────────────────

  if (!card) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 p-6">
        <div className="bg-white rounded-2xl shadow-xl p-10 text-center max-w-sm border border-surface-200">
          <div className="w-16 h-16 mx-auto mb-4 bg-surface-100 rounded-full flex items-center justify-center text-surface-400">
            <IconSearch className="w-8 h-8" />
          </div>
          <h2 className="font-bold text-surface-900 mb-2">Programa no encontrado</h2>
          <p className="text-surface-500 text-sm">El enlace no es válido o el programa ha sido desactivado.</p>
        </div>
      </div>
    );
  }

  const bgColor = card.background_color || '#1A1A2E';
  const txtColor = card.text_color || '#FFFFFF';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 shadow-lg ring-2 ring-white/10"
            style={{ backgroundColor: bgColor }}
          >
            <IconCardType cardType={card.card_type} className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">{card.name}</h1>
          <p className="text-white/60 text-sm mt-1">por {card.tenant_name}</p>
          {card.description && <p className="text-white/40 text-xs mt-2 max-w-xs mx-auto">{card.description}</p>}
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10 backdrop-blur-xl">
          {/* ═══ FORM STEP ═══ */}
          {step === 'form' && (
            <form onSubmit={handleEnroll} className="space-y-4" noValidate>
              <h2 className="text-lg font-bold text-surface-900 text-center mb-1">Únete ahora</h2>
              <p className="text-center text-surface-400 text-xs mb-4">Completa tus datos para recibir tu tarjeta digital</p>

              {/* Dynamic or static form fields */}
              {(() => {
                const customFields = (card.metadata as Record<string, unknown>)?.form_fields as Array<{
                  id: string; type: string; label: string; placeholder: string;
                  required: boolean; options?: string[]; country_code?: boolean;
                }> | undefined;

                const fields = customFields && customFields.length > 0
                  ? customFields.map(f => ({
                      id: f.id, label: f.label, placeholder: f.placeholder || '',
                      type: f.type || 'text', required: !!f.required,
                      options: f.options, country_code: f.country_code,
                    }))
                  : [
                      { id: 'first_name', label: 'Nombre', placeholder: 'Juan', type: 'text', required: true, options: undefined, country_code: undefined },
                      { id: 'last_name', label: 'Apellido', placeholder: 'Pérez', type: 'text', required: true, options: undefined, country_code: undefined },
                      { id: 'email', label: 'Correo', placeholder: 'tu@email.com', type: 'email', required: true, options: undefined, country_code: undefined },
                      { id: 'phone', label: 'Teléfono (opcional)', placeholder: '+593 999 999 999', type: 'tel', required: false, options: undefined, country_code: undefined },
                      { id: 'date_of_birth', label: 'Fecha de nacimiento (opcional)', placeholder: 'YYYY-MM-DD', type: 'date', required: false, options: undefined, country_code: undefined },
                    ];

                return fields.map(({ id, label, placeholder, type, required, options, country_code }) => (
                  <div key={id}>
                    <label className="block text-xs font-semibold text-surface-600 mb-1 uppercase tracking-wider" htmlFor={id}>
                      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    {type === 'select' && options ? (
                      <select id={id}
                        className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                        value={form[id] || ''} onChange={e => setForm(f => ({ ...f, [id]: e.target.value }))}
                        required={required}>
                        <option value="">Seleccionar...</option>
                        {options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : type === 'tel' && country_code ? (
                      <div className="flex gap-2">
                        <select className="w-24 px-2 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                          value={form[`${id}_code`] || '+593'}
                          onChange={e => setForm(f => ({ ...f, [`${id}_code`]: e.target.value }))}>
                          {['+593','+1','+52','+57','+51','+56','+54','+34','+44'].map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <input id={id} type="tel"
                          className="flex-1 px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                          placeholder={placeholder}
                          value={form[id] || ''} onChange={e => setForm(f => ({ ...f, [id]: e.target.value }))}
                          required={required} />
                      </div>
                    ) : (
                      <input id={id} type={type}
                        className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                        placeholder={placeholder}
                        value={form[id] || ''} onChange={e => setForm(f => ({ ...f, [id]: e.target.value }))}
                        required={required} />
                    )}
                  </div>
                ));
              })()}

              {/* Privacy consent */}
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" className="mt-0.5 w-4 h-4 rounded border-surface-300 text-brand-500 focus:ring-brand-500"
                  checked={privacyAccepted} onChange={e => setPrivacyAccepted(e.target.checked)} />
                <span className="text-[11px] text-surface-500 leading-relaxed">
                  Acepto la <a href="/privacy" target="_blank" className="text-brand-600 hover:underline">política de privacidad</a> y
                  autorizo el uso de mis datos para este programa de fidelización.
                </span>
              </label>

              <button type="submit"
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-brand-600/20"
                disabled={loading || !privacyAccepted} id="enroll-btn">
                {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Inscribirme gratis'}
              </button>
              <p className="text-center text-[10px] text-surface-400">
                Al inscribirte aceptas recibir notificaciones de este programa.
              </p>
            </form>
          )}

          {/* ═══ SUCCESS STEP ═══ */}
          {step === 'success' && enrollResult && (
            <div className="text-center py-2 space-y-5">
              {/* Success icon */}
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                <IconCheckCircle className="w-9 h-9" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-surface-900 mb-1">Inscripción exitosa</h2>
                <p className="text-surface-500 text-sm">
                  Ya eres miembro de <strong>{enrollResult.card_name}</strong>.
                </p>
              </div>

              {/* ─── Premium Card Preview ─── */}
              <div
                className="w-full rounded-2xl overflow-hidden shadow-xl relative"
                style={{ 
                  background: `linear-gradient(135deg, ${bgColor} 0%, ${adjustColor(bgColor, -20)} 100%)`,
                  color: txtColor
                }}
              >
                {/* Card gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                
                {/* Subtle pattern */}
                <div className="absolute inset-0 opacity-5" style={{
                  backgroundImage: `radial-gradient(circle at 2px 2px, ${txtColor} 1px, transparent 1px)`,
                  backgroundSize: '16px 16px'
                }} />

                <div className="relative p-5">
                  {/* Card Header - Logo + Brand */}
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                      {/* Logo - PROMINENTLY DISPLAYED */}
                      {card.logo_url ? (
                        <img 
                          src={card.logo_url} 
                          alt="Logo" 
                          className="w-12 h-12 rounded-xl object-cover border-2 border-white/30 shadow-lg"
                        />
                      ) : (
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center border-2 border-white/30 shadow-lg"
                          style={{ backgroundColor: txtColor + '20' }}
                        >
                          <IconCardType cardType={card.card_type} className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] uppercase tracking-widest opacity-60 mb-0.5">Programa de lealtad</p>
                        <h3 className="text-base font-bold leading-tight">{card.name}</h3>
                        <p className="text-xs opacity-50 mt-0.5">{card.tenant_name}</p>
                      </div>
                    </div>
                  </div>

                  {/* Divider line */}
                  <div className="h-px bg-current opacity-10 mb-4" />

                  {/* Member info */}
                  <div className="flex items-end justify-between">
                    <div className="space-y-1.5">
                      <div>
                        <p className="text-[9px] uppercase tracking-widest opacity-40">Miembro</p>
                        <p className="text-sm font-semibold">{form.first_name} {form.last_name}</p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-widest opacity-40">Código</p>
                        <p className="text-xs font-mono tracking-wider opacity-80">{enrollResult.qr_code}</p>
                      </div>
                    </div>

                    {/* QR Code — Real rendered SVG */}
                    <div className="bg-white rounded-lg p-2 shadow-inner">
                      <QRCodeSVG
                        value={enrollResult.qr_code}
                        size={72}
                        bgColor="#ffffff"
                        fgColor="#111111"
                        level="M"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Wallet Buttons ─── */}
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
                  Agregar a billetera digital
                </p>

                {/* Apple Wallet — show when available on backend, or on iOS before status loads */}
                {(walletStatus?.apple_wallet_available || (isIOS() && !walletStatus)) && (
                  <button
                    onClick={handleAppleWallet}
                    className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-3 shadow-md"
                    id="add-apple-wallet-btn"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    Añadir a Apple Wallet
                  </button>
                )}

                {/* Google Wallet — show when available on backend, or on Android before status loads */}
                {(walletStatus?.google_wallet_available || (isAndroid() && !walletStatus)) && (
                  <button
                    onClick={handleGoogleWallet}
                    className="w-full bg-white hover:bg-surface-50 text-surface-800 font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-3 shadow-md border border-surface-200"
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

                {/* Wallet unavailable fallback */}
                {walletStatus && !walletStatus.apple_wallet_available && !walletStatus.google_wallet_available && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 flex items-start gap-2.5">
                    <IconAlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-xs">Billetera digital en configuración</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed">Tu tarjeta ya está activa. Muestra el código QR en tu próxima visita.</p>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-[10px] text-surface-400 pt-1">
                Tu tarjeta de fidelización ya está activa. Muestra el código QR en tu siguiente visita.
              </p>
            </div>
          )}

          {/* ═══ ERROR STEP ═══ */}
          {step === 'error' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
                <IconXCircle className="w-9 h-9" />
              </div>
              <h2 className="text-xl font-bold text-surface-900">Error de inscripción</h2>
              <p className="text-surface-500 text-sm">No se pudo completar la inscripción.</p>
              <button onClick={() => setStep('form')}
                className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-all"
                id="retry-enroll-btn">
                Intentar de nuevo
              </button>
            </div>
          )}
        </div>

        {/* Brand footer */}
        <p className="text-center text-[10px] text-white/30 mt-5">
          <span className="font-semibold text-white/50">Loyallia</span> · Intelligent Rewards · <span className="text-[9px] opacity-50">powered by Yachaq.ai</span>
        </p>
      </div>
    </div>
  );
}
