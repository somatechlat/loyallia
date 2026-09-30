/**
 * Unit tests for the WYSIWYG NotificationConfigPanel — per-field Apple/Google config.
 */

import React, { useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { NotificationConfigPanel } from '@/components/wallet/studio/NotificationConfigPanel';
import type { FieldNotifications } from '@/components/wallet/types/unified-state';

/** Stateful harness so controlled inputs actually re-render with new values. */
function Harness({
  initial,
  onChange,
}: {
  initial: FieldNotifications;
  onChange?: (n: FieldNotifications) => void;
}) {
  const [notifications, setNotifications] = useState<FieldNotifications>(initial);
  return (
    <NotificationConfigPanel
      notifications={notifications}
      onChange={(next) => {
        setNotifications(next);
        onChange?.(next);
      }}
    />
  );
}

function renderPanel(notifications: FieldNotifications = {}, onChange = vi.fn()) {
  return render(
    <I18nProvider>
      <Harness initial={notifications} onChange={onChange} />
    </I18nProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('NotificationConfigPanel', () => {
  it('renders two side-by-side platform columns', () => {
    renderPanel();
    expect(screen.getByTestId('notification-apple-column')).toBeDefined();
    expect(screen.getByTestId('notification-google-column')).toBeDefined();
  });

  it('toggles write both platform configs', () => {
    const onChange = vi.fn();
    renderPanel({}, onChange);

    fireEvent.click(screen.getByTestId('toggle-apple-change-message'));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        appleChangeMessage: expect.objectContaining({ enabled: true }),
      })
    );

    fireEvent.click(screen.getByTestId('toggle-google-message'));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        googleMessage: expect.objectContaining({ enabled: true, trigger: 'onChange' }),
      })
    );
  });

  it('typing in the Apple message updates the iOS preview live', () => {
    renderPanel({ appleChangeMessage: { enabled: true, message: 'Saldo %@' } });
    const input = screen.getByTestId('apple-change-message-input');
    fireEvent.change(input, { target: { value: 'Puntos: %@' } });
    const preview = screen.getByTestId('apple-notification-preview');
    expect(preview.textContent).toContain('Puntos: 3/10');
  });

  it('substitutes %@ with the sample value in the Apple preview', () => {
    renderPanel({ appleChangeMessage: { enabled: true, message: 'Tu saldo es ahora %@ puntos' } });
    const preview = screen.getByTestId('apple-notification-preview');
    expect(preview.textContent).toContain('Tu saldo es ahora 3/10 puntos');
  });

  it('previews are aria-hidden decorative duplicates', () => {
    renderPanel({
      appleChangeMessage: { enabled: true, message: 'x' },
      googleMessage: { enabled: true, header: 'H', body: 'B', trigger: 'onChange' },
    });
    expect(screen.getByTestId('apple-notification-preview').getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByTestId('google-notification-preview').getAttribute('aria-hidden')).toBe('true');
  });

  it('%@ chip inserts the token at the caret', () => {
    const onChange = vi.fn();
    renderPanel({ appleChangeMessage: { enabled: true, message: 'Saldo ' } }, onChange);
    const input = screen.getByTestId('apple-change-message-input') as HTMLTextAreaElement;
    input.focus();
    input.setSelectionRange(7, 7);
    fireEvent.click(screen.getByTestId('insert-apple-token'));
    expect(onChange).toHaveBeenLastCalledWith({
      appleChangeMessage: { enabled: true, message: 'Saldo %@' },
    });
  });

  it('Google trigger radio reveals scheduledAt control', () => {
    renderPanel({ googleMessage: { enabled: true, header: 'H', body: 'B', trigger: 'onChange' } });
    expect(screen.queryByTestId('google-scheduled-at')).toBeNull();
    fireEvent.click(screen.getByTestId('google-trigger-scheduled'));
    expect(screen.getByTestId('google-scheduled-at')).toBeDefined();
    expect(screen.queryByTestId('google-days-before-expiry')).toBeNull();
  });

  it('Google trigger radio reveals daysBeforeExpiry stepper', () => {
    renderPanel({ googleMessage: { enabled: true, header: 'H', body: 'B', trigger: 'onChange' } });
    fireEvent.click(screen.getByTestId('google-trigger-beforeExpiry'));
    expect(screen.getByTestId('google-days-before-expiry')).toBeDefined();
    expect(screen.queryByTestId('google-scheduled-at')).toBeNull();
    fireEvent.click(screen.getByTestId('google-days-plus'));
    expect((screen.getByTestId('google-days-before-expiry') as HTMLInputElement).value).toBe('4');
  });

  it('Google preview substitutes {value} placeholders', () => {
    renderPanel({
      googleMessage: {
        enabled: true,
        header: 'Saldo',
        body: 'Ahora tienes {value} puntos',
        trigger: 'onChange',
      },
    });
    const preview = screen.getByTestId('google-notification-preview');
    expect(preview.textContent).toContain('Ahora tienes 3/10 puntos');
  });

  it('disabling Apple clears the config', () => {
    const onChange = vi.fn();
    renderPanel({ appleChangeMessage: { enabled: true, message: 'x' } }, onChange);
    fireEvent.click(screen.getByTestId('toggle-apple-change-message'));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ appleChangeMessage: undefined })
    );
  });

  it('disabling Google clears the config', () => {
    const onChange = vi.fn();
    renderPanel(
      { googleMessage: { enabled: true, header: 'H', body: 'B', trigger: 'onChange' } },
      onChange
    );
    fireEvent.click(screen.getByTestId('toggle-google-message'));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ googleMessage: undefined })
    );
  });

  it('shows the Apple free-text platform warning', () => {
    renderPanel({ appleChangeMessage: { enabled: true, message: 'x' } });
    expect(screen.getByTestId('apple-free-text-warning').textContent).toMatch(/Apple/i);
  });
});
