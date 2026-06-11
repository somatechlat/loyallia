/**
 * Unit tests for BarcodeTab component.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
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
    render(<BarcodeTab {...baseProps} />);
    expect(screen.getByText('QR Code')).toBeDefined();
  });

  it('shows all 4 main format cards', () => {
    render(<BarcodeTab {...baseProps} />);
    expect(screen.getByRole('button', { name: 'QR Code' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Aztec' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'PDF417' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Code 128' })).toBeDefined();
  });

  it('selecting a format updates state', () => {
    render(<BarcodeTab {...baseProps} />);
    const aztecButton = screen.getByRole('button', { name: 'Aztec' });
    fireEvent.click(aztecButton);
    expect(baseProps.onUpdateBarcode).toHaveBeenCalledWith({ format: 'AZTEC' });
  });

  it('alt text input updates state', () => {
    render(<BarcodeTab {...baseProps} />);
    const input = screen.getByPlaceholderText('0000 0000 0000');
    fireEvent.change(input, { target: { value: 'Mi Código' } });
    expect(baseProps.onUpdateBarcode).toHaveBeenCalledWith({ altText: 'Mi Código' });
  });

  it('shows rectangular warning for PDF417', () => {
    render(
      <BarcodeTab
        {...baseProps}
        barcode={createMockBarcode({ format: 'PDF417' })}
      />
    );
    expect(screen.getByText(/PDF417 y Code 128 reducen espacio/i)).toBeDefined();
  });

  it('shows rectangular warning for Code 128', () => {
    render(
      <BarcodeTab
        {...baseProps}
        barcode={createMockBarcode({ format: 'CODE128' })}
      />
    );
    expect(screen.getByText(/PDF417 y Code 128 reducen espacio/i)).toBeDefined();
  });

  it('does not show rectangular warning for QR Code', () => {
    render(<BarcodeTab {...baseProps} barcode={createMockBarcode({ format: 'QR_CODE' })} />);
    expect(screen.queryByText(/PDF417 y Code 128 reducen espacio/i)).toBeNull();
  });

  it('toggles customer id checkbox', () => {
    render(<BarcodeTab {...baseProps} />);
    const checkbox = screen.getByRole('checkbox', { name: /ID cliente/i });
    fireEvent.click(checkbox);
    expect(baseProps.onUpdateBarcode).toHaveBeenCalled();
  });

  it('toggles program id checkbox', () => {
    render(<BarcodeTab {...baseProps} />);
    const checkbox = screen.getByRole('checkbox', { name: /ID programa/i });
    fireEvent.click(checkbox);
    expect(baseProps.onUpdateBarcode).toHaveBeenCalled();
  });

  it('toggles timestamp checkbox', () => {
    render(<BarcodeTab {...baseProps} />);
    const checkbox = screen.getByRole('checkbox', { name: /^timestamp$/i });
    fireEvent.click(checkbox);
    expect(baseProps.onUpdateBarcode).toHaveBeenCalled();
  });
});
