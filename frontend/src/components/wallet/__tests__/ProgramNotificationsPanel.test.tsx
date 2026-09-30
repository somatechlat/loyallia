/**
 * Unit tests for the program-level Notificaciones studio panel.
 */

import React, { useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { ProgramNotificationsPanel } from '@/components/wallet/studio/ProgramNotificationsPanel';
import {
  getDefaultProgramNotifications,
  parseProgramNotifications,
  PROGRAM_NOTIFICATION_DEFAULT_KEYS,
  type ProgramNotificationSettings,
} from '@/components/wallet/types/wallet-settings';

/** Stateful harness so controlled inputs re-render with new values. */
function Harness({
  initial,
  onChange,
}: {
  initial: ProgramNotificationSettings;
  onChange?: (s: ProgramNotificationSettings) => void;
}) {
  const [settings, setSettings] = useState(initial);
  return (
    <ProgramNotificationsPanel
      settings={settings}
      onChange={(next) => {
        setSettings(next);
        onChange?.(next);
      }}
    />
  );
}

function renderPanel(
  settings: ProgramNotificationSettings = getDefaultProgramNotifications(),
  onChange = vi.fn()
) {
  return render(
    <I18nProvider>
      <Harness initial={settings} onChange={onChange} />
    </I18nProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('getDefaultProgramNotifications', () => {
  it('onEnroll is opt-in (enabled === false)', () => {
    expect(getDefaultProgramNotifications().onEnroll.enabled).toBe(false);
  });

  it('onRedeem and onValueChange default to enabled', () => {
    const d = getDefaultProgramNotifications();
    expect(d.onRedeem.enabled).toBe(true);
    expect(d.onValueChange.enabled).toBe(true);
  });

  it('default copy fields hold catalog keys (resolved via t() in React)', () => {
    const d = getDefaultProgramNotifications();
    expect(d.onEnroll.message).toBe(PROGRAM_NOTIFICATION_DEFAULT_KEYS.onEnrollMessage);
    expect(d.onRedeem.header).toBe(PROGRAM_NOTIFICATION_DEFAULT_KEYS.onRedeemHeader);
    expect(d.onRedeem.body).toBe(PROGRAM_NOTIFICATION_DEFAULT_KEYS.onRedeemBody);
  });
});

describe('parseProgramNotifications', () => {
  it('returns defaults for unknown input', () => {
    expect(parseProgramNotifications(undefined)).toEqual(getDefaultProgramNotifications());
    expect(parseProgramNotifications('nope')).toEqual(getDefaultProgramNotifications());
    expect(parseProgramNotifications(42)).toEqual(getDefaultProgramNotifications());
  });

  it('merges partial payloads onto defaults', () => {
    const parsed = parseProgramNotifications({ onEnroll: { enabled: true } });
    expect(parsed.onEnroll.enabled).toBe(true);
    expect(parsed.onEnroll.message).toBe(PROGRAM_NOTIFICATION_DEFAULT_KEYS.onEnrollMessage);
    expect(parsed.onRedeem.enabled).toBe(true);
  });
});

describe('ProgramNotificationsPanel', () => {
  it('renders all three lifecycle events', () => {
    renderPanel();
    expect(screen.getByTestId('program-notif-on-enroll')).toBeDefined();
    expect(screen.getByTestId('program-notif-on-redeem')).toBeDefined();
    expect(screen.getByTestId('program-notif-on-value-change')).toBeDefined();
  });

  it('defaults have onEnroll disabled', () => {
    renderPanel();
    const toggle = screen.getByTestId('program-notif-on-enroll-toggle') as HTMLInputElement;
    expect(toggle.checked).toBe(false);
  });

  it('toggling enroll shows the consent control and writes state', () => {
    const onChange = vi.fn();
    renderPanel(getDefaultProgramNotifications(), onChange);
    fireEvent.click(screen.getByTestId('program-notif-on-enroll-toggle'));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        onEnroll: expect.objectContaining({ enabled: true }),
      })
    );
    expect(screen.getByTestId('program-enroll-require-consent')).toBeDefined();
    // LOPDP/GDPR consent hint is visible
    expect(
      screen.getAllByText(/consentimiento/i).length
    ).toBeGreaterThan(0);
  });

  it('changing the enroll message updates both previews', () => {
    renderPanel();
    fireEvent.change(screen.getByTestId('program-enroll-message'), {
      target: { value: 'Hola %@ amigo {value}' },
    });
    const apples = screen.getAllByTestId('apple-notification-preview');
    // Apple substitutes %@ only
    expect(apples[0]!.textContent).toContain('Hola 3/10 amigo {value}');
    const googles = screen.getAllByTestId('google-notification-preview');
    // Google substitutes {value} only
    expect(googles[0]!.textContent).toContain('Hola %@ amigo 3/10');
  });

  it('toggling requireConsent writes state', () => {
    const onChange = vi.fn();
    renderPanel(getDefaultProgramNotifications(), onChange);
    fireEvent.click(screen.getByTestId('program-enroll-require-consent'));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        onEnroll: expect.objectContaining({ requireConsent: false }),
      })
    );
  });

  it('editing redeem header updates the Google preview', () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('program-notif-on-redeem-expand'));
    fireEvent.change(screen.getByTestId('program-redeem-header'), {
      target: { value: 'Canje OK' },
    });
    const previews = screen.getAllByTestId('google-notification-preview');
    const redeemPreview = previews.find((p) => p.textContent?.includes('Canje OK'));
    expect(redeemPreview).toBeDefined();
  });

  it('platform checkboxes write apple/google targets', () => {
    const onChange = vi.fn();
    renderPanel(getDefaultProgramNotifications(), onChange);
    fireEvent.click(screen.getByTestId('program-enroll-apple'));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        onEnroll: expect.objectContaining({ apple: false }),
      })
    );
  });
});
