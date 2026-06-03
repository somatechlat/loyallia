'use client';

import React from 'react';

/**
 * Represents a loyalty card for enrollment.
 */
interface Card {
  id: string; name: string; description: string; card_type: string; tenant_name: string;
  background_color: string; text_color: string; logo_url: string; strip_image_url: string;
  metadata: Record<string, unknown>;
}

/**
 * Props for the EnrollmentForm component.
 */
interface EnrollmentFormProps {
  /** Card data for the program */
  card: Card;
  /** Current form field values */
  form: Record<string, string>;
  /** Form state setter */
  setForm: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  /** Current form validation errors */
  formErrors: Record<string, string>;
  /** Error state setter */
  setFormErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  /** Whether the privacy policy is accepted */
  privacyAccepted: boolean;
  /** Privacy acceptance setter */
  setPrivacyAccepted: (v: boolean) => void;
  /** Honeypot field value (anti-bot) */
  honeypot: string;
  /** Honeypot setter */
  setHoneypot: (v: string) => void;
  /** Whether the form is submitting */
  loading: boolean;
  /** Cooldown seconds before re-submit */
  cooldown: number;
  /** Form submit handler */
  onSubmit: (e: React.FormEvent) => void;
}

/**
 * @description Dynamic enrollment form with custom fields, honeypot, and privacy consent.
 * @param {EnrollmentFormProps} props - Component props
 * @returns JSX.Element
 */
export default function EnrollmentForm({
  card,
  form,
  setForm,
  formErrors,
  setFormErrors,
  privacyAccepted,
  setPrivacyAccepted,
  honeypot,
  setHoneypot,
  loading,
  cooldown,
  onSubmit,
}: EnrollmentFormProps) {
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

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <h2 className="text-lg font-bold text-surface-900 dark:text-white text-center mb-1">Únete ahora</h2>
      <p className="text-center text-surface-400 text-xs mb-4">Completa tus datos para recibir tu tarjeta digital</p>

      {fields.map(({ id, label, placeholder, type, required, options, country_code }) => (
        <div key={id}>
          <label className="block text-xs font-semibold text-surface-600 mb-1 uppercase tracking-wider" htmlFor={id}>
            {label}{required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          {type === 'select' && options ? (
            <select id={id}
              className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 dark:border-surface-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
              value={form[id] || ''} onChange={e => { setForm(f => ({ ...f, [id]: e.target.value })); setFormErrors(prev => { const n = { ...prev }; delete n[id]; return n; }); }}
              aria-invalid={!!formErrors[id]} aria-describedby={formErrors[id] ? `${id}-error` : undefined}
              required={required}>
              <option value="">Seleccionar...</option>
              {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : type === 'tel' && country_code ? (
            <div className="flex gap-2">
              <select className="w-24 px-2 py-2.5 bg-surface-50 border border-surface-200 dark:border-surface-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                value={form[`${id}_code`] || '+593'}
                onChange={e => setForm(f => ({ ...f, [`${id}_code`]: e.target.value }))}>
                {['+593','+1','+52','+57','+51','+56','+54','+34','+44'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input id={id} type="tel"
                className="flex-1 px-4 py-2.5 bg-surface-50 border border-surface-200 dark:border-surface-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                placeholder={placeholder}
                value={form[id] || ''} onChange={e => { setForm(f => ({ ...f, [id]: e.target.value })); setFormErrors(prev => { const n = { ...prev }; delete n[id]; return n; }); }}
                aria-invalid={!!formErrors[id]} aria-describedby={formErrors[id] ? `${id}-error` : undefined}
                required={required} />
            </div>
          ) : (
            <input id={id} type={type}
              className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 dark:border-surface-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
              placeholder={placeholder}
              value={form[id] || ''} onChange={e => { setForm(f => ({ ...f, [id]: e.target.value })); setFormErrors(prev => { const n = { ...prev }; delete n[id]; return n; }); }}
              aria-invalid={!!formErrors[id]} aria-describedby={formErrors[id] ? `${id}-error` : undefined}
              required={required} />
          )}
          {formErrors[id] && <p id={`${id}-error`} role="alert" className="text-xs text-red-500 mt-1">{formErrors[id]}</p>}
        </div>
      ))}

      {/* SEC-011: Honeypot field — hidden from real users, catches bots */}
      <div className="absolute opacity-0 pointer-events-none" aria-hidden="true" tabIndex={-1}>
        <label htmlFor="website">Website</label>
        <input id="website" type="text" autoComplete="off" tabIndex={-1}
          value={honeypot} onChange={e => setHoneypot(e.target.value)} />
      </div>

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
        disabled={loading || !privacyAccepted || cooldown > 0} id="enroll-btn">
        {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
         cooldown > 0 ? `Espera ${cooldown}s...` : 'Inscribirme gratis'}
      </button>
      <p className="text-center text-[10px] text-surface-400">
        Al inscribirte aceptas recibir notificaciones de este programa.
      </p>
    </form>
  );
}
