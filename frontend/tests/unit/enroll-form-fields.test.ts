/**
 * enroll-form-fields.test.ts — R9: la inscripción ya no pide date_of_birth
 * nunca configurado.
 *
 * Causa raíz: el fallback de EnrollmentForm y el de app/enroll/[slug] pedían
 * 5 campos (incluido date_of_birth) mientras el wizard por defecto define 3
 * (name/email/phone) que además nunca se persistían al aceptar los defaults.
 *
 * Cubre el módulo compartido components/enroll/enrollFormFields:
 * - UN solo fallback compartido (name/email/phone), sin date_of_birth.
 * - metadata.form_fields configurado se respeta tal cual (ids legacy,
 *   incluido date_of_birth, aceptados aditivamente: el backend valida contra
 *   esos ids).
 * - R9a: ensurePersistedFormFields persiste form_fields aunque se acepten los
 *   defaults del wizard.
 * - Normalización de ids name ↔ first_name/last_name.
 */
import React, { createElement as h, useState } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import { I18nProvider } from '@/lib/i18n';
import {
  buildEnrollFields,
  resolveEnrollFields,
  ensurePersistedFormFields,
  buildInitialFormValues,
  splitName,
  memberDisplayName,
  type EnrollFormField,
} from '@/components/enroll/enrollFormFields';
import EnrollmentForm from '@/components/enroll/EnrollmentForm';

const t = (key: string) => key;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('buildEnrollFields — fallback compartido del wizard (3 campos, sin date_of_birth)', () => {
  it('define exactamente name/email/phone como el FormBuilder del wizard', () => {
    const ids = buildEnrollFields(t).map((f) => f.id);
    expect(ids).toEqual(['name', 'email', 'phone']);
  });

  it('nunca incluye date_of_birth', () => {
    expect(buildEnrollFields(t).some((f) => f.id === 'date_of_birth')).toBe(false);
  });

  it('usa las etiquetas i18n del wizard (programs.formBuilder.defaultFields.*)', () => {
    const [name, email, phone] = buildEnrollFields(t);
    expect(name!.label).toBe('programs.formBuilder.defaultFields.name');
    expect(email!.label).toBe('programs.formBuilder.defaultFields.email');
    expect(phone!.label).toBe('programs.formBuilder.defaultFields.phone');
  });
});

describe('resolveEnrollFields — fallback ÚNICO compartido', () => {
  it('usa el fallback cuando no hay metadata', () => {
    expect(resolveEnrollFields(undefined, t).map((f) => f.id)).toEqual(['name', 'email', 'phone']);
    expect(resolveEnrollFields(null, t).map((f) => f.id)).toEqual(['name', 'email', 'phone']);
    expect(resolveEnrollFields({}, t).map((f) => f.id)).toEqual(['name', 'email', 'phone']);
  });

  it('usa el fallback cuando form_fields está vacío o es inválido', () => {
    expect(resolveEnrollFields({ form_fields: [] }, t).map((f) => f.id)).toEqual(['name', 'email', 'phone']);
    expect(resolveEnrollFields({ form_fields: 'garbage' }, t).map((f) => f.id)).toEqual(['name', 'email', 'phone']);
  });

  it('el fallback no contiene date_of_birth aunque el viejo fallback sí lo pedía', () => {
    for (const metadata of [undefined, null, {}, { form_fields: [] }, { form_fields: 'x' }]) {
      expect(resolveEnrollFields(metadata as Record<string, unknown>, t).some((f) => f.id === 'date_of_birth')).toBe(false);
    }
  });

  it('respeta metadata.form_fields tal cual — ids legacy aceptados aditivamente', () => {
    const legacy: EnrollFormField[] = [
      { id: 'first_name', type: 'text', label: 'Nombre', placeholder: '', required: true },
      { id: 'last_name', type: 'text', label: 'Apellido', placeholder: '', required: true },
      { id: 'email', type: 'email', label: 'Correo', placeholder: '', required: true },
      { id: 'date_of_birth', type: 'date', label: 'Nacimiento', placeholder: '', required: false },
    ];
    const resolved = resolveEnrollFields({ form_fields: legacy }, t);
    expect(resolved.map((f) => f.id)).toEqual(['first_name', 'last_name', 'email', 'date_of_birth']);
  });

  it('normaliza entradas parciales (type por defecto, required coercido, sin id se descarta)', () => {
    const resolved = resolveEnrollFields(
      { form_fields: [{ id: 'field_x', label: 'X' }, { id: '', label: 'sin id' }, null] },
      t,
    );
    expect(resolved).toHaveLength(1);
    expect(resolved[0]).toMatchObject({ id: 'field_x', type: 'text', required: false });
  });
});

