/**
 * Plan features hook for Wallet Pass Studio gating.
 *
 * Mock implementation for Phase 11.
 * Will be replaced with real API integration in a later phase.
 */

export interface PlanFeatures {
  wallet_pass_studio: boolean;
  wallet_custom_templates: boolean;
  wallet_advanced_fields: boolean;
  limits: {
    wallet_templates: number;
    wallet_pass_updates_month: number;
    wallet_ai_designs_month: number;
  };
  usage: {
    wallet_templates: number;
    wallet_pass_updates_month: number;
    wallet_ai_designs_month: number;
  };
}

export function usePlanFeatures(): PlanFeatures {
  return {
    wallet_pass_studio: true,
    wallet_custom_templates: true,
    wallet_advanced_fields: true,
    limits: {
      wallet_templates: 50,
      wallet_pass_updates_month: 200,
      wallet_ai_designs_month: 20,
    },
    usage: {
      wallet_templates: 3,
      wallet_pass_updates_month: 12,
      wallet_ai_designs_month: 2,
    },
  };
}
