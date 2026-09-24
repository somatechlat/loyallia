/**
 * Unit tests for StudioSidebar as a pure tool panel (D-U1).
 *
 * Locks: the panel must never re-enumerate tools as a tab strip —
 * ActivityBar is the sole tool chooser.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { StudioSidebar } from '@/components/wallet/studio/StudioSidebar';
import { createDefaultState } from '@/hooks/useWalletStudio';
import type { ActiveTab } from '@/components/wallet/types/unified-state';

function renderSidebar(activeTab: ActiveTab = 'images') {
  const state = createDefaultState();
  state.ui.activeTab = activeTab;
  const props = {
    state,
    updateColors: vi.fn(),
    updateImages: vi.fn(),
    updateFields: vi.fn(),
    updateBarcode: vi.fn(),
    updateBackContent: vi.fn(),
    updateCardTypeConfig: vi.fn(),
    updateAppleConfig: vi.fn(),
    updateGoogleConfig: vi.fn(),
    onOpenAI: vi.fn(),
  };
  return {
    props,
    ...render(
      <I18nProvider>
        <StudioSidebar {...props} />
      </I18nProvider>
    ),
  };
}

describe('StudioSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('does not render a tablist (deletion lock for the duplicate nav strip)', () => {
    renderSidebar();
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('does not render any role=tab buttons (deletion lock)', () => {
    renderSidebar();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('renders the active tool panel content without a tab strip', () => {
    renderSidebar('images');
    // ImagesTab body must actually render — not just "no tab chrome"
    expect(screen.getByTestId('studio-panel-images')).toBeDefined();
    expect(screen.queryByTestId('studio-panel-colors')).toBeNull();
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('switches panel content with state.ui.activeTab (single selection source)', () => {
    const { unmount } = renderSidebar('colors');
    expect(screen.getByTestId('studio-panel-colors')).toBeDefined();
    expect(screen.queryByTestId('studio-panel-images')).toBeNull();
    unmount();
    cleanup();
    const { unmount: unmount2 } = renderSidebar('barcode');
    expect(screen.getByTestId('studio-panel-barcode')).toBeDefined();
    expect(screen.queryByTestId('studio-panel-colors')).toBeNull();
    unmount2();
    cleanup();
    renderSidebar('fields');
    expect(screen.getByTestId('studio-panel-fields')).toBeDefined();
  });

  it('every STUDIO_TOOLS entry has a panel body (exhaustive tool panel)', () => {
    for (const tab of ['images', 'cardType', 'fields', 'back', 'barcode', 'colors', 'advanced'] as const) {
      cleanup();
      renderSidebar(tab);
      expect(screen.getByTestId('studio-panel-' + tab)).toBeDefined();
      // a real panel body, not an empty shell
      const body = screen.getByTestId('studio-panel-' + tab);
      expect(body.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    }
  });
});
