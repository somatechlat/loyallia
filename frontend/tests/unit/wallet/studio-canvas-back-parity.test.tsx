/**
 * StudioCanvas integration: the Google stage shows CUSTOM designer fields
 * (text-module mapping) and both back previews render the SAME shared
 * `state.backContent` fields/links.
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { StudioCanvas } from '@/components/wallet/studio/StudioCanvas';
import { createDefaultState } from '@/hooks/useWalletStudio';
import type { UnifiedField } from '@/components/wallet/types';

function customField(overrides: Partial<UnifiedField> = {}): UnifiedField {
  return {
    id: 'bebida_favorita',
    label: 'Bebida favorita',
    value: 'Té verde',
    fieldGroup: 'secondary',
    order: 10,
    showOnApple: true,
    showOnGoogle: true,
    isDynamic: false,
    dataType: 'text',
    appleOptions: {},
    googleOptions: { isPredefined: false },
    notifications: {},
    formatting: { isLink: false },
    ...overrides,
  };
}

function renderCanvas(state: ReturnType<typeof createDefaultState>, props: { platformView: 'apple' | 'google' | 'both'; showBack: boolean }) {
  return render(
    <I18nProvider>
      <StudioCanvas state={state} platformView={props.platformView} showBack={props.showBack} />
    </I18nProvider>,
  );
}

afterEach(cleanup);

describe('StudioCanvas custom fields on the Google stage', () => {
  it('shows custom fields in the Google preview (text-module rows)', () => {
    const state = createDefaultState();
    state.fields = [...state.fields, customField()];
    renderCanvas(state, { platformView: 'google', showBack: false });

    const googleStage = screen.getByTestId('studio-stage-google');
    expect(googleStage.textContent).toContain('Bebida favorita');
    expect(googleStage.textContent).toContain('Té verde');
  });

  it('keeps custom fields hidden from Google when showOnGoogle is false', () => {
    const state = createDefaultState();
    state.fields = [
      ...state.fields,
      customField({ id: 'interno', label: 'Nota interna', value: 'No publicar', showOnGoogle: false }),
    ];
    renderCanvas(state, { platformView: 'google', showBack: false });

    const googleStage = screen.getByTestId('studio-stage-google');
    expect(googleStage.textContent).not.toContain('No publicar');
  });
});

describe('StudioCanvas unified back content', () => {
  it('renders the same back fields and links on the Apple and Google backs', () => {
    const state = createDefaultState();
    state.backContent = {
      ...state.backContent,
      fields: [
        {
          id: 'b1',
          label: 'Términos',
          value: 'Válido por 12 meses',
          isLink: false,
          order: 0,
        },
      ],
      links: [
        { id: 'l1', type: 'website', url: 'https://example.com', label: 'Sitio web' },
      ],
    };
    renderCanvas(state, { platformView: 'both', showBack: true });

    const appleBack = screen.getByTestId('studio-stage-apple');
    const googleBack = screen.getByTestId('studio-stage-google');
    for (const stage of [appleBack, googleBack]) {
      expect(stage.textContent).toContain('Términos');
      expect(stage.textContent).toContain('Válido por 12 meses');
      expect(stage.textContent).toContain('Sitio web');
    }
  });

  it('resolves template placeholders identically on both backs', () => {
    const state = createDefaultState();
    state.backContent = {
      ...state.backContent,
      fields: [
        {
          id: 'b2',
          label: 'Titular',
          value: 'Cliente: {customer_name}',
          isLink: false,
          order: 0,
        },
      ],
    };
    renderCanvas(state, { platformView: 'both', showBack: true });

    const appleBack = screen.getByTestId('studio-stage-apple');
    const googleBack = screen.getByTestId('studio-stage-google');
    // The raw token must never leak into either preview.
    expect(appleBack.textContent).not.toContain('{customer_name}');
    expect(googleBack.textContent).not.toContain('{customer_name}');
    expect(appleBack.textContent).toMatch(/Cliente: \S+/);
    expect(googleBack.textContent).toMatch(/Cliente: \S+/);
  });
});
