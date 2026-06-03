/**
 * Unit tests for Zod validation schemas.
 */
import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  locationSchema,
  programSchema,
  passwordChangeSchema,
  campaignSchema,
  campaignStep0Schema,
  campaignStep1Schema,
  campaignStep2Schema,
  programWizardStep0Schema,
  programWizardStep2Schema,
} from '@/lib/validations';

describe('loginSchema', () => {
  it('accepts valid email and password', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: 'secret123' });
    expect(result.success).toBe(true);
  });

  it('rejects empty email', () => {
    const result = loginSchema.safeParse({ email: '', password: 'secret123' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email format', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'secret123' });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: '' });
    expect(result.success).toBe(false);
  });
});

describe('registerSchema', () => {
  const valid = {
    business_name: 'Mi Negocio',
    first_name: 'Juan',
    last_name: 'Pérez',
    email: 'juan@example.com',
    password: 'password123',
    phone_number: '+593999999999',
  };

  it('accepts valid registration data', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects empty business_name', () => {
    expect(registerSchema.safeParse({ ...valid, business_name: '' }).success).toBe(false);
  });

  it('rejects business_name over 200 chars', () => {
    expect(registerSchema.safeParse({ ...valid, business_name: 'a'.repeat(201) }).success).toBe(false);
  });

  it('rejects short password', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'short' }).success).toBe(false);
  });

  it('rejects password over 128 chars', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'a'.repeat(129) }).success).toBe(false);
  });

  it('accepts missing phone_number', () => {
    const { phone_number, ...rest } = valid;
    expect(registerSchema.safeParse(rest).success).toBe(true);
  });
});

