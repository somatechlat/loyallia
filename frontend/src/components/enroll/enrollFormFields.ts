/**
 * Shared enrollment form-field resolution.
 *
 * ONE source of truth for the enrollment form fields shown on the public
 * enroll page (`app/enroll/[slug]`) and rendered by `EnrollmentForm`.
 *
 * Rules (ENR / R9):
 * - `card.metadata.form_fields` (FormBuilder output) is authoritative and is
 *   passed through AS-IS — legacy ids (`first_name`, `last_name`,
 *   `date_of_birth`, ...) are accepted additively because the backend validates
 *   the payload against exactly those ids.
 * - When nothing is configured, the shared fallback is used: the same 3 fields
 *   as the program wizard defaults (`name`, `email`, `phone`) — NEVER a field
 *   the business never configured (the old fallback asked for `date_of_birth`).
 * - Id normalization: the program wizard uses a single `name` field while
 *   legacy configs split `first_name` / `last_name`. Both schemes are
 *   understood everywhere (initial values, prefill, display name).
 */

/** Field config as stored in `card.metadata.form_fields` (FormBuilder shape). */
export interface EnrollFormField {
  id: string;
  type: string;
  label: string;
  placeholder: string;
  required: boolean;
  options?: string[];
  country_code?: boolean;
  unique?: boolean;
}

/** Minimal translate function (`t` from useI18n). */
export type TranslateFn = (key: string) => string;

/** Ids accepted additively from legacy form_fields configurations. */
export const LEGACY_ENROLL_FIELD_IDS = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'date_of_birth',
  'gender',
  'notes',
  'cedula',
] as const;

