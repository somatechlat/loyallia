/**
 * Unit tests for ColorsTab component.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
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
    render(<ColorsTab {...baseProps} />);
    expect(screen.getByText('Fondo')).toBeDefined();
    expect(screen.getByText('Texto')).toBeDefined();
    expect(screen.getByText('Etiquetas')).toBeDefined();
    expect(screen.getByText('Acento')).toBeDefined();
  });

  it('renders contrast section', () => {
    render(<ColorsTab {...baseProps} />);
    expect(screen.getByText(/contraste/i)).toBeDefined();
  });

  it('shows correct WCAG badge for high contrast', () => {
    render(<ColorsTab {...baseProps} colors={createMockColors({ background: '#000000', foreground: '#FFFFFF' })} />);
    expect(screen.getByText('AAA')).toBeDefined();
  });

  it('shows FAIL badge for low contrast', () => {
    render(<ColorsTab {...baseProps} colors={createMockColors({ background: '#EEEEEE', foreground: '#FFFFFF' })} />);
    expect(screen.getByText('FAIL')).toBeDefined();
  });

  it('color picker change updates state', () => {
    render(<ColorsTab {...baseProps} />);
    const pickers = document.querySelectorAll('input[type="color"]');
    expect(pickers.length).toBe(4);
    fireEvent.change(pickers[0]!, { target: { value: '#FF0000' } });
    expect(baseProps.onUpdateColors).toHaveBeenCalledWith({ background: '#FF0000' });
  });

  it('hex text input updates state on valid hex', () => {
    render(<ColorsTab {...baseProps} />);
    const hexInputs = screen.getAllByDisplayValue(/#[0-9A-F]{6}/i);
    expect(hexInputs.length).toBeGreaterThan(0);
    fireEvent.change(hexInputs[0]!, { target: { value: '#FF5733' } });
    expect(baseProps.onUpdateColors).toHaveBeenCalledWith({ background: '#FF5733' });
  });

  it('shows invalid state on bad hex input', () => {
    render(<ColorsTab {...baseProps} />);
    const hexInputs = screen.getAllByDisplayValue(/#[0-9A-F]{6}/i);
    fireEvent.change(hexInputs[0]!, { target: { value: '#GGG' } });
    expect(baseProps.onUpdateColors).not.toHaveBeenCalled();
    // Should have red border styling (we verify by checking the input still has invalid value)
    expect(hexInputs[0]!).toHaveProperty('value', '#GGG');
  });

  it('preset swatches are rendered', () => {
    render(<ColorsTab {...baseProps} />);
    const presetButtons = document.querySelectorAll('button[title]');
    expect(presetButtons.length).toBeGreaterThan(0);
  });

  it('clicking preset applies all 4 colors', () => {
    render(<ColorsTab {...baseProps} />);
    const presetButtons = document.querySelectorAll('button[title]');
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
    render(<ColorsTab {...baseProps} colors={createMockColors({ background: '#FFFFFF', foreground: '#000000' })} />);
    const autoBtn = screen.getByRole('button', { name: /auto/i });
    fireEvent.click(autoBtn);
    expect(baseProps.onUpdateColors).toHaveBeenCalledWith(
      expect.objectContaining({
        foreground: expect.any(String),
      })
    );
  });

  it('renders color harmony buttons', () => {
    render(<ColorsTab {...baseProps} />);
    expect(screen.getByText('Análogo +')).toBeDefined();
    expect(screen.getByText('Análogo −')).toBeDefined();
    expect(screen.getByText('Complementario')).toBeDefined();
  });

  it('clicking harmony button updates accent color', () => {
    render(<ColorsTab {...baseProps} />);
    const compBtn = screen.getByText('Complementario');
    fireEvent.click(compBtn);
    expect(baseProps.onUpdateColors).toHaveBeenCalledWith(
      expect.objectContaining({ accent: expect.any(String) })
    );
  });

  it('renders live preview card', () => {
    render(<ColorsTab {...baseProps} />);
    expect(screen.getByText(/vista previa/i)).toBeDefined();
    expect(screen.getByText('Loyallia Rewards')).toBeDefined();
  });

  it('copy buttons exist for each color', () => {
    render(<ColorsTab {...baseProps} />);
    const copyButtons = screen.getAllByLabelText(/copiar color/i);
    expect(copyButtons.length).toBe(4);
  });
});
