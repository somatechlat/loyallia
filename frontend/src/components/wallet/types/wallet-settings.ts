/**
 * Program-level notification settings (wallet_settings.notifications).
 *
 * These fire on wallet-pass lifecycle events — enroll, redeem, value change —
 * and are distinct from per-field change messages.
 *
 * Default copy lives in the i18n catalog (Spanish as source of truth).
 * Pure-TS modules cannot call `t()`, so defaults store catalog key names and
 * React components resolve them via `useI18n().t()`.
 */

export interface ProgramNotificationSettings {
  onEnroll: {
    enabled: boolean;
    requireConsent: boolean;
    apple: boolean;
    google: boolean;
    message: string;
  };
  onRedeem: {
    enabled: boolean;
    apple: boolean;
    google: boolean;
    header: string;
    body: string;
  };
  onValueChange: {
    enabled: boolean;
  };
}

/** Catalog keys for default program-notification copy. */
export const PROGRAM_NOTIFICATION_DEFAULT_KEYS = {
  onEnrollMessage: 'wallet.studio.programNotifications.defaultEnrollMessage',
  onRedeemHeader: 'wallet.studio.programNotifications.defaultRedeemHeader',
  onRedeemBody: 'wallet.studio.programNotifications.defaultRedeemBody',
} as const;

/**
 * Defaults: onEnroll is opt-in, the other events are on.
 * Copy fields hold catalog keys; resolve with `t()` before display or export.
 */
export function getDefaultProgramNotifications(): ProgramNotificationSettings {
  return {
    onEnroll: {
      enabled: false,
      requireConsent: true,
      apple: true,
      google: true,
      message: PROGRAM_NOTIFICATION_DEFAULT_KEYS.onEnrollMessage,
    },
    onRedeem: {
      enabled: true,
      apple: true,
      google: true,
      header: PROGRAM_NOTIFICATION_DEFAULT_KEYS.onRedeemHeader,
      body: PROGRAM_NOTIFICATION_DEFAULT_KEYS.onRedeemBody,
    },
    onValueChange: {
      enabled: true,
    },
  };
}

function asRecord(raw: unknown): Record<string, unknown> {
  return raw !== null && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

/**
 * Tolerant parse of stored program notifications. Merges any missing fields
 * onto the defaults so partial/legacy payloads stay loadable.
 */
export function parseProgramNotifications(raw: unknown): ProgramNotificationSettings {
  const defaults = getDefaultProgramNotifications();
  const root = asRecord(raw);
  const onEnroll = asRecord(root.onEnroll);
  const onRedeem = asRecord(root.onRedeem);
  const onValueChange = asRecord(root.onValueChange);

  return {
    onEnroll: {
      enabled: asBoolean(onEnroll.enabled, defaults.onEnroll.enabled),
      requireConsent: asBoolean(onEnroll.requireConsent, defaults.onEnroll.requireConsent),
      apple: asBoolean(onEnroll.apple, defaults.onEnroll.apple),
      google: asBoolean(onEnroll.google, defaults.onEnroll.google),
      message: asString(onEnroll.message, defaults.onEnroll.message),
    },
    onRedeem: {
      enabled: asBoolean(onRedeem.enabled, defaults.onRedeem.enabled),
      apple: asBoolean(onRedeem.apple, defaults.onRedeem.apple),
      google: asBoolean(onRedeem.google, defaults.onRedeem.google),
      header: asString(onRedeem.header, defaults.onRedeem.header),
      body: asString(onRedeem.body, defaults.onRedeem.body),
    },
    onValueChange: {
      enabled: asBoolean(onValueChange.enabled, defaults.onValueChange.enabled),
    },
  };
}

/**
 * Resolve a stored copy field for display: catalog keys become localized
 * copy; anything else (user-typed text) passes through unchanged.
 */
export function resolveNotificationCopy(
  value: string,
  t: (key: string, vars?: Record<string, string | number>) => string
): string {
  return t(value);
}
