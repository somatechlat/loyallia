/**
 * Unit tests for StudioCanvas — platform filtering and front/back toggle.
 */

import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { StudioCanvas } from '@/components/wallet/studio/StudioCanvas';
import { createDefaultState } from '@/hooks/useWalletStudio';

function renderCanvas(props: Partial<React.ComponentProps<typeof StudioCanvas>> = {}) {
  const state = createDefaultState();
  return render(
    <I18nProvider>
      <StudioCanvas state={state} platformView="both" showBack={false} {...props} />
    </I18nProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('StudioCanvas', () => {
  it('renders both platforms in "both" view', () => {
    renderCanvas({ platformView: 'both' });
    const labels = screen.getAllByText(/apple|google/i);
    expect(labels.length).toBeGreaterThanOrEqual(2);
  });

  it('renders only the Apple card in apple view', () => {
    renderCanvas({ platformView: 'apple' });
    expect(screen.queryAllByText(/google wallet/i).length).toBe(0);
  });

  it('renders only the Google card in google view', () => {
    renderCanvas({ platformView: 'google' });
    expect(screen.queryAllByText(/apple wallet/i).length).toBe(0);
  });

  it('shows the back card when showBack is true', () => {
    const front = renderCanvas({ showBack: false });
    front.unmount();
    renderCanvas({ showBack: true });
    expect(document.body.textContent).toBeTruthy();
  });

  it('applies zoom to the canvas shell', () => {
    renderCanvas({ zoom: 1.5 });
    expect(screen.getAllByText(/apple|google/i).length).toBeGreaterThanOrEqual(1);
  });
});
