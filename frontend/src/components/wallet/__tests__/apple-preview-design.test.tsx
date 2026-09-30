/**
 * Apple preview design: hero scale, stamp icons, design-system chrome.
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { AppleWalletCard } from '@/components/wallet/AppleWalletPreview';
import WalletPreviewContent from '@/components/programs/WalletPreviewContent';

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

const stampForm = {
  name: 'Cafe',
  description: 'Collect and earn',
  background_color: '#1a1a2e',
  text_color: '#ffffff',
  card_type: 'stamp',
};

const stampConfig = {
  cardType: 'stamp' as const,
  stampsRequired: 5,
  rewardDescription: 'Free coffee',
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

describe('AppleWalletCard design-system presentation', () => {
  it('renders the hero primary value and stamp progress grid', () => {
    renderWithI18n(
      <AppleWalletCard
        form={stampForm}
        barcodeType="qr_code"
        cardTypeConfig={stampConfig}
        deviceFrame={false}
      />,
    );
    // Hero: 3 / 5 at CARD_TYPE_SCALE.xl
    expect(screen.getByText('3 / 5')).toBeTruthy();
    expect(screen.getByTestId('apple-primary-field')).toBeTruthy();
    // Real stamp icons, not block glyphs
    expect(screen.getByTestId('stamp-progress-grid')).toBeTruthy();
    expect(screen.getByTestId('apple-barcode')).toBeTruthy();
  });

  it('paints the card face from the design-system gradient, not the raw form hex', () => {
    renderWithI18n(
      <AppleWalletCard
        form={stampForm}
        barcodeType="qr_code"
        cardTypeConfig={stampConfig}
        deviceFrame={false}
      />,
    );
    const card = screen.getByTestId('apple-wallet-card');
    const style = card.getAttribute('style') ?? '';
    // stamp palette gradient (amber → rose). DOM serialises hex as rgb().
    expect(style).toContain('linear-gradient');
    expect(style).toMatch(/245,\s*158,\s*11/);
  });

  it('shows secondary fields as a two-column readable grid (no 52px label trap)', () => {
    const walletDesign = {
      appleFields: {
        secondaryFields: [
          { key: 's0', label: 'RECOMPENSA', value: 'Café gratis' },
          { key: 's1', label: 'VÁLIDO', value: '31/12/2025' },
        ],
      },
    };
    const { container } = renderWithI18n(
      <AppleWalletCard
        form={stampForm}
        barcodeType="qr_code"
        cardTypeConfig={stampConfig}
        walletDesign={walletDesign}
        deviceFrame={false}
      />,
    );
    expect(screen.getByText('RECOMPENSA')).toBeTruthy();
    expect(container.innerHTML).not.toContain('max-w-[52px]');
    expect(container.innerHTML).not.toContain('truncate');
    expect(container.querySelectorAll('.grid-cols-2').length).toBeGreaterThan(0);
  });

  it('renders the Apple pass body in WalletPreviewContent with the design-system face', () => {
    const { container } = renderWithI18n(
      <WalletPreviewContent type="stamp" />,
    );
    expect(screen.getByTestId('apple-pass-body')).toBeTruthy();
    expect(screen.getByTestId('stamp-progress-grid')).toBeTruthy();
    expect(container.innerHTML).toContain('linear-gradient');
    expect(container.innerHTML).not.toMatch(/text-\[(8|9|10)px\]/);
  });
});
