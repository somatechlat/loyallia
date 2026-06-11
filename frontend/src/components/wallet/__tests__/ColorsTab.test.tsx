/**
 * Unit tests for ColorsTab component.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { ColorsTab } from '@/components/wallet/studio/ColorsTab';
import type { WalletColors } from '@/components/wallet/types/unified-state';

function createMockColors(overrides: Partial<WalletColors> = {}): WalletColors {
  return {
    background: '#1A1A1A',
    foreground: '#FFFFFF',
    label: '#9CA3AF',
    accent: '#3B82F6',
    ...overrides,
  };
}

describe('ColorsTab', () => {
  const baseProps = {
    colors: createMockColors(),
    onUpdateColors: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders all 4 color input labels', () => {
    render(<I18nProvider><ColorsTab {...baseProps} /></I18nProvider>);
    expect(screen.getByText('Fondo')).toBeDefined();
    expect(screen.getByText('Texto')).toBeDefined();
    expect(screen.getByText('Etiquetas')).toBeDefined();
    expect(screen.getByText('Acento')).toBeDefined();
  });

  it('renders contrast section', () => {
    render(<I18nProvider><ColorsTab {...baseProps} /></I18nProvider>);
    expect(screen.getByText('Contraste')).toBeDefined();
  });

  it('shows correct WCAG badge for high contrast', () => {
    render(<I18nProvider><ColorsTab {...baseProps} colors={createMockColors({ background: '#000000', foreground: '#FFFFFF' })} /></I18nProvider>);
    expect(screen.getByText('AAA')).toBeDefined();
  });

  it('shows FAIL badge for low contrast', () => {
    render(<I18nProvider><ColorsTab {...baseProps} colors={createMockColors({ background: '#EEEEEE', foreground: '#FFFFFF' })} /></I18nProvider>);
    expect(screen.getByText('FAIL')).toBeDefined();
  });

  it('color picker change updates state', () => {
    render(<I18nProvider><ColorsTab {...baseProps} /></I18nProvider>);
    // Open the first color picker popover
    const colorButtons = screen.getAllByRole('button', { name: /Selector de color/i });
    fireEvent.click(colorButtons[0]!);
    const pickers = document.querySelectorAll('input[type="color"]');
    expect(pickers.length).toBeGreaterThanOrEqual(1);
    fireEvent.change(pickers[0]!, { target: { value: '#FF0000' } });
    expect(baseProps.onUpdateColors).toHaveBeenCalledWith({ background: '#FF0000' });
  });

  it('hex text input updates state on valid hex', () => {
    render(<I18nProvider><ColorsTab {...baseProps} /></I18nProvider>);
    const hexInputs = screen.getAllByTestId('hex-input');
    expect(hexInputs.length).toBe(4);
    fireEvent.change(hexInputs[0]!, { target: { value: '#FF5733' } });
    expect(baseProps.onUpdateColors).toHaveBeenCalledWith({ background: '#FF5733' });
  });

  it('shows invalid state on bad hex input', () => {
    render(<I18nProvider><ColorsTab {...baseProps} /></I18nProvider>);
    const hexInputs = screen.getAllByTestId('hex-input');
    fireEvent.change(hexInputs[0]!, { target: { value: '#GGG' } });
    expect(baseProps.onUpdateColors).not.toHaveBeenCalled();
    expect(hexInputs[0]!).toHaveProperty('value', '#GGG');
  });

  it('preset swatches are rendered', () => {
    render(<I18nProvider><ColorsTab {...baseProps} /></I18nProvider>);
    const presetButtons = screen.getAllByTestId('color-preset');
    expect(presetButtons.length).toBeGreaterThan(0);
  });

  it('clicking preset applies all 4 colors', () => {
    render(<I18nProvider><ColorsTab {...baseProps} /></I18nProvider>);
    const presetButtons = screen.getAllByTestId('color-preset');
    fireEvent.click(presetButtons[0]!);
    expect(baseProps.onUpdateColors).toHaveBeenCalledWith(
      expect.objectContaining({
        background: expect.any(String),
        foreground: expect.any(String),
        label: expect.any(String),
        accent: expect.any(String),
      })
    );
  });

  it('auto-foreground button updates foreground color', () => {
    render(<I18nProvider><ColorsTab {...baseProps} colors={createMockColors({ background: '#FFFFFF', foreground: '#000000' })} /></I18nProvider>);
    const autoBtn = screen.getByRole('button', { name: /Auto/i });
    fireEvent.click(autoBtn);
    expect(baseProps.onUpdateColors).toHaveBeenCalledWith(
      expect.objectContaining({
        foreground: expect.any(String),
      })
    );
  });

  it('renders color harmony buttons', () => {
    render(<I18nProvider><ColorsTab {...baseProps} /></I18nProvider>);
    expect(screen.getByText('Análogo +')).toBeDefined();
    expect(screen.getByText('Análogo −')).toBeDefined();
    expect(screen.getByText('Complementario')).toBeDefined();
  });

  it('clicking harmony button updates accent color', () => {
    render(<I18nProvider><ColorsTab {...baseProps} /></I18nProvider>);
    const compBtn = screen.getByText('Complementario');
    fireEvent.click(compBtn);
    expect(baseProps.onUpdateColors).toHaveBeenCalledWith(
      expect.objectContaining({ accent: expect.any(String) })
    );
  });

  it('copy buttons exist for each color', () => {
    render(<I18nProvider><ColorsTab {...baseProps} /></I18nProvider>);
    const copyButtons = screen.getAllByLabelText(/Copiar color/i);
    expect(copyButtons.length).toBe(4);
  });
});
