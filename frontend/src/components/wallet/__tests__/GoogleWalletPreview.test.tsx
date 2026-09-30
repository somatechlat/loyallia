/**
 * Unit tests for the Google Wallet card preview.
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { GoogleWalletCard, GoogleWalletBackCard } from '@/components/wallet/GoogleWalletPreview';

const baseForm = {
  name: 'Cafe Aurora',
  description: 'Disfruta cada visita',
  background_color: '',
  text_color: '',
  card_type: 'stamp',
};

function renderCard(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

afterEach(cleanup);

describe('GoogleWalletCard', () => {
  it('renders hero value and program name', () => {
    renderCard(
      <GoogleWalletCard
        form={baseForm}
        barcodeType="qr_code"
        cardTypeConfig={{ cardType: 'stamp', stampsAtIssue: 3, stampsRequired: 5 }}
        deviceFrame={false}
      />,
    );
    expect(screen.getByTestId('google-wallet-card')).toBeTruthy();
    expect(screen.getByTestId('google-hero-value').textContent).toContain('3/5');
    expect(screen.getByText('Cafe Aurora')).toBeTruthy();
  });

  it('renders Material message chips from google.messages', () => {
    renderCard(
      <GoogleWalletCard
        form={baseForm}
        barcodeType="qr_code"
        deviceFrame={false}
        walletDesign={{
          google: {
            programName: 'Aurora Club',
            hexBackgroundColor: '#312E81',
            messages: [
              { header: 'Puntos actualizados', body: 'Sumaste 120 puntos esta semana' },
            ],
          },
        }}
      />,
    );
    const chips = screen.getByTestId('google-messages');
    expect(chips.textContent).toContain('Puntos actualizados');
    expect(chips.textContent).toContain('Sumaste 120 puntos esta semana');
  });

  it('falls back to the design-system palette when no hex is set', () => {
    const { container } = renderCard(
      <GoogleWalletCard
        form={{ ...baseForm, background_color: '' }}
        barcodeType="qr_code"
        deviceFrame={false}
      />,
    );
    const card = container.querySelector('[data-testid="google-wallet-card"]') as HTMLElement;
    expect(card.style.backgroundImage).toContain('linear-gradient');
  });

  it('honours google.hexBackgroundColor when set', () => {
    const { container } = renderCard(
      <GoogleWalletCard
        form={baseForm}
        barcodeType="qr_code"
        deviceFrame={false}
        walletDesign={{ google: { hexBackgroundColor: '#0F766E' } }}
      />,
    );
    const card = container.querySelector('[data-testid="google-wallet-card"]') as HTMLElement;
    // jsdom normalises hex to rgb()
    expect(card.style.background).toMatch(/rgb\(15,\s*118,\s*110\)|#0F766E/i);
  });

  it('shows progress slots for stamp cards', () => {
    renderCard(
      <GoogleWalletCard
        form={baseForm}
        barcodeType="qr_code"
        deviceFrame={false}
        cardTypeConfig={{ cardType: 'stamp', stampsAtIssue: 2, stampsRequired: 4 }}
      />,
    );
    const progress = screen.getByTestId('google-progress');
    expect(progress).toBeTruthy();
    expect(progress.querySelectorAll('svg').length).toBe(4);
  });

  it('shows offer hero for OfferClass coupon cards', () => {
    renderCard(
      <GoogleWalletCard
        form={{ ...baseForm, card_type: 'coupon' }}
        barcodeType="qr_code"
        deviceFrame={false}
        cardTypeConfig={{ cardType: 'coupon', discountValue: 15, discountType: 'percentage' }}
        walletDesign={{ google: { passType: 'OfferClass' } }}
      />,
    );
    expect(screen.getByTestId('google-hero-value').textContent).toContain('15%');
  });

  it('shows gift balance for GiftCardClass cards', () => {
    renderCard(
      <GoogleWalletCard
        form={{ ...baseForm, card_type: 'gift_certificate' }}
        barcodeType="qr_code"
        deviceFrame={false}
        cardTypeConfig={{ cardType: 'gift_certificate', denominations: [25] }}
        walletDesign={{ google: { passType: 'GiftCardClass' } }}
      />,
    );
    expect(screen.getByTestId('google-hero-value').textContent).toContain('25.00');
  });
});

describe('GoogleWalletBackCard', () => {
  it('renders back fields and empty state', () => {
    renderCard(
      <GoogleWalletBackCard
        form={baseForm}
        backFields={[{ label: 'Términos', value: 'Válido por 12 meses' }]}
        backLinks={[{ type: 'website', url: 'https://example.com', label: 'Sitio web' }]}
      />,
    );
    expect(screen.getByTestId('google-wallet-back-card')).toBeTruthy();
    expect(screen.getByText('Válido por 12 meses')).toBeTruthy();
    expect(screen.getByText('Sitio web')).toBeTruthy();
  });
});
