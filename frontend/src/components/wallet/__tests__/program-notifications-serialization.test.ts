/**
 * programNotifications + cardTypeConfig regression tests.
 *
 * Locks the frontend→backend contract:
 *   - programNotifications round-trips unchanged through metadata
 *   - wallet_settings.notifications mirrors the same shape for the backend
 *   - makeDefaultStateFor builds a matching cardTypeConfig (production bug)
 */

import { describe, it, expect } from 'vitest';
import {
  parseWalletDesignFromMetadata,
  buildWalletDesignMetadata,
} from '@/components/wallet/serialization';
import {
  getDefaultProgramNotifications,
  type ProgramNotificationSettings,
} from '@/components/wallet/types/wallet-settings';
import { makeDefaultStateFor, createDefaultState } from '@/hooks/useWalletStudio';
import type { WalletPassStudioState } from '@/components/wallet/types/unified-state';

function minimalState(
  programNotifications: ProgramNotificationSettings
): WalletPassStudioState {
  const base = createDefaultState();
  return {
    ...base,
    id: 'ws-pn-1',
    name: 'PN Pass',
    programNotifications,
  };
}

describe('programNotifications serialization', () => {
  it('round-trips programNotifications unchanged', () => {
    const custom: ProgramNotificationSettings = {
      onEnroll: {
        enabled: true,
        requireConsent: false,
        apple: true,
        google: false,
        message: 'Bienvenido al club',
      },
      onRedeem: {
        enabled: false,
        apple: false,
        google: true,
        header: 'Canje',
        body: 'Listo',
      },
      onValueChange: { enabled: false },
    };

    const metadata = buildWalletDesignMetadata(minimalState(custom));
    const parsed = parseWalletDesignFromMetadata(metadata);

    expect(parsed.programNotifications).toEqual(custom);
  });

  it('round-trips default programNotifications', () => {
    const defaults = getDefaultProgramNotifications();
    const metadata = buildWalletDesignMetadata(minimalState(defaults));
    const parsed = parseWalletDesignFromMetadata(metadata);
    expect(parsed.programNotifications).toEqual(defaults);
  });

  it('writes wallet_settings.notifications for the backend', () => {
    const custom = getDefaultProgramNotifications();
    const metadata = buildWalletDesignMetadata(minimalState(custom));
    const settings = metadata.wallet_settings as {
      notifications: ProgramNotificationSettings;
    };
    expect(settings.notifications.onEnroll).toEqual(custom.onEnroll);
    expect(settings.notifications.onRedeem).toEqual(custom.onRedeem);
    expect(settings.notifications.onValueChange).toEqual(custom.onValueChange);
  });

  it('stores programNotifications under wallet_studio too', () => {
    const custom = getDefaultProgramNotifications();
    const metadata = buildWalletDesignMetadata(minimalState(custom));
    const ws = metadata.wallet_studio as Record<string, unknown>;
    expect(ws.programNotifications).toEqual(custom);
  });
});

describe('makeDefaultStateFor cardTypeConfig', () => {
  it('cashback yields a cashback config (regression: wizard left stamp config)', () => {
    const state = makeDefaultStateFor('cashback');
    expect(state.cardType).toBe('cashback');
    expect(state.cardTypeConfig.cardType).toBe('cashback');
    expect(state.apple.passStyle).toBe('storeCard');
    expect(state.google.passType).toBe('LoyaltyClass');
  });

  it('every card type gets a matching cardTypeConfig', () => {
    const types = [
      'stamp',
      'cashback',
      'coupon',
      'affiliate',
      'discount',
      'gift_certificate',
      'vip_membership',
      'corporate_discount',
      'referral_pass',
      'multipass',
    ] as const;
    for (const cardType of types) {
      const state = makeDefaultStateFor(cardType);
      expect(state.cardTypeConfig.cardType).toBe(cardType);
    }
  });

  it('createDefaultState is makeDefaultStateFor(stamp)', () => {
    const def = createDefaultState();
    expect(def.cardType).toBe('stamp');
    expect(def.cardTypeConfig.cardType).toBe('stamp');
    expect(def.programNotifications).toEqual(getDefaultProgramNotifications());
  });

  it('repairs mismatched cardTypeConfig on parse (legacy wizard bug)', () => {
    const metadata = {
      wallet_studio: {
        version: 2,
        id: 'ws-legacy',
        name: 'Legacy cashback',
        cardType: 'cashback',
        cardTypeConfig: {
          cardType: 'stamp',
          stampsRequired: 10,
        },
      },
    };
    const parsed = parseWalletDesignFromMetadata(metadata);
    expect(parsed.cardType).toBe('cashback');
    expect(parsed.cardTypeConfig?.cardType).toBe('cashback');
  });
});
