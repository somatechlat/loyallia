/**
 * Unit tests for notification preview token substitution.
 */

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import {
  AppleNotificationPreview,
  GoogleNotificationPreview,
  substituteAppleChangeMessage,
  substituteGoogleBody,
} from '@/components/wallet/studio/NotificationPreviews';

const SAMPLE = '3/10';

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

afterEach(() => {
  cleanup();
});

describe('substitute helpers', () => {
  it('replaces %@ with the sample value (Apple)', () => {
    expect(substituteAppleChangeMessage('Saldo %@ puntos', SAMPLE)).toBe('Saldo 3/10 puntos');
  });

  it('replaces every %@ occurrence', () => {
    expect(substituteAppleChangeMessage('%@ → %@', SAMPLE)).toBe('3/10 → 3/10');
  });

  it('replaces {value} with the sample value (Google)', () => {
    expect(substituteGoogleBody('Tienes {value} puntos', SAMPLE)).toBe('Tienes 3/10 puntos');
  });

  it('replaces every {value} occurrence', () => {
    expect(substituteGoogleBody('{value}/{value}', SAMPLE)).toBe('3/10/3/10');
  });

  it('honors a custom sample value', () => {
    expect(substituteAppleChangeMessage('x %@', '9/10')).toBe('x 9/10');
    expect(substituteGoogleBody('x {value}', '9/10')).toBe('x 9/10');
  });
});

describe('AppleNotificationPreview', () => {
  it('renders the substituted message and is aria-hidden', () => {
    renderWithI18n(<AppleNotificationPreview message="Saldo: %@ puntos" sampleValue={SAMPLE} />);
    const preview = screen.getByTestId('apple-notification-preview');
    expect(preview.getAttribute('aria-hidden')).toBe('true');
    expect(preview.textContent).toContain('Saldo: 3/10 puntos');
  });
});

describe('GoogleNotificationPreview', () => {
  it('renders header and substituted body and is aria-hidden', () => {
    renderWithI18n(
      <GoogleNotificationPreview
        header="Actualización"
        body="Saldo {value} puntos"
        sampleValue={SAMPLE}
      />
    );
    const preview = screen.getByTestId('google-notification-preview');
    expect(preview.getAttribute('aria-hidden')).toBe('true');
    expect(preview.textContent).toContain('Actualización');
    expect(preview.textContent).toContain('Saldo 3/10 puntos');
  });
});
