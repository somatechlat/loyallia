/**
 * Router component that renders the correct card-type configuration tab
 * based on the current cardType.
 */

'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n';
import type { CardType, CardTypeConfig } from '@/components/wallet/types/unified-state';
import { StampTab } from './tabs/StampTab';
import { CashbackTab } from './tabs/CashbackTab';
import { CouponTab } from './tabs/CouponTab';
import { VIPTab } from './tabs/VIPTab';
import { GiftTab } from './tabs/GiftTab';
import { AffiliateTab } from './tabs/AffiliateTab';
import { DiscountTab } from './tabs/DiscountTab';
import { CorporateTab } from './tabs/CorporateTab';
import { ReferralTab } from './tabs/ReferralTab';
import { MultipassTab } from './tabs/MultipassTab';

export interface CardTypeTabProps {
  cardType: CardType;
  config: CardTypeConfig;
  onChange: (config: Partial<CardTypeConfig>) => void;
}

export function CardTypeTab({ cardType, config, onChange }: CardTypeTabProps) {
  switch (cardType) {
    case 'stamp':
      return (
        <StampTab
          config={config as Extract<CardTypeConfig, { cardType: 'stamp' }>}
          onChange={onChange as (c: Partial<Extract<CardTypeConfig, { cardType: 'stamp' }>>) => void}
        />
      );
    case 'cashback':
      return (
        <CashbackTab
          config={config as Extract<CardTypeConfig, { cardType: 'cashback' }>}
          onChange={onChange as (c: Partial<Extract<CardTypeConfig, { cardType: 'cashback' }>>) => void}
        />
      );
    case 'coupon':
      return (
        <CouponTab
          config={config as Extract<CardTypeConfig, { cardType: 'coupon' }>}
          onChange={onChange as (c: Partial<Extract<CardTypeConfig, { cardType: 'coupon' }>>) => void}
        />
      );
    case 'vip_membership':
      return (
        <VIPTab
          config={config as Extract<CardTypeConfig, { cardType: 'vip_membership' }>}
          onChange={onChange as (c: Partial<Extract<CardTypeConfig, { cardType: 'vip_membership' }>>) => void}
        />
      );
    case 'gift_certificate':
      return (
        <GiftTab
          config={config as Extract<CardTypeConfig, { cardType: 'gift_certificate' }>}
          onChange={onChange as (c: Partial<Extract<CardTypeConfig, { cardType: 'gift_certificate' }>>) => void}
        />
      );
    case 'affiliate':
      return (
        <AffiliateTab
          config={config as Extract<CardTypeConfig, { cardType: 'affiliate' }>}
          onChange={onChange as (c: Partial<Extract<CardTypeConfig, { cardType: 'affiliate' }>>) => void}
        />
      );
    case 'discount':
      return (
        <DiscountTab
          config={config as Extract<CardTypeConfig, { cardType: 'discount' }>}
          onChange={onChange as (c: Partial<Extract<CardTypeConfig, { cardType: 'discount' }>>) => void}
        />
      );
    case 'corporate_discount':
      return (
        <CorporateTab
          config={config as Extract<CardTypeConfig, { cardType: 'corporate_discount' }>}
          onChange={onChange as (c: Partial<Extract<CardTypeConfig, { cardType: 'corporate_discount' }>>) => void}
        />
      );
    case 'referral_pass':
      return (
        <ReferralTab
          config={config as Extract<CardTypeConfig, { cardType: 'referral_pass' }>}
          onChange={onChange as (c: Partial<Extract<CardTypeConfig, { cardType: 'referral_pass' }>>) => void}
        />
      );
    case 'multipass':
      return (
        <MultipassTab
          config={config as Extract<CardTypeConfig, { cardType: 'multipass' }>}
          onChange={onChange as (c: Partial<Extract<CardTypeConfig, { cardType: 'multipass' }>>) => void}
        />
      );
    default:
      // Exhaustiveness check
      const { t } = useI18n();
      return (
        <div className="p-4 text-sm text-neutral-500 dark:text-neutral-400">
          {t('wallet.studio.cardType.unsupported', { type: (cardType as string) ?? t('wallet.studio.cardType.unknown') })}
        </div>
      );
  }
}
