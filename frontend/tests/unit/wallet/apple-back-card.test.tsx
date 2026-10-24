/**
 * Apple back-of-card preview: renders the SAME back content as the Google
 * back card — shared `state.backContent` fields/links merged with the legacy
 * `walletDesign.appleFields.backFields`, de-duplicated by label + value.
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { AppleWalletBackCard } from '@/components/wallet/AppleWalletPreview';

const baseForm = {
  name: 'Cafe Aurora',
  description: 'Disfruta cada visita',
  background_color: '#1a1a2e',
  text_color: '#ffffff',
  card_type: 'stamp',
};

function renderBack(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

afterEach(cleanup);

describe('AppleWalletBackCard unified back content', () => {
  it('renders shared back fields and links', () => {
    const { container } = renderBack(
      <AppleWalletBackCard
        form={baseForm}
        deviceFrame={false}
        backFields={[{ label: 'Términos', value: 'Válido por 12 meses' }]}
        backLinks={[{ type: 'website', url: 'https://example.com', label: 'Sitio web' }]}
      />,
    );
    expect(screen.getByText('Términos')).toBeTruthy();
    expect(screen.getByText('Válido por 12 meses')).toBeTruthy();
    expect(screen.getByText(/Enlaces/)).toBeTruthy();
    expect(screen.getByText('Sitio web')).toBeTruthy();
    const link = container.querySelector('a[href="https://example.com"]');
    expect(link).not.toBeNull();
  });

  it('renders legacy walletDesign.appleFields.backFields when no shared props are given', () => {
    renderBack(
      <AppleWalletBackCard
        form={baseForm}
        deviceFrame={false}
        walletDesign={{
          appleFields: {
            backFields: [{ key: 'k1', label: 'Membresía', value: 'Oro' }],
          },
        }}
      />,
    );
    expect(screen.getByText('Membresía')).toBeTruthy();
    expect(screen.getByText('Oro')).toBeTruthy();
  });

  it('de-duplicates fields present in both the shared source and the legacy slice', () => {
    renderBack(
      <AppleWalletBackCard
        form={baseForm}
        deviceFrame={false}
        backFields={[{ label: 'Términos', value: 'Válido por 12 meses' }]}
        walletDesign={{
          appleFields: {
            backFields: [{ key: 'k1', label: 'Términos', value: 'Válido por 12 meses' }],
          },
        }}
      />,
    );
    expect(screen.getAllByText('Válido por 12 meses')).toHaveLength(1);
    expect(screen.getAllByText('Términos')).toHaveLength(1);
  });

  it('resolves template placeholders to real preview values', () => {
    renderBack(
      <AppleWalletBackCard
        form={baseForm}
        customerName="Ana Torres"
        deviceFrame={false}
        backFields={[{ label: 'Titular', value: '{customer_name}' }]}
      />,
    );
    expect(screen.getByText('Ana Torres')).toBeTruthy();
  });

  it('drops empty designer placeholders and shows the empty state', () => {
    renderBack(
      <AppleWalletBackCard
        form={baseForm}
        deviceFrame={false}
        backFields={[{ label: '', value: '' }]}
        backLinks={[]}
      />,
    );
    expect(screen.getByText(/Sin información adicional/)).toBeTruthy();
  });

  it('renders the same content the Google back card receives', () => {
    const fields = [{ label: 'Términos', value: 'Válido por 12 meses' }];
    const links = [{ type: 'website', url: 'https://example.com', label: 'Sitio web' }];
    const { container } = renderBack(
      <AppleWalletBackCard form={baseForm} deviceFrame={false} backFields={fields} backLinks={links} />,
    );
    // Every shared field/link renders as text inside the card.
    for (const entry of [...fields.map((f) => f.value), ...links.map((l) => l.label)]) {
      expect(container.textContent).toContain(entry);
    }
  });
});