describe('ensurePersistedFormFields — R9a persiste form_fields aunque se acepten los defaults', () => {
  it('devuelve los defaults del wizard cuando no hay nada configurado', () => {
    expect(ensurePersistedFormFields({}, t).map((f) => f.id)).toEqual(['name', 'email', 'phone']);
  });

  it('conserva una lista ya configurada (no la pisa)', () => {
    const configured: EnrollFormField[] = [
      { id: 'first_name', type: 'text', label: 'Nombre', placeholder: '', required: true },
    ];
    expect(ensurePersistedFormFields({ form_fields: configured }, t)).toEqual(configured);
  });
});

describe('normalización de ids name ↔ first_name/last_name', () => {
  it('divide un nombre único en first_name/last_name', () => {
    expect(splitName({ name: 'Ada Lovelace' })).toEqual({ first_name: 'Ada', last_name: 'Lovelace', name: 'Ada Lovelace' });
  });

  it('une first_name/last_name en name', () => {
    expect(splitName({ first_name: 'Ada', last_name: 'Lovelace' })).toEqual({ first_name: 'Ada', last_name: 'Lovelace', name: 'Ada Lovelace' });
  });

  it('acepta esquemas mixtos sin perder datos', () => {
    const out = splitName({ first_name: 'Ada', name: 'Ignorado Byron' });
    expect(out.first_name).toBe('Ada');
    expect(out.name).toBe('Ada');
  });

  it('memberDisplayName funciona con cualquier esquema', () => {
    expect(memberDisplayName({ name: 'Ada Lovelace' })).toBe('Ada Lovelace');
    expect(memberDisplayName({ first_name: 'Ada', last_name: 'Lovelace' })).toBe('Ada Lovelace');
    expect(memberDisplayName({})).toBe('');
  });

  it('buildInitialFormValues crea un string vacío por campo', () => {
    expect(buildInitialFormValues(buildEnrollFields(t))).toEqual({ name: '', email: '', phone: '' });
  });
});

// ─── Integración de rendering: EnrollmentForm usa el mismo fallback ───────────

/** Harness mínima para renderizar EnrollmentForm con estado local. */
function EnrollmentHarness({ metadata }: { metadata?: Record<string, unknown> }) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  return h(EnrollmentForm, {
    card: { id: 'c1', name: 'Tarjeta', card_type: 'loyalty', metadata: metadata ?? {} },
    form,
    setForm,
    formErrors,
    setFormErrors,
    privacyAccepted,
    setPrivacyAccepted,
    honeypot,
    setHoneypot,
    loading: false,
    cooldown: 0,
    onSubmit: (e: { preventDefault: () => void }) => e.preventDefault(),
  });
}

const renderForm = (metadata?: Record<string, unknown>) =>
  render(h(I18nProvider, null, h(EnrollmentHarness, { metadata })));

describe('EnrollmentForm — rendering con el fallback compartido', () => {
  it('sin configuración renderiza name/email/phone y NUNCA date_of_birth', () => {
    renderForm();
    expect(document.getElementById('name')).toBeTruthy();
    expect(document.getElementById('email')).toBeTruthy();
    expect(document.getElementById('phone')).toBeTruthy();
    expect(document.getElementById('date_of_birth')).toBeNull();
  });

  it('con metadata legada (first_name/last_name/date_of_birth) la respeta tal cual', () => {
    renderForm({
      form_fields: [
        { id: 'first_name', type: 'text', label: 'Nombre', placeholder: '', required: true },
        { id: 'last_name', type: 'text', label: 'Apellido', placeholder: '', required: true },
        { id: 'date_of_birth', type: 'date', label: 'Nacimiento', placeholder: '', required: false },
      ],
    });
    expect(document.getElementById('first_name')).toBeTruthy();
    expect(document.getElementById('last_name')).toBeTruthy();
    expect(document.getElementById('date_of_birth')).toBeTruthy();
    expect(document.getElementById('name')).toBeNull();
  });

  it('renderiza exactamente los campos configurados', () => {
    renderForm({ form_fields: [{ id: 'field_custom', type: 'text', label: 'Campo X', placeholder: '', required: false }] });
    expect(screen.getByLabelText('Campo X')).toBeTruthy();
    expect(document.getElementById('email')).toBeNull();
  });
});
