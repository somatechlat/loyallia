/**
 * P0 preview correctness: Apple field limits, crop styles, real barcode message.
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { AppleWalletCard } from '@/components/wallet/AppleWalletPreview';
import { BarcodeSvg } from '@/components/wallet/BarcodeRenderer';
import type { PreviewWalletDesign } from '@/components/wallet/apple-wallet-helpers';

const baseForm = {
  name: 'Cafe',
  description: '',
  background_color: '#1a1a2e',
  text_color: '#ffffff',
  card_type: 'coupon',
};

function makeFields(group: string, count: number, prefix: string) {
  return Array.from({ length: count }, (_, i) => ({
    key: `${prefix}${i}`,
    label: `${prefix}-l${i}`,
    value: `${prefix}-v${i}`,
    dataType: 'text' as const,
    changeMessage: undefined,
    textAlignment: undefined,
    attributedValue: undefined,
  }));
}

afterEach(cleanup);

describe('AppleWalletCard field limits', () => {
  it('renders only the first primary field', () => {
    const walletDesign: PreviewWalletDesign = {
      appleFields: {
        primaryFields: makeFields('primary', 3, 'p'),
      },
    };
    render(
      <I18nProvider>
        <AppleWalletCard form={baseForm} barcodeType="qr_code" walletDesign={walletDesign} />
      </I18nProvider>
    );
    expect(screen.getByText('p-v0')).toBeTruthy();
    expect(screen.queryByText('p-v1')).toBeNull();
    expect(screen.queryByText('p-v2')).toBeNull();
  });

  it('caps combined secondary+auxiliary at 4 for coupon (COMBINED_LIMIT_4)', () => {
    const walletDesign: PreviewWalletDesign = {
      appleFields: {
        secondaryFields: makeFields('secondary', 3, 's'),
        auxiliaryFields: makeFields('auxiliary', 3, 'a'),
      },
    };
    render(
      <I18nProvider>
        <AppleWalletCard form={baseForm} barcodeType="qr_code" walletDesign={walletDesign} />
      </I18nProvider>
    );
    expect(screen.getByText('s-v0')).toBeTruthy();
    expect(screen.getByText('s-v1')).toBeTruthy();
    expect(screen.getByText('s-v2')).toBeTruthy();
    expect(screen.getByText('a-v0')).toBeTruthy();
    // 4th aux slot must be dropped — combined limit is 4, not 8
    expect(screen.queryByText('a-v1')).toBeNull();
    expect(screen.queryByText('a-v2')).toBeNull();
  });

  it('applies crop transform style to the strip image', () => {
    const walletDesign: PreviewWalletDesign = {
      appleStripUrl: '/strip.png',
      imageCrops: {
        strip: { zoom: 1.2, offsetX: 5, offsetY: -3, rotate: 0, flipH: false, flipV: false },
      },
    };
    render(
      <I18nProvider>
        <AppleWalletCard
          form={{ ...baseForm, card_type: 'stamp' }}
          barcodeType="qr_code"
          walletDesign={walletDesign}
        />
      </I18nProvider>
    );
    const img = screen.getByTestId('apple-strip-image').querySelector('img');
    expect(img?.style.transform).toBe('translate(5px, -3px) scale(1.2, 1.2) rotate(0deg)');
    expect(img?.style.transformOrigin).toBe('center center');
  });
});

describe('BarcodeSvg honesty', () => {
  it('encodes a real QR when message is provided', () => {
    render(<BarcodeSvg type="qr_code" size={48} message="LOYAL-99" />);
    expect(screen.getByTestId('barcode-qr')).toBeTruthy();
  });

  it('badges unencodable formats instead of faking a scannable code', () => {
    render(<BarcodeSvg type="aztec" size={48} message="LOYAL-99" />);
    expect(screen.getByTestId('barcode-unencodable')).toBeTruthy();
    expect(screen.getByTestId('barcode-preview-placeholder')).toBeTruthy();
  });

  it('renders real Code128 bars', () => {
    render(<BarcodeSvg type="code_128" size={68} message="ABC123" />);
    expect(screen.getByTestId('barcode-code128')).toBeTruthy();
  });
});
