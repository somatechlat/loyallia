/**
 * LocationPicker — maps config validation, search wiring and pin visibility.
 *
 * Regression coverage for the broken-map bug: missing NEXT_PUBLIC_* map vars
 * must render a clear Spanish configuration notice (never a silent empty
 * search or an invisible marker), search failures must surface inline, and a
 * pin must always be visible (default center before any coordinates are set).
 *
 * react-leaflet is stubbed so this test exercises OUR logic, not Leaflet's
 * canvas. The pure helpers (env validation + Nominatim URL builders) are
 * tested directly.
 */
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

import { I18nProvider } from '@/lib/i18n';
import {
  getMapsConfigError,
  buildNominatimSearchUrl,
  buildNominatimReverseUrl,
  MAPS_REQUIRED_ENV_VARS,
} from '@/lib/constants';
import LocationPicker from '@/components/maps/LocationPicker';

vi.mock('leaflet', () => {
  function MarkerMock() {}
  MarkerMock.prototype.options = {};
  return {
    default: { icon: () => ({}), Marker: MarkerMock },
    icon: () => ({}),
    Marker: MarkerMock,
  };
});

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-map">{children}</div>,
  TileLayer: () => null,
  Marker: ({ position, children }: { position: [number, number]; children?: React.ReactNode }) => (
    <div data-testid="mock-marker" data-lat={position[0]} data-lng={position[1]}>
      {children}
    </div>
  ),
  Popup: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  useMapEvents: () => null,
  useMap: () => ({ flyTo: vi.fn() }),
}));

const ENV_KEYS = [
  'NEXT_PUBLIC_NOMINATIM_URL',
  'NEXT_PUBLIC_NOMINATIM_REVERSE_URL',
  'NEXT_PUBLIC_LEAFLET_ICON_URL',
] as const;

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nProvider>{children}</I18nProvider>
);

function renderPicker(lat: number | null = null, lng: number | null = null, onChange = vi.fn()) {
  render(
    <Wrapper>
      <LocationPicker lat={lat} lng={lng} onChange={onChange} />
    </Wrapper>
  );
  return { onChange };
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_NOMINATIM_URL = 'https://nominatim.example.test';
  process.env.NEXT_PUBLIC_NOMINATIM_REVERSE_URL = 'https://nominatim.example.test/reverse';
  process.env.NEXT_PUBLIC_LEAFLET_ICON_URL = 'https://cdn.example.test/leaflet';
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  for (const key of ENV_KEYS) delete process.env[key];
});

describe('getMapsConfigError', () => {
  it('returns a Spanish message listing every missing variable', () => {
    const error = getMapsConfigError({});
    expect(error).toBeTruthy();
    expect(error).toContain('Configuración de mapas');
    for (const key of MAPS_REQUIRED_ENV_VARS) {
      expect(error).toContain(key);
    }
  });

  it('lists only the missing variables', () => {
    const error = getMapsConfigError({
      NEXT_PUBLIC_NOMINATIM_URL: 'https://nominatim.example.test',
      NEXT_PUBLIC_NOMINATIM_REVERSE_URL: 'https://nominatim.example.test/reverse',
    });
    expect(error).toContain('NEXT_PUBLIC_LEAFLET_ICON_URL');
    expect(error).not.toContain('NEXT_PUBLIC_NOMINATIM_URL,');
  });

  it('returns null when everything is configured', () => {
    expect(
      getMapsConfigError({
        NEXT_PUBLIC_NOMINATIM_URL: 'https://nominatim.example.test',
        NEXT_PUBLIC_NOMINATIM_REVERSE_URL: 'https://nominatim.example.test/reverse',
        NEXT_PUBLIC_LEAFLET_ICON_URL: 'https://cdn.example.test/leaflet',
      })
    ).toBeNull();
  });

  it('treats empty strings as missing', () => {
    expect(
      getMapsConfigError({
        NEXT_PUBLIC_NOMINATIM_URL: '',
        NEXT_PUBLIC_NOMINATIM_REVERSE_URL: 'https://nominatim.example.test/reverse',
        NEXT_PUBLIC_LEAFLET_ICON_URL: 'https://cdn.example.test/leaflet',
      })
    ).toContain('NEXT_PUBLIC_NOMINATIM_URL');
  });
});

