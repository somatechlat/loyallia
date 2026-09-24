/**
 * WalletDesignerOverlay — full-screen shell contract.
 *
 * The overlay must (a) mount the existing WalletStudio unchanged,
 * (b) close on Esc / Back / Close / Done, and (c) stay hidden when closed.
 * No mocks of the shell itself; WalletStudio is stubbed so this test stays
 * about the shell, not the IDE inside it.
 */
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

import { I18nProvider } from '@/lib/i18n';
import { WalletDesignerOverlay } from '@/components/wallet/studio/WalletDesignerOverlay';

vi.mock('@/components/wallet/studio/WalletStudio', () => ({
  WalletStudio: (props: Record<string, unknown>) => (
    <div data-testid="wallet-studio-stub" data-has-onchange={!!props.onChange} data-has-onsave={!!props.onSave}>
      studio-stub
    </div>
  ),
}));

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nProvider>{children}</I18nProvider>
);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('WalletDesignerOverlay', () => {
  it('renders nothing when closed', () => {
    render(
      <Wrapper>
        <WalletDesignerOverlay open={false} onClose={() => {}} />
      </Wrapper>
    );
    expect(screen.queryByTestId('wallet-designer-overlay')).toBeNull();
  });

  it('renders a modal shell with the existing studio mounted', () => {
    render(
      <Wrapper>
        <WalletDesignerOverlay open onClose={() => {}} onChange={() => {}} onSaveAndClose={() => {}} />
      </Wrapper>
    );
    const dialog = screen.getByTestId('wallet-designer-overlay');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByTestId('wallet-studio-stub')).toBeTruthy();
    expect(screen.getByTestId('wallet-studio-stub').getAttribute('data-has-onchange')).toBe('true');
    expect(screen.getByTestId('wallet-studio-stub').getAttribute('data-has-onsave')).toBe('true');
  });

  it('calls onClose from the Back button', () => {
    const onClose = vi.fn();
    render(
      <Wrapper>
        <WalletDesignerOverlay open onClose={onClose} />
      </Wrapper>
    );
    fireEvent.click(screen.getByTestId('wallet-designer-back'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose from the Close button', () => {
    const onClose = vi.fn();
    render(
      <Wrapper>
        <WalletDesignerOverlay open onClose={onClose} />
      </Wrapper>
    );
    fireEvent.click(screen.getByTestId('wallet-designer-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose from Done', () => {
    const onClose = vi.fn();
    render(
      <Wrapper>
        <WalletDesignerOverlay open onClose={onClose} />
      </Wrapper>
    );
    fireEvent.click(screen.getByTestId('wallet-designer-done'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    render(
      <Wrapper>
        <WalletDesignerOverlay open onClose={onClose} />
      </Wrapper>
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
