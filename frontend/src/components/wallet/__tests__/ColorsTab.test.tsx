/**
 * Unit tests for ColorsTab component.
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('ColorsTab', () => {
  let calls: Array<Partial<WalletColors>> = [];
  const onUpdateColors = (update: Partial<WalletColors>) => { calls.push(update); };

  const baseProps = {
    colors: createMockColors(),
    onUpdateColors,
  };

  beforeEach(() => {
    calls = [];
  });

  afterEach(() => {
    cleanup();
  });

  it('renders all 4 color input labels', () => {
    renderWithI18n(<ColorsTab {...baseProps} />);
    expect(screen.getByText('Background')).toBeDefined();
    expect(screen.getByText('Text')).toBeDefined();
    expect(screen.getByText('Labels')).toBeDefined();
    expect(screen.getByText('Accent')).toBeDefined();
  });

  it('renders contrast section', () => {
    renderWithI18n(<ColorsTab {...baseProps} />);
    expect(screen.getByText('Contrast')).toBeDefined();
  });

  it('shows correct WCAG badge for high contrast', () => {
    renderWithI18n(<ColorsTab {...baseProps} colors={createMockColors({ background: '#000000', foreground: '#FFFFFF' })} />);
    expect(screen.getByText('AAA')).toBeDefined();
  });

  it('shows FAIL badge for low contrast', () => {
    renderWithI18n(<ColorsTab {...baseProps} colors={createMockColors({ background: '#EEEEEE', foreground: '#FFFFFF' })} />);
    expect(screen.getByText('FAIL')).toBeDefined();
  });

  it('color picker change updates state', () => {
    renderWithI18n(<ColorsTab {...baseProps} />);
    const pickers = document.querySelectorAll('input[type="color"]');
    expect(pickers.length).toBe(4);
    fireEvent.change(pickers[0]!, { target: { value: '#FF0000' } });
    expect(calls).toContainEqual({ background: '#FF0000' });
  });

  it('hex text input updates state on valid hex', () => {
    renderWithI18n(<ColorsTab {...baseProps} />);
    const hexInputs = screen.getAllByDisplayValue(/#[0-9A-F]{6}/i);
    expect(hexInputs.length).toBeGreaterThan(0);
    fireEvent.change(hexInputs[0]!, { target: { value: '#FF5733' } });
    expect(calls).toContainEqual({ background: '#FF5733' });
  });

  it('shows invalid state on bad hex input', () => {
    renderWithI18n(<ColorsTab {...baseProps} />);
    const hexInputs = screen.getAllByDisplayValue(/#[0-9A-F]{6}/i);
    // hexInputs[0] is the color picker, hexInputs[1] is the text input
    const textInput = hexInputs[1]!;
    fireEvent.change(textInput, { target: { value: '#GGG' } });
    expect(calls.length).toBe(0);
    // Should have red border styling (we verify by checking the input still has invalid value)
    expect(textInput).toHaveProperty('value', '#GGG');
  });

  it('preset swatches are rendered', () => {
    renderWithI18n(<ColorsTab {...baseProps} />);
    const presetButtons = document.querySelectorAll('button[title]');
    expect(presetButtons.length).toBeGreaterThan(0);
  });

  it('clicking preset applies all 4 colors', () => {
    renderWithI18n(<ColorsTab {...baseProps} />);
    const presetSection = screen.getByText('Quick presets').parentElement;
    const presetButtons = presetSection!.querySelectorAll('button');
    expect(presetButtons.length).toBeGreaterThan(0);
    fireEvent.click(presetButtons[0]!);
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          background: expect.any(String),
          foreground: expect.any(String),
          label: expect.any(String),
          accent: expect.any(String),
        }),
      ])
    );
  });

  it('auto-foreground button updates foreground color', () => {
    renderWithI18n(<ColorsTab {...baseProps} colors={createMockColors({ background: '#FFFFFF', foreground: '#000000' })} />);
    const autoBtn = screen.getByRole('button', { name: /Auto/i });
    fireEvent.click(autoBtn);
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          foreground: expect.any(String),
        }),
      ])
    );
  });

  it('renders color harmony buttons', () => {
    renderWithI18n(<ColorsTab {...baseProps} />);
    expect(screen.getByText('Analogous +')).toBeDefined();
    expect(screen.getByText('Analogous −')).toBeDefined();
    expect(screen.getByText('Complementary')).toBeDefined();
  });

  it('clicking harmony button updates accent color', () => {
    renderWithI18n(<ColorsTab {...baseProps} />);
    const compBtn = screen.getByText('Complementary');
    fireEvent.click(compBtn);
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ accent: expect.any(String) }),
      ])
    );
  });

  it('renders live preview card', () => {
    renderWithI18n(<ColorsTab {...baseProps} />);
    expect(screen.getByText('Preview')).toBeDefined();
    expect(screen.getByText('Loyallia Rewards')).toBeDefined();
  });

  it('copy buttons exist for each color', () => {
    renderWithI18n(<ColorsTab {...baseProps} />);
    const copyButtons = screen.getAllByLabelText(/Copy color/i);
    expect(copyButtons.length).toBe(4);
  });
});
