/**
 * prefill.test.ts — Tests para R11 (pre-llenado del formulario de enroll con datos
 * conocidos del negocio/socio) y R10 (sede principal del TenantWizard precargada
 * desde la información de la empresa del paso 2).
 */
import { describe, it, expect, vi } from 'vitest';
import {
  prefillValuesForFields,
  mergePrefill,
  type EnrollFormField,
} from '@/components/enroll/enrollFormFields';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
}));
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    const Noop = () => null;
    return Noop;
  },
}));

// Import perezoso tras los mocks: TenantWizard importa api/next-dynamic.
const { prefillPrimaryLocation } = await import(
  '@/components/superadmin/tenants/TenantWizard'
);

const f = (id: string, label: string, type = 'text', required = false): EnrollFormField => ({
  id,
  label,
  type,
  required,
});

describe('R11 — prefillValuesForFields', () => {
  it('divide el nombre completo en first_name/last_name cuando el esquema lo usa', () => {
    const values = prefillValuesForFields(
      [f('first_name', 'Nombre'), f('last_name', 'Apellido'), f('email', 'Correo', 'email')],
      {
        name: 'Ada Lovelace',
        email: 'ada@ejemplo.com',
        phone: '+593 99 111 2222',
        address: 'Av. Siempre Viva 742',
      },
    );
    expect(values.first_name).toBe('Ada');
    expect(values.last_name).toBe('Lovelace');
    expect(values.email).toBe('ada@ejemplo.com');
  });

  it('usa el nombre completo en un campo único name', () => {
    const values = prefillValuesForFields([f('name', 'Nombre completo')], {
      name: 'Ada Lovelace',
    });
    expect(values.name).toBe('Ada Lovelace');
    expect(values.first_name).toBeUndefined();
  });

  it('mapea ids personalizados por palabras clave de la etiqueta', () => {
    const values = prefillValuesForFields(
      [
        f('field_abc', 'Nombre completo'),
        f('field_def', 'Correo electrónico', 'email'),
        f('field_ghi', 'Teléfono', 'tel'),
        f('field_jkl', 'Dirección'),
      ],
      {
        name: 'Ada Lovelace',
        email: 'ada@ejemplo.com',
        phone: '+593 99 111 2222',
        address: 'Av. Siempre Viva 742',
      },
    );
    expect(values.field_abc).toBe('Ada Lovelace');
    expect(values.field_def).toBe('ada@ejemplo.com');
    expect(values.field_ghi).toBe('+593 99 111 2222');
    expect(values.field_jkl).toBe('Av. Siempre Viva 742');
  });

  it('no pre-llena campos sin dato conocido ni adivina valores', () => {
    const values = prefillValuesForFields(
      [f('name', 'Nombre'), f('date_of_birth', 'Fecha de nacimiento', 'date')],
      { name: 'Ada Lovelace' },
    );
    expect(values.name).toBe('Ada Lovelace');
    expect(values.date_of_birth).toBeUndefined();
    expect(Object.keys(values)).toHaveLength(1);
  });

  it('respeta los alias de teléfono y dirección', () => {
    const values = prefillValuesForFields(
      [f('phone', 'Teléfono', 'tel'), f('address', 'Dirección')],
      { phone: '+593 99 111 2222', address: 'Av. Siempre Viva 742' },
    );
    expect(values.phone).toBe('+593 99 111 2222');
    expect(values.address).toBe('Av. Siempre Viva 742');
  });
});

describe('R11 — mergePrefill (solo pre-llenado, nunca pisa la entrada del usuario)', () => {
  it('completa campos vacíos', () => {
    const merged = mergePrefill({ name: '', email: '' }, { name: 'Ada', email: 'a@b.com' });
    expect(merged).toEqual({ name: 'Ada', email: 'a@b.com' });
  });

  it('nunca sobrescribe valores ya cargados por el usuario', () => {
    const merged = mergePrefill(
      { name: 'Nombre del usuario', email: 'usuario@ejemplo.com' },
      { name: 'Ada', email: 'a@b.com', phone: '+593 99' },
    );
    expect(merged.name).toBe('Nombre del usuario');
    expect(merged.email).toBe('usuario@ejemplo.com');
    expect(merged.phone).toBe('+593 99');
  });

  it('no altera claves que el prefill no conoce', () => {
    const merged = mergePrefill(
      { field_x: 'dato del usuario' },
      { name: 'Ada' },
    );
    expect(merged.field_x).toBe('dato del usuario');
    expect(merged.name).toBe('Ada');
  });
});

describe('R10 — prefillPrimaryLocation (TenantWizard)', () => {
  const primary = () => ({
    name: '',
    street: '',
    city: '',
    country: 'Ecuador',
    latitude: undefined,
    longitude: undefined,
  });

  it('precarga nombre, dirección y ciudad de la sede principal desde la empresa', () => {
    const out = prefillPrimaryLocation(
      [primary()],
      { name: 'Panadería Loján', address: 'Av. Siempre Viva 742', city: 'Quito' },
      'Sede Principal',
    );
    expect(out[0]).toMatchObject({
      name: 'Panadería Loján',
      street: 'Av. Siempre Viva 742',
      city: 'Quito',
      country: 'Ecuador',
    });
  });

  it('usa el nombre de la empresa cuando la sede aún tiene la etiqueta por defecto', () => {
    const out = prefillPrimaryLocation(
      [{ ...primary(), name: 'Sede Principal', street: 'Av. Siempre Viva 742' }],
      { name: 'Panadería Loján', address: 'Av. 2' },
      'Sede Principal',
    );
    expect(out[0].name).toBe('Panadería Loján');
    expect(out[0].street).toBe('Av. 2');
  });

  it('respeta ediciones manuales de la sede y no toca sedes adicionales', () => {
    const extra = { ...primary(), name: 'Sucursal Norte', street: 'Calle Falsa 123' };
    const out = prefillPrimaryLocation(
      [{ ...primary(), name: 'Mi Local', street: 'Editada 1' }, extra],
      { name: 'Panadería Loján', address: 'Av. Siempre Viva 742', city: 'Quito' },
      'Sede Principal',
    );
    expect(out[0]).toMatchObject({ name: 'Mi Local', street: 'Editada 1' });
    expect(out[1]).toEqual(extra);
  });

  it('completa solo campos vacíos de la sede principal', () => {
    const out = prefillPrimaryLocation(
      [{ ...primary(), street: 'Editada por el usuario' }],
      { name: 'Panadería Loján', address: 'Av. Siempre Viva 742', city: 'Quito' },
      'Sede Principal',
    );
    expect(out[0].street).toBe('Editada por el usuario');
    expect(out[0].city).toBe('Quito');
    expect(out[0].name).toBe('Panadería Loján');
  });
});