describe('locationSchema', () => {
  const valid = {
    name: 'Sucursal Centro',
    address: 'Av. Principal 123',
    city: 'Quito',
    country: 'EC',
    latitude: -0.18,
    longitude: -78.48,
    phone: '+593999999999',
    is_active: true,
    is_primary: false,
  };

  it('accepts valid location', () => {
    expect(locationSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects empty name', () => {
    expect(locationSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
  });

  it('rejects name over 200 chars', () => {
    expect(locationSchema.safeParse({ ...valid, name: 'a'.repeat(201) }).success).toBe(false);
  });

  it('rejects invalid latitude', () => {
    expect(locationSchema.safeParse({ ...valid, latitude: 91 }).success).toBe(false);
  });

  it('rejects invalid longitude', () => {
    expect(locationSchema.safeParse({ ...valid, longitude: 181 }).success).toBe(false);
  });

  it('accepts null coordinates', () => {
    expect(locationSchema.safeParse({ ...valid, latitude: null, longitude: null }).success).toBe(true);
  });
});

describe('programSchema', () => {
  const valid = {
    name: 'Café Frecuente',
    card_type: 'stamp',
    description: 'Programa de sellos',
    background_color: '#1a1a2e',
    text_color: '#ffffff',
    logo_url: 'https://example.com/logo.png',
    strip_image_url: '',
    icon_url: '',
    barcode_type: 'qr_code',
  };

  it('accepts valid program data', () => {
    expect(programSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects empty name', () => {
    expect(programSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
  });

  it('rejects empty card_type', () => {
    expect(programSchema.safeParse({ ...valid, card_type: '' }).success).toBe(false);
  });

  it('rejects invalid hex color', () => {
    expect(programSchema.safeParse({ ...valid, background_color: 'red' }).success).toBe(false);
  });

  it('rejects invalid logo_url', () => {
    expect(programSchema.safeParse({ ...valid, logo_url: 'not-a-url' }).success).toBe(false);
  });

  it('accepts empty optional URLs', () => {
    expect(programSchema.safeParse({ ...valid, logo_url: '', strip_image_url: '', icon_url: '' }).success).toBe(true);
  });
});

describe('passwordChangeSchema', () => {
  it('accepts matching passwords', () => {
    expect(passwordChangeSchema.safeParse({
      current_password: 'oldpass123',
      new_password: 'newpass123',
      confirm_password: 'newpass123',
    }).success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = passwordChangeSchema.safeParse({
      current_password: 'oldpass123',
      new_password: 'newpass123',
      confirm_password: 'different123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short new password', () => {
    expect(passwordChangeSchema.safeParse({
      current_password: 'oldpass123',
      new_password: 'short',
      confirm_password: 'short',
    }).success).toBe(false);
  });
});

describe('campaignSchema', () => {
  const valid = {
    internalName: 'Campaña Verano',
    title: 'Oferta especial',
    message: 'Aprovecha esta oferta',
    imageUrl: '',
    actionUrl: '',
    channel: 'email' as const,
    walletPlatform: 'both' as const,
    audience: {
      mode: 'preset' as const,
      programId: 'all',
      walletPlatform: 'both' as const,
      segmentId: 'all',
      customerIds: [],
      excludedCustomerIds: [],
      customerCount: 10,
      label: 'Todos',
    },
    scheduleType: 'immediate' as const,
    scheduledAt: null,
  };

  it('accepts valid campaign data', () => {
    expect(campaignSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects empty title', () => {
    expect(campaignSchema.safeParse({ ...valid, title: '' }).success).toBe(false);
  });

  it('rejects empty message', () => {
    expect(campaignSchema.safeParse({ ...valid, message: '' }).success).toBe(false);
  });

  it('rejects scheduled without scheduledAt', () => {
    expect(campaignSchema.safeParse({ ...valid, scheduleType: 'scheduled', scheduledAt: null }).success).toBe(false);
  });

  it('accepts scheduled with valid scheduledAt', () => {
    expect(campaignSchema.safeParse({ ...valid, scheduleType: 'scheduled', scheduledAt: '2026-06-03T10:00' }).success).toBe(true);
  });

  it('rejects wallet channel without walletPlatform', () => {
    expect(campaignSchema.safeParse({ ...valid, channel: 'wallet', walletPlatform: undefined }).success).toBe(false);
  });

  it('rejects audience with zero customerCount', () => {
    expect(campaignSchema.safeParse({ ...valid, audience: { ...valid.audience, customerCount: 0 } }).success).toBe(false);
  });
});

describe('campaignStep0Schema', () => {
  it('accepts valid email channel', () => {
    expect(campaignStep0Schema.safeParse({ channel: 'email', walletPlatform: 'both' }).success).toBe(true);
  });

  it('accepts wallet channel with platform', () => {
    expect(campaignStep0Schema.safeParse({ channel: 'wallet', walletPlatform: 'apple' }).success).toBe(true);
  });

  it('rejects wallet channel without platform', () => {
    expect(campaignStep0Schema.safeParse({ channel: 'wallet', walletPlatform: undefined }).success).toBe(false);
  });
});

describe('campaignStep1Schema', () => {
  const validAudience = {
    audience: {
      mode: 'preset' as const,
      programId: 'prog-1',
      walletPlatform: 'both' as const,
      segmentId: 'all',
      customerIds: [],
      excludedCustomerIds: [],
      customerCount: 5,
      label: 'Todos',
    },
  };

  it('accepts valid audience', () => {
    expect(campaignStep1Schema.safeParse(validAudience).success).toBe(true);
  });

  it('rejects empty programId', () => {
    expect(campaignStep1Schema.safeParse({
      audience: { ...validAudience.audience, programId: '' },
    }).success).toBe(false);
  });

  it('rejects empty segmentId', () => {
    expect(campaignStep1Schema.safeParse({
      audience: { ...validAudience.audience, segmentId: '' },
    }).success).toBe(false);
  });

  it('rejects zero customerCount', () => {
    expect(campaignStep1Schema.safeParse({
      audience: { ...validAudience.audience, customerCount: 0 },
    }).success).toBe(false);
  });
});

describe('campaignStep2Schema', () => {
  it('accepts valid compose data', () => {
    expect(campaignStep2Schema.safeParse({
      title: 'Oferta',
      message: 'Mensaje',
      scheduleType: 'immediate',
    }).success).toBe(true);
  });

  it('rejects empty title', () => {
    expect(campaignStep2Schema.safeParse({ title: '', message: 'Mensaje', scheduleType: 'immediate' }).success).toBe(false);
  });

  it('rejects empty message', () => {
    expect(campaignStep2Schema.safeParse({ title: 'Oferta', message: '', scheduleType: 'immediate' }).success).toBe(false);
  });

  it('rejects scheduled without date', () => {
    expect(campaignStep2Schema.safeParse({
      title: 'Oferta', message: 'Mensaje', scheduleType: 'scheduled', scheduledAt: null,
    }).success).toBe(false);
  });

  it('accepts scheduled with date', () => {
    expect(campaignStep2Schema.safeParse({
      title: 'Oferta', message: 'Mensaje', scheduleType: 'scheduled', scheduledAt: '2026-06-03T10:00',
    }).success).toBe(true);
  });
});

describe('programWizardStep0Schema', () => {
  it('accepts valid card_type', () => {
    expect(programWizardStep0Schema.safeParse({ card_type: 'stamp' }).success).toBe(true);
  });

  it('rejects empty card_type', () => {
    expect(programWizardStep0Schema.safeParse({ card_type: '' }).success).toBe(false);
  });
});

describe('programWizardStep2Schema', () => {
  const valid = {
    name: 'Programa Test',
    description: 'Descripción',
    background_color: '#1a1a2e',
    text_color: '#ffffff',
    locations: [{ lat: -0.18, lng: -78.48, name: 'Sucursal Centro' }],
  };

  it('accepts valid step 2 data', () => {
    expect(programWizardStep2Schema.safeParse(valid).success).toBe(true);
  });

  it('rejects empty name', () => {
    expect(programWizardStep2Schema.safeParse({ ...valid, name: '' }).success).toBe(false);
  });

  it('rejects invalid color', () => {
    expect(programWizardStep2Schema.safeParse({ ...valid, background_color: 'red' }).success).toBe(false);
  });

  it('rejects location with empty name', () => {
    expect(programWizardStep2Schema.safeParse({
      ...valid, locations: [{ lat: -0.18, lng: -78.48, name: '' }],
    }).success).toBe(false);
  });

  it('rejects location with invalid lat', () => {
    expect(programWizardStep2Schema.safeParse({
      ...valid, locations: [{ lat: 91, lng: -78.48, name: 'Sucursal' }],
    }).success).toBe(false);
  });

  it('accepts empty locations array', () => {
    expect(programWizardStep2Schema.safeParse({ ...valid, locations: [] }).success).toBe(true);
  });
});
