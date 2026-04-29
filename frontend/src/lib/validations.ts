/**
 * Shared Zod validation schemas for all frontend forms.
 * LYL-H-FE-004: react-hook-form + zod integration
 * LYL-M-FE-020: Client-side validation with zod
 */
import { z } from 'zod';

/* ── Auth schemas ─────────────────────────────────────────────────────── */

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo electrónico es obligatorio')
    .email('Ingresa un correo electrónico válido'),
  password: z
    .string()
    .min(1, 'La contraseña es obligatoria'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  business_name: z
    .string()
    .min(1, 'El nombre del negocio es obligatorio')
    .max(200, 'Máximo 200 caracteres'),
  first_name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(100, 'Máximo 100 caracteres'),
  last_name: z
    .string()
    .min(1, 'El apellido es obligatorio')
    .max(100, 'Máximo 100 caracteres'),
  email: z
    .string()
    .min(1, 'El correo electrónico es obligatorio')
    .email('Ingresa un correo electrónico válido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'Máximo 128 caracteres'),
  phone_number: z.string().optional(),
});

export type RegisterFormData = z.infer<typeof registerSchema>;

/* ── Location schema ──────────────────────────────────────────────────── */

export const locationSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(200, 'Máximo 200 caracteres'),
  address: z.string().max(500, 'Máximo 500 caracteres').optional().default(''),
  city: z.string().max(100, 'Máximo 100 caracteres').optional().default(''),
  country: z.string().max(2).default('EC'),
  latitude: z
    .number()
    .min(-90, 'Latitud inválida')
    .max(90, 'Latitud inválida')
    .nullable()
    .optional(),
  longitude: z
    .number()
    .min(-180, 'Longitud inválida')
    .max(180, 'Longitud inválida')
    .nullable()
    .optional(),
  phone: z.string().max(30, 'Máximo 30 caracteres').optional().default(''),
  is_active: z.boolean().default(true),
  is_primary: z.boolean().default(false),
});

export type LocationFormData = z.infer<typeof locationSchema>;

/* ── Program creation schema ──────────────────────────────────────────── */

export const programSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre del programa es obligatorio')
    .max(200, 'Máximo 200 caracteres'),
  card_type: z.string().min(1, 'Selecciona un tipo de programa'),
  description: z.string().max(1000, 'Máximo 1000 caracteres').optional().default(''),
  background_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido').default('#1a1a2e'),
  text_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido').default('#ffffff'),
  logo_url: z.string().url('URL inválida').optional().or(z.literal('')).default(''),
  strip_image_url: z.string().url('URL inválida').optional().or(z.literal('')).default(''),
  icon_url: z.string().url('URL inválida').optional().or(z.literal('')).default(''),
  barcode_type: z.string().default('qr_code'),
});

export type ProgramFormData = z.infer<typeof programSchema>;

/* ── Password change schema ───────────────────────────────────────────── */

export const passwordChangeSchema = z
  .object({
    current_password: z.string().min(1, 'La contraseña actual es obligatoria'),
    new_password: z
      .string()
      .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
      .max(128, 'Máximo 128 caracteres'),
    confirm_password: z.string().min(1, 'Confirma la nueva contraseña'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm_password'],
  });

export type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

/* ── Campaign schema ──────────────────────────────────────────────────── */

export const campaignSchema = z.object({
  title: z
    .string()
    .min(1, 'El título es obligatorio')
    .max(200, 'Máximo 200 caracteres'),
  message: z
    .string()
    .min(1, 'El mensaje es obligatorio')
    .max(10000, 'Máximo 10,000 caracteres'),
  segment_id: z.string().min(1, 'Selecciona un segmento'),
  image_url: z.string().url('URL inválida').optional().or(z.literal('')).default(''),
});

export type CampaignFormData = z.infer<typeof campaignSchema>;
