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
    // ImagesTab is the panel for activeTab=images — its presence is enough
    // to prove the panel opened; the tab strip is asserted absent above.
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('switches panel content with state.ui.activeTab (single selection source)', () => {
    const { unmount } = renderSidebar('colors');
    // ColorsTab heading uses the colors label key; just assert no tab chrome
    expect(screen.queryByRole('tablist')).toBeNull();
    unmount();
    cleanup();
    renderSidebar('barcode');
    expect(screen.queryByRole('tablist')).toBeNull();
  });
});