describe('Nominatim URL builders', () => {
  it('builds a search URL with the encoded address', () => {
    const url = buildNominatimSearchUrl('https://nominatim.example.test', 'Av. Siempre Viva 742, Quito');
    expect(url).toBe(
      'https://nominatim.example.test?format=json&q=Av.%20Siempre%20Viva%20742%2C%20Quito&countrycodes=ec&limit=5'
    );
  });

  it('builds a reverse URL with coordinates', () => {
    expect(buildNominatimReverseUrl('https://nominatim.example.test/reverse', -0.18, -78.47)).toBe(
      'https://nominatim.example.test/reverse?format=json&lat=-0.18&lon=-78.47&zoom=18'
    );
  });
});

describe('LocationPicker configuration guard', () => {
  it('renders a Spanish configuration notice when map env vars are missing', () => {
    for (const key of ENV_KEYS) delete process.env[key];
    renderPicker();
    const notice = screen.getByTestId('maps-config-error');
    expect(notice.textContent).toContain('Configuración de mapas incompleta');
    expect(notice.textContent).toContain('NEXT_PUBLIC_NOMINATIM_URL');
    // No map must be rendered on a broken configuration.
    expect(screen.queryByTestId('mock-map')).toBeNull();
  });

  it('renders the map when the env vars are configured', () => {
    renderPicker();
    expect(screen.queryByTestId('maps-config-error')).toBeNull();
    expect(screen.getByTestId('mock-map')).toBeTruthy();
  });
});

describe('LocationPicker pin visibility', () => {
  it('always shows a default pin at the map center when no coordinates are set', () => {
    renderPicker(null, null);
    const marker = screen.getByTestId('mock-marker');
    expect(marker.getAttribute('data-lat')).toBe('-1.8312');
    expect(marker.getAttribute('data-lng')).toBe('-78.1834');
  });

  it('keeps the pin visible once coordinates are set', () => {
    renderPicker(-0.2, -78.5);
    const marker = screen.getByTestId('mock-marker');
    expect(marker.getAttribute('data-lat')).toBe('-0.2');
    expect(marker.getAttribute('data-lng')).toBe('-78.5');
  });
});

describe('LocationPicker search', () => {
  it('surfaces search errors inline instead of silently emptying results', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);
    renderPicker();
    const input = screen.getByPlaceholderText('Buscar dirección en Ecuador...');
    fireEvent.change(input, { target: { value: 'Av. Siempre Viva 742' } });

    await waitFor(() => expect(screen.getByTestId('maps-search-error')).toBeTruthy(), { timeout: 3000 });
    expect(screen.getByTestId('maps-search-error').textContent).toContain('No se pudo buscar la dirección');
  });

  it('selecting a result sets lat/lng AND the address', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { display_name: 'Av. Siempre Viva 742, Quito, Ecuador', lat: '-0.1801', lon: '-78.4687' },
      ],
    });
    vi.stubGlobal('fetch', fetchMock);
    const { onChange } = renderPicker();
    const input = screen.getByPlaceholderText('Buscar dirección en Ecuador...');
    fireEvent.change(input, { target: { value: 'Siempre Viva' } });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1), { timeout: 3000 });
    const resultButton = await screen.findByText('Av. Siempre Viva 742, Quito, Ecuador', {}, { timeout: 3000 });
    fireEvent.click(resultButton);
    expect(onChange).toHaveBeenCalledWith(-0.1801, -78.4687, 'Av. Siempre Viva 742, Quito, Ecuador');
  });

  it('Enter selects the first result without clicking', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { display_name: 'Plaza Foch, Quito, Ecuador', lat: '-0.2100', lon: '-78.4900' },
      ],
    });
    vi.stubGlobal('fetch', fetchMock);
    const { onChange } = renderPicker();
    const input = screen.getByPlaceholderText('Buscar dirección en Ecuador...');
    fireEvent.change(input, { target: { value: 'Plaza Foch' } });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1), { timeout: 3000 });
    await waitFor(() => expect(screen.getByText('Plaza Foch, Quito, Ecuador')).toBeTruthy(), { timeout: 3000 });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(-0.21, -78.49, 'Plaza Foch, Quito, Ecuador');
  });
});
