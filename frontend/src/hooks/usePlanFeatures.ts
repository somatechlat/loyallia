/**
 * Plan-aware feature gating hook for the Wallet Pass Studio.
 *
 * Wraps usePlan with wallet-specific feature checks and limit tracking.
 * Provides typed access to wallet plan features and usage limits.
 *
 * Gracefully falls back to all-features-enabled when PlanProvider is
 * not available (e.g. in tests or standalone usage).
 */

'use client';

import { usePlan } from './usePlan';

export interface WalletPlanFeatures {
  hasPassStudio: boolean;
  hasCustomTemplates: boolean;
  hasAdvancedFields: boolean;
  hasAIAssistant: boolean;
  walletTemplatesLimit: number;
  walletTemplatesUsed: number;
  walletTemplatesRemaining: number;
  walletPassUpdatesLimit: number;
  walletPassUpdatesUsed: number;
  walletPassUpdatesRemaining: number;
  isAtTemplateLimit: boolean;
  isAtPassUpdatesLimit: boolean;
  isLoading: boolean;
  error: Error | null;
}

const DEFAULT_FEATURES: WalletPlanFeatures = {
  hasPassStudio: true,
  hasCustomTemplates: true,
  hasAdvancedFields: true,
  hasAIAssistant: true,
  walletTemplatesLimit: 999,
  walletTemplatesUsed: 0,
  walletTemplatesRemaining: 999,
  walletPassUpdatesLimit: 999,
  walletPassUpdatesUsed: 0,
  walletPassUpdatesRemaining: 999,
  isAtTemplateLimit: false,
  isAtPassUpdatesLimit: false,
  isLoading: false,
  error: null,
};

export function usePlanFeatures(): WalletPlanFeatures {
  try {
    const plan = usePlan();

    const hasPassStudio = plan.hasFeature('wallet_pass_studio');
    const hasCustomTemplates = plan.hasFeature('wallet_custom_templates');
    const hasAdvancedFields = plan.hasFeature('wallet_advanced_fields');
    const hasAIAssistant = plan.hasFeature('ai_assistant');

    const walletTemplatesLimit = plan.getLimit('wallet_templates');
    const walletTemplatesUsed = plan.getUsage('wallet_templates');
    const walletTemplatesRemaining = Math.max(0, walletTemplatesLimit - walletTemplatesUsed);
    const isAtTemplateLimit = plan.isAtLimit('wallet_templates');

    const walletPassUpdatesLimit = plan.getLimit('wallet_pass_updates_month');
    const walletPassUpdatesUsed = plan.getUsage('wallet_pass_updates_month');
    const walletPassUpdatesRemaining = Math.max(0, walletPassUpdatesLimit - walletPassUpdatesUsed);
    const isAtPassUpdatesLimit = plan.isAtLimit('wallet_pass_updates_month');

    return {
      hasPassStudio,
      hasCustomTemplates,
      hasAdvancedFields,
      hasAIAssistant,
      walletTemplatesLimit,
      walletTemplatesUsed,
      walletTemplatesRemaining,
      walletPassUpdatesLimit,
      walletPassUpdatesUsed,
      walletPassUpdatesRemaining,
      isAtTemplateLimit,
      isAtPassUpdatesLimit,
      isLoading: plan.isLoading,
      error: plan.error,
    };
  } catch {
    // PlanProvider not available — return defaults (all features enabled)
    return DEFAULT_FEATURES;
  }
}
