/**
 * Unit tests for ActivityBar — the sole tool chooser (D-U3, D-U7, D-U8).
 *
 * Locks: fully controlled by ui.activeTab, navigation semantics
 * (not a toolbar), roving-tabindex keyboard support, visible labels.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { I18nProvider, getNestedValue } from '@/lib/i18n';
import es from '@/lib/i18n/locales/es.json';
import { ActivityBar } from '@/components/wallet/studio/ActivityBar';
import { STUDIO_TOOLS } from '@/components/wallet/studio/tools';

function renderBar(activeTool: (typeof STUDIO_TOOLS)[number]['id'] | null = 'images', onSelect = vi.fn()) {
  render(
    <I18nProvider>
      <ActivityBar activeTool={activeTool} onSelect={onSelect} />
    </I18nProvider>
  );
  return { onSelect };
}

function getNav(): HTMLElement {
  return screen.getByRole('navigation');
}

function getToolButtons(): HTMLElement[] {
  return within(getNav()).getAllByRole('button');
}

describe('ActivityBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('is navigation, not a toolbar', () => {
    renderBar();
    expect(screen.getByRole('navigation')).toBeDefined();
    expect(screen.queryByRole('toolbar')).toBeNull();
  });

  it('renders exactly the STUDIO_TOOLS entries with visible labels', () => {
    renderBar();
    const buttons = getToolButtons();
    expect(buttons).toHaveLength(STUDIO_TOOLS.length);
    for (const tool of STUDIO_TOOLS) {
      const label = getNestedValue(es as Record<string, unknown>, tool.labelKey);
      const btn = screen.getByRole('button', { name: label });
      expect(btn).toBeDefined();
      // D-U8: icon alone is not enough — the label text must be in the DOM
      expect(btn.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    }
  });

  it('marks exactly one item current and it always equals activeTool', () => {
    renderBar('colors');
    expect(screen.getByTestId('studio-tool-colors').getAttribute('aria-current')).toBe('page');
    for (const tool of STUDIO_TOOLS) {
      const el = screen.getByTestId(`studio-tool-${tool.id}`);
      expect(el.getAttribute('aria-current')).toBe(tool.id === 'colors' ? 'page' : null);
    }
  });

  it('is fully controlled — click calls onSelect and never toggles itself off', () => {
    const { onSelect } = renderBar('images');
    fireEvent.click(screen.getByTestId('studio-tool-colors'));
    expect(onSelect).toHaveBeenCalledWith('colors');
    // clicking the already-active tool still selects it (no blank cockpit)
    fireEvent.click(screen.getByTestId('studio-tool-images'));
    expect(onSelect).toHaveBeenCalledWith('images');
    expect(onSelect).not.toHaveBeenCalledWith(null);
  });

  it('supports Arrow keys, Home/End, and roving tabindex', () => {
    renderBar('images');
    const buttons = getToolButtons();
    expect(buttons[0].tabIndex).toBe(0);
    expect(buttons[1].tabIndex).toBe(-1);

    buttons[0].focus();
    fireEvent.keyDown(getNav(), { key: 'ArrowDown' });
    expect(buttons[1]).toHaveFocus();
    // WAI-ARIA APG: the tab stop must follow the arrowed focus target
    expect(buttons[1].tabIndex).toBe(0);
    expect(buttons[0].tabIndex).toBe(-1);

    fireEvent.keyDown(getNav(), { key: 'End' });
    expect(buttons[buttons.length - 1]).toHaveFocus();
    expect(buttons[buttons.length - 1].tabIndex).toBe(0);
    expect(buttons[1].tabIndex).toBe(-1);

    fireEvent.keyDown(getNav(), { key: 'Home' });
    expect(buttons[0]).toHaveFocus();
    expect(buttons[0].tabIndex).toBe(0);
    expect(buttons[buttons.length - 1].tabIndex).toBe(-1);

    fireEvent.keyDown(getNav(), { key: 'ArrowUp' });
    expect(buttons[buttons.length - 1]).toHaveFocus();
    expect(buttons[buttons.length - 1].tabIndex).toBe(0);
    expect(buttons[0].tabIndex).toBe(-1);
  });

  it('Enter/Space activate via native button semantics', () => {
    const { onSelect } = renderBar('images');
    // real <button type="button"> elements: Enter/Space fire click
    const fields = screen.getByTestId('studio-tool-fields');
    expect(fields.tagName).toBe('BUTTON');
    expect(fields.getAttribute('type')).toBe('button');
    fireEvent.click(fields);
    expect(onSelect).toHaveBeenCalledWith('fields');
  });

  it('does not use aria-pressed (that is toolbar semantics)', () => {
    renderBar('images');
    for (const btn of getToolButtons()) {
      expect(btn.getAttribute('aria-pressed')).toBeNull();
    }
  });
});
