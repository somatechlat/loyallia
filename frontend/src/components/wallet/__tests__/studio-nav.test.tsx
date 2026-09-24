/**
 * Integration tests for studio navigation unification (D-U3, D-U4, D-U5, D-U10).
 *
 * Locks: one selection state (ui.activeTab), never a blank cockpit,
 * one width source that does not clip the panel, mobile keeps one nav source.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { I18nProvider, getNestedValue } from '@/lib/i18n';
import es from '@/lib/i18n/locales/es.json';
import { WalletStudio } from '@/components/wallet/studio/WalletStudio';
import { STUDIO_TOOLS } from '@/components/wallet/studio/tools';
import type { WalletPassStudioState } from '@/components/wallet/types/unified-state';

vi.mock('@/components/wallet/services/export', () => ({
  generatePreviewPass: vi.fn(),
  triggerDownload: vi.fn(),
  openGoogleSaveUrl: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  walletTemplatesApi: {
    create: vi.fn(),
    list: vi.fn().mockResolvedValue([]),
  },
}));

function renderStudio(initialState?: Partial<WalletPassStudioState>) {
  const onChange = vi.fn();
  const utils = render(
    <I18nProvider>
      <WalletStudio initialState={initialState} onChange={onChange} />
    </I18nProvider>
  );
  return { onChange, ...utils };
}

function getRail(): HTMLElement {
  return screen.getByRole('navigation');
}

function labelOf(id: (typeof STUDIO_TOOLS)[number]['id']): string {
  const tool = STUDIO_TOOLS.find((t) => t.id === id)!;
  return getNestedValue(es as Record<string, unknown>, tool.labelKey);
}

describe('studio navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.innerWidth = 1280;
  });

  afterEach(() => {
    cleanup();
  });

  it('first paint is never blank — tool panel is open and exactly one rail item is current', () => {
    renderStudio();
    expect(screen.getByTestId('studio-tool-panel')).toBeDefined();
    expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    // default tool is images
    const imagesBtn = screen.getByRole('button', { name: labelOf('images') });
    expect(imagesBtn.getAttribute('aria-current')).toBe('page');
  });

  it('rail selection is one state — clicking a tool updates ui.activeTab and the highlight together', () => {
    const { onChange } = renderStudio();
    const colorsBtn = screen.getByRole('button', { name: labelOf('colors') });
    fireEvent.click(colorsBtn);

    expect(colorsBtn.getAttribute('aria-current')).toBe('page');
    expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1);

    const last = onChange.mock.calls.at(-1)?.[0] as WalletPassStudioState;
    expect(last.ui.activeTab).toBe('colors');
  });

  it('there is no second selection source that can disagree (no tablist in the panel)', () => {
    renderStudio();
    fireEvent.click(screen.getByRole('button', { name: labelOf('barcode') }));
    const panel = screen.getByTestId('studio-tool-panel');
    expect(within(panel).queryByRole('tablist')).toBeNull();
    expect(within(panel).queryAllByRole('tab')).toHaveLength(0);
    // rail still agrees with ui.activeTab via aria-current
    expect(screen.getByRole('button', { name: labelOf('barcode') }).getAttribute('aria-current')).toBe('page');
  });

  it('panel wrapper has one width source and does not clip content', () => {
    renderStudio();
    const wrapper = screen.getByTestId('studio-tool-panel-wrapper');
    expect(wrapper.className).not.toMatch(/overflow-hidden/);
    expect(wrapper.className).toMatch(/w-\[340px\]/);
    expect(wrapper.className).toMatch(/lg:w-\[400px\]/);
    expect(wrapper.className).toMatch(/xl:w-\[460px\]/);

    const panel = screen.getByTestId('studio-tool-panel');
    expect(panel.className).toMatch(/(^|\s)w-full(\s|$)/);
    expect(panel.className).not.toMatch(/md:w-|lg:w-|xl:w-/);
    expect(panel.className).not.toMatch(/overflow-hidden/);
  });

  it('mobile FAB shows the active tool name and the sheet uses the same STUDIO_TOOLS registry', () => {
    window.innerWidth = 375;
    renderStudio();
    // force re-detect: WalletStudio checks window.innerWidth on mount + resize
    fireEvent(window, new Event('resize'));

    expect(screen.getByTestId('mobile-sheet-toggle')).toBeDefined();
    // active tool name is visible near the FAB (default: images)
    expect(screen.getByTestId('mobile-active-tool-label').textContent).toContain(labelOf('images').slice(0, 4));

    fireEvent.click(screen.getByTestId('mobile-sheet-toggle'));
    const switcher = screen.getByTestId('mobile-tool-switcher');
    const buttons = within(switcher).getAllByRole('button');
    expect(buttons).toHaveLength(STUDIO_TOOLS.length);
    // sheet must not resurrect a tab strip
    expect(within(switcher).queryByRole('tablist')).toBeNull();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('renders exactly one primary AI launcher (toolbar) and no AI tool in the rail', () => {
    renderStudio();
    expect(screen.getAllByTestId('ai-launcher')).toHaveLength(1);
    // AI is not a tool in STUDIO_TOOLS / the rail
    expect(screen.queryByTestId('studio-tool-ai')).toBeNull();
    // contextual per-image buttons are not primary launchers
    expect(screen.queryAllByTestId('ai-launcher').length).toBe(1);
  });
});
