/**
 * Unit tests for BarcodeTab component.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
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

  it('opens format dropdown and shows all 5 formats', () => {
    render(<BarcodeTab {...baseProps} />);
    const formatButton = screen.getByRole('button', { name: /formato/i });
    fireEvent.click(formatButton);
    expect(screen.getByText('Aztec')).toBeDefined();
    expect(screen.getByText('PDF417')).toBeDefined();
    expect(screen.getByText('Code 128')).toBeDefined();
    expect(screen.getByText('Data Matrix')).toBeDefined();
  });

  it('selecting a format updates state', () => {
    render(<BarcodeTab {...baseProps} />);
    const formatButton = screen.getByRole('button', { name: /formato/i });
    fireEvent.click(formatButton);
    const aztecOption = screen.getByRole('option', { name: /aztec/i });
    fireEvent.click(aztecOption);
    expect(baseProps.onUpdateBarcode).toHaveBeenCalledWith({ format: 'AZTEC' });
  });

  it('message input updates state on change', () => {
    render(<BarcodeTab {...baseProps} />);
    const input = screen.getByPlaceholderText('{customer_id}-{program_id}-{timestamp}');
    fireEvent.change(input, { target: { value: 'hello-world' } });
    expect(baseProps.onUpdateBarcode).toHaveBeenCalledWith({ message: 'hello-world' });
  });

  it('message encoding select updates state', () => {
    render(<BarcodeTab {...baseProps} />);
    const select = screen.getByLabelText(/codificación/i);
    fireEvent.change(select, { target: { value: 'utf-8' } });
    expect(baseProps.onUpdateBarcode).toHaveBeenCalledWith({ messageEncoding: 'utf-8' });
  });

  it('alt text input updates state', () => {
    render(<BarcodeTab {...baseProps} />);
    const input = screen.getByPlaceholderText(/texto mostrado debajo del código/i);
    fireEvent.change(input, { target: { value: 'Mi Código' } });
    expect(baseProps.onUpdateBarcode).toHaveBeenCalledWith({ altText: 'Mi Código' });
  });

  it('renders barcode preview', () => {
    render(<BarcodeTab {...baseProps} />);
    expect(screen.getByText(/vista previa/i)).toBeDefined();
    const svg = document.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('shows apple warning when format not supported on apple', () => {
    render(
      <BarcodeTab
        {...baseProps}
        barcode={createMockBarcode({ format: 'DATA_MATRIX' })}
      />
    );
    expect(screen.getByText(/no es compatible con Apple Wallet/i)).toBeDefined();
  });

  it('shows google warning when format not supported on google', () => {
    render(
      <BarcodeTab
        {...baseProps}
        barcode={createMockBarcode({ format: 'AZTEC' })}
      />
    );
    expect(screen.getByText(/no es compatible con Google Wallet/i)).toBeDefined();
  });

  it('shows compatibility message when both platforms supported', () => {
    render(<BarcodeTab {...baseProps} barcode={createMockBarcode({ format: 'QR_CODE' })} />);
    expect(screen.getByText(/Compatible con Apple Wallet y Google Wallet/i)).toBeDefined();
  });

  it('inserts placeholder when helper button clicked', () => {
    render(<BarcodeTab {...baseProps} />);
    const customerBtn = screen.getByText('Customer ID');
    fireEvent.click(customerBtn);
    expect(baseProps.onUpdateBarcode).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('{customer_id}'),
      })
    );
  });

  it('shows example generated data', () => {
    render(<BarcodeTab {...baseProps} />);
    expect(screen.getByText(/ejemplo generado/i)).toBeDefined();
    const exampleCode = document.querySelector('code');
    expect(exampleCode).toBeTruthy();
    expect(exampleCode!.textContent).toContain('CUST-12345');
    expect(exampleCode!.textContent).toContain('PROG-67890');
  });

  it('copy example button exists', () => {
    render(<BarcodeTab {...baseProps} />);
    const copyBtn = screen.getByLabelText(/copiar ejemplo/i);
    expect(copyBtn).toBeDefined();
  });
});
