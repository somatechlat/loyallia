/**
 * Unit tests for BarcodeTab component.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { BarcodeTab } from '@/components/wallet/studio/BarcodeTab';
import type { BarcodeConfig } from '@/components/wallet/types/unified-state';

function createMockBarcode(overrides: Partial<BarcodeConfig> = {}): BarcodeConfig {
  return {
    format: 'QR_CODE',
    message: '{customer_id}-{program_id}-{timestamp}',
    messageEncoding: 'iso-8859-1',
    ...overrides,
  };
}

describe('BarcodeTab', () => {
  const baseProps = {
    barcode: createMockBarcode(),
    onUpdateBarcode: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders format selector with current format label', () => {
    render(<I18nProvider><BarcodeTab {...baseProps} /></I18nProvider>);
    expect(screen.getByText('Código QR')).toBeDefined();
  });

  it('shows all 4 main format cards', () => {
    render(<I18nProvider><BarcodeTab {...baseProps} /></I18nProvider>);
    expect(screen.getByRole('button', { name: 'Código QR' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Aztec' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'PDF417' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Código 128' })).toBeDefined();
  });

  it('selecting a format updates state', () => {
    render(<I18nProvider><BarcodeTab {...baseProps} /></I18nProvider>);
    const aztecButton = screen.getByRole('button', { name: 'Aztec' });
    fireEvent.click(aztecButton);
    expect(baseProps.onUpdateBarcode).toHaveBeenCalledWith({ format: 'AZTEC' });
  });

  it('alt text input updates state', () => {
    render(<I18nProvider><BarcodeTab {...baseProps} /></I18nProvider>);
    const input = screen.getByPlaceholderText('0000 0000 0000');
    fireEvent.change(input, { target: { value: 'Mi Código' } });
    expect(baseProps.onUpdateBarcode).toHaveBeenCalledWith({ altText: 'Mi Código' });
  });

  it('shows rectangular warning for PDF417', () => {
    render(
      <I18nProvider>
        <BarcodeTab
          {...baseProps}
          barcode={createMockBarcode({ format: 'PDF417' })}
        />
      </I18nProvider>
    );
    expect(screen.getByText(/PDF417 y Code 128 reducen espacio/i)).toBeDefined();
  });

  it('shows rectangular warning for Code 128', () => {
    render(
      <I18nProvider>
        <BarcodeTab
          {...baseProps}
          barcode={createMockBarcode({ format: 'CODE128' })}
        />
      </I18nProvider>
    );
    expect(screen.getByText(/PDF417 y Code 128 reducen espacio/i)).toBeDefined();
  });

  it('does not show rectangular warning for QR Code', () => {
    render(<I18nProvider><BarcodeTab {...baseProps} barcode={createMockBarcode({ format: 'QR_CODE' })} /></I18nProvider>);
    expect(screen.queryByText(/PDF417 y Code 128 reducen espacio/i)).toBeNull();
  });

  it('toggles customer id checkbox', () => {
    render(<I18nProvider><BarcodeTab {...baseProps} /></I18nProvider>);
    const checkbox = screen.getByRole('checkbox', { name: /ID cliente/i });
    fireEvent.click(checkbox);
    expect(baseProps.onUpdateBarcode).toHaveBeenCalled();
  });

  it('toggles program id checkbox', () => {
    render(<I18nProvider><BarcodeTab {...baseProps} /></I18nProvider>);
    const checkbox = screen.getByRole('checkbox', { name: /ID programa/i });
    fireEvent.click(checkbox);
    expect(baseProps.onUpdateBarcode).toHaveBeenCalled();
  });

  it('toggles timestamp checkbox', () => {
    render(<I18nProvider><BarcodeTab {...baseProps} /></I18nProvider>);
    const checkbox = screen.getByRole('checkbox', { name: /^timestamp$/i });
    fireEvent.click(checkbox);
    expect(baseProps.onUpdateBarcode).toHaveBeenCalled();
  });
});
