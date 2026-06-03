import { describe, it, expect } from 'vitest';
import type { WalletPassStudioState } from '@/components/wallet/types';
import {
  getDefaultCardTypeConfig,
  type CardTypeConfig,
} from '@/components/wallet/types/card-type-config';
import {
  DYNAMIC_TEMPLATES,
  getDynamicTemplatesForCardType,
} from '@/components/wallet/types/dynamic-templates';
import type { CardType } from '@/components/wallet/types/unified-state';

describe('Wallet Pass Studio types', () => {
  describe('WalletPassStudioState', () => {
    it('compiles with strict types and version 2', () => {
      const state: WalletPassStudioState = {
        version: 2,
        id: 'test-id',
        name: 'Test Pass',
        cardType: 'stamp',
        industry: 'retail',
        colors: { background: '#fff', foreground: '#000', label: '#666', accent: '#f00' },
        images: {},
        fields: [],
        cardTypeConfig: getDefaultCardTypeConfig('stamp'),
        barcode: { format: 'QR_CODE', message: 'test', messageEncoding: 'iso-8859-1' },
        backContent: { fields: [], links: [], detailImages: [] },
        apple: {
          passStyle: 'generic',
          description: '',
          organizationName: '',
          nfc: { enabled: false, requiresAuthentication: false },
          locations: [],
          beacons: [],
          suppressStripShine: false,
          sharingProhibited: false,
          voided: false,
        },
        google: {
          passType: 'GenericClass',
          programName: '',
          hexBackgroundColor: '#ffffff',
          messages: [],
          notifyPreference: true,
        },
        ui: {
          activeTab: 'images',
          platformView: 'both',
          showBack: false,
          zoom: 1,
          isModified: false,
        },
      };

      expect(state.version).toBe(2);
      expect(state.ui.activeTab).toBe('images');
    });

    it('accepts all valid activeTab values', () => {
      const tabs: Array<WalletPassStudioState['ui']['activeTab']> = [
        'images',
        'cardType',
        'fields',
        'back',
        'barcode',
        'colors',
        'advanced',
      ];
      expect(tabs).toHaveLength(7);
    });
  });

  describe('getDefaultCardTypeConfig', () => {
    const cardTypes: CardType[] = [
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
    ];

    it.each(cardTypes)('returns correct cardType for %s', (cardType) => {
      const config = getDefaultCardTypeConfig(cardType);
      expect(config.cardType).toBe(cardType);
    });

    it('returns StampCardConfig for stamp with visual fields', () => {
      const config = getDefaultCardTypeConfig('stamp');
      expect(config.cardType).toBe('stamp');
      expect('stampsRequired' in config).toBe(true);
      expect('stampShape' in config).toBe(true);
      expect('stampIcon' in config).toBe(true);
      expect('stampFilledIcon' in config).toBe(true);
      expect('stampColor' in config).toBe(true);
      expect('stampGridLayout' in config).toBe(true);
    });

    it('returns CashbackCardConfig for cashback with visual fields', () => {
      const config = getDefaultCardTypeConfig('cashback');
      expect(config.cardType).toBe('cashback');
      expect('cashbackPercentage' in config).toBe(true);
      expect('coinIcon' in config).toBe(true);
      expect('tierBadge' in config).toBe(true);
      expect('progressRingColor' in config).toBe(true);
    });

    it('returns CouponCardConfig for coupon with visual fields', () => {
      const config = getDefaultCardTypeConfig('coupon');
      expect(config.cardType).toBe('coupon');
      expect('discountType' in config).toBe(true);
      expect('cutLineStyle' in config).toBe(true);
      expect('discountBadgeStyle' in config).toBe(true);
      expect('offerTag' in config).toBe(true);
    });

    it('returns VipMembershipCardConfig for vip_membership with visual fields', () => {
      const config = getDefaultCardTypeConfig('vip_membership');
      expect(config.cardType).toBe('vip_membership');
      expect('membershipName' in config).toBe(true);
      expect('crownIcon' in config).toBe(true);
      expect('memberBadgeStyle' in config).toBe(true);
      expect('benefitsListIcons' in config).toBe(true);
    });

    it('returns GiftCertificateCardConfig for gift_certificate with visual fields', () => {
      const config = getDefaultCardTypeConfig('gift_certificate');
      expect(config.cardType).toBe('gift_certificate');
      expect('denominations' in config).toBe(true);
      expect('boxGraphic' in config).toBe(true);
      expect('ribbonColor' in config).toBe(true);
      expect('denominationBadge' in config).toBe(true);
    });

    it('throws for unknown card type', () => {
      expect(() => getDefaultCardTypeConfig('unknown' as CardType)).toThrow(
        'Unknown card type: unknown'
      );
    });
  });

  describe('Dynamic Templates', () => {
    it('has at least 25 templates', () => {
      expect(DYNAMIC_TEMPLATES.length).toBeGreaterThanOrEqual(25);
    });

    it.each([
      ['stamp', ['stamp_count', 'visit_count']],
      ['cashback', ['cashback_earned', 'points_balance']],
      ['coupon', ['discount_amount', 'remaining_uses']],
      ['referral_pass', ['referral_code', 'friend_name']],
      ['gift_certificate', ['gift_amount']],
      ['corporate_discount', ['employee_id', 'department', 'company_name']],
      ['multipass', ['session_count', 'remaining_uses']],
    ] as [CardType, string[]][])(
      'getDynamicTemplatesForCardType(%s) includes expected templates',
      (cardType, expectedIds) => {
        const templates = getDynamicTemplatesForCardType(cardType);
        const ids = templates.map((t) => t.id);
        for (const expectedId of expectedIds) {
          expect(ids).toContain(expectedId);
        }
      }
    );

    it('returns only templates applicable to the card type', () => {
      const stampTemplates = getDynamicTemplatesForCardType('stamp');
      for (const template of stampTemplates) {
        expect(template.applicableCardTypes).toContain('stamp');
      }
    });

    it('returns universal templates for every card type', () => {
      const allCardTypes: CardType[] = [
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
      ];
      for (const cardType of allCardTypes) {
        const templates = getDynamicTemplatesForCardType(cardType);
        const ids = templates.map((t) => t.id);
        expect(ids).toContain('customer_name');
        expect(ids).toContain('barcode_data');
        expect(ids).toContain('current_date');
      }
    });
  });
});
