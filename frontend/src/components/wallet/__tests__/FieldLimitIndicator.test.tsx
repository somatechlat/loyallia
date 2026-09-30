/**
 * Unit tests for FieldLimitIndicator component.
 */

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { FieldLimitIndicator } from '@/components/wallet/studio/FieldLimitIndicator';

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('FieldLimitIndicator', () => {
  afterEach(() => {
    cleanup();
  });
  it('renders label and count text', () => {
    renderWithI18n(<FieldLimitIndicator group="header" current={2} max={4} />);
    expect(screen.getByText('Encabezado')).toBeDefined();
    expect(screen.getByText('2 / 4')).toBeDefined();
  });

  it('shows green color when under 50%', () => {
    renderWithI18n(<FieldLimitIndicator group="primary" current={0} max={1} />);
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar.className).toContain('bg-emerald-500');
  });

  it('shows yellow color between 50% and 80%', () => {
    renderWithI18n(<FieldLimitIndicator group="secondary" current={2} max={4} />);
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar.className).toContain('bg-amber-500');
  });

  it('shows red color when over 80%', () => {
    renderWithI18n(<FieldLimitIndicator group="auxiliary" current={4} max={4} />);
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar.className).toContain('bg-red-500');
  });

  it('shows warning icon and red background when over limit', () => {
    renderWithI18n(<FieldLimitIndicator group="back" current={9} max={8} />);
    expect(screen.getByLabelText('Advertencia: límite excedido')).toBeDefined();
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar.className).toContain('bg-red-500');
  });

  it('has correct aria attributes', () => {
    renderWithI18n(<FieldLimitIndicator group="header" current={1} max={3} />);
    const region = screen.getByRole('region');
    expect(region.getAttribute('aria-label')).toBe('Uso de campos de Encabezado: 1 de 3');
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar.getAttribute('aria-valuenow')).toBe('1');
    expect(progressbar.getAttribute('aria-valuemax')).toBe('3');
    expect(progressbar.getAttribute('aria-label')).toBe('Uso de Encabezado');
  });
});
