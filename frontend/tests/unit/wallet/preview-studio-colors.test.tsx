/**
 * User-palette previews: the wallet_studio palette drives both card faces
 * through `walletDesign.studioColors`, and any custom surface gets
 * contrast-derived text so preview copy is never illegible.
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { GoogleWalletCard } from '@/components/wallet/GoogleWalletPreview';
import { AppleWalletCard } from '@/components/wallet/AppleWalletPreview';

const stampForm = {
  name: 'Cafe Aurora',
  description: 'Disfruta cada visita',
  background_color: '',
  text_color: '',
  card_type: 'stamp',
};

const stampConfig = {
  cardType: 'stamp' as const,
  stampsRequired: 5,
  rewardDescription: 'Café gratis',
  stampType: 'visit' as const,
  consumptionPerStamp: 1,
  stampExpiry: 'unlimited' as const,
  stampsAtIssue: 3,
  dailyStampLimit: 1,
  birthdayStamps: 0,
  stampShape: 'circle' as const,
  stampIcon: '',
  stampFilledIcon: '',
  stampColor: '#FBBF24',
  stampGridLayout: '5x2' as const,
};

afterEach(cleanup);

describe('GoogleWalletCard user palette', () => {
  it('paints the surface from studioColors and derives readable text', () => {
    render(
      <I18nProvider>
        <GoogleWalletCard
          form={stampForm}
          barcodeType="qr_code"
          cardTypeConfig={stampConfig}
          deviceFrame={false}
          walletDesign={{ studioColors: { background: '#FFFFFF' } }}
        />
      </I18nProvider>,
    );
    const card = screen.getByTestId('google-wallet-card');
    expect(card.style.background).toMatch(/rgb\(255,\s*255,\s*255\)|#FFFFFF/i);

    // White palette text on a white face would be illegible → derived black.
    const programName = screen.getByText('Cafe Aurora');
    expect((programName as HTMLElement).style.color).toMatch(/rgb\(0,\s*0,\s*0\)/);
  });

  it('derives readable text on an explicit hex background too', () => {
    render(
      <I18nProvider>
        <GoogleWalletCard
          form={stampForm}
          barcodeType="qr_code"
          cardTypeConfig={stampConfig}
          deviceFrame={false}
          walletDesign={{ google: { hexBackgroundColor: '#FFF2CC' } }}
        />
      </I18nProvider>,
    );
    const card = screen.getByTestId('google-wallet-card');
    expect(card.style.background).toMatch(/rgb\(255,\s*242,\s*204\)|#FFF2CC/i);
    const programName = screen.getByText('Cafe Aurora');
    expect((programName as HTMLElement).style.color).toMatch(/rgb\(0,\s*0,\s*0\)/);
  });

  it('keeps design-system colours when no custom surface is configured', () => {
    render(
      <I18nProvider>
        <GoogleWalletCard
          form={stampForm}
          barcodeType="qr_code"
          cardTypeConfig={stampConfig}
          deviceFrame={false}
        />
      </I18nProvider>,
    );
    const card = screen.getByTestId('google-wallet-card');
    expect(card.style.backgroundImage).toContain('linear-gradient');
    const programName = screen.getByText('Cafe Aurora');
    expect((programName as HTMLElement).style.color).not.toBe('');
  });
});

describe('AppleWalletCard user palette', () => {
  it('paints the face from studioColors instead of the form hex', () => {
    render(
      <I18nProvider>
        <AppleWalletCard
          form={{ ...stampForm, background_color: '#FF00FF' }}
          barcodeType="qr_code"
          cardTypeConfig={stampConfig}
          deviceFrame={false}
          walletDesign={{
            studioColors: { background: '#111827', foreground: '#F9FAFB', label: '#D1D5DB', accent: '#FBBF24' },
          }}
        />
      </I18nProvider>,
    );
    const card = screen.getByTestId('apple-wallet-card');
    const style = card.getAttribute('style') ?? '';
    // Studio background wins over the raw form hex.
    expect(card.style.backgroundColor).toMatch(/rgb\(17,\s*24,\s*39\)/);
    expect(style).not.toContain('rgb(255, 0, 255)');
  });

  it('derives readable text when the user text colour is illegible', () => {
    render(
      <I18nProvider>
        <AppleWalletCard
          form={stampForm}
          barcodeType="qr_code"
          cardTypeConfig={stampConfig}
          deviceFrame={false}
          walletDesign={{
            studioColors: { background: '#FFFFFF', foreground: '#FFFFFF', label: '#F3F4F6', accent: '#FDE68A' },
          }}
        />
      </I18nProvider>,
    );
    const card = screen.getByTestId('apple-wallet-card');
    expect(card.style.backgroundColor).toMatch(/rgb\(255,\s*255,\s*255\)/);
    expect(card.style.color).toMatch(/rgb\(0,\s*0,\s*0\)/);
    // Field labels derive the muted colour too — the illegible user colours
    // must not survive anywhere on the card face.
    const all = Array.from(card.querySelectorAll('*')) as HTMLElement[];
    const illegible = all.filter((el) => /rgb\(243,\s*244,\s*246\)/.test(el.style?.color ?? ''));
    expect(illegible).toEqual([]);
  });
});
