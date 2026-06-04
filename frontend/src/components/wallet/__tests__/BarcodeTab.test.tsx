/**
 * Unit tests for BarcodeTab component.
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('BarcodeTab', () => {
  let calls: Array<Partial<BarcodeConfig>> = [];
  const onUpdateBarcode = (update: Partial<BarcodeConfig>) => { calls.push(update); };

  const baseProps = {
    barcode: createMockBarcode(),
    onUpdateBarcode,
  };

  beforeEach(() => {
    calls = [];
  });

  afterEach(() => {
    cleanup();
  });

  it('renders format selector with current format label', () => {
    renderWithI18n(<BarcodeTab {...baseProps} />);
    expect(screen.getByText('QR Code')).toBeDefined();
  });

  it('opens format dropdown and shows all 5 formats', () => {
    renderWithI18n(<BarcodeTab {...baseProps} />);
    const formatButton = screen.getByRole('button', { name: /QR Code/i });
    fireEvent.click(formatButton);
    expect(screen.getByText('Aztec')).toBeDefined();
    expect(screen.getByText('PDF417')).toBeDefined();
    expect(screen.getByText('Code 128')).toBeDefined();
    expect(screen.getByText('Data Matrix')).toBeDefined();
  });

  it('selecting a format updates state', () => {
    renderWithI18n(<BarcodeTab {...baseProps} />);
    const formatButton = screen.getByRole('button', { name: /QR Code/i });
    fireEvent.click(formatButton);
    const aztecOption = screen.getByRole('option', { name: /Aztec/i });
    fireEvent.click(aztecOption);
    expect(calls).toContainEqual({ format: 'AZTEC' });
  });

  it('message input updates state on change', () => {
    renderWithI18n(<BarcodeTab {...baseProps} />);
    const input = screen.getByPlaceholderText('{customer_id}-{program_id}-{timestamp}');
    fireEvent.change(input, { target: { value: 'hello-world' } });
    expect(calls).toContainEqual({ message: 'hello-world' });
  });

  it('message encoding select updates state', () => {
    renderWithI18n(<BarcodeTab {...baseProps} />);
    const select = screen.getByLabelText('Encoding');
    fireEvent.change(select, { target: { value: 'utf-8' } });
    expect(calls).toContainEqual({ messageEncoding: 'utf-8' });
  });

  it('alt text input updates state', () => {
    renderWithI18n(<BarcodeTab {...baseProps} />);
    const input = screen.getByPlaceholderText(/Text displayed below the code/i);
    fireEvent.change(input, { target: { value: 'Mi Código' } });
    expect(calls).toContainEqual({ altText: 'Mi Código' });
  });

  it('renders barcode preview', () => {
    renderWithI18n(<BarcodeTab {...baseProps} />);
    expect(screen.getByText('Preview')).toBeDefined();
    const svg = document.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('shows apple warning when format not supported on apple', () => {
    renderWithI18n(
      <BarcodeTab
        {...baseProps}
        barcode={createMockBarcode({ format: 'DATA_MATRIX' })}
      />
    );
    expect(screen.getByText(/not supported by Apple Wallet/i)).toBeDefined();
  });

  it('shows google warning when format not supported on google', () => {
    renderWithI18n(
      <BarcodeTab
        {...baseProps}
        barcode={createMockBarcode({ format: 'AZTEC' })}
      />
    );
    expect(screen.getByText(/not supported by Google Wallet/i)).toBeDefined();
  });

  it('shows compatibility message when both platforms supported', () => {
    renderWithI18n(<BarcodeTab {...baseProps} barcode={createMockBarcode({ format: 'QR_CODE' })} />);
    expect(screen.getByText('Compatible with Apple Wallet and Google Wallet.')).toBeDefined();
  });

  it('inserts placeholder when helper button clicked', () => {
    renderWithI18n(<BarcodeTab {...baseProps} />);
    const customerBtn = screen.getByText('Customer ID');
    fireEvent.click(customerBtn);
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining('{customer_id}'),
        }),
      ])
    );
  });

  it('shows example generated data', () => {
    renderWithI18n(<BarcodeTab {...baseProps} />);
    expect(screen.getByText('Generated example')).toBeDefined();
    const exampleCode = document.querySelectorAll('code')[1];
    expect(exampleCode).toBeTruthy();
    expect(exampleCode!.textContent).toContain('CUST-12345');
    expect(exampleCode!.textContent).toContain('PROG-67890');
  });

  it('copy example button exists', () => {
    renderWithI18n(<BarcodeTab {...baseProps} />);
    const copyBtn = screen.getByLabelText('Copy example');
    expect(copyBtn).toBeDefined();
  });
});
