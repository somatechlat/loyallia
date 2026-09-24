/**
 * Unit tests for NotificationConfigPanel — per-field Apple/Google push config.
 */

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { NotificationConfigPanel } from '@/components/wallet/studio/NotificationConfigPanel';
import type { FieldNotifications } from '@/components/wallet/types/unified-state';

function renderPanel(notifications: FieldNotifications = {}, onChange = vi.fn()) {
  return render(
    <I18nProvider>
      <NotificationConfigPanel notifications={notifications} onChange={onChange} />
    </I18nProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('NotificationConfigPanel', () => {
  it('collapses until the header is clicked', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /notif|notific/i }));
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThanOrEqual(2);
  });

  it('enables the Apple change message with a default body', () => {
    const onChange = vi.fn();
    renderPanel({}, onChange);
    fireEvent.click(screen.getByRole('button', { name: /notif|notific/i }));
    fireEvent.click(screen.getAllByRole('checkbox')[0]!);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        appleChangeMessage: expect.objectContaining({ enabled: true }),
      })
    );
  });

  it('edits the Apple message body', () => {
    const onChange = vi.fn();
    renderPanel({ appleChangeMessage: { enabled: true, message: 'old' } }, onChange);
    fireEvent.click(screen.getByRole('button', { name: /notif|notific/i }));
    fireEvent.change(screen.getByDisplayValue('old'), { target: { value: 'new' } });
    expect(onChange).toHaveBeenLastCalledWith({
      appleChangeMessage: { enabled: true, message: 'new' },
    });
  });

  it('enables Google message with defaults and edits header/body', () => {
    const onChange = vi.fn();
    renderPanel(
      { googleMessage: { enabled: true, header: 'H', body: 'B', trigger: 'onChange' } },
      onChange
    );
    fireEvent.click(screen.getByRole('button', { name: /notif|notific/i }));
    fireEvent.change(screen.getByTestId('google-notification-header'), {
      target: { value: 'New header' },
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        googleMessage: expect.objectContaining({ header: 'New header' }),
      })
    );
    fireEvent.change(screen.getByTestId('google-notification-body'), {
      target: { value: 'New body' },
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        googleMessage: expect.objectContaining({ body: 'New body' }),
      })
    );
  });

  it('disables Apple message when toggled off', () => {
    const onChange = vi.fn();
    renderPanel({ appleChangeMessage: { enabled: true, message: 'x' } }, onChange);
    fireEvent.click(screen.getByRole('button', { name: /notif|notific/i }));
    fireEvent.click(screen.getAllByRole('checkbox')[0]!);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ appleChangeMessage: undefined })
    );
  });
});