/** Known business/tenant data that can prefill enrollment fields (R11). */
export interface KnownEnrollData {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

/**
 * The shared fallback / wizard-default field set: `name`, `email`, `phone`.
 * Identical shape and labels to the FormBuilder defaults so a program that
 * accepts the defaults persists exactly what the fallback renders.
 */
export function buildEnrollFields(t: TranslateFn): EnrollFormField[] {
  return [
    {
      id: 'name',
      type: 'text',
      label: t('programs.formBuilder.defaultFields.name'),
      placeholder: t('programs.formBuilder.defaultFields.namePlaceholder'),
      required: true,
      unique: false,
    },
    {
      id: 'email',
      type: 'email',
      label: t('programs.formBuilder.defaultFields.email'),
      placeholder: t('programs.formBuilder.defaultFields.emailPlaceholder'),
      required: true,
      unique: true,
    },
    {
      id: 'phone',
      type: 'tel',
      label: t('programs.formBuilder.defaultFields.phone'),
      placeholder: t('programs.formBuilder.defaultFields.phonePlaceholder'),
      required: false,
      unique: false,
      country_code: true,
    },
  ];
}

/**
 * @description Resolve the enrollment fields for a card.
 * Uses `metadata.form_fields` when configured (legacy ids accepted additively),
 * otherwise the shared fallback (no `date_of_birth`).
 * @param metadata - Card metadata (`card.metadata`) or null/undefined.
 * @param t - Translate function.
 * @returns The normalized field list to render, validate and submit.
 */
export function resolveEnrollFields(
  metadata: Record<string, unknown> | null | undefined,
  t: TranslateFn,
): EnrollFormField[] {
  const configured = (metadata as Record<string, unknown> | null | undefined)?.form_fields;
  if (Array.isArray(configured) && configured.length > 0) {
    return configured
      .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object')
      .map((f) => ({
        id: String(f.id ?? ''),
        type: String(f.type ?? 'text'),
        label: String(f.label ?? f.id ?? ''),
        placeholder: String(f.placeholder ?? ''),
        required: !!f.required,
        options: Array.isArray(f.options) ? (f.options as string[]) : undefined,
        country_code: f.country_code ? true : undefined,
        unique: f.unique ? true : undefined,
      }))
      .filter((f) => f.id !== '');
  }
  return buildEnrollFields(t);
}

/**
 * @description Persist `form_fields` in program metadata even when the user
 * accepts the wizard defaults (R9a). Keeps an already-configured list.
 * @param meta - Program metadata being built.
 * @param t - Translate function.
 * @returns The form_fields list to persist.
 */
export function ensurePersistedFormFields(
  meta: Record<string, unknown>,
  t: TranslateFn,
): EnrollFormField[] {
  const existing = meta?.form_fields;
  if (Array.isArray(existing) && existing.length > 0) {
    return existing as EnrollFormField[];
  }
  return buildEnrollFields(t);
}

/**
 * @description Build the initial (empty) value record for a field list.
 * @param fields - Resolved enrollment fields.
 * @returns One empty string per field id.
 */
export function buildInitialFormValues(fields: EnrollFormField[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const f of fields) values[f.id] = '';
  return values;
}

/**
 * @description Normalize a name value into the `name` / `first_name` /
 * `last_name` id schemes (mirrors the backend `_split_name`).
 * @param values - Current form values (either id scheme).
 * @returns The name split and joined under every known id.
 */
export function splitName(values: Record<string, string>): {
  first_name: string;
  last_name: string;
  name: string;
} {
  const first = (values.first_name ?? '').trim();
  const last = (values.last_name ?? '').trim();
  const rawName = (values.name ?? '').trim();
  let firstOut = first;
  let lastOut = last;
  if (!firstOut && rawName) {
    const parts = rawName.split(/\s+/);
    firstOut = parts[0] ?? '';
    if (!lastOut) lastOut = parts.slice(1).join(' ');
  }
  return {
    first_name: firstOut,
    last_name: lastOut,
    name: [firstOut, lastOut].filter(Boolean).join(' ') || rawName,
  };
}

/**
 * @description Display name of the enrolled member, whatever id scheme the
 * configured fields use (`name` or `first_name`/`last_name`).
 * @param values - Current form values.
 * @returns The member display name (may be empty).
 */
export function memberDisplayName(values: Record<string, string>): string {
  const { name } = splitName(values);
  return name;
}

/**
 * @description Map a field id onto a known-data key (id normalization shared
 * by prefill and initial values). Legacy ids are accepted additively.
 * @param id - Field id.
 * @returns The known-data key, or null for dynamic/custom ids.
 */
export function knownKeyForFieldId(id: string): keyof KnownEnrollData | null {
  const norm = id.trim().toLowerCase();
  if (norm === 'name' || norm === 'nombre') return 'name';
  if (norm === 'first_name' || norm === 'firstname') return 'name';
  if (norm === 'last_name' || norm === 'lastname') return 'name';
  if (norm === 'email' || norm === 'correo') return 'email';
  if (norm === 'phone' || norm === 'telefono' || norm === 'tel' || norm === 'celular') return 'phone';
  if (norm === 'address' || norm === 'direccion') return 'address';
  return null;
}

/** Label keywords used to match custom (`field_*`) ids to known data. */
function knownKeyForLabel(label: string): keyof KnownEnrollData | null {
  const norm = label.trim().toLowerCase();
  if (/direcci[oó]n|address/.test(norm)) return 'address';
  if (/correo|e-?mail/.test(norm)) return 'email';
  if (/tel[eé]fono|celular|phone/.test(norm)) return 'phone';
  if (/nombre|name/.test(norm)) return 'name';
  return null;
}

/**
 * @description Compute prefill values for a field list from already-known
 * business/tenant data (R11). Only well-known data is used; unknown fields are
 * left for the user.
 * @param fields - Resolved enrollment fields.
 * @param known - Known data (name, email, phone, address).
 * @returns Prefill values keyed by field id (only fields with known data).
 */
export function prefillValuesForFields(
  fields: EnrollFormField[],
  known: KnownEnrollData,
): Record<string, string> {
  const name = (known.name ?? '').trim();
  const nameParts = name ? name.split(/\s+/) : [];
  const firstName = nameParts[0] ?? '';
  const lastName = nameParts.slice(1).join(' ');
  const out: Record<string, string> = {};

  for (const field of fields) {
    const idNorm = field.id.trim().toLowerCase();
    let key = knownKeyForFieldId(field.id) ?? knownKeyForLabel(field.label ?? '');
    // `name` vs split-name normalization: decide by the actual field id.
    if (key === 'name') {
      if (idNorm === 'first_name' || idNorm === 'firstname') {
        if (firstName) out[field.id] = firstName;
        continue;
      }
      if (idNorm === 'last_name' || idNorm === 'lastname') {
        if (lastName) out[field.id] = lastName;
        continue;
      }
      if (name) out[field.id] = name;
      continue;
    }
    if (key === 'email' && known.email) out[field.id] = known.email.trim();
    else if (key === 'phone' && known.phone) out[field.id] = known.phone.trim();
    else if (key === 'address' && known.address) out[field.id] = known.address.trim();
  }
  return out;
}

/**
 * @description Merge prefill values into the current form values. Prefill ONLY
 * fills empty fields — user input is never overwritten.
 * @param current - Current form values.
 * @param prefill - Prefill values (see {@link prefillValuesForFields}).
 * @returns The merged values.
 */
export function mergePrefill(
  current: Record<string, string>,
  prefill: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = { ...current };
  for (const [key, value] of Object.entries(prefill)) {
    if (!out[key] && value) out[key] = value;
  }
  return out;
}
