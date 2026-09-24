/**
 * i18n key-existence gate for dynamic `t()` families in the Wallet Designer.
 *
 * Dynamic key building (`t(\`wallet.studio.cashback.expiry${...}\`)`) leaks raw
 * keys into the UI when a locale entry is missing. This test enumerates every
 * key those families can produce and asserts both locales carry them.
 */
import { describe, it, expect } from 'vitest';
import es from '@/lib/i18n/locales/es.json';
import en from '@/lib/i18n/locales/en.json';

const locales: Array<[string, Record<string, string>]> = [
  ['es', es as Record<string, string>],
  ['en', en as Record<string, string>],
];

/** Every key a dynamic `t()` site in the wallet studio can request. */
const DYNAMIC_KEY_FAMILIES: Record<string, string[]> = {
  'wallet.studio.cashback.expiry*': [
    'wallet.studio.cashback.expiryUnlimited',
    'wallet.studio.cashback.expiryDefined',
    'wallet.studio.cashback.expiryAtIssue',
    'wallet.studio.cashback.expiryType',
    'wallet.studio.cashback.expiryDays',
  ],
  'programs.cardTypes.*': [
    'programs.cardTypes.stamp',
    'programs.cardTypes.cashback',
    'programs.cardTypes.coupon',
    'programs.cardTypes.affiliate',
    'programs.cardTypes.discount',
    'programs.cardTypes.gift_certificate',
    'programs.cardTypes.vip_membership',
    'programs.cardTypes.corporate_discount',
    'programs.cardTypes.referral_pass',
    'programs.cardTypes.multipass',
  ],
  'wallet.studio.group.{group}.title|subtitle': [
    'wallet.studio.group.header.title',
    'wallet.studio.group.header.subtitle',
    'wallet.studio.group.primary.title',
    'wallet.studio.group.primary.subtitle',
    'wallet.studio.group.secondary.title',
    'wallet.studio.group.secondary.subtitle',
    'wallet.studio.group.auxiliary.title',
    'wallet.studio.group.auxiliary.subtitle',
    'wallet.studio.group.back.title',
    'wallet.studio.group.back.subtitle',
    'wallet.studio.group.add.header',
    'wallet.studio.group.add.primary',
    'wallet.studio.group.add.secondary',
    'wallet.studio.group.add.auxiliary',
    'wallet.studio.group.add.back',
    'wallet.studio.group.add',
  ],
  'wallet.studio.backDesign.cardInfo.*': [
    'wallet.studio.backDesign.cardInfo.terms',
    'wallet.studio.backDesign.cardInfo.expiry',
    'wallet.studio.backDesign.cardInfo.nextReward',
    'wallet.studio.backDesign.cardInfo.pointsBalance',
    'wallet.studio.backDesign.cardInfo.totalVisits',
    'wallet.studio.backDesign.cardInfo.rewardLevels',
    'wallet.studio.backDesign.cardInfo.locations',
    'wallet.studio.backDesign.cardInfo.companyName',
    'wallet.studio.backDesign.cardInfo.issuer',
    'wallet.studio.backDesign.cardInfo.serialNumber',
    'wallet.studio.backDesign.cardInfo.createdBy',
    'wallet.studio.backDesign.cardInfo.lastUpdated',
    'wallet.studio.backDesign.cardInfo.referralShare',
  ],
  'wallet.studio.fieldValidation.*': [
    'wallet.studio.fieldValidation.combinedLimitWarning',
    'wallet.studio.fieldValidation.fieldLabelRequired',
    'wallet.studio.fieldValidation.fieldValueRequired',
    'wallet.studio.fieldValidation.groupExceedsLimit',
    'wallet.studio.fieldValidation.tooManyFrontFields',
    'wallet.studio.fieldValidation.googleRowMaxItems',
    'wallet.studio.fieldValidation.unknownDynamicTemplate',
  ],
  'wallet.studio.overlay.*': [
    'wallet.studio.overlay.title',
    'wallet.studio.overlay.back',
    'wallet.studio.overlay.close',
    'wallet.studio.overlay.done',
    'wallet.studio.overlay.escHint',
  ],
  'wallet.studio.summary.*': [
    'wallet.studio.summary.title',
    'wallet.studio.summary.description',
    'wallet.studio.summary.open',
    'wallet.studio.summary.edit',
    'wallet.studio.summary.empty',
    'wallet.studio.summary.customized',
    'wallet.studio.summary.platform',
  ],
};

describe('i18n dynamic key families', () => {
  for (const [family, keys] of Object.entries(DYNAMIC_KEY_FAMILIES)) {
    for (const [lang, dict] of locales) {
      it(`${lang} has every key in ${family}`, () => {
        const missing = keys.filter((k) => typeof dict[k] !== 'string' || dict[k].length === 0);
        expect(missing, `missing in ${lang}: ${missing.join(', ')}`).toEqual([]);
      });
    }
  }

  for (const [lang, dict] of locales) {
    it(`${lang} has no raw-key leak placeholders (wallet.studio.*)`, () => {
      const leaked = Object.entries(dict)
        .filter(([k, v]) => k.startsWith('wallet.studio.') && (v === k || v === ''))
        .map(([k]) => k);
      expect(leaked).toEqual([]);
    });
  }
});
