/**
 * Unit tests for ImagesTab component.
 */

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { ImagesTab } from '@/components/wallet/studio/ImagesTab';
import type { WalletImages } from '@/components/wallet/types/unified-state';

describe('ImagesTab', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders logo section', () => {
    render(
      <I18nProvider>
        <ImagesTab images={{}} onUpdateImages={() => {}} />
      </I18nProvider>
    );
    expect(screen.getByText('LOGO DEL NEGOCIO')).toBeDefined();
    expect(screen.getByText('Arrastra una imagen o haz click')).toBeDefined();
  });

  it('renders hero section', () => {
    render(
      <I18nProvider>
        <ImagesTab images={{}} onUpdateImages={() => {}} />
      </I18nProvider>
    );
    expect(screen.getByText('IMAGEN PRINCIPAL (Strip / Hero)')).toBeDefined();
    expect(screen.getByText('Arrastra una imagen panorámica')).toBeDefined();
  });

  it('renders additional images section', () => {
    render(
      <I18nProvider>
        <ImagesTab images={{}} onUpdateImages={() => {}} />
      </I18nProvider>
    );
    expect(screen.getByText('IMÁGENES ADICIONALES')).toBeDefined();
    expect(screen.getByText('Icono Apple')).toBeDefined();
    expect(screen.getByText('Miniatura')).toBeDefined();
    expect(screen.getByText('Fondo')).toBeDefined();
    expect(screen.getByText('Wide Logo')).toBeDefined();
  });

  it('renders logo preview and actions when logo is present', () => {
    render(
      <I18nProvider>
        <ImagesTab
          images={{
            logo: { url: 'https://example.com/logo.png', width: 160, height: 160 },
          }}
          onUpdateImages={() => {}}
        />
      </I18nProvider>
    );
    expect(screen.getByAltText('Apple rect preview')).toBeDefined();
    expect(screen.getByAltText('Google circle preview')).toBeDefined();
    expect(screen.getByAltText('Original preview')).toBeDefined();
    expect(screen.getByText('Auto-generar @2x y @3x para Apple')).toBeDefined();
    expect(screen.getByText('Eliminar')).toBeDefined();
    expect(screen.getByText('Reemplazar')).toBeDefined();
    expect(screen.getByText('Mejorar con IA')).toBeDefined();
  });

  it('calls onUpdateImages when logo is deleted', () => {
    let lastUpdate: Partial<WalletImages> | undefined;
    render(
      <I18nProvider>
        <ImagesTab
          images={{
            logo: { url: 'https://example.com/logo.png', width: 160, height: 160 },
          }}
          onUpdateImages={(update) => { lastUpdate = update; }}
        />
      </I18nProvider>
    );
    const deleteBtn = screen.getByText('Eliminar');
    fireEvent.click(deleteBtn);
    expect(lastUpdate).toEqual({
      logo: undefined,
      logo2x: undefined,
      logo3x: undefined,
    });
  });

  it('renders hero preview when strip is present', () => {
    render(
      <I18nProvider>
        <ImagesTab
          images={{
            strip: { url: 'https://example.com/strip.png', width: 1125, height: 432 },
          }}
          onUpdateImages={() => {}}
        />
      </I18nProvider>
    );
    const img = screen.getByAltText('Arrastra una imagen panorámica') as HTMLImageElement;
    expect(img).toBeDefined();
    expect(img.src).toBe('https://example.com/strip.png');
  });

  it('toggles auto-generate checkbox', () => {
    render(
      <I18nProvider>
        <ImagesTab
          images={{
            logo: { url: 'https://example.com/logo.png', width: 160, height: 160 },
          }}
          onUpdateImages={() => {}}
        />
      </I18nProvider>
    );
    const checkbox = screen.getByRole('checkbox');
    expect((checkbox as HTMLInputElement).checked).toBe(true);
    fireEvent.click(checkbox);
    expect((checkbox as HTMLInputElement).checked).toBe(false);
  });
});
