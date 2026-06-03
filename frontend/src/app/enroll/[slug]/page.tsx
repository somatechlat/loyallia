'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { stripLocalMinioUrl } from '@/lib/url-utils';
import EnrollmentForm from '@/components/enroll/EnrollmentForm';
import WalletButtons from '@/components/enroll/WalletButtons';
import EnrollmentHero from '@/components/enroll/EnrollmentHero';

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
  already_enrolled?: boolean;
}

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

export default function EnrollPage() {
  const params = useParams();
  const cardId = params.slug as string;
  const [card, setCard] = useState<Card | null>(null);
  const [step, setStep] = useState<'form' | 'success' | 'error'>('form');
  const [loading, setLoading] = useState(false);
  const [cardLoading, setCardLoading] = useState(true);
  const [form, setForm] = useState<Record<string, string>>({ first_name: '', last_name: '', email: '', phone: '', date_of_birth: '' });
  const [honeypot, setHoneypot] = useState('');
  const [enrollResult, setEnrollResult] = useState<EnrollResult | null>(null);
  const [walletStatus, setWalletStatus] = useState<WalletStatus | null>(null);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [cooldown, setCooldown] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(c => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    const baseUrl = getBaseUrl();
    fetch(`${baseUrl}/api/v1/cards/public/${cardId}/`)
      .then(res => {
        if (!res.ok) throw new Error('Card not found');
        return res.json();
      })
      .then(data => {
        data.logo_url = stripLocalMinioUrl(data.logo_url);
        data.strip_image_url = stripLocalMinioUrl(data.strip_image_url);
        setCard(data);
      })
      .catch(() => setCard(null))
      .finally(() => setCardLoading(false));
  }, [cardId]);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) {
      setStep('success');
      return;
    }
    const errors: Record<string, string> = {};

    // Dynamic validation based on card.metadata.form_fields
    const customFields = (card?.metadata as Record<string, unknown>)?.form_fields as Array<{
      id: string; type: string; label: string; required: boolean; country_code?: boolean;
    }> | undefined;

    const fieldsToValidate = customFields && customFields.length > 0
      ? customFields
      : [
          { id: 'first_name', type: 'text', label: 'Nombre', required: true },
          { id: 'last_name', type: 'text', label: 'Apellido', required: true },
          { id: 'email', type: 'email', label: 'Correo', required: true },
          { id: 'phone', type: 'tel', label: 'Teléfono', required: false },
          { id: 'date_of_birth', type: 'date', label: 'Fecha de nacimiento', required: false },
        ];

    for (const field of fieldsToValidate) {
      const value = form[field.id] || '';
      if (field.required && !value.trim()) {
        errors[field.id] = `${field.label} es obligatorio`;
      }
      if (value.trim()) {
        if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors[field.id] = 'Ingresa un correo electrónico válido';
        }
        if (field.type === 'tel' && !/^[\d\s\+\-\(\)]+$/.test(value)) {
          errors[field.id] = 'Ingresa un teléfono válido';
        }
      }
    }

    if (Object.keys(errors).length > 0) { setFormErrors(errors); toast.error('Por favor completa los campos obligatorios'); return; }
    setFormErrors({});
    if (submitting || cooldown > 0) return;
    if (!privacyAccepted) {
      setFormErrors({ privacy: 'Debes aceptar la política de privacidad para continuar' });
      return;
    }
    setSubmitting(true);
    setLoading(true);
    const baseUrl = getBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/api/v1/customers/enroll/?card_id=${cardId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, privacy_accepted: privacyAccepted }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || 'Error al inscribirse');
      }
      const result: EnrollResult = await res.json();
      setEnrollResult(result);

      if (result.wallet_urls?.status) {
        try {
          const statusRes = await fetch(`${baseUrl}${result.wallet_urls.status}`);
          if (statusRes.ok) {
            setWalletStatus(await statusRes.json());
          }
        } catch { /* wallet status check is optional */ }
      }

      setCooldown(30);
      setStep('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al inscribirse';
      toast.error(msg);
      setStep('error');
    } finally {
      setLoading(false);
      setSubmitting(false);
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
    const baseUrl = getBaseUrl();
    const redirectUrl = `${baseUrl}${enrollResult.wallet_urls.google}?redirect=true`;
    window.location.href = redirectUrl;
  };

  const handleResendEmail = async () => {
    if (!form.email || !cardId) return;
    setResendingEmail(true);
    try {
      const baseUrl = getBaseUrl();
      const res = await fetch(`${baseUrl}/api/v1/customers/resend-pass/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, card_id: cardId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || 'Error al reenviar');
      }
      const data = await res.json();
      toast.success(data.message || 'Tarjeta reenviada a tu email');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al reenviar';
      toast.error(msg);
    } finally {
      setResendingEmail(false);
    }
  };

  if (cardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 p-6">
        <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-xl p-10 text-center max-w-sm border border-surface-200 dark:border-surface-700">
          <div className="w-16 h-16 mx-auto mb-4 bg-surface-100 rounded-full flex items-center justify-center text-surface-400">
            <IconSearch className="w-8 h-8" />
          </div>
          <h2 className="font-bold text-surface-900 dark:text-white mb-2">Programa no encontrado</h2>
          <p className="text-surface-500 text-sm">El enlace no es válido o el programa ha sido desactivado.</p>
        </div>
      </div>
    );
  }

  const bgColor = card.background_color || '#1A1A2E';

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

        <div className="bg-white dark:bg-surface-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10 backdrop-blur-xl">

          {step === 'form' && (
            <EnrollmentForm
              card={card}
              form={form}
              setForm={setForm}
              formErrors={formErrors}
              setFormErrors={setFormErrors}
              privacyAccepted={privacyAccepted}
              setPrivacyAccepted={setPrivacyAccepted}
              honeypot={honeypot}
              setHoneypot={setHoneypot}
              loading={loading}
              cooldown={cooldown}
              onSubmit={handleEnroll}
            />
          )}

          {step === 'success' && enrollResult && (
            <div className="text-center py-2 space-y-5">
              {/* Icon */}
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${enrollResult.already_enrolled ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'}`}>
                {enrollResult.already_enrolled ? (
                  <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                ) : (
                  <IconCheckCircle className="w-9 h-9" />
                )}
              </div>

              <div>
                <h2 className="text-xl font-bold text-surface-900 dark:text-white mb-1">
                  {enrollResult.already_enrolled ? 'Ya estás inscrito' : 'Inscripción exitosa'}
                </h2>
                <p className="text-surface-500 text-sm">
                  {enrollResult.already_enrolled
                    ? <>Ya eres miembro de <strong>{enrollResult.card_name}</strong>. Aquí está tu tarjeta:</>
                    : <>Ya eres miembro de <strong>{enrollResult.card_name}</strong>.</>}
                </p>
              </div>

              <EnrollmentHero card={card} enrollResult={enrollResult} form={form} />

              <WalletButtons
                enrollResult={enrollResult}
                walletStatus={walletStatus}
                onAppleWallet={handleAppleWallet}
                onGoogleWallet={handleGoogleWallet}
              />

              {/* Resend to email — shown when already enrolled */}
              {enrollResult?.already_enrolled && (
                <button
                  onClick={handleResendEmail}
                  disabled={resendingEmail}
                  className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-600/20"
                >
                  {resendingEmail ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 01-2 2H4a2 2 0 01-2-2V10a2 2 0 01.8-1.6l8-6a2 2 0 012.4 0l8 6z"/><polyline points="22 12 12 17 2 12"/></svg>
                  )}
                  {resendingEmail ? 'Enviando...' : 'Reenviar tarjeta a mi email'}
                </button>
              )}

              {/* Pass ID and link for later access */}
              {enrollResult?.id && (
                <div className="text-center space-y-1">
                  <p className="text-[10px] text-surface-400 font-mono">ID: {enrollResult.id}</p>
                  <a
                    href={`/pass/${enrollResult.id}/`}
                    className="block text-xs text-brand-600 hover:text-brand-700 font-medium py-1"
                  >
                    Ver mi tarjeta / Agregar a billetera →
                  </a>
                </div>
              )}

              <p className="text-[10px] text-surface-400 pt-1">
                Tu tarjeta de fidelización ya está activa. Muestra el código QR en tu siguiente visita.
              </p>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
                <IconXCircle className="w-9 h-9" />
              </div>
              <h2 className="text-xl font-bold text-surface-900 dark:text-white">Error de inscripción</h2>
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
